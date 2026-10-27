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
  const raw=String(target).toLowerCase().replace('×','x');
  if (/set|round|giro/.test(raw)) return {count:1,reps:'-',weightOnly:true};
  const parts=raw.split('x');
  return {count:Math.min(30,Math.max(1,parseInt(parts[0])||3)),reps:parts[1]?.trim()||'',weightOnly:false};
}
export function makeDraft(program) {
  return program.map(day => {const sessionId=crypto.randomUUID();return day.esercizi.map(ex => ({sessionId,note:'',serie:Array.from({length:targetInfo(ex.target).count},()=>({kg:'',rip:'',check:false}))}));});
}
export function recordDay(program, draft, dayIndex, date) {
  const result=clone(program);
  const sessionId=draft[dayIndex].find(log=>log.sessionId)?.sessionId||crypto.randomUUID();
  result[dayIndex].esercizi.forEach((ex,i)=>{
    const log=draft[dayIndex][i];
    log.sessionId ||= sessionId;
    const serie=log.serie.filter(s=>s.check).map(({kg,rip})=>({kg,rip}));
    if (!serie.length) return;
    ex.storico=Array.isArray(ex.storico)?ex.storico:[];
    const index=ex.storico.findIndex(s=>s.session_id===log.sessionId);
    const previous=index>=0?ex.storico[index]:null;
    const rec={...previous,data:previous?.data||date,serie,note:log.note,session_id:log.sessionId,saved_at:previous?.saved_at||new Date().toISOString()};
    if(index<0) ex.storico.push(rec); else ex.storico[index]=rec;
    ex.ultimo_peso=ex.storico.at(-1)?.serie?.filter(s=>s.kg).at(-1)?.kg||ex.ultimo_peso||'';
  });
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

