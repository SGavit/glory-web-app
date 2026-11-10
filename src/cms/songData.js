const asArray = value => Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];

export const toStatusVisibility = (status, visibility) => String(status || "DRAFT") + "_" + String(visibility || "PRIVATE");

export function normalizeSong(id, value = {}) {
  const legacyLyrics = value.songContent || "";
  const composite = String(value.statusVisibility || "").split("_");
  const status = value.status || composite[0] || (legacyLyrics ? "PUBLISHED" : "DRAFT");
  const visibility = value.visibility || composite.slice(1).join("_") || (legacyLyrics ? "PUBLIC" : "PRIVATE");
  const sourceSections = asArray(value.sections);
  return {
    ...value,
    firebaseKey: id || value.firebaseKey || "",
    songNo: Number(value.songNo || 0),
    songTitle: value.songTitle || "Untitled song",
    songLanguage: value.songLanguage || "English",
    songCategory: value.songCategory || "Worship",
    originalKey: value.originalKey || "C",
    status,
    visibility,
    statusVisibility: toStatusVisibility(status, visibility),
    version: Number(value.version || 1),
    tags: asArray(value.tags),
    aliases: asArray(value.aliases),
    preferredKeys: asArray(value.preferredKeys),
    sections: (sourceSections.length ? sourceSections : parseLyrics(legacyLyrics)).map(section => ({
      ...section,
      ...(section.sectionNo === undefined ? {} : { sectionNo: section.sectionNo }),
      lines: asArray(section.lines).map(line => ({
        ...line,
        chords: asArray(line.chords).map(chord => ({
          ...chord,
          charIndex: Number(chord.charIndex || 0)
        }))
      }))
    }))
  };
}

export function parseLyrics(text = "", previousSections = []) {
  const previous = asArray(previousSections);
  const sections = [];
  String(text).split(/\r?\n/).forEach(line => {
    const heading = line.trim().match(/^\[(.+)\]$/);
    if (heading) {
      const title = heading[1].trim();
      const old = previous.find(section => section.title === title) || {};
      sections.push({
        ...old,
        type: old.type || title.toUpperCase().split(" ")[0],
        title,
        lines: []
      });
      return;
    }
    if (!line.trim()) return;
    if (!sections.length) {
      const old = previous.find(section => /verse/i.test(section.title || "")) || {};
      sections.push({
        ...old,
        type: old.type || "VERSE",
        title: old.title || "Verse 1",
        lines: []
      });
    }
    const current = sections[sections.length - 1];
    const oldSection = previous.find(section => section.title === current.title);
    const oldLine = asArray(oldSection?.lines)[current.lines.length] || {};
    let clean = "";
    const chords = [];
    const marker = /\{([^}]+)\}/g;
    let last = 0;
    let match;
    while ((match = marker.exec(line))) {
      clean += line.slice(last, match.index);
      chords.push({ chordName: match[1].trim(), charIndex: clean.length });
      last = marker.lastIndex;
    }
    clean += line.slice(last);
    current.lines.push({ ...oldLine, text: clean, chords });
  });
  return sections;
}

export function lyricsFromSections(sections) {
  return asArray(sections).map(section =>
    "[" + (section.title || "Verse") + "]\n" + asArray(section.lines).map(line => {
      let text = line.text || "";
      asArray(line.chords).slice().sort((a, b) => b.charIndex - a.charIndex).forEach(chord => {
        const index = Math.max(0, Math.min(text.length, Number(chord.charIndex || 0)));
        text = text.slice(0, index) + "{" + chord.chordName + "}" + text.slice(index);
      });
      return text;
    }).join("\n")
  ).join("\n\n");
}

