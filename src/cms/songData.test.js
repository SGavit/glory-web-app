import {
  normalizeSong, parseLyrics, lyricsFromSections, normalizeForDuplicate,
  normalizeLyricsForDuplicate, jaccardSimilarity, checkDuplicateSongs,
  toStatusVisibility, buildSongPayload, buildSongIndexPayload, DuplicateMatchType
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


  test("builds a compact search index without lyrics or chord sections", () => {
    const index = buildSongIndexPayload("song-7", {
      songTitle: "Amazing Grace", songNo: "7", songLanguage: "English",
      songCategory: "Worship", originalKey: "G", status: "PUBLISHED",
      visibility: "PUBLIC", artist: "John Newton", updatedAt: 123,
      sections: [{ title: "Verse 1", lines: [{ text: "Amazing grace", chords: [{ chordName: "G" }] }] }]
    });
    expect(index.firebaseKey).toBe("song-7");
    expect(index.titleLower).toBe("amazing grace");
    expect(index.artistLower).toBe("john newton");
    expect(index.songNo).toBe(7);
    expect(index.updatedAt).toBe(123);
    expect(index.sections).toBeUndefined();
    expect(index.lyrics).toBeUndefined();
  });

  test("builds Android status visibility field", () => {
    expect(toStatusVisibility("PUBLISHED", "PUBLIC")).toBe("PUBLISHED_PUBLIC");
  });
});
