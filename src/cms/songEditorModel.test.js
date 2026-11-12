import { detectSectionsFromLyrics, nextSectionTitle, normalizeChordIndex } from "./songEditorModel";

describe("Android-compatible section and chord editing", () => {
  test("detects explicit section headings and keeps section titles", () => {
    const result = detectSectionsFromLyrics("[Intro]\nMusic\n[Verse 1]\nFirst line\nSecond line\n[Chorus]\nSing");
    expect(result.map(section => section.title)).toEqual(["Intro", "Verse 1", "Chorus"]);
    expect(result[1].lines.map(line => line.text)).toEqual(["First line", "Second line"]);
  });

  test("uses blank-line groups as numbered verses when no headings exist", () => {
    const result = detectSectionsFromLyrics("Line one\nLine two\n\nLine three\n\nLine four");
    expect(result.map(section => section.title)).toEqual(["Verse 1", "Verse 2", "Verse 3"]);
    expect(result[1].lines[0].text).toBe("Line three");
  });

  test("does not create sections for empty input or heading-only input", () => {
    expect(detectSectionsFromLyrics("  ")).toEqual([]);
    expect(detectSectionsFromLyrics("[Verse 1]")).toEqual([]);
  });

  test("numbers standard verse and chorus sections independently", () => {
    const sections = [{ title: "Verse 1" }, { title: "Verse 3" }, { title: "Chorus 1" }];
    expect(nextSectionTitle("Verse", sections)).toBe("Verse 4");
    expect(nextSectionTitle("Chorus", sections)).toBe("Chorus 2");
    expect(nextSectionTitle("Bridge", sections)).toBe("Bridge");
  });

  test("finds nearest free chord index without collisions", () => {
    const chords = [{ chordName: "C", charIndex: 3 }, { chordName: "G", charIndex: 4 }];
    expect(normalizeChordIndex(chords, 3, 8)).toBe(2);
    expect(normalizeChordIndex(chords, 4, 8)).toBe(5);
    expect(normalizeChordIndex(chords, 8, 8)).toBe(7);
  });

  test("supports UTF-16 offsets because JS and Kotlin both index UTF-16 code units", () => {
    expect("😀Praise".length).toBe(8);
    expect(normalizeChordIndex([], 2, "😀Praise".length)).toBe(2);
  });
});