export function buildSongPayload(existing, edited, uid, now) {
  const old = existing || {};
  const status = edited.status || old.status || "DRAFT";
  const visibility = edited.visibility || old.visibility || "PRIVATE";
  return {
    ...old,
    ...edited,
    firebaseKey: edited.firebaseKey || old.firebaseKey,
    songNo: Number(edited.songNo || 0),
    songTitle: String(edited.songTitle || "").trim(),
    songLanguage: edited.songLanguage || "English",
    songCategory: edited.songCategory || "Worship",
    tempo: edited.tempo === "" || edited.tempo == null ? null : Number(edited.tempo),
    year: edited.year === "" || edited.year == null ? null : Number(edited.year),
    artist: edited.artist || null,
    author: edited.author || null,
    composer: edited.composer || null,
    copyright: edited.copyright || null,
    description: edited.description || null,
    coverImageUrl: edited.coverImageUrl || null,
    tags: asArray(edited.tags ?? old.tags),
    aliases: asArray(edited.aliases ?? old.aliases),
    preferredKeys: asArray(edited.preferredKeys ?? old.preferredKeys),
    sections: asArray(edited.sections),
    status,
    visibility,
    statusVisibility: toStatusVisibility(status, visibility),
    version: Number(old.version || 0) + 1,
    createdAt: old.createdAt || now,
    createdBy: old.createdBy || uid,
    updatedAt: now,
    updatedBy: uid
  };
}

// These normalization rules deliberately mirror DuplicateSongChecker.kt:
// NFC, locale-based lowercase, punctuation/symbol removal (not replacement), whitespace collapse.
export function normalizeForDuplicate(value = "") {
  return String(value).normalize("NFC").toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLyricsForDuplicate(sections = []) {
  const fullText = asArray(sections)
    .map(section => asArray(section.lines).map(line => line.text || "").join(" "))
    .join(" ");
  return normalizeForDuplicate(fullText);
}

export function jaccardSimilarity(left, right) {
  if (left === right) return 1;
  const a = new Set(String(left).split(" ").filter(Boolean));
  const b = new Set(String(right).split(" ").filter(Boolean));
  const union = new Set([...a, ...b]).size;
  if (!union) return 0;
  let intersection = 0;
  a.forEach(word => { if (b.has(word)) intersection += 1; });
  return intersection / union;
}

export const DuplicateMatchType = Object.freeze({
  NONE: "NONE",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  EXACT: "EXACT"
});

// Mirrors Android DuplicateSongChecker.check() and calculateSimilarity().
// This produces warnings/results only; it does not block a save.
export function checkDuplicateSongs(target, existingList = [], excludeKey = null) {
  const results = [];
  const targetTitle = normalizeForDuplicate(target?.songTitle || "");
  const targetLyrics = normalizeLyricsForDuplicate(target?.sections);
  if (!targetTitle) return results;

  asArray(existingList).forEach(existing => {
    if (existing?.firebaseKey && existing.firebaseKey === excludeKey) return;
    const existingTitle = normalizeForDuplicate(existing?.songTitle || "");
    const titleSimilarity = jaccardSimilarity(targetTitle, existingTitle);
    const aliasMatches = asArray(existing?.aliases)
      .some(alias => normalizeForDuplicate(alias) === targetTitle);
    const existingLyrics = normalizeLyricsForDuplicate(existing?.sections);
    const lyricsSimilarity = targetLyrics && existingLyrics
      ? jaccardSimilarity(targetLyrics, existingLyrics)
      : 0;

    let type = DuplicateMatchType.NONE;
    if ((targetTitle === existingTitle || aliasMatches) && lyricsSimilarity > 0.95) {
      type = DuplicateMatchType.EXACT;
    } else if ((targetTitle === existingTitle || aliasMatches) && lyricsSimilarity > 0.8) {
      type = DuplicateMatchType.HIGH;
    } else if (titleSimilarity > 0.9 || lyricsSimilarity > 0.8 || aliasMatches) {
      type = DuplicateMatchType.MEDIUM;
    }
    if (type !== DuplicateMatchType.NONE) {
      results.push({
        type,
        matchedSong: existing,
        titleSimilarity,
        lyricsSimilarity,
        reason: type === DuplicateMatchType.EXACT
          ? "Exact match found"
          : type === DuplicateMatchType.HIGH
            ? "High similarity detected"
            : "Similar title or lyrics found"
      });
    }
  });

  return results.sort((a, b) =>
    (b.lyricsSimilarity + b.titleSimilarity) - (a.lyricsSimilarity + a.titleSimilarity)
  );
}
