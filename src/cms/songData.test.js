import { clampUtf16Offset, wordStartAtUtf16Offset, remapChordsAfterTextEdit, remapLinesAfterEdit, normalizeChordIndex, normalizeSections } from "./songEditorModel";
import {
  normalizeSong, parseLyrics, lyricsFromSections, normalizeForDuplicate,
  normalizeLyricsForDuplicate, jaccardSimilarity, checkDuplicateSongs,
  toStatusVisibility, buildSongPayload, getNextSongNo, DuplicateMatchType, validateChordOffsets
} from "./songData";

describe("Android song model compatibility", () => {
  test("keeps Firebase key and composite status", () => {
    const song = normalizeSong("song-1", { statusVisibility: "PUBLISHED_PUBLIC", songNo: "12" });
    expect(song.firebaseKey).toBe("song-1");
    expect(song.songNo).toBe(12);
    expect(song.statusVisibility).toBe("PUBLISHED_PUBLIC");
  });

  test("uses UTF-16 chord offsets, matching Kotlin String.length", () => {
    expect(parseLyrics("[Verse 1]\n😀{C}song")[0].lines[0].chords[0].charIndex).toBe(2);
  });

  test("round-trips chord markers", () => {
    const sections = parseLyrics("[Chorus]\n{Ab}Praise {Eb}the Lord");
    expect(lyricsFromSections(sections)).toBe("[Chorus]\n{Ab}Praise {Eb}the Lord");
  });

  test("matches Android punctuation removal after NFC normalization", () => {
    expect(normalizeForDuplicate("A-B!")).toBe("ab");
    expect(normalizeForDuplicate("धन्यवाद  के साथ ")).toBe("धनयवद क सथ");
  });

  test("matches Android word-set Jaccard and duplicate thresholds", () => {
    const existing = {
      firebaseKey: "song-1",
      songTitle: "Amazing Grace",
      aliases: [],
      sections: [{ lines: [{ text: "Amazing grace how sweet the sound" }] }]
    };
    const target = {
      songTitle: "Amazing Grace",
      sections: [{ lines: [{ text: "Amazing grace how sweet the sound" }] }]
    };
    const matches = checkDuplicateSongs(target, [existing]);
    expect(matches[0].type).toBe(DuplicateMatchType.EXACT);
    expect(jaccardSimilarity("a b c", "a b c d")).toBe(0.75);
    expect(normalizeLyricsForDuplicate(target.sections)).toBe("amazing grace how sweet the sound");
  });

  test("preserves unknown nested metadata and optional section number", () => {
    const old = {
      firebaseKey: "legacy-key",
      vendorField: "keep",
      version: 4,
      sections: [{
        type: "verse", title: "Verse 1", custom: 7,
        lines: [{ text: "Hi", customLine: true }]
      }]
    };
    const sections = parseLyrics("[Verse 1]\nHello", old.sections);
    const next = buildSongPayload(old, {
      songTitle: "Test", status: "DRAFT", visibility: "PRIVATE", sections
    }, "uid-1", 100);
    expect(next.firebaseKey).toBe("legacy-key");
    expect(next.vendorField).toBe("keep");
    expect(next.sections[0].custom).toBe(7);
    expect(next.sections[0].sectionNo).toBeUndefined();
    expect(next.sections[0].lines[0].customLine).toBe(true);
  });


  test("builds Android status visibility field", () => {
    expect(toStatusVisibility("PUBLISHED", "PUBLIC")).toBe("PUBLISHED_PUBLIC");
  });
  test("keeps chord indexes with their original lines when a lyric line is inserted", () => {
    const result = remapLinesAfterEdit([
      { text: "First line", chords: [{ chordName: "C", charIndex: 0 }] },
      { text: "Second line", chords: [{ chordName: "G", charIndex: 7 }] }
    ], ["New inserted line", "First line", "Second line"]);
    expect(result.lines[0].chords).toEqual([]);
    expect(result.lines[1].chords[0].chordName).toBe("C");
    expect(result.lines[2].chords[0].charIndex).toBe(7);
  });

});


