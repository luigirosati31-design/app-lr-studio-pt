import {validTarget} from './core.js?v=20261115.1';
export function parseProgramText(text){
 const days=[],errors=[];let current;
 if(text.length>40000)return {days,errors:['Testo troppo lungo: dividi la scheda in più parti.']};
 for(const [index,raw]of text.split(/\r?\n/).entries()){
  const line=raw.trim().replace(/^[-•]\s+|^\d+[.)]\s+/,'');if(!line)continue;
  if(/^(?:giorno|day|scheda|allenamento)\s+[a-z0-9](?:\b|\s|:)/i.test(line)&&!line.includes('|')){current={titolo:line.replace(/:$/,''),esercizi:[]};days.push(current);continue;}
  let nome,target,recupero=90,note='',explicitRest=false;
  if(line.includes('|')){const fields=line.split('|').map(x=>x.trim());if(fields.length<2||fields.length>4){errors.push('Riga '+(index+1)+': usa Nome | Target | Recupero | Indicazioni.');continue;}[nome,target]=fields;note=fields[3]||'';if(fields[2]){const rest=fields[2].match(/^(?:rec(?:upero)?\s*:?\s*)?(\d+)\s*(?:s|sec|secondi|["″])?$/i);if(!rest){errors.push('Riga '+(index+1)+': recupero non riconosciuto.');continue;}recupero=Number(rest[1]);explicitRest=true;}}
  else {const match=line.match(/^(.+?)\s+((?:\d+\s*[x×]\s*\d+|\d+\s*set\b|per\s+\d+\b|da\s+\d+\s+a\s+\d+\b|\d+\s*(?:sec|secondi|min)\b).*)$/i);if(!match){errors.push('Riga '+(index+1)+': non distinguo nome e target. Usa Nome | Target.');continue;}nome=match[1].replace(/\s*[-–:]$/,'').trim();target=match[2];const rest=target.match(/\s+rec(?:upero)?\s*:?\s*(\d+)\s*(?:s|sec|secondi|["″])?\s*$/i);if(rest){recupero=Number(rest[1]);explicitRest=true;target=target.slice(0,rest.index).trim();}}
  if(!nome||!validTarget(target)||recupero>3600){errors.push('Riga '+(index+1)+': controlla nome, target e recupero (0–3600 s).');continue;}
  if(!current){current={titolo:'Giorno A',esercizi:[]};days.push(current);}current.esercizi.push({nome,target,recupero,note_coach:note,gifs:[],storico:[],importDefaultRest:!explicitRest});
 }
 if(!days.some(d=>d.esercizi.length)&&!errors.length)errors.push('Inserisci almeno un esercizio.');
 for(const d of days)if(!d.esercizi.length)errors.push(d.titolo+': manca almeno un esercizio.');
 return {days,errors};
}
