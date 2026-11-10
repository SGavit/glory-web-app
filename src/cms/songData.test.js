import {
  buildSongPayload, jaccardSimilarity, lyricsFromSections, normalizeForDuplicate,
  normalizeSong, parseLyrics, toStatusVisibility
} from "./songData";

describe("Android-compatible song schema", () => {
  test("normalizes composite status and keeps the Firebase key in the object", () => {
    const song = normalizeSong("song-1", { statusVisibility: "PUBLISHED_PUBLIC", songNo: "12" });
    expect(song.firebaseKey).toBe("song-1");
    expect(song.songNo).toBe(12);
    expect(song.status).toBe("PUBLISHED");
    expect(song.visibility).toBe("PUBLIC");
    expect(song.statusVisibility).toBe("PUBLISHED_PUBLIC");
  });

  test("preserves unknown song, section and line metadata while parsing edited lyrics", () => {
    const original = {
      extraMetadata: { source: "android" },
      sections: [{ type: "verse", sectionNo: 1, title: "Verse 1", customSection: true,
        lines: [{ text: "Hello", customLine: "keep", chords: [{ chordName: "G", charIndex: 0 }] }] }]
    };
    const parsed = parseLyrics("[Verse 1]\\n{G}Hello world", original.sections);
    const payload = buildSongPayload(original, { ...normalizeSong("s1", original), sections: parsed }, "uid", 100);
    expect(payload.extraMetadata).toEqual({ source: "android" });
    expect(payload.sections[0].sectionNo).toBe(1);
    expect(payload.sections[0].customSection).toBe(true);
    expect(payload.sections[0].lines[0].customLine).toBe("keep");
    expect(payload.sections[0].lines[0].chords).toEqual([{ chordName: "G", charIndex: 0 }]);
  });

  test("uses UTF-16 offsets for chord positions", () => {
    const parsed = parseLyrics("[Verse 1]\\n😀{C}song");
    expect(parsed[0].lines[0].chords[0].charIndex).toBe(2);
  });

  test("round-trips chord markers through the lyrics editor", () => {
    const sections = parseLyrics("[Chorus]\\n{Ab}Praise {Eb}the Lord");
    expect(lyricsFromSections(sections)).toBe("[Chorus]\\n{Ab}Praise {Eb}the Lord");
  });

  test("normalizes Devanagari text to NFC before duplicate comparison", () => {
    expect(normalizeForDuplicate("नमः-शिवाय")).toBe(normalizeForDuplicate("नमः शिवाय"));
    expect(jaccardSimilarity("नमः शिवाय", "नमः शिवाय")).toBe(1);
  });

  test("always derives the composite visibility field", () => {
    expect(toStatusVisibility("PUBLISHED", "PUBLIC")).toBe("PUBLISHED_PUBLIC");
  });
});
