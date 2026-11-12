const asArray = value =>
  Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];

const cleanText = value => String(value || "").replace(/\{[^}]+\}/g, "").replace(/\r\n?/g, "\n");

/**
 * Clamp a chord position to a valid JavaScript string offset.
 *
 * JavaScript string indexes, String#length, String#slice, DOM text-node offsets,
 * and the Glory Android charIndex contract all use UTF-16 code units.
 * Deliberately do not convert this value to a grapheme/visible-letter index.
 */
export function clampUtf16Offset(text, offset) {
  const value = String(text || "");
  const numeric = Number(offset);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(Math.max(0, value.length - 1), Math.trunc(numeric)));
}

/** Backward-compatible name; this now only clamps a UTF-16 offset and never snaps graphemes. */
export function snapUtf16Offset(text, offset) {
  return clampUtf16Offset(text, offset);
}

/** Find the beginning of the Unicode word at a DOM UTF-16 text-node offset. */
export function wordStartAtUtf16Offset(text, offset) {
  const value = String(text || "");
  const safe = Math.max(0, Math.min(value.length, Math.trunc(Number(offset) || 0)));
  const prefix = value.slice(0, safe);
  const match = prefix.match(/[\p{L}\p{N}\p{M}_]*$/u);
  return match ? prefix.length - match[0].length : safe;
}

/** Remap UTF-16 chord anchors through one contiguous text edit. */
export function remapChordsAfterTextEdit(oldText, newText, chords = []) {
  const before = String(oldText || "");
  const after = String(newText || "");
  let prefix = 0;

  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const oldTail = before.length - suffix;
  const delta = (after.length - suffix) - oldTail;
  let changedAnchors = 0;

  const mapped = asArray(chords).map(chord => {
    const original = clampUtf16Offset(before, chord.charIndex);
    let next = original;

    if (original >= oldTail) {
      next = original + delta;
    } else if (original >= prefix) {
      next = prefix;
      changedAnchors += 1;
    }

    return {
      ...chord,
      charIndex: clampUtf16Offset(after, next)
    };
  }).sort((a, b) => a.charIndex - b.charIndex);

  return { chords: mapped, changedAnchors };
}

export function remapLinesAfterEdit(oldLines, newTexts) {
  const old = asArray(oldLines);
  const next = asArray(newTexts).map(String);
  const n = old.length;
  const k = next.length;
  const dp = Array.from({ length: n + 1 }, () => Array(k + 1).fill(0));

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = k - 1; j >= 0; j -= 1) {
      dp[i][j] = String(old[i].text || "") === next[j]
        ? 1 + dp[i + 1][j + 1]
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const pairs = new Map();
  const usedOld = new Set();
  const usedNew = new Set();
  let i = 0;
  let j = 0;

  while (i < n && j < k) {
    if (String(old[i].text || "") === next[j]) {
      pairs.set(j, i);
      usedOld.add(i);
      usedNew.add(j);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  const remainingOld = old.map((_, index) => index).filter(index => !usedOld.has(index));
  const remainingNew = next.map((_, index) => index).filter(index => !usedNew.has(index));
  remainingNew.forEach((newIndex, index) => {
    if (remainingOld[index] != null) pairs.set(newIndex, remainingOld[index]);
  });

  let changedAnchors = 0;
  const lines = next.map((text, newIndex) => {
    const oldIndex = pairs.get(newIndex);
    if (oldIndex == null) return { text, chords: [] };

    const mapped = remapChordsAfterTextEdit(
      old[oldIndex].text,
      text,
      old[oldIndex].chords || []
    );
    changedAnchors += mapped.changedAnchors;
    return { text, chords: mapped.chords };
  });

  return { lines, changedAnchors };
}

export function detectSectionsFromLyrics(input) {
  const source = cleanText(input).trim();
  if (!source) return [];

  const lines = source.split("\n");
  const explicit = lines.some(line => /^\s*\[[^\]]+\]\s*$/.test(line));

  if (explicit) {
    const output = [];
    let current = null;
    const finish = () => {
      if (current && current.lines.length) output.push(current);
    };

    lines.forEach(raw => {
      const match = raw.match(/^\s*\[([^\]]+)\]\s*$/);
      if (match) {
        finish();
        const title = match[1].trim();
        current = {
          type: title.toUpperCase().split(/\s+/)[0],
          title,
          lines: []
        };
      } else if (current && raw.trim()) {
        current.lines.push({ text: raw.trimEnd(), chords: [] });
      }
    });

    finish();
    return output;
  }

  return source
    .split(/\n\s*\n+/)
    .map(block => block.split("\n").map(line => line.trimEnd()).filter(line => line.trim()))
    .filter(block => block.length)
    .map((block, index) => ({
      type: "VERSE",
      title: "Verse " + (index + 1),
      lines: block.map(text => ({ text, chords: [] }))
    }));
}

export function nextSectionTitle(type, sections) {
  const value = String(type || "Verse").trim();
  if (!/^(verse|chorus)$/i.test(value)) return value;

  const numbers = asArray(sections).map(section => {
    const match = String(section.title || "").match(new RegExp("^" + value + "\\s+(\\d+)$", "i"));
    return match ? Number(match[1]) : 0;
  });

  return value[0].toUpperCase() + value.slice(1).toLowerCase() + " " + (Math.max(0, ...numbers) + 1);
}

export function normalizeChordIndex(chords, requested, length, exclude = -1) {
  const size = Math.max(0, Number(length) || 0);
  if (size === 0) return -1;

  const used = new Set(
    asArray(chords)
      .filter((_, index) => index !== exclude)
      .map(chord => Number(chord.charIndex) || 0)
  );
  const target = Math.max(0, Math.min(size - 1, Math.trunc(Number(requested) || 0)));

  if (!used.has(target)) return target;

  for (let distance = 1; distance < size; distance += 1) {
    if (target - distance >= 0 && !used.has(target - distance)) return target - distance;
    if (target + distance < size && !used.has(target + distance)) return target + distance;
  }

  return -1;
}

export function normalizeSections(sections) {
  return asArray(sections).map(section => ({
    type: String(section.type || section.title || "VERSE").toUpperCase().split(/\s+/)[0],
    ...(section.sectionNo == null ? {} : { sectionNo: Number(section.sectionNo) }),
    title: String(section.title || section.type || "Verse"),
    lines: asArray(section.lines).map(line => {
      const text = String(line.text || "");
      return {
        text,
        chords: asArray(line.chords)
          .map(chord => ({
            chordName: String(chord.chordName || "").trim().replace("♯", "#").replace("♭", "b"),
            charIndex: clampUtf16Offset(text, chord.charIndex)
          }))
          .filter(chord => chord.chordName)
          .sort((a, b) => a.charIndex - b.charIndex)
      };
    })
  }));
}
