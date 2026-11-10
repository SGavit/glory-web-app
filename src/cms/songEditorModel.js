const asArray = value => Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];

const cleanText = value => String(value || "").replace(/\\{[^}]+\\}/g, "").replace(/\\r\\n?/g, "\\n");

export function detectSectionsFromLyrics(input) {
  const source = cleanText(input).trim();
  if (!source) return [];
  const lines = source.split("\\n");
  const hasHeadings = lines.some(line => /^\\s*\\[[^\\]]+\\]\\s*$/.test(line));
  const sections = [];

  if (hasHeadings) {
    let current = null;
    const finish = () => {
      if (current && current.lines.length) sections.push(current);
    };
    lines.forEach(raw => {
      const heading = raw.match(/^\\s*\\[([^\\]]+)\\]\\s*$/);
      if (heading) {
        finish();
        const title = heading[1].trim();
        current = { type: title.toUpperCase().split(/\\s+/)[0], title, lines: [] };
      } else if (current && raw.trim()) {
        current.lines.push({ text: raw.trimEnd(), chords: [] });
      }
    });
    finish();
    return sections;
  }

  const blocks = source.split(/\\n\\s*\\n+/)
    .map(block => block.split("\\n").map(line => line.trimEnd()).filter(line => line.trim()))
    .filter(block => block.length);
  return blocks.map((block, index) => ({
    type: "VERSE",
    title: "Verse " + (index + 1),
    lines: block.map(text => ({ text, chords: [] }))
  }));
}

export function nextSectionTitle(type, sections) {
  const standard = String(type || "Verse").trim();
  if (!/^(verse|chorus)$/i.test(standard)) return standard;
  const numbers = asArray(sections).map(section => {
    const match = String(section.title || "").match(new RegExp("^" + standard + "\\s+(\\d+)$", "i"));
    return match ? Number(match[1]) : 0;
  });
  return standard[0].toUpperCase() + standard.slice(1).toLowerCase() + " " + (Math.max(0, ...numbers) + 1);
}

export function normalizeChordIndex(chords, requested, textLength, excludeIndex = -1) {
  const max = Math.max(0, Number(textLength) || 0);
  const occupied = new Set(asArray(chords)
    .filter((_, index) => index !== excludeIndex)
    .map(chord => Number(chord.charIndex) || 0));
  const target = Math.max(0, Math.min(max, Number(requested) || 0));
  if (!occupied.has(target)) return target;
  for (let distance = 1; distance <= max; distance += 1) {
    if (target - distance >= 0 && !occupied.has(target - distance)) return target - distance;
    if (target + distance <= max && !occupied.has(target + distance)) return target + distance;
  }
  return -1;
}
