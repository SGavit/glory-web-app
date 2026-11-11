const asArray=value=>Array.isArray(value)?value:value&&typeof value==="object"?Object.values(value):[];
const cleanText=value=>String(value||"").replace(/\{[^}]+\}/g,"").replace(/\r\n?/g,"\n");

/** Return UTF-16 offsets at grapheme boundaries, matching Android String offsets. */
export function graphemeBoundaries(text){
 const value=String(text||""),boundaries=[0];
 if(typeof Intl!=="undefined"&&Intl.Segmenter){
  const segmenter=new Intl.Segmenter(undefined,{granularity:"grapheme"});
  for(const part of segmenter.segment(value)){const end=part.index+part.segment.length;if(end>boundaries[boundaries.length-1])boundaries.push(end);}
 }else{
  let offset=0;
  for(const point of value){offset+=point.length;boundaries.push(offset);}
 }
 return boundaries;
}
export function snapUtf16Offset(text,offset,direction="nearest"){
 const value=String(text||""),target=Math.max(0,Math.min(value.length,Number(offset)||0)),bounds=graphemeBoundaries(value);
 if(bounds.includes(target))return target;
 const after=bounds.find(x=>x>target)??value.length,before=[...bounds].reverse().find(x=>x<target)??0;
 return direction==="forward"?after:direction==="backward"?before:(target-before<=after-target?before:after);
}
export function wordStartAtUtf16Offset(text,offset){
 const value=String(text||""),safe=snapUtf16Offset(value,offset,"backward"),prefix=value.slice(0,safe);
 const match=prefix.match(/[\p{L}\p{N}\p{M}_]*$/u);
 return snapUtf16Offset(value,match?prefix.length-match[0].length:safe,"backward");
}
/** Map existing chord anchors through one contiguous text edit. */
export function remapChordsAfterTextEdit(oldText,newText,chords=[]){
 const before=String(oldText||""),after=String(newText||"");
 let prefix=0;
 while(prefix<before.length&&prefix<after.length&&before[prefix]===after[prefix])prefix++;
 prefix=snapUtf16Offset(before,prefix,"backward");
 let suffix=0;
 while(suffix<before.length-prefix&&suffix<after.length-prefix&&before[before.length-1-suffix]===after[after.length-1-suffix])suffix++;
 const oldTail=before.length-suffix,newTail=after.length-suffix,delta=newTail-oldTail;
 let changedAnchors=0;
 const mapped=asArray(chords).map(ch=>{
  const original=Math.max(0,Math.min(before.length,Number(ch.charIndex)||0));
  let next=original;
  if(original>=oldTail)next=original+delta;
  else if(original>=prefix){next=prefix;changedAnchors++;}
  next=snapUtf16Offset(after,Math.max(0,Math.min(after.length,next)),"backward");
  if(after.length&&next===after.length)next=snapUtf16Offset(after,after.length-1,"backward");
  return{...ch,charIndex:next};
 }).sort((a,b)=>a.charIndex-b.charIndex);
 return{chords:mapped,changedAnchors};
}
export function detectSectionsFromLyrics(input){
 const source=cleanText(input).trim();if(!source)return[];const lines=source.split("\n"),explicit=lines.some(x=>/^\s*\[[^\]]+\]\s*$/.test(x));
 if(explicit){const out=[];let current=null;const finish=()=>{if(current&&current.lines.length)out.push(current);};lines.forEach(raw=>{const m=raw.match(/^\s*\[([^\]]+)\]\s*$/);if(m){finish();const title=m[1].trim();current={type:title.toUpperCase().split(/\s+/)[0],title,lines:[]};}else if(current&&raw.trim())current.lines.push({text:raw.trimEnd(),chords:[]});});finish();return out;}
 return source.split(/\n\s*\n+/).map(b=>b.split("\n").map(x=>x.trimEnd()).filter(x=>x.trim())).filter(b=>b.length).map((b,i)=>({type:"VERSE",title:"Verse "+(i+1),lines:b.map(text=>({text,chords:[]}))}));
}
export function nextSectionTitle(type,sections){const t=String(type||"Verse").trim();if(!/^(verse|chorus)$/i.test(t))return t;const nums=asArray(sections).map(s=>{const m=String(s.title||"").match(new RegExp("^"+t+"\\s+(\\d+)$","i"));return m?Number(m[1]):0;});return t[0].toUpperCase()+t.slice(1).toLowerCase()+" "+(Math.max(0,...nums)+1);}
export function normalizeChordIndex(chords,requested,length,exclude=-1){
 const size=Math.max(0,Number(length)||0),used=new Set(asArray(chords).filter((_,i)=>i!==exclude).map(c=>Number(c.charIndex)||0));
 const target=Math.max(0,Math.min(Math.max(0,size-1),Number(requested)||0));
 if(!used.has(target))return target;
 for(let d=1;d<=size;d++){if(target-d>=0&&!used.has(target-d))return target-d;if(target+d<size&&!used.has(target+d))return target+d;}
 return -1;
}
export function normalizeSections(sections){return asArray(sections).map(s=>({type:String(s.type||s.title||"VERSE").toUpperCase().split(/\s+/)[0],...(s.sectionNo==null?{}:{sectionNo:Number(s.sectionNo)}),title:String(s.title||s.type||"Verse"),lines:asArray(s.lines).map(l=>{const text=String(l.text||"");return{text,chords:asArray(l.chords).map(c=>({chordName:String(c.chordName||"").trim().replace("♯","#").replace("♭","b"),charIndex:snapUtf16Offset(text,Math.max(0,Math.min(Math.max(0,text.length-1),Number(c.charIndex)||0)),"backward")})).filter(c=>c.chordName).sort((x,y)=>x.charIndex-y.charIndex)};})}));}
