import {mediaThumb} from './media.js';
import {identity,isDemo,loadRows,saveWorkout,logout,measurements,saveMeasurements,massage,config} from './data.js';
import {normalize,makeDraft,recordDay,payloads,clone,safeURL,targetInfo} from './core.js';
import {activities,daysWithActivity,measurementTrend,weeklyTraining,strengthChanges} from './insights.js';
import {$,el,button,toast,error,field,hero} from './ui.js';
let user,rows,program,draft,day=0,view='training',busy=false,restEnd=0,sessionStart=0,workoutOpen=false;
const key=()=>`lr-v2-draft-${isDemo?'demo':user.id}`;
function store(){try{sessionStorage.setItem(key(),JSON.stringify({source:rows.map(r=>r.dati_scheda),draft,sessionStart,selectedDay:day,workoutOpen}));}catch{toast('Memoria locale piena: conserva la pagina aperta e salva la sessione.');}}
$('#logout').onclick=()=>logout();
$('#demoNotice').hidden=!isDemo;
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;if(view==='training'){workoutOpen=false;store();}render().catch(error);});
async function init(){try{user=await identity();rows=await loadRows(user.app_metadata.client_id);program=normalize(rows);draft=makeDraft(program);const cached=sessionStorage.getItem(key());if(cached){try{const c=JSON.parse(cached);if(JSON.stringify(c.source)===JSON.stringify(rows.map(r=>r.dati_scheda))){draft=c.draft;sessionStart=c.sessionStart||0;day=Math.min(Math.max(0,c.selectedDay||0),Math.max(0,program.length-1));workoutOpen=!!c.workoutOpen;}else toast('Scheda aggiornata dal coach. Bozza precedente conservata, non applicata.');}catch{toast('Bozza non leggibile. Scheda originale disponibile.');}}$('.bottom-nav').hidden=false;await render();}catch(e){$('#content').replaceChildren();error(e);}}
function updateProgress(){const all=draft[day]?.flatMap(e=>e.serie)||[],done=all.filter(s=>s.check).length;const p=$('#progress');if(p)p.value=all.length?done/all.length:0;const label=$('#progressLabel');if(label)label.textContent=`${done} di ${all.length} serie completate`;for(const id of ['#saveWorkout','#saveWorkoutDock']){const saveButton=$(id);if(saveButton){saveButton.disabled=busy||done===0;saveButton.textContent=busy?'Salvataggio…':'Concludi e salva';}}const dock=$('#workoutSaveDock');if(dock){dock.hidden=done===0;const count=$('#dockProgress');if(count)count.textContent=`${done}/${all.length} serie`;document.body.classList.toggle('workout-save-visible',done>0);}else document.body.classList.remove('workout-save-visible');const start=$('#startWorkout');if(start&&sessionStart){start.textContent='In corso';start.disabled=true;}}
function rest(seconds){restEnd=Date.now()+Math.max(0,Number(seconds)||90)*1000;$('#rest').hidden=false;tick();}
$('#stopRest').onclick=()=>{restEnd=0;$('#rest').hidden=true;};
function tick(){if(restEnd){const left=Math.max(0,Math.ceil((restEnd-Date.now())/1000));$('#restTime').textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;if(!left){restEnd=0;$('#rest').hidden=true;toast('Recupero terminato. Pronto per la prossima serie.');}}const clock=$('#clock');if(clock){const sec=sessionStart?Math.floor((Date.now()-sessionStart)/1000):0;clock.textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;}}
setInterval(tick,1000);
async function render(){document.body.classList.remove('workout-save-visible');document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-current',b.dataset.view===view?'page':'false'));$('#content').className='';$('#content').replaceChildren();if(view==='training')renderTraining();if(view==='progress')await renderProgress();if(view==='recovery')await renderRecovery();}
function renderTraining(){
 if(!workoutOpen){renderHome();return;}
 const root=$('#content');
 if(!program.length){root.append(el('div',{class:'panel empty'},'La tua scheda è in preparazione. Contatta il coach.'));return;}
 const title=String(program[day].titolo||'').replace(/^\s*[A-Z]\s*[·–-]\s*/i,'').trim();
 const switcher=el('select',{'aria-label':'Cambia giorno'},...program.map((session,index)=>el('option',{value:index},'Giorno '+dayLetter(index))));switcher.value=String(day);
 switcher.onchange=()=>{day=Number(switcher.value);store();renderTrainingOnly();};
 root.append(el('div',{class:'workout-intro'},
  el('div',{},button('← Tutti i giorni',()=>{workoutOpen=false;store();renderTrainingOnly();},'quiet workout-back'),el('h1',{},'Giorno '+dayLetter(day)),title?el('p',{class:'workout-subtitle'},title):null),
  program.length>1?field('Cambia giorno',switcher):null));
 const exercises=el('section',{'aria-label':'Esercizi'});program[day].esercizi.forEach((ex,i)=>exercises.append(exercise(ex,i)));
 const aside=el('aside',{class:'side','aria-label':'Controlli sessione'},el('div',{class:'session-strip'},el('div',{class:'session-time'},el('small',{},'Durata'),el('div',{class:'row'},el('span',{id:'clock',class:'stat'},'00:00'),button(sessionStart?'In corso':'Avvia',()=>{if(!sessionStart){sessionStart=Date.now();store();renderTrainingOnly();}},'',{id:'startWorkout'}))),el('div',{class:'session-progress'},el('p',{id:'progressLabel',class:'muted'}),el('progress',{id:'progress',max:1,value:0,'aria-label':'Serie completate'})),button('Concludi e salva',save,'primary',{id:'saveWorkout',disabled:''})));
 root.append(el('div',{class:'workout-layout'},exercises,aside),el('div',{id:'workoutSaveDock',class:'workout-save-dock',hidden:''},el('span',{id:'dockProgress'},'0 serie'),button('Concludi e salva',save,'primary',{id:'saveWorkoutDock'})));updateProgress();tick();
}
function renderTrainingOnly(){ document.body.classList.remove('workout-save-visible');$('#content').replaceChildren();renderTraining(); }
function exercise(ex,index){const log=draft[day][index],target=targetInfo(ex.target);const card=el('article',{class:'exercise'});card.append(el('div',{class:'exercise-head'},mediaThumb(ex),el('div',{class:'exercise-heading'},el('div',{class:'exercise-number'},'ESERCIZIO '+String(index+1).padStart(2,'0')),el('h3',{},ex.nome||'Esercizio'),el('div',{class:'prescription'},`${ex.target||'3x10'} · Recupero ${ex.recupero??90}s`))));const body=el('div',{class:'exercise-body'});const last=Array.isArray(ex.storico)?ex.storico.at(-1):null;if(last?.serie?.length)body.append(el('p',{class:'previous-sets'},'Ultima volta · '+last.serie.map(s=>`${s.kg||'—'} kg × ${s.rip||'—'}`).join('  /  ')));else if(ex.ultimo_peso)body.append(el('p',{class:'previous-sets'},`Ultimo carico · ${ex.ultimo_peso} kg`));if(ex.note_coach)body.append(el('div',{class:'coach-note'},ex.note_coach));const tbody=el('tbody');const table=el('table',{class:'sets'},el('thead',{},el('tr',{},...['Serie','Kg',target.weightOnly?'Target':'Rip.','Fatto'].map(t=>el('th',{scope:'col'},t)))),tbody);
function addRow(s,idx){const tr=el('tr',{class:s.check?'done':''});const kg=el('input',{value:s.kg,inputmode:'decimal','aria-label':`${ex.nome}, serie ${idx+1}, chilogrammi`,placeholder:'kg'});const rip=el('input',{value:s.rip,inputmode:target.weightOnly?'text':'numeric','aria-label':`${ex.nome}, serie ${idx+1}, ripetizioni`,placeholder:target.weightOnly?'—':'rip'});kg.oninput=()=>{s.kg=kg.value;store();};rip.oninput=()=>{s.rip=rip.value;store();};const check=button(s.check?'✓':'○',()=>{if(!s.check){if(!s.rip&&!target.weightOnly){toast('Inserisci le ripetizioni eseguite.');rip.focus();return;}if(s.kg&&!/^\d+([.,]\d+)?$/.test(s.kg)){toast('Inserisci un carico valido.');kg.focus();return;}if(!sessionStart)sessionStart=Date.now();}s.check=!s.check;check.textContent=s.check?'✓':'○';check.setAttribute('aria-pressed',s.check);tr.classList.toggle('done',s.check);store();updateProgress();if(s.check)rest(ex.recupero??90);},'check',{'aria-label':`Conferma serie ${idx+1} di ${ex.nome}`,'aria-pressed':s.check});tr.append(el('td',{},idx+1),el('td',{},kg),el('td',{},rip),el('td',{},check));tbody.append(tr);}
log.serie.forEach(addRow);body.append(table);const more=el('details',{class:'exercise-more'},el('summary',{},'Altre opzioni'),el('div',{class:'exercise-tools'},button('Ripeti ultimi carichi',()=>{const previous=ex.storico?.at(-1)?.serie;log.serie.forEach((s,i)=>{if(!s.check){s.kg=previous?.[i]?.kg||ex.ultimo_peso||'';s.rip=previous?.[i]?.rip||'';}});store();renderTrainingOnly();}),button('Avvia recupero',()=>rest(ex.recupero??90))));body.append(el('div',{class:'exercise-tools'},button('+ Aggiungi serie',()=>{const s={kg:'',rip:'',check:false};log.serie.push(s);addRow(s,log.serie.length-1);store();updateProgress();})),more);
const details=el('details',{},el('summary',{},'Storico e note'));const url=safeURL(ex.video);if(url)details.append(el('p',{},el('a',{href:url,target:'_blank',rel:'noopener noreferrer'},'Apri video tecnica ↗')));if(ex.storico?.length){[...ex.storico].reverse().slice(0,5).forEach(r=>details.append(el('p',{class:'muted'},`${r.data} · ${r.serie.map(s=>(s.kg||'—')+' kg × '+(s.rip||'—')).join(' / ')}`)));}else details.append(el('p',{class:'muted'},'Il tuo storico inizierà qui.'));const notes=el('textarea',{rows:2,placeholder:'Come ti sei sentito?',value:log.note});notes.oninput=()=>{log.note=notes.value;store();};details.append(field('Note personali',notes));body.append(details);card.append(body);return card;}
async function save(){
 if(busy)return;
 const completed=draft[day].flatMap(ex=>ex.serie).filter(set=>set.check).length;
 if(!completed){toast('Conferma almeno una serie prima di salvare.');return;}
 busy=true;updateProgress();
 try{
  const updated=recordDay(program,draft,day,new Date().toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}));
  const nextPayloads=payloads(rows,updated);
  await saveWorkout(rows,updated);
  try{rows=await loadRows(user.app_metadata.client_id);}catch{
   rows=rows.map(row=>({...row,dati_scheda:nextPayloads.find(p=>p.id===row.id)?.value||row.dati_scheda}));
   toast('Allenamento salvato. La scheda aggiornata sarà disponibile alla prossima apertura.');
  }
  program=normalize(rows);
  draft[day]=makeDraft(program)[day];sessionStart=0;store();
  showSuccess(completed);
 }catch(e){error(e);}finally{busy=false;updateProgress();}
}
function measureSparkline(rows,key,label,unit){
 const points=(rows||[]).map(row=>({date:row.created_at,value:Number(String(row[key]||'').replace(',','.'))})).filter(item=>Number.isFinite(item.value)&&item.value>0).slice(0,8).reverse();
 if(points.length<2)return el('span',{class:'sparkline-empty'},'Il grafico appare dopo due misure.');
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 200 72');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${label}: da ${points[0].value} a ${points.at(-1).value} ${unit} in ${points.length} rilevazioni`);svg.classList.add('measure-sparkline');
 const low=Math.min(...points.map(item=>item.value)),high=Math.max(...points.map(item=>item.value)),span=Math.max(high-low,1);
 const coordinates=points.map((item,index)=>[8+184*index/(points.length-1),60-46*(item.value-low)/span]);
 const line=document.createElementNS(ns,'polyline');line.setAttribute('points',coordinates.map(([x,y])=>`${x},${y}`).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','3');line.setAttribute('stroke-linecap','round');line.setAttribute('stroke-linejoin','round');svg.append(line);
 for(const [x,y] of [coordinates[0],coordinates.at(-1)]){const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',x);circle.setAttribute('cy',y);circle.setAttribute('r','4');circle.setAttribute('fill','currentColor');svg.append(circle);}
 const dateLabel=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'});};
 return el('div',{class:'sparkline-wrap'},svg,el('div',{class:'sparkline-dates'},el('span',{},dateLabel(points[0].date)),el('span',{},dateLabel(points.at(-1).date))));
}
async function renderProgress(){
 const root=$('#content');root.append(hero('IL TUO PERCORSO','Progressi','Allenamenti e misure registrate.'));
 const id=user.app_metadata.client_id;
 const data=await measurements(id);if(view!=='progress')return;
 const log=activities(program),days=daysWithActivity(program);
 root.append(el('div',{class:'progress-stats'},
  el('div',{class:'progress-stat'},el('small',{},'GIORNI REGISTRATI'),el('strong',{},String(days)),el('span',{},'nello storico disponibile')),
  el('div',{class:'progress-stat'},el('small',{},'ULTIMA ATTIVITÀ'),el('strong',{},log[0]?.date||'—'),el('span',{},log[0]?.exercise||'Nessuna serie registrata'))));
 const weeks=weeklyTraining(program),maxWeek=Math.max(1,...weeks.map(item=>item.count));
 const rhythm=el('section',{class:'panel rhythm-panel'},el('div',{class:'row spread'},el('h2',{},'Continuità'),el('small',{},'Ultime 6 settimane')));
 rhythm.append(el('div',{class:'week-chart'},...weeks.map(item=>el('div',{class:'week-column','aria-label':`Settimana del ${item.label}: ${item.count} ${item.count===1?'allenamento':'allenamenti'}`},el('strong',{},String(item.count)),el('div',{class:'week-track'},el('span',{style:`height:${Math.max(item.count?16:3,Math.round(item.count/maxWeek*100))}%`})),el('small',{},item.label)))));
 root.append(rhythm);
 const strength=strengthChanges(program).slice(0,3),strengthPanel=el('section',{class:'panel strength-panel'},el('h2',{},'Carichi nel tempo'));
 if(!strength.length)strengthPanel.append(el('p',{class:'muted'},'Dopo due allenamenti dello stesso esercizio vedrai qui come cambia il carico.'));
 for(const item of strength){const format=value=>new Intl.NumberFormat('it-IT',{maximumFractionDigits:1}).format(value);strengthPanel.append(el('div',{class:'strength-row'},el('div',{},el('strong',{},item.exercise),el('small',{},item.date+' · massimo per serie')),el('div',{class:'strength-values'},el('strong',{},format(item.current)+' kg'),el('small',{},`${item.difference>0?'+':''}${format(item.difference)} kg dal ${item.previousDate}`))));}
 root.append(strengthPanel);
 const recent=el('section',{class:'panel activity-panel'},el('h2',{},'Ultime serie'));
 if(!log.length)recent.append(el('p',{class:'muted'},'Il tuo storico apparirà qui dopo il primo allenamento salvato.'));
 for(const item of log.slice(0,5))recent.append(el('div',{class:'activity-row'},
  el('div',{},el('strong',{},item.exercise),el('small',{},item.date+' · '+item.sets+' '+(item.sets===1?'serie':'serie'))),
  el('span',{},item.series.map(set=>[set.kg?set.kg+' kg':'—',set.rip?'× '+set.rip:''].filter(Boolean).join(' ')).join(' / '))));
 const measures=el('section',{class:'panel'},el('h2',{},'Misure'));
 const grid=el('div',{class:'grid2'});
 for(const [key,unit] of [['peso','kg'],['vita','cm']]){
  const trend=measurementTrend(data,key);
  const current=data.find(row=>row[key])?.[key];
  const previousDate=trend?.previousDate?new Date(trend.previousDate).toLocaleDateString('it-IT'):'—';
  const detail=trend?((trend.difference>0?'+':'')+trend.difference.toFixed(1)+' '+unit+' dal '+previousDate):'Nessun confronto disponibile';
  grid.append(el('div',{class:'metric'},el('small',{},key==='peso'?'Peso':'Vita'),el('strong',{},current?current+' '+unit:'—'),el('span',{class:'metric-trend'},detail),measureSparkline(data,key,key==='peso'?'Peso':'Vita',unit)));
 }
 measures.append(grid);
 const history=el('details',{class:'measure-history'},el('summary',{},'Vedi le ultime misurazioni'));
 data.slice(0,8).forEach(m=>history.append(el('p',{class:'muted'},new Date(m.created_at).toLocaleDateString('it-IT')+' · Peso '+(m.peso||'—')+' kg · Vita '+(m.vita||'—')+' cm')));
 if(!data.length)history.append(el('p',{},'Nessuna misurazione registrata.'));
 measures.append(history);
 const form=el('form',{},el('h3',{},'Aggiungi una misurazione'));const inputs={};const fields=el('div',{class:'grid2'});
 for(const key of ['peso','petto','spalle','braccio','vita','fianchi','quadricipiti','polpacci']){
  inputs[key]=el('input',{type:'number',step:'0.1',min:'0.1',max:key==='peso'?'500':'300',inputmode:'decimal'});
  fields.append(field(key.charAt(0).toUpperCase()+key.slice(1)+(key==='peso'?' (kg)':' (cm)'),inputs[key]));
 }
 const submit=el('button',{type:'submit',class:'primary',style:'margin-top:20px'},'Salva misurazione');form.append(fields,submit);
 form.onsubmit=async event=>{event.preventDefault();const values=Object.fromEntries(Object.entries(inputs).filter(([,node])=>node.value).map(([key,node])=>[key,node.value]));if(!Object.keys(values).length){toast('Inserisci almeno una misura.');return;}if(!form.reportValidity())return;submit.disabled=true;try{await saveMeasurements(id,values);toast(isDemo?'Misurazione salvata nella demo.':'Misurazione salvata.');await render();}catch(err){error(err);}finally{submit.disabled=false;}};
 measures.append(el('details',{class:'measure-form'},el('summary',{},'+ Aggiungi una misurazione'),form));root.append(measures,recent,el('section',{class:'panel account-panel'},el('h2',{},'Accesso'),el('p',{class:'muted'},'Puoi aggiornare la tua password quando sei già dentro lo studio.'),el('a',{href:'reset.html'},'Cambia password →')));
}
async function renderRecovery(){const root=$('#content');root.append(hero('STUDIO','Massaggi e recupero','Pacchetto attivo e prenotazioni.'));const data=await massage(user.app_metadata.client_id);if(view!=='recovery')return;root.append(el('div',{class:'panel'},el('div',{class:'eyebrow'},'MASSAGGIO SPORTIVO'),el('h2',{},data[0]?.nome_pacchetto||'Il tuo recupero'),el('p',{class:'stat'},data[0]?`${data[0].sedute_rimaste} sedute disponibili`:'Nessun pacchetto attivo'),el('p',{class:'muted'},'Per prenotare una seduta o scegliere un percorso, contatta Luigi.')));if(/^\d{8,15}$/.test(config.whatsapp))root.append(el('a',{href:`https://wa.me/${config.whatsapp}?text=Ciao%2C%20vorrei%20prenotare%20una%20seduta.`,target:'_blank',rel:'noopener noreferrer'},'Prenota una seduta su WhatsApp →'));else root.append(el('p',{class:'muted'},'Chiedi al coach la disponibilità per la prossima seduta.'));}
$('#plates').onclick=()=>$('#platesDialog').showModal();$('#closePlates').onclick=()=>$('#platesDialog').close();$('#calculate').onclick=()=>{let remaining=(Number($('#total').value)-Number($('#bar').value))/2;if(!Number.isFinite(remaining)||remaining<0){$('#plateResult').textContent='Il totale deve essere almeno pari al peso del bilanciere.';return;}const result=[];for(const size of [25,20,15,10,5,2.5,1.25]){const count=Math.floor((remaining+0.00001)/size);if(count){result.push(`${count} × ${size} kg`);remaining-=count*size;}}$('#plateResult').textContent=(result.length?result.join(' + '):'Nessun disco')+(remaining>0.001?` · Restano ${remaining.toFixed(2)} kg per lato: servono dischi più piccoli.`:' per lato.');};
window.addEventListener('beforeunload',()=>{if(user&&draft)store();});init();

function dayLetter(index){return index<26?String.fromCharCode(65+index):String(index+1);}
function dayHasDraft(index){
  return draft[index]?.some(ex => ex.note?.trim() || ex.serie.some(set => set.check || set.kg?.trim() || set.rip?.trim())) || false;
}
function renderHome(){
  const root=$('#content');root.replaceChildren();
  const name=isDemo?'':String(user.user_metadata?.full_name||user.user_metadata?.name||'').trim().slice(0,60);
  root.append(el('section',{class:'welcome'},
    el('div',{class:'eyebrow'},'LR STUDIO · IL TUO PROGRAMMA'),
    el('h1',{},name?'Bentornato, '+name+'.':'Bentornato.',el('span',{},'Cosa alleniamo oggi?'))));
  if(!program.length){root.append(el('div',{class:'panel empty'},'Il coach sta preparando il tuo programma.'));return;}
  const grid=el('div',{class:'day-grid','aria-label':'Giorni di allenamento'});
  program.forEach((session,index)=>{
    const letter=dayLetter(index),pending=dayHasDraft(index),count=session.esercizi.length;
    const preview=session.esercizi[0]?.nome||'';
    const coachTitle=String(session.titolo||'').replace(/^\s*[A-Z]\s*[·–-]\s*/i,'').trim();
    const description=[coachTitle && !/^giorno\s+[a-z0-9]+$/i.test(coachTitle)?coachTitle:'',`${count} ${count===1?'esercizio':'esercizi'}`].filter(Boolean).join(' · ');
    const card=button('',()=>{day=index;workoutOpen=true;store();renderTrainingOnly();},'day-card'+(pending?' day-card-pending':''),{'aria-label':`${pending?'Riprendi':'Apri'} Giorno ${letter}`});
    card.append(
      el('span',{class:'day-mark','aria-hidden':'true'},letter),
      el('span',{class:'day-copy'},
        el('span',{class:'day-overline'},pending?'SESSIONE IN CORSO':'ALLENAMENTO'),
        el('strong',{},'Giorno '+letter),
        el('small',{},description),
        preview?el('span',{class:'day-preview'},preview):null),
      el('span',{class:'day-action','aria-hidden':'true'},pending?'Riprendi ↗':'Apri ↗')
    );
    grid.append(card);
  });
  root.append(grid);
  const pending=program.map((_,index)=>index).filter(dayHasDraft);
  if(pending.length){
    const next=pending.includes(day)?day:pending[0],done=draft[next].flatMap(ex=>ex.serie).filter(set=>set.check).length;
    root.append(el('section',{class:'home-status'},el('div',{},el('small',{},'SESSIONE IN CORSO'),el('strong',{},'Giorno '+dayLetter(next)),el('span',{},done?`${done} ${done===1?'serie confermata':'serie confermate'} · bozza conservata`:'Hai una bozza da completare')),button('Continua →',()=>{day=next;workoutOpen=true;store();renderTrainingOnly();},'primary')));
  }else{
    const last=activities(program)[0];
    if(last)root.append(el('section',{class:'home-status home-status-history'},el('div',{},el('small',{},'ULTIMO ALLENAMENTO'),el('strong',{},'Giorno '+dayLetter(last.dayIndex)+' · '+last.date),el('span',{},last.exercise))));
  }
}
function showSuccess(done){const phrases=['La costanza si costruisce così: un allenamento alla volta.','Hai dedicato tempo a te. Continua a costruire il tuo percorso.','Un altro allenamento registrato. Il percorso continua.'];const dialog=el('dialog',{class:'success-dialog','aria-label':'Allenamento salvato'});dialog.append(el('div',{class:'success-mark','aria-hidden':'true'},'✓'),el('div',{class:'eyebrow'},'GIORNO '+dayLetter(day)),el('h2',{},'Ottimo allenamento!'),el('p',{},done+' serie confermate.'+(isDemo?' Salvate nella demo.':' Salvate nel tuo registro.')),el('p',{class:'success-note'},phrases[Math.floor(Math.random()*phrases.length)]),el('div',{class:'actions'},button('Rivedi la scheda',()=>dialog.close()),button('Torna ai giorni',()=>{dialog.close();workoutOpen=false;store();renderTrainingOnly();},'primary')));dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();}
