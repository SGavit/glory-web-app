import React, { useEffect, useMemo, useRef, useState } from "react";
import { lyricsFromSections, parseLyrics } from "./songData";
import { detectSectionsFromLyrics, nextSectionTitle, normalizeChordIndex } from "./songEditorModel";

const ROOTS_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const ROOTS_FLAT = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
const QUALITY = [
  ["Major", [""]], ["Minor", ["m"]], ["7th", ["7"]], ["m7", ["m7"]],
  ["Maj7", ["maj7"]], ["Sus", ["sus2","sus4"]], ["Dim/Aug", ["dim","dim7","aug"]],
  ["9th/13th", ["9","add9","11","13"]]
];
const normalizeChord = value => String(value || "").trim().replace(/♯/g,"#").replace(/♭/g,"b");

export default function SongEditorWorkspace({ value = "", onChange }) {
  const [sections, setSections] = useState(() => parseLyrics(value));
  const [selected, setSelected] = useState("G");
  const [quality, setQuality] = useState("Major");
  const [flats, setFlats] = useState(false);
  const [locked, setLocked] = useState(false);
  const [preview, setPreview] = useState(false);
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState(() => [parseLyrics(value)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [detectText, setDetectText] = useState("");
  const [showDetect, setShowDetect] = useState(false);
  const [notice, setNotice] = useState("");
  const dragRef = useRef(null);
  const lastPublishedRef = useRef(value);
  const roots = flats ? ROOTS_FLAT : ROOTS_SHARP;
  const palette = useMemo(() => {
    const suffixes = QUALITY.find(item => item[0] === quality)?.[1] || [""];
    return roots.flatMap(item => suffixes.map(suffix => item + suffix));
  }, [roots, quality]);
  const chordName = normalizeChord(selected);

  useEffect(() => {
    if (value === lastPublishedRef.current) return;
    lastPublishedRef.current = value;
    const parsed = parseLyrics(value);
    setSections(parsed);
    setHistory([parsed]);
    setHistoryIndex(0);
  }, [value]);

  const publish = next => {
    const serialized = lyricsFromSections(next);
    lastPublishedRef.current = serialized;
    setSections(next);
    onChange?.(serialized);
  };
  const commit = next => {
    if (locked) return;
    const updated = [...history.slice(0, historyIndex + 1), next].slice(-50);
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
    publish(next);
    setNotice("");
  };
  const undo = () => {
    if (locked || historyIndex <= 0) return;
    const index = historyIndex - 1;
    setHistoryIndex(index);
    publish(history[index]);
  };
  const redo = () => {
    if (locked || historyIndex >= history.length - 1) return;
    const index = historyIndex + 1;
    setHistoryIndex(index);
    publish(history[index]);
  };
  const updateSection = (sectionIndex, nextSection) => {
    const next = sections.map((section, index) => index === sectionIndex ? nextSection : section);
    commit(next);
  };
  const updateLine = (sectionIndex, lineIndex, nextLine) => {
    const section = sections[sectionIndex];
    if (!section) return;
    updateSection(sectionIndex, {
      ...section,
      lines: section.lines.map((line, index) => index === lineIndex ? nextLine : line)
    });
  };
  const addSection = type => {
    if (locked) return;
    const title = nextSectionTitle(type, sections);
    commit([...sections, { type: title.toUpperCase().split(/\s+/)[0], title, lines: [{ text: "", chords: [] }] }]);
  };
  const addLine = sectionIndex => {
    const section = sections[sectionIndex];
    if (section) updateSection(sectionIndex, { ...section, lines: [...section.lines, { text: "", chords: [] }] });
  };
  const duplicateSection = index => {
    const source = sections[index];
    if (!source || locked) return;
    const copy = { ...source, title: source.title + " (copy)", lines: source.lines.map(line => ({ ...line, chords: line.chords.map(chord => ({ ...chord })) })) };
    const next = [...sections];
    next.splice(index + 1, 0, copy);
    commit(next);
  };
  const moveSection = (index, delta) => {
    const target = index + delta;
    if (locked || target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };
  const deleteSection = index => {
    if (locked || !window.confirm("Delete this section and its chords?")) return;
    commit(sections.filter((_, current) => current !== index));
  };
  const placeChord = (sectionIndex, lineIndex, charIndex) => {
    if (locked || !selected) return;
    const line = sections[sectionIndex]?.lines[lineIndex];
    if (!line) return;
    const index = normalizeChordIndex(line.chords, charIndex, line.text.length);
    if (index < 0) { setNotice("No free character position remains on this line."); return; }
    updateLine(sectionIndex, lineIndex, { ...line, chords: [...line.chords, { chordName, charIndex: index }].sort((a,b) => a.charIndex - b.charIndex) });
  };
  const moveChord = (from, to, charIndex) => {
    if (locked) return;
    const source = sections[from.section]?.lines[from.line];
    const target = sections[to.section]?.lines[to.line];
    if (!source || !target) return;
    const chord = source.chords[from.chord];
    if (!chord) return;
    const sourceLines = sections.map(section => ({ ...section, lines: section.lines.map(line => ({ ...line, chords: line.chords.map(item => ({ ...item })) })) }));
    sourceLines[from.section].lines[from.line].chords.splice(from.chord, 1);
    const targetLine = sourceLines[to.section].lines[to.line];
    const index = normalizeChordIndex(targetLine.chords, charIndex, targetLine.text.length);
    if (index < 0) { setNotice("No free character position remains on the target line."); return; }
    targetLine.chords.push({ ...chord, charIndex: index });
    targetLine.chords.sort((a,b) => a.charIndex - b.charIndex);
    commit(sourceLines);
  };
  const editChord = (sectionIndex, lineIndex, chordIndex, name) => {
    const line = sections[sectionIndex]?.lines[lineIndex];
    if (!line || !name.trim()) return;
    updateLine(sectionIndex, lineIndex, { ...line, chords: line.chords.map((chord,index) => index === chordIndex ? { ...chord, chordName: normalizeChord(name) } : chord) });
  };
  const deleteChord = (sectionIndex, lineIndex, chordIndex) => {
    const line = sections[sectionIndex]?.lines[lineIndex];
    if (line) updateLine(sectionIndex, lineIndex, { ...line, chords: line.chords.filter((_,index) => index !== chordIndex) });
  };
  const clearChords = () => {
    if (locked || !sections.some(section => section.lines.some(line => line.chords.length))) return;
    if (window.confirm("Remove all chords from this song?")) commit(sections.map(section => ({ ...section, lines: section.lines.map(line => ({ ...line, chords: [] })) })));
  };
  const runDetection = () => {
    const detected = detectSectionsFromLyrics(detectText);
    if (!detected.length) { setNotice("No lyrics found. Add [Verse 1] headings or separate sections with blank lines."); return; }
    const oldByText = new Map();
    sections.forEach(section => section.lines.forEach(line => {
      const key = line.text.trim().toLocaleLowerCase();
      if (key && !oldByText.has(key)) oldByText.set(key, line);
    }));
    const preserved = detected.map(section => ({
      ...section,
      lines: section.lines.map(line => {
        const old = oldByText.get(line.text.trim().toLocaleLowerCase());
        return old ? { ...line, chords: old.chords.map(chord => ({ ...chord })) } : line;
      })
    }));
    commit(preserved);
    setShowDetect(false);
    setNotice("Sections detected. Review the section cards before saving.");
  };
  const beginEdit = (sectionIndex,lineIndex,chordIndex,chord) => setEditing({sectionIndex,lineIndex,chordIndex,name:chord.chordName});

  return <div className="android-song-workspace">
    <div className="android-section-toolbar">
      <div className="android-section-add">{["Verse","Chorus","Bridge","Intro","Outro","Pre-Chorus","Tag"].map(type => <button type="button" key={type} disabled={locked} onClick={() => addSection(type)}>＋ {type}</button>)}</div>
      <button type="button" className="android-detect-button" onClick={() => { setDetectText(value.replace(/\{[^}]+\}/g,"")); setShowDetect(true); }}>✦ Auto-detect from lyrics</button>
    </div>
    {showDetect && <div className="android-detect-panel"><label>Paste or edit the complete lyrics<textarea rows="7" value={detectText} onChange={event => setDetectText(event.target.value)} placeholder={"[Verse 1]\nLyrics…\n\n[Chorus]\nLyrics…"}/></label><div><button type="button" onClick={runDetection}>Detect sections</button><button type="button" className="quiet" onClick={() => setShowDetect(false)}>Cancel</button></div></div>}
    <div className="android-chord-toolbar">
      <div className="android-chord-actions">
        <button type="button" disabled={locked || historyIndex===0} onClick={undo}>↶ Undo</button>
        <button type="button" disabled={locked || historyIndex===history.length-1} onClick={redo}>↷ Redo</button>
        <button type="button" onClick={() => setLocked(current => !current)}>{locked ? "🔒 Unlock" : "🔓 Lock"}</button>
        <button type="button" onClick={() => setFlats(current => !current)}>{flats ? "Use sharps" : "Use flats"}</button>
        <button type="button" onClick={() => setPreview(current => !current)}>{preview ? "Edit workspace" : "Preview"}</button>
        <button type="button" className="danger" disabled={locked} onClick={clearChords}>Clear chords</button>
      </div>
      <div className="android-chord-palette">
        <label>Quality<select value={quality} onChange={event => setQuality(event.target.value)}>{QUALITY.map(([name]) => <option key={name}>{name}</option>)}</select></label>
        <div className="android-chord-roots">{palette.map(name => <button type="button" key={name} className={selected===name?"selected":""} onClick={() => setSelected(name)}>{name}</button>)}</div>
      </div>
      <p className="android-selected-chord">Selected chord: <b>{selected || "Choose a chord"}</b></p>
    </div>
    {notice && <p className="android-editor-notice">{notice}</p>}
    {!sections.length && <div className="android-empty-sections">Add a section or use Auto-detect to organize your lyrics.</div>}
    {!preview && <div className="android-section-list">{sections.map((section,sectionIndex) => <section className="android-section-card" key={sectionIndex}>
      <header><input aria-label="Section title" value={section.title} disabled={locked} onChange={event => updateSection(sectionIndex,{...section,title:event.target.value,type:event.target.value.toUpperCase().split(/\s+/)[0]})}/><div className="android-section-actions"><button type="button" disabled={locked||sectionIndex===0} onClick={() => moveSection(sectionIndex,-1)} title="Move up">↑</button><button type="button" disabled={locked||sectionIndex===sections.length-1} onClick={() => moveSection(sectionIndex,1)} title="Move down">↓</button><button type="button" disabled={locked} onClick={() => duplicateSection(sectionIndex)} title="Duplicate">⧉</button><button type="button" disabled={locked} onClick={() => deleteSection(sectionIndex)} title="Delete">×</button></div></header>
      {section.lines.map((line,lineIndex) => <div className="android-chord-line" key={lineIndex}>
        <div className="android-chord-label-track" style={{minHeight:line.chords.length?25:5}}>
          {line.chords.map((chord,chordIndex) => <button type="button" draggable={!locked} key={chordIndex} className="android-chord-chip" style={{left:(chord.charIndex*0.6)+"em"}} onContextMenu={event => {event.preventDefault();beginEdit(sectionIndex,lineIndex,chordIndex,chord);}} onClick={() => beginEdit(sectionIndex,lineIndex,chordIndex,chord)} onDragStart={event => {dragRef.current={section:sectionIndex,line:lineIndex,chord:chordIndex};event.dataTransfer.effectAllowed="move";}}>{chord.chordName}</button>)}
        </div>
        <textarea rows="1" className="android-chord-lyric" value={line.text} disabled={locked} onChange={event => {const text=event.target.value;updateLine(sectionIndex,lineIndex,{...line,text,chords:line.chords.map(chord=>({...chord,charIndex:Math.min(chord.charIndex,text.length)}))});}} onClick={event => placeChord(sectionIndex,lineIndex,event.currentTarget.selectionStart)} onDragOver={event => event.preventDefault()} onDrop={event => {event.preventDefault();if(dragRef.current){const rect=event.currentTarget.getBoundingClientRect(),index=Math.round((event.clientX-rect.left)/7.2);moveChord(dragRef.current,{section:sectionIndex,line:lineIndex},index);dragRef.current=null;}}} placeholder="Type lyrics here; choose a chord then tap a character position…"} />
        <div className="android-line-actions"><button type="button" disabled={locked} onClick={() => updateLine(sectionIndex,lineIndex,{...line,text:line.text,chords:line.chords})}>Line {lineIndex+1}</button><button type="button" disabled={locked} onClick={() => {if(window.confirm("Delete this lyric line?"))updateSection(sectionIndex,{...section,lines:section.lines.filter((_,index)=>index!==lineIndex)});}}>Delete line</button></div>
      </div>)}
      <button type="button" className="android-add-line" disabled={locked} onClick={() => addLine(sectionIndex)}>＋ Add lyric line</button>
    </section>)}</div>}
    {preview && <div className="android-song-preview">{sections.map((section,index)=><section key={index}><h4>{section.title}</h4>{section.lines.map((line,lineIndex)=><div className="android-preview-line" key={lineIndex}><div>{line.chords.map((chord,chordIndex)=><span key={chordIndex} style={{left:(chord.charIndex*0.6)+"em"}}>{chord.chordName}</span>)}</div><p>{line.text || " "}</p></div>)}</section>)}</div>}
    {editing && <div className="android-chord-modal-backdrop" role="presentation" onClick={() => setEditing(null)}><form className="android-chord-modal" onSubmit={event => {event.preventDefault();editChord(editing.sectionIndex,editing.lineIndex,editing.chordIndex,editing.name);setEditing(null);}} onClick={event => event.stopPropagation()}><h4>Edit chord</h4><label>Chord name<input autoFocus value={editing.name} onChange={event => setEditing(current=>({...current,name:event.target.value}))}/></label><div><button type="submit">Save</button><button type="button" className="danger" onClick={() => {deleteChord(editing.sectionIndex,editing.lineIndex,editing.chordIndex);setEditing(null);}}>Delete</button><button type="button" className="quiet" onClick={() => setEditing(null)}>Cancel</button></div></form></div>}
  </div>;
}
