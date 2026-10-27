// Selezione curata di esercizi ricorrenti. Il coach può sempre modificare nome, GIF e indicazioni.
export const exerciseLibrary = [
  {name:'Arnold press',categories:['Spalle','Braccia'],gif:'esercizi/spalle/arnold_press.gif',note:'Parti con i manubri davanti alle spalle. Ruota i polsi durante la spinta e controlla il ritorno senza inarcare la schiena.'},
  {name:'Panca piana con bilanciere',categories:['Petto','Braccia'],gif:'esercizi/petto/pancapiana.gif',note:'Piedi stabili a terra e scapole raccolte. Controlla la discesa e spingi senza sollevare il bacino.'},
  {name:'Rematore con manubrio a un braccio',categories:['Schiena','Braccia'],gif:'esercizi/schiena/rematore1arm.gif',note:'Mantieni il busto fermo e la schiena neutra. Porta il gomito verso il fianco senza ruotare il tronco.'},
  {name:'Trazioni presa larga',categories:['Schiena','Braccia'],gif:'esercizi/schiena/trazioni_presa_larga.gif',note:'Parti con le spalle attive. Sali senza slancio e controlla la discesa.'},
  {name:'Squat con bilanciere',categories:['Gambe'],gif:'esercizi/gambe/squat_bil.gif',note:'Mantieni il piede ben appoggiato e il busto stabile. Scendi in controllo e risali spingendo il pavimento.'},
  {name:'Affondi bulgari con bilanciere',categories:['Gambe'],gif:'esercizi/gambe/affondi_bulgari_bil.gif',note:'Mantieni il busto stabile e il piede anteriore ben appoggiato. Scendi in controllo senza perdere l’equilibrio.'},
  {name:'Affondi sul posto con manubri',categories:['Gambe'],gif:'esercizi/gambe/affondisulposto.gif',note:'Fai un passo comodo e mantieni il ginocchio in linea con il piede. Risali senza slancio.'},
  {name:'Sollevamento gambe alla sbarra',categories:['Addome'],gif:'esercizi/addome/leg_raise_sbarra.gif',note:'Evita di oscillare. Solleva le gambe usando l’addome e scendi lentamente.'},
  {name:'Shoulder press alla macchina',categories:['Spalle','Braccia'],gif:'esercizi/spalle/shoulder_press.gif',note:'Mantieni il busto stabile contro lo schienale. Spingi verso l’alto e controlla il ritorno.'},
  {name:'Croci ai cavi',categories:['Petto'],gif:'esercizi/petto/croci_cavi.gif',note:'Tieni una leggera flessione dei gomiti. Avvicina le mani in controllo senza oscillare con il busto.'},
  {name:'Dip alle parallele',categories:['Petto','Braccia'],gif:'esercizi/petto/dip.gif',note:'Mantieni le spalle controllate. Scendi solo fin dove riesci a restare stabile e risali senza slancio.'},
  {name:'Lat machine presa larga',categories:['Schiena','Braccia'],gif:'esercizi/schiena/lat_machine_larga.gif',note:'Mantieni il petto aperto. Porta la barra verso la parte alta del petto senza dondolare con il busto.'},
  {name:'Push press',categories:['Spalle','Gambe'],gif:'esercizi/spalle/push_press.gif',note:'Piega leggermente le ginocchia e spingi con le gambe prima di completare la spinta sopra la testa.'}
];

const displayNames={
  bicipiti45:'Curl bicipiti su panca a 45°',bicipitipancascott:'Curl bicipiti alla panca Scott',bicipitiz:'Curl bicipiti con bilanciere EZ',
  affondisulposto:'Affondi sul posto',disntensioni:'Distensioni con manubri',crociinclinate:'Croci su panca inclinata',crocipancapiana:'Croci su panca piana',
  pancainclinata:'Panca inclinata con bilanciere',pancapiana:'Panca piana con bilanciere',piegamentipiedipanca:'Piegamenti con piedi sulla panca',
  spintepancainclinata:'Spinte su panca inclinata',rematore1arm:'Rematore con manubrio a un braccio',
  'hip thrust bil':'Hip thrust con bilanciere','squat bil':'Squat con bilanciere','affondi bulgari bil':'Affondi bulgari con bilanciere',
  'lat machine larga':'Lat machine presa larga','shoulder press':'Shoulder press alla macchina'
};
export function exerciseOptions(media=[]){
 const curatedByPath=new Map(exerciseLibrary.map(item=>[item.gif,item]));
 const result=media.map(item=>{
  const curated=curatedByPath.get(item.path);
  const name=curated?.name||displayNames[item.name]||item.name.replaceAll('_',' ').replace(/^./,c=>c.toLocaleUpperCase('it'));
  return {name,gif:item.path,note:curated?.note||''};
 });
 for(const item of exerciseLibrary)if(!result.some(option=>option.gif===item.gif))result.push(item);
 result.sort((a,b)=>a.name.localeCompare(b.name,'it'));
 const seen=new Map();
 for(const item of result){const key=item.name.toLocaleLowerCase('it');const count=(seen.get(key)||0)+1;seen.set(key,count);if(count>1)item.name+=` · GIF ${count}`;}
 return result;
}
export function findExercise(name,media=[]){return exerciseOptions(media).find(item=>item.name.toLocaleLowerCase('it')===String(name||'').trim().toLocaleLowerCase('it'));}
