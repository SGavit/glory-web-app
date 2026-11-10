import { normalizeSong, parseLyrics, lyricsFromSections, normalizeForDuplicate, jaccardSimilarity, toStatusVisibility, buildSongPayload } from "./songData";

describe("song data compatibility", () => {
  test("keeps firebaseKey and composite status", () => {
    const song = normalizeSong("song-1", { statusVisibility: "PUBLISHED_PUBLIC", songNo: "12" });
    expect(song.firebaseKey).toBe("song-1");
    expect(song.songNo).toBe(12);
    expect(song.statusVisibility).toBe("PUBLISHED_PUBLIC");
  });
  test("uses UTF-16 chord offsets", () => {
    expect(parseLyrics("[Verse 1]\n😀{C}song")[0].lines[0].chords[0].charIndex).toBe(2);
  });
  test("round-trips chord markers", () => {
    const sections = parseLyrics("[Chorus]\n{Ab}Praise {Eb}the Lord");
    expect(lyricsFromSections(sections)).toBe("[Chorus]\n{Ab}Praise {Eb}the Lord");
  });
  test("normalizes Unicode before duplicate checks", () => {
    expect(normalizeForDuplicate("नमः-शिवाय")).toBe(normalizeForDuplicate("नमः शिवाय"));
    expect(jaccardSimilarity("नमः शिवाय", "नमः शिवाय")).toBe(1);
  });
  test("preserves unknown nested metadata and optional section number", () => {
    const old = { vendorField: "keep", version: 4, sections: [{ type: "verse", title: "Verse 1", custom: 7, lines: [{ text: "Hi", customLine: true }] }] };
    const sections = parseLyrics("[Verse 1]\\nHello", old.sections);
    const next = buildSongPayload(old, { songTitle: "Test", status: "DRAFT", visibility: "PRIVATE", sections }, "uid-1", 100);
    expect(next.vendorField).toBe("keep");
    expect(next.sections[0].custom).toBe(7);
    expect(next.sections[0].sectionNo).toBeUndefined();
    expect(next.sections[0].lines[0].customLine).toBe(true);
    expect(next.firebaseKey).toBeUndefined();
  });
  test("builds the Android query field", () => {
    expect(toStatusVisibility("PUBLISHED", "PUBLIC")).toBe("PUBLISHED_PUBLIC");
  });
});
