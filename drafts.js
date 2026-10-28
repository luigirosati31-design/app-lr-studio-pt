import {clone,makeDraft} from './core.js?v=20261028.4';

// Le credenziali restano nella sessione; qui conserviamo solo bozze dell'account.
export function readDraft(key){
 const copies=[];
 for(const storage of ['localStorage','sessionStorage']){try{const raw=globalThis[storage].getItem(key);if(raw){try{copies.push({value:JSON.parse(raw)});}catch{copies.push({value:{damagedRaw:raw}});}}}catch{}}
 if(!copies.length)return null;
 copies.sort((a,b)=>(b.value.updatedAt||0)-(a.value.updatedAt||0));
 const chosen=copies.find(c=>!c.value.damagedRaw)||copies[0];
 return {...chosen.value,damagedCopies:copies.filter(c=>c!==chosen&&c.value.damagedRaw).map(c=>c.value.damagedRaw)};
}
export function writeDraft(key,value){
 const raw=JSON.stringify({...value,updatedAt:Date.now()});
 try{localStorage.setItem(key,raw);}catch{sessionStorage.setItem(key,raw);return false;}
 sessionStorage.removeItem(key);
 return true;
}
export function removeDraft(key){localStorage.removeItem(key);sessionStorage.removeItem(key);}
export function hasLog(log){return !!(log?.note?.trim()||log?.serie?.some(s=>s.check||String(s.kg??'').trim()||String(s.rip??'').trim()));}
const name=value=>String(value||'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
const target=value=>name(value).replace(/×/g,'x').replace(/\s+/g,'');
export function prescription(program){return JSON.stringify(program.map(day=>({...day,esercizi:day.esercizi.map(({storico,ultimo_peso,...ex})=>ex)})));}
export function cachedProgram(snapshot){
 if(snapshot.program)return snapshot.program;
 const source=(snapshot.source||[]).map(value=>typeof value==='string'?JSON.parse(value):value);
 if(source.length===1&&source[0][0]?.esercizi)return source[0];
 return source.map((esercizi,i)=>({titolo:snapshot.titles?.[i]||'Bozza giorno '+(i+1),esercizi}));
}
function uniqueIndex(items,predicate){const found=items.flatMap((item,index)=>predicate(item)?[index]:[]);return found.length===1?found[0]:-1;}
function daySignature(day){return JSON.stringify((day.esercizi||[]).map(ex=>[name(ex.nome),target(ex.target)]));}
export function recoveryTarget(program,item){
 const d=uniqueIndex(program,day=>name(day.titolo)===name(item.targetDay||item.day));
 if(d<0)return null;
 const e=uniqueIndex(program[d].esercizi,ex=>name(ex.nome)===name(item.exercise));
 return e<0?null:{day:d,exercise:e};
}
export function recoverDraft(oldProgram,oldDraft,program){
 const draft=makeDraft(program),items=[];let recovered=0;
 for(const [d,oldDay] of oldProgram.entries()){
  let nextDay=uniqueIndex(program,day=>name(day.titolo)===name(oldDay.titolo));
  if(oldProgram.filter(day=>name(day.titolo)===name(oldDay.titolo)).length!==1)nextDay=-1;
  if(nextDay<0)nextDay=uniqueIndex(program,day=>daySignature(day)===daySignature(oldDay));
  for(const [e,ex] of oldDay.esercizi.entries()){
   const log=oldDraft?.[d]?.[e];if(!hasLog(log))continue;
   const nextEx=nextDay<0?-1:uniqueIndex(program[nextDay].esercizi,value=>name(value.nome)===name(ex.nome));
   const ambiguous=oldDay.esercizi.filter(value=>name(value.nome)===name(ex.nome)).length!==1;
   if(nextEx>=0&&!ambiguous&&target(program[nextDay].esercizi[nextEx].target)===target(ex.target)){
    draft[nextDay][nextEx]={...clone(log),sessionId:log.sessionId||draft[nextDay][nextEx].sessionId};recovered++;
   }else items.push({day:oldDay.titolo,targetDay:nextDay>=0?program[nextDay].titolo:null,exercise:ex.nome,target:ex.target,log:clone(log),reason:nextEx>=0&&!ambiguous?'Target modificato dal coach':'Esercizio spostato, rimosso o non identificabile con certezza'});
  }
 }
 return {draft,items,recovered};
}
export function downloadDraft(value,filename='LR-Studio-bozza.json'){
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
