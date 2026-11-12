import React,{useEffect,useLayoutEffect,useMemo,useRef,useState}from"react";
import{detectSectionsFromLyrics,clampUtf16Offset,nextSectionTitle,normalizeChordIndex,normalizeSections,remapChordsAfterTextEdit,remapLinesAfterEdit,wordStartAtUtf16Offset}from"./songEditorModel";
const SHARP=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],FLAT=["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"],QUALITY=[["Major",[""]],["Minor",["m"]],["7th",["7"]],["m7",["m7"]],["Maj7",["maj7"]],["Sus",["sus2","sus4"]],["Dim/Aug",["dim","dim7","aug"]],["9th/13th",["9","add9","11","13"]]];
const chordNorm=v=>String(v||"").trim().replace(/♯/g,"#").replace(/♭/g,"b"),clone=v=>normalizeSections(v).map(s=>({...s,lines:s.lines.map(l=>({...l,chords:l.chords.map(c=>({...c}))}))}));
const graphemeSegmenter=typeof Intl!=="undefined"&&Intl.Segmenter?new Intl.Segmenter(undefined,{granularity:"grapheme"}):null;
const graphemeEndAt=(text,start)=>{
 if(start>=text.length)return start;
 if(graphemeSegmenter){for(const part of graphemeSegmenter.segment(text)){if(part.index===start)return start+part.segment.length;if(part.index>start)break;}}
 let end=start+String.fromCodePoint(text.codePointAt(start)).length;
 while(end<text.length){const cp=String.fromCodePoint(text.codePointAt(end));if(!/[\\p{M}\\u200d\\ufe0e\\ufe0f]/u.test(cp))break;end+=cp.length;}
 return end;
};
export default function SongEditorWorkspace({value=[],onChange,activeTab="lyrics"}){
 const[sections,S]=useState(()=>clone(value)),[selected,SS]=useState(null),[movingChord,SMC]=useState(null),[repeatCounts,SRC]=useState({}),[activeRepeatSection,SARS]=useState(null),[quality,SQ]=useState("Major"),[flats,SF]=useState(false),[locked,SL]=useState(false),[preview,SP]=useState(false),[editing,SE]=useState(null),[history,SH]=useState(()=>[clone(value)]),[hi,SI]=useState(0),[raw,SR]=useState(""),[importOpen,SIO]=useState(false),[notice,SN]=useState("");
 const lastPublishedRef=useRef(JSON.stringify(clone(value)));
 const lyricTextRefs=useRef(new Map());
 const [chordOffsets,setChordOffsets]=useState({});
 const registerLyricText=(key,node)=>{if(node)lyricTextRefs.current.set(key,node);else lyricTextRefs.current.delete(key);};
 useLayoutEffect(()=>{
  if(activeTab!=="chords")return;
  let cancelled=false;
  const measure=()=>{
   if(cancelled)return;
   const next={};
   lyricTextRefs.current.forEach((node,lineKey)=>{
    if(!node?.isConnected)return;
    const textNode=node.firstChild,text=String(node.textContent||"");
    if(!textNode||textNode.nodeType!==Node.TEXT_NODE)return;
    const match=lineKey.match(/^(target|preview):(\d+):(\d+)$/);
    if(!match)return;
    const line=sections[Number(match[2])]?.lines[Number(match[3])];
    if(!line)return;
    const lineRect=node.getBoundingClientRect();
    line.chords.forEach((ch,ci)=>{
     const offset=Math.max(0,Math.min(text.length,Number(ch.charIndex)||0));
     // Select the complete grapheme beginning at the stored UTF-16 offset.
     // This lets the browser shape Devanagari conjuncts and vowel marks as a
     // unit, then anchors the chord to that grapheme's actual rendered left edge.
     const end=graphemeEndAt(text,offset);
     const range=document.createRange();
     range.setStart(textNode,offset);
     range.setEnd(textNode,Math.max(offset,end));
     const rects=range.getClientRects();
     const rect=rects.length?rects[0]:range.getBoundingClientRect();
     next[lineKey+":"+ci]=Math.max(0,rect.left-lineRect.left);
    });
   });
   setChordOffsets(next);
  };
  measure();
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(measure):null;
  lyricTextRefs.current.forEach(node=>observer?.observe(node));
  window.addEventListener("resize",measure);
  if(document.fonts?.ready)document.fonts.ready.then(measure);
  return()=>{cancelled=true;observer?.disconnect();window.removeEventListener("resize",measure);};
 },[activeTab,sections,preview]);
 const roots=flats?FLAT:SHARP,palette=useMemo(()=>{const suffix=QUALITY.find(x=>x[0]===quality)?.[1]||[""];return roots.flatMap(r=>suffix.map(s=>r+s));},[roots,quality]),chordName=chordNorm(selected);
 useEffect(()=>{const n=clone(value),serialized=JSON.stringify(n);if(serialized===lastPublishedRef.current)return;lastPublishedRef.current=serialized;S(n);SH([n]);SI(0);},[value]);
 const publish=n=>{const safe=clone(n);lastPublishedRef.current=JSON.stringify(safe);S(safe);onChange?.(safe);},commit=n=>{if(locked)return;const safe=clone(n),h=[...history.slice(0,hi+1),safe].slice(-50);SH(h);SI(h.length-1);publish(safe);SN("");};
 const undo=()=>{if(!locked&&hi>0){const i=hi-1;SI(i);publish(history[i]);}},redo=()=>{if(!locked&&hi<history.length-1){const i=hi+1;SI(i);publish(history[i]);}};
 const updateSection=(si,n)=>commit(sections.map((s,i)=>i===si?n:s)),updateLine=(si,li,n)=>{const s=sections[si];if(s)updateSection(si,{...s,lines:s.lines.map((l,i)=>i===li?n:l)});};
 const addSection=t=>{if(locked)return;const title=nextSectionTitle(t,sections);commit([...sections,{type:title.toUpperCase().split(/\s+/)[0],title,lines:[{text:"",chords:[]}]}]);};
 const removeSection=i=>{if(!locked&&window.confirm("Delete this section and its chords?"))commit(sections.filter((_,x)=>x!==i));};
 const place=(si,li,requested)=>{if(locked||!selected)return;const l=sections[si]?.lines[li];if(!l||!l.text){SN("Enter lyrics before attaching chords.");return;}const word=wordStartAtUtf16Offset(l.text,requested),idx=normalizeChordIndex(l.chords,word,l.text.length);if(idx<0){SN("That word already has a chord. Edit or reposition it.");return;}updateLine(si,li,{...l,chords:[...l.chords,{chordName,charIndex:idx}].sort((a,b)=>a.charIndex-b.charIndex)});SN(chordName+" attached at UTF-16 position "+idx+".");};
 const moveChord=(si,li,ci,delta)=>{if(locked)return;const line=sections[si]?.lines[li],chord=line?.chords[ci];if(!line||!chord)return;const current=clampUtf16Offset(line.text,chord.charIndex),next=clampUtf16Offset(line.text,current+delta);if(next===current)return;if(line.chords.some((item,index)=>index!==ci&&item.charIndex===next)){SN("Another chord is already at that position.");return;}updateLine(si,li,{...line,chords:line.chords.map((item,index)=>index===ci?{...item,charIndex:next}:item)});SN("Moved "+chord.chordName+" to UTF-16 position "+next+".");};
  const moveChordRef=useRef(moveChord);moveChordRef.current=moveChord;
 useEffect(()=>{if(activeTab!=="chords"||!movingChord||locked)return;const handle=e=>{if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;if(e.target instanceof HTMLElement&&(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable))return;e.preventDefault();moveChordRef.current(movingChord.si,movingChord.li,movingChord.ci,e.key==="ArrowLeft"?-1:1);};window.addEventListener("keydown",handle);return()=>window.removeEventListener("keydown",handle);},[activeTab,movingChord,locked,sections]);
 const edit=(si,li,ci,name,index)=>{const l=sections[si]?.lines[li];if(!l||!name.trim())return;const ix=clampUtf16Offset(l.text,index);updateLine(si,li,{...l,chords:l.chords.map((c,i)=>i===ci?{...c,chordName:chordNorm(name),charIndex:ix}:c).sort((a,b)=>a.charIndex-b.charIndex)});},removeChord=(si,li,ci)=>{const l=sections[si]?.lines[li];if(l)updateLine(si,li,{...l,chords:l.chords.filter((_,i)=>i!==ci)});};
 const leftAlignAllSections=()=>{
  if(locked)return;
  const next=sections.map(section=>({...section,lines:section.lines.map(line=>{
   const leading=line.text.match(/^\s+/u)?.[0]||"";
   if(!leading)return line;
   return{...line,text:line.text.slice(leading.length),chords:line.chords.map(ch=>({...ch,charIndex:Math.max(0,(Number(ch.charIndex)||0)-leading.length)}))};
  })}));
  if(JSON.stringify(next)!==JSON.stringify(sections)){
   commit(next);
   SN("Lyrics left-aligned across all sections. Chord positions were adjusted to preserve their word anchors.");
  }else SN("Lyrics are already left-aligned across all sections.");
 };
 const clear=()=>{if(!locked&&sections.some(s=>s.lines.some(l=>l.chords.length))&&window.confirm("Remove all chords?"))commit(sections.map(s=>({...s,lines:s.lines.map(l=>({...l,chords:[]}))})));};
 const organize=()=>{const detected=detectSectionsFromLyrics(raw);if(!detected.length){SN("No lyrics detected. Use [Verse 1] headings or blank-line separation.");return;}const old=new Map();sections.forEach(s=>s.lines.forEach(l=>{const k=l.text.trim().toLowerCase();if(k&&!old.has(k))old.set(k,l);}));const result=detected.map(s=>{const prev=sections.find(x=>x.title.toLowerCase()===s.title.toLowerCase());return{...s,lines:s.lines.map(l=>{const p=prev?.lines.find(x=>x.text.trim()===l.text.trim())||old.get(l.text.trim().toLowerCase());return p?{...l,chords:p.chords.map(c=>({...c}))}:l;})};});commit(result);SIO(false);SN("Lyrics organized. Add chords to individual words.");};
 return <div className="android-song-workspace">
 {activeTab==="lyrics"&&<>
 <div className="android-section-toolbar"><div className="android-section-add">{["Verse","Chorus","Bridge","Intro","Outro","Pre-Chorus","Tag"].map(t=><button type="button" key={t} disabled={locked} onClick={()=>addSection(t)}>＋ {t}</button>)}</div><div className="android-lyrics-tools"><button type="button" className="android-detect-button" disabled={locked} onClick={leftAlignAllSections} title="Remove leading spaces from every lyric line in every section">⇤ Left align all</button><button type="button" className="android-detect-button" disabled={locked} onClick={()=>{SR(sections.map(s=>"[ "+s.title+" ]\n"+s.lines.map(l=>l.text).join("\n")).join("\n\n"));SIO(true);}}>＋ Add / import lyrics</button></div></div>
 {importOpen&&<div className="android-detect-panel"><label>Paste lyrics and optional section headings<textarea rows="8" value={raw} onChange={e=>SR(e.target.value)} placeholder={"[Verse 1]\nLyrics here…\n\n[Chorus]\nLyrics here…"}/></label><div><button type="button" onClick={organize}>Organize lyrics</button><button type="button" className="quiet" onClick={()=>SIO(false)}>Cancel</button></div></div>}
 {!preview&&<div className="android-section-list">{sections.map((s,si)=><section className="android-section-card" key={si}><header><input aria-label="Section title" value={s.title} disabled={locked} onChange={e=>updateSection(si,{...s,title:e.target.value,type:e.target.value.toUpperCase().split(/\s+/)[0]})}/><div className="android-section-actions"><button type="button" className={"android-repeat-stepper"+(activeRepeatSection===si?" is-active":"")} disabled={locked} aria-label="Decrease repeat count" onClick={()=>SRC(x=>({...x,[si]:Math.max(2,(x[si]??2)-1)}))}>−</button><button type="button" className={"android-repeat-value"+(activeRepeatSection===si?" is-active":"")} disabled={locked} aria-label={activeRepeatSection===si?"Click a lyric position to insert repeat count":"Activate repeat counter insertion"} aria-pressed={activeRepeatSection===si} onClick={()=>SARS(x=>x===si?null:si)}>{repeatCounts[si]??2}</button><button type="button" className={"android-repeat-stepper"+(activeRepeatSection===si?" is-active":"")} disabled={locked} aria-label="Increase repeat count" onClick={()=>SRC(x=>({...x,[si]:Math.min(99,(x[si]??2)+1)}))}>+</button><button type="button" disabled={locked||si===0} onClick={()=>{const n=[...sections];[n[si],n[si-1]]=[n[si-1],n[si]];commit(n);}}>↑</button><button type="button" disabled={locked||si===sections.length-1} onClick={()=>{const n=[...sections];[n[si],n[si+1]]=[n[si+1],n[si]];commit(n);}}>↓</button><button type="button" disabled={locked} onClick={()=>{const n=[...sections];n.splice(si+1,0,{...s,title:s.title+" (copy)",lines:s.lines.map(l=>({...l,chords:l.chords.map(c=>({...c}))}))});commit(n);}}>⧉</button><button type="button" disabled={locked} onClick={()=>removeSection(si)}>×</button></div></header>
 <textarea className="android-verse-lyrics" rows={Math.max(4,s.lines.length+1)} value={s.lines.map(l=>l.text).join("\n")} disabled={locked} aria-label={"Lyrics for "+s.title} onClick={e=>{if(activeRepeatSection!==si)return;const source=s.lines.map(line=>line.text).join("\n"),caret=e.currentTarget.selectionStart??source.length,lineStart=source.lastIndexOf("\n",Math.max(0,caret-1))+1,lineIndex=source.slice(0,caret).split("\n").length-1,localOffset=caret-lineStart,line=s.lines[lineIndex];if(!line)return;const marker=" ("+(repeatCounts[si]??2)+")",nextText=line.text.slice(0,localOffset)+marker+line.text.slice(localOffset),mapped=remapChordsAfterTextEdit(line.text,nextText,line.chords);updateSection(si,{...s,lines:s.lines.map((item,index)=>index===lineIndex?{...item,text:nextText,chords:mapped.chords}:item)});SARS(null);if(mapped.changedAnchors)SN("A chord position overlapped the inserted counter and should be reviewed.");}} onChange={e=>{const mapped=remapLinesAfterEdit(s.lines,e.target.value.split("\n"));updateSection(si,{...s,lines:mapped.lines});if(mapped.changedAnchors)SN(mapped.changedAnchors+" chord position(s) need review because their original lyric text was edited.");}} placeholder={activeRepeatSection===si?"Click where you want to insert ("+(repeatCounts[si]??2)+").":"Enter the complete lyrics for this section, one line per row…"} /></section>)}</div>}
 {preview&&<div className="android-song-preview">{sections.map((s,i)=><section key={i}><h4>{s.title}</h4>{s.lines.map((l,j)=><div className="android-preview-line" key={j}><div>{l.chords.map((c,k)=><span key={k} style={{left:(chordOffsets["preview:"+i+":"+j+":"+k]??0)+"px"}}>{c.chordName}</span>)}</div><p><span ref={node=>registerLyricText("preview:"+i+":"+j,node)}>{l.text||" "}</span></p></div>)}</section>)}</div>}

 </>}
 {activeTab==="chords"&&<section className="android-editor-step android-chord-step"><div className="android-chord-toolbar"><div className="android-chord-actions"><button type="button" disabled={locked||hi===0} onClick={undo}>↶ Undo</button><button type="button" disabled={locked||hi===history.length-1} onClick={redo}>↷ Redo</button><button type="button" onClick={()=>SL(x=>!x)}>{locked?"Unlock editing":"Lock editing"}</button><button type="button" onClick={()=>{SF(x=>!x);SS(null);}}>{flats?"Use sharps":"Use flats"}</button><button type="button" onClick={()=>SP(x=>!x)}>{preview?"Edit":"Preview"}</button><button type="button" className="danger" disabled={locked} onClick={clear}>Clear chords</button></div><div className="android-chord-palette"><label>Chord type<select value={quality} onChange={e=>{SQ(e.target.value);SS(null);}}>{QUALITY.map(([n])=><option key={n}>{n}</option>)}</select></label><div className="android-chord-roots">{palette.map(n=><button type="button" key={n} className={selected===n?"selected":""} onClick={()=>SS(n)}>{n}</button>)}</div></div><p className="android-selected-chord">Selected chord: <b>{selected||"None"}</b> <span>Choose a chord, then click a word in the lyric line. Click a chord to select it, then use your keyboard ← / → arrows to move it. Double-click a chord to edit it.</span></p></div>
 {notice&&<p className="android-editor-notice">{notice}</p>}
 <div className="android-chord-targets">{sections.map((s,si)=><section className="android-section-card" key={si}><h5>{s.title}</h5>{s.lines.map((l,li)=><div className="android-chord-target-line" key={li}><div className="android-chord-label-track" style={{minHeight:l.chords.length?25:5}}>{l.chords.map((ch,ci)=><span className="android-chord-positioner" key={ci} style={{left:(chordOffsets["target:"+si+":"+li+":"+ci]??0)+"px"}}><button type="button" title="Click to select · double-click to edit" aria-label={"Edit "+ch.chordName} onClick={()=>SMC({si,li,ci})} onDoubleClick={()=>SE({si,li,ci,name:ch.chordName,charIndex:ch.charIndex})} aria-pressed={movingChord?.si===si&&movingChord?.li===li&&movingChord?.ci===ci} className={"android-chord-chip"+(movingChord?.si===si&&movingChord?.li===li&&movingChord?.ci===ci?" is-moving":"")}>{ch.chordName}</button></span>)}</div><div className="android-lyric-word-line" onClick={e=>{if(locked||!selected)return;let node=null,offset=0;if(document.caretPositionFromPoint){const caret=document.caretPositionFromPoint(e.clientX,e.clientY);node=caret?.offsetNode;offset=caret?.offset||0;}else if(document.caretRangeFromPoint){const caret=document.caretRangeFromPoint(e.clientX,e.clientY);node=caret?.startContainer;offset=caret?.startOffset||0;}if(node?.nodeType===Node.TEXT_NODE)place(si,li,offset);}} title={selected?"Click a word to attach "+selected:"Select a chord, then click a word"}><span ref={node=>registerLyricText("target:"+si+":"+li,node)}>{l.text||"Add lyrics in tab 02…"}</span></div></div>)}</section>)}</div>
 </section>}
 {!sections.length&&activeTab==="lyrics"&&<div className="android-empty-sections">Import lyrics or add a section to begin.</div>}
 {editing&&<div className="android-chord-modal-backdrop" role="presentation" onClick={()=>SE(null)}><form className="android-chord-modal" onSubmit={e=>{e.preventDefault();edit(editing.si,editing.li,editing.ci,editing.name,editing.charIndex);SE(null);}} onClick={e=>e.stopPropagation()}><h4>Edit chord</h4><label>Chord name<input autoFocus value={editing.name} onChange={e=>SE(x=>({...x,name:e.target.value}))}/></label><label>UTF-16 position (0-based)<input type="number" min="0" value={editing.charIndex} onChange={e=>SE(x=>({...x,charIndex:Number(e.target.value)}))}/></label><div><button type="submit">Save chord</button><button type="button" className="danger" onClick={()=>{removeChord(editing.si,editing.li,editing.ci);SE(null);}}>Delete</button><button type="button" className="quiet" onClick={()=>SE(null)}>Cancel</button></div></form></div>}
 </div>;
}