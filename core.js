export const clone = value => structuredClone(value);
export function parse(value) { return typeof value === 'string' ? JSON.parse(value) : clone(value); }
export function normalize(rows) {
  if (!rows.length) return [];
  if (rows.length === 1) {
    const data = parse(rows[0].dati_scheda || '[]');
    if (!Array.isArray(data)) throw Error('Formato scheda non valido');
    if (rows[0].titolo_sessione === 'PROGRAMMA_COMPLETO' || data[0]?.esercizi) return data;
  }
  return rows.map(r => ({titolo:r.titolo_sessione || 'Allenamento',esercizi:parse(r.dati_scheda || '[]')}));
}
export function targetInfo(target='3x10') {
  const raw=String(target).toLowerCase().replaceAll('×','x').trim();
  const circuit=raw.match(/^(\d+)\s*(?:sets?|giri?|giro)\s*(?:x\s*(\d+))?\s*$/);
  if(circuit){const rounds=Number(circuit[1]),blocks=Number(circuit[2]||1);return {count:Math.min(30,rounds*blocks),rounds,blocks,circuit:true,reps:'',weightOnly:true};}
  const sets=raw.match(/^(\d+)\s*(?:x|set\b|sets\b|round\b|rounds\b|gir[oi]\b)/);
  if(sets)return {count:Math.min(30,Math.max(1,Number(sets[1]))),reps:raw.replace(/^\d+\s*x\s*/,''),weightOnly:!/^\d+\s*x/.test(raw)};
  // A duration is one task, not thirty sets; keep its text visible.
  if(/^\d+(?:[.,]\d+)?\s*(?:s|sec|secondi|min|minuti)\b/.test(raw))return {count:1,reps:raw,weightOnly:true};
  return {count:1,reps:raw,weightOnly:true};
}
export function targetLabel(value){const t=targetInfo(value);return t.circuit?`${t.rounds} ${t.rounds===1?'giro':'giri'} senza pausa · ${t.blocks} ${t.blocks===1?'blocco':'blocchi'}`:value;}
export function shouldRest(plan,draft,day,index,setIndex){
 const ex=plan[day].esercizi[index],info=targetInfo(ex.target);
 if(!info.circuit)return true;
 const block=Math.floor(setIndex/info.rounds);
 if(block>=info.blocks-1)return false;
 const members=plan[day].esercizi.map((e,i)=>({e,i,t:targetInfo(e.target)})).filter(({e,i})=>ex.circuit_id?e.circuit_id===ex.circuit_id:i===index);
 return members.every(({i,t})=>t.circuit&&t.blocks===info.blocks&&Array.from({length:t.rounds},(_,r)=>draft[day][i]?.serie[block*t.rounds+r]?.check).every(Boolean));
}
export function validCircuits(plan){return plan.every(day=>{
 const codes=new Set(day.esercizi.map(e=>e.circuit_id).filter(Boolean));
 return [...codes].every(code=>{const members=day.esercizi.filter(e=>e.circuit_id===code).map(e=>targetInfo(e.target));return members.every(t=>t.circuit&&t.blocks===members[0].blocks);});
});}
export function validTarget(target){const info=targetInfo(target);if(info.circuit&&(!info.rounds||!info.blocks||info.rounds*info.blocks>30))return false;return /^(?:[1-9]\d?\s*(?:x|×|sets?\b|rounds?\b|gir[oi]\b)|\d+(?:[.,]\d+)?\s*(?:s|sec|secondi|min|minuti)\b)/i.test(String(target||'').trim());}
export function makeDraft(program) {
  return program.map(day => {const sessionId=crypto.randomUUID();return day.esercizi.map(ex => ({sessionId,note:'',serie:Array.from({length:targetInfo(ex.target).count},()=>({kg:'',rip:'',check:false}))}));});
}
const exerciseName=value=>String(value||'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
export function exerciseHistory(ex){return (Array.isArray(ex.storico)?ex.storico:[]).filter(record=>!record.exercise_name||exerciseName(record.exercise_name)===exerciseName(ex.nome));}
export function renameExercise(ex,nextName,previousName=ex.nome){
 const same=exerciseName(nextName)===exerciseName(previousName),oldWeight=ex.ultimo_peso;
 if(exerciseName(nextName)!==exerciseName(previousName)){
  for(const record of Array.isArray(ex.storico)?ex.storico:[])record.exercise_name ||= previousName;
  if(ex.ultimo_peso){ex.previous_weights ||= [];if(!ex.previous_weights.some(item=>exerciseName(item.nome)===exerciseName(previousName)))ex.previous_weights.push({nome:previousName,peso:ex.ultimo_peso});}
 }
 ex.nome=nextName;
 ex.ultimo_peso=exerciseHistory(ex).at(-1)?.serie?.filter(s=>s.kg).at(-1)?.kg||ex.previous_weights?.find(item=>exerciseName(item.nome)===exerciseName(nextName))?.peso||(same?oldWeight:'')||'';
}
export function validateSet(set,info){
 const kg=String(set.kg??'').trim(),rip=String(set.rip??'').trim();
 if(kg&&(!/^\d+([.,]\d+)?$/.test(kg)||!Number.isFinite(Number(kg.replace(',','.')))))return {field:'kg',message:'Inserisci un carico valido, uguale o maggiore di zero.'};
 if(!info.weightOnly&&!/^[1-9]\d*$/.test(rip))return {field:'rip',message:'Inserisci ripetizioni intere maggiori di zero.'};
 return null;
}
export function remainingDraft(program,draft,day){
 const result=clone(draft),fresh=makeDraft(program)[day];
 result[day]=draft[day].map((log,i)=>({...clone(log),sessionId:fresh[i].sessionId,note:log.serie.some(s=>s.check)?'':log.note,serie:log.serie.map(s=>s.check?{kg:'',rip:'',check:false}:clone(s))}));
 return result;
}
export function recordDay(program, draft, dayIndex, date) {
  const result=clone(program);
  const sessionId=draft[dayIndex].find(log=>log.sessionId)?.sessionId||crypto.randomUUID();
  result[dayIndex].esercizi.forEach((ex,i)=>{
    const log=draft[dayIndex][i];
    log.sessionId ||= sessionId;
    const serie=log.serie.filter(s=>s.check).map(s=>{s.set_id ||= crypto.randomUUID();return {kg:s.kg,rip:s.rip,set_id:s.set_id};});
    if (!serie.length) return;
    ex.storico=Array.isArray(ex.storico)?ex.storico:[];
    const index=ex.storico.findIndex(s=>s.session_id===log.sessionId&&(!s.exercise_name||exerciseName(s.exercise_name)===exerciseName(ex.nome)));
    const previous=index>=0?ex.storico[index]:null;
    // A lost response may leave this session committed. Unchecking a set must
    // never remove that committed set when another part of the draft is retried.
    const combined=clone(previous?.serie||[]);
    for(const s of serie){let at=combined.findIndex(old=>old.set_id===s.set_id);if(at<0)at=combined.findIndex(old=>!old.set_id&&old.kg===s.kg&&old.rip===s.rip);if(at<0)combined.push(s);else combined[at]=s;}
    const rec={...previous,data:previous?.data||date,serie:combined,note:log.note||previous?.note||'',exercise_name:ex.nome,session_id:log.sessionId,saved_at:previous?.saved_at||new Date().toISOString()};
    if(index<0) ex.storico.push(rec); else ex.storico[index]=rec;
    ex.ultimo_peso=exerciseHistory(ex).at(-1)?.serie?.filter(s=>s.kg).at(-1)?.kg||ex.ultimo_peso||'';
  });
  return result;
}
// Preserve history independently of edits/removals in the active prescription.
// Archived records remain in storico (supported by the current database guard).
export function preserveHistory(next,previous){
 const result=clone(next),destinations=result.flatMap(d=>d.esercizi||[]);
 const records=previous.flatMap(d=>(d.esercizi||[]).flatMap(ex=>(ex.storico||[]).map(r=>({...clone(r),exercise_name:r.exercise_name||ex.nome}))));
 if(records.length&&!destinations.length)throw Error('Mantieni almeno un esercizio per conservare lo storico.');
 const used=new Set();
 for(const record of records){
  let existing;
  for(const ex of destinations)for(const [index,r] of (ex.storico||[]).entries()){
   const key=destinations.indexOf(ex)+':'+index;
   const same=record.session_id?r.session_id===record.session_id&&exerciseName(r.exercise_name||ex.nome)===exerciseName(record.exercise_name):JSON.stringify({...r,exercise_name:r.exercise_name||ex.nome})===JSON.stringify(record);
   if(same&&!used.has(key)){existing={ex,index,key};break;}
  }
  if(existing){existing.ex.storico[existing.index]=record;used.add(existing.key);continue;}
  const sourceDay=previous.find(d=>d.esercizi?.some(ex=>(ex.storico||[]).some(r=>JSON.stringify({...r,exercise_name:r.exercise_name||ex.nome})===JSON.stringify(record))));
  const matching=result.filter(d=>d.titolo===sourceDay?.titolo).flatMap(d=>d.esercizi||[]).filter(ex=>exerciseName(ex.nome)===exerciseName(record.exercise_name));
  const dest=matching.length===1?matching[0]:destinations[0];
  dest.storico ||= [];
  used.add(destinations.indexOf(dest)+':'+dest.storico.length);dest.storico.push(record);
 }
 for(const ex of destinations)ex.ultimo_peso=exerciseHistory(ex).at(-1)?.serie?.filter(s=>s.kg).at(-1)?.kg||ex.ultimo_peso||'';
 return result;
}
export function payloads(rows,program) {
  if(rows.length===1 && (rows[0].titolo_sessione==='PROGRAMMA_COMPLETO'||parse(rows[0].dati_scheda)[0]?.esercizi)) return [{id:rows[0].id,old:rows[0].dati_scheda,value:JSON.stringify(program)}];
  if(rows.length!==program.length) throw Error('Scheda modificata: ricarica prima di salvare');
  return rows.map((r,i)=>({id:r.id,old:r.dati_scheda,value:JSON.stringify(program[i].esercizi)}));
}
export function safeURL(value,media=false) {
  if(!value) return '';
  try { const url=new URL(value,location.href); if(url.protocol!=='https:' && !(media && url.origin===location.origin && /^(http:|file:)$/.test(url.protocol))) return ''; return url.href; } catch {return '';}
}
export const demoProgram=[
 {titolo:'A · Parte alta',esercizi:[{nome:'Panca piana con bilanciere',target:'3x8',recupero:90,note_coach:'Scapole stabili. Controlla la discesa, espira nella spinta.',ultimo_peso:'40',gifs:['esercizi/petto/pancapiana.gif'],storico:[{data:'22/10/2026',serie:[{kg:'40',rip:'8'},{kg:'40',rip:'8'},{kg:'40',rip:'7'}]}]},{nome:'Rematore con manubrio a un braccio',target:'3x10',recupero:75,note_coach:'Mantieni il busto fermo e porta il gomito verso il fianco.',gifs:['esercizi/schiena/rematore1arm.gif'],ultimo_peso:'18',storico:[]},{nome:'Arnold press',gifs:['esercizi/spalle/arnold_press.gif'],target:'3x10',recupero:90,note_coach:'Ruota i polsi durante la spinta e mantieni il busto stabile.',storico:[]}]},
 {titolo:'B · Gambe e addome',esercizi:[{nome:'Squat con bilanciere',target:'3x8',recupero:120,note_coach:'Piedi stabili. Scendi in controllo e risali mantenendo il busto compatto.',gifs:['esercizi/gambe/squat_bil.gif'],storico:[]},{nome:'Affondi sul posto con manubri',target:'3x10',recupero:75,note_coach:'Fai un passo comodo e mantieni il ginocchio in linea con il piede.',gifs:['esercizi/gambe/affondisulposto.gif'],storico:[]},{nome:'Sollevamento gambe alla sbarra',target:'3x12',recupero:60,note_coach:'Evita di oscillare. Solleva le gambe con l’addome, poi scendi lentamente.',gifs:['esercizi/addome/leg_raise_sbarra.gif'],storico:[]}]}
];