describe("UTF-16 chord editor positions (Android/Firebase contract)", () => {
  test("uses the exact Android UTF-16 offsets for the Hindi test lyric", () => {
    const line = "प्रभु का धन्यवाद करूँगा";
    expect(line.length).toBe(23);
    expect(line.indexOf("प्र")).toBe(0);
    expect(line.indexOf("भु")).toBe(3);
    expect(line.indexOf("का")).toBe(6);
    expect(line.indexOf("ध")).toBe(9);
  });

  test("keeps Firebase charIndex values unchanged when normalizing Devanagari chords", () => {
    const sections = normalizeSections([{
      title: "Verse 1",
      lines: [{
        text: "प्रभु का धन्यवाद करूँगा",
        chords: [
          { chordName: "G", charIndex: 0 },
          { chordName: "C", charIndex: 3 },
          { chordName: "D", charIndex: 6 },
          { chordName: "Em", charIndex: 9 }
        ]
      }]
    }]);
    expect(sections[0].lines[0].chords.map(chord => chord.charIndex)).toEqual([0, 3, 6, 9]);
  });

  test("uses DOM word offsets as native JavaScript UTF-16 positions", () => {
    const line = "प्रभु का धन्यवाद करूँगा";
    expect(wordStartAtUtf16Offset(line, 8)).toBe(line.indexOf("का"));
    expect(wordStartAtUtf16Offset(line, line.indexOf("धन्यवाद") + 3)).toBe(line.indexOf("धन्यवाद"));
  });

  test("clamps UTF-16 offsets without converting them to visible grapheme indexes", () => {
    const line = "प्रभु का धन्यवाद करूँगा";
    expect(clampUtf16Offset(line, 3)).toBe(3);
    expect(clampUtf16Offset(line, 6)).toBe(6);
    expect(clampUtf16Offset(line, 9)).toBe(9);
    expect(clampUtf16Offset(line, 999)).toBe(22);
    expect(clampUtf16Offset("", 0)).toBe(0);
  });

  test("parses inline chord markers into UTF-16 offsets for Devanagari", () => {
    const parsed = parseLyrics("[Verse 1]\nप्र{G}भु {C}का {D}धन्यवाद");
    expect(parsed[0].lines[0].text).toBe("प्रभु का धन्यवाद");
    expect(parsed[0].lines[0].chords.map(chord => chord.charIndex)).toEqual([3, 6, 9]);
  });

  test("moves chord anchors by one UTF-16 code unit", () => {
    expect(clampUtf16Offset("प्रभु", 3 + 1)).toBe(4);
    expect(clampUtf16Offset("प्रभु", 3 - 1)).toBe(2);
  });

  test("shifts chord anchors when text is inserted before them", () => {
    const result = remapChordsAfterTextEdit("Amazing grace", "Very Amazing grace", [
      { chordName: "G", charIndex: 8 }
    ]);
    expect(result.chords[0].charIndex).toBe(13);
    expect(result.changedAnchors).toBe(0);
  });

  test("flags chord anchors whose original lyric segment was replaced", () => {
    const result = remapChordsAfterTextEdit("Amazing grace", "Amazing peace", [
      { chordName: "D", charIndex: 8 }
    ]);
    expect(result.changedAnchors).toBe(1);
    expect(result.chords[0].charIndex).toBe(8);
  });

  test("rejects invalid chord offsets before a Firebase payload is built", () => {
    expect(() => validateChordOffsets([{
      lines: [{ text: "प्रभु", chords: [{ chordName: "C", charIndex: 99 }] }]
    }])).toThrow(/UTF-16 offset/);
    expect(() => validateChordOffsets([{
      lines: [{ text: "प्रभु", chords: [{ chordName: "C", charIndex: 1.5 }] }]
    }])).toThrow(/UTF-16 offset/);
  });

  test("allows valid Android UTF-16 offsets in the song payload", () => {
    const sections = [{
      type: "VERSE",
      title: "Verse 1",
      lines: [{
        text: "प्रभु का धन्यवाद करूँगा",
        chords: [
          { chordName: "G", charIndex: 0 },
          { chordName: "C", charIndex: 3 },
          { chordName: "D", charIndex: 6 },
          { chordName: "Em", charIndex: 9 }
        ]
      }]
    }];
    const payload = buildSongPayload({}, { songTitle: "Test", sections }, "uid", 100);
    expect(payload.sections[0].lines[0].chords.map(chord => chord.charIndex)).toEqual([0, 3, 6, 9]);
  });

  test("keeps a requested position within the valid UTF-16 range", () => {
    expect(normalizeChordIndex([], 8, 8)).toBe(7);
    expect(normalizeChordIndex([], 2, 8)).toBe(2);
    expect(normalizeChordIndex([], 0, 0)).toBe(-1);
  });
});


describe("automatic song numbering", () => {
  test("assigns the next number after the highest existing Firebase song number", () => {
    expect(getNextSongNo({
      oldA: { songNo: "698" },
      oldB: { songNo: 700 },
      archived: { songNo: "699" },
      noNumber: { songTitle: "Legacy song" }
    })).toBe(701);
  });

  test("starts numbering at 1 when the Firebase song collection is empty", () => {
    expect(getNextSongNo(null)).toBe(1);
  });

  test("does not allow an edited song number to overwrite the existing number", () => {
    const payload = buildSongPayload(
      { firebaseKey: "song-700", songNo: "700", version: 3 },
      { songTitle: "Edited title", songNo: 999, sections: [] },
      "uid",
      100
    );
    expect(payload.songNo).toBe(700);
  });

  test("uses the generated number for a new song", () => {
    const payload = buildSongPayload(
      { firebaseKey: "new-song-key" },
      { songTitle: "New song", songNo: 701, sections: [] },
      "uid",
      100
    );
    expect(payload.songNo).toBe(701);
  });
});
