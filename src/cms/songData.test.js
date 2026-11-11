import { graphemeBoundaries, snapUtf16Offset, wordStartAtUtf16Offset, remapChordsAfterTextEdit, remapLinesAfterEdit } from "./songEditorModel";
import {
  normalizeSong, parseLyrics, lyricsFromSections, normalizeForDuplicate,
  normalizeLyricsForDuplicate, jaccardSimilarity, checkDuplicateSongs,
  toStatusVisibility, buildSongPayload, DuplicateMatchType
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


describe("Unicode-safe chord editor positions", () => {
  test("uses UTF-16 offsets but never splits a grapheme", () => {
    expect(graphemeBoundaries("A😀किB")).toEqual([0, 1, 3, 5, 6]);
    expect(snapUtf16Offset("A😀B", 2, "backward")).toBe(1);
    expect(snapUtf16Offset("A😀B", 2, "forward")).toBe(3);
  });

  test("attaches a chord to the beginning of a clicked Hindi word", () => {
    const line = "प्रभु का धन्यवाद करूँगा";
    expect(wordStartAtUtf16Offset(line, 8)).toBe(line.indexOf("का"));
    expect(wordStartAtUtf16Offset(line, line.indexOf("धन्यवाद") + 3)).toBe(line.indexOf("धन्यवाद"));
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
});
