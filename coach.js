import {mediaThumb} from './media.js';
import {identity,isDemo,listAthletes,loadRows,saveProgram,coachAccount,logout,validateId} from './data.js';
import {normalize,clone,safeURL} from './core.js';
import {activities,daysWithActivity} from './insights.js';
import {exerciseOptions,findExercise} from './exercise-library.js';
import {$,el,button,toast,error,field} from './ui.js';
let rows=[],program=[],day=0,id='',dirty=false,athletes=[],media=[],coachUser;
const expandedCards=new WeakMap();
const draftKey=()=>`lr-coach-${isDemo?'demo':coachUser?.id||'none'}-${id}`;
$('#demoNotice').hidden=!isDemo;$('#logout').onclick=()=>{if(!dirty||confirm('La bozza resta in questa sessione. Vuoi uscire?'))logout();};
function changed(){dirty=true;try{sessionStorage.setItem(draftKey(),JSON.stringify({program,source:rows.map(r=>r.dati_scheda)}));}catch{toast('Impossibile conservare la bozza locale. Esportala prima di uscire.');}const status=$('#saveStatus');if(status)status.textContent='Modifiche da salvare';}
async function init(){try{coachUser=await identity(true);athletes=await listAthletes();try{media=await(await fetch('esercizi.json')).json();}catch{}render();}catch(e){$('#content').replaceChildren();error(e);}}
async function open(clientId){if(dirty&&!confirm('Cambiare atleta? La bozza corrente resta disponibile in questa sessione.'))return;try{rows=await loadRows(clientId);program=normalize(rows);id=clientId;day=0;dirty=false;const cached=sessionStorage.getItem(draftKey());if(cached){const c=JSON.parse(cached);if(JSON.stringify(c.source)===JSON.stringify(rows.map(r=>r.dati_scheda))&&confirm('Riprendere le modifiche non salvate?')){program=c.program;dirty=true;}else toast('Bozza conservata; caricato il programma corrente.');}render();}catch(e){error(e);}}
function newProgramDialog(){
 if(dirty&&!confirm('Conservare la bozza e iniziare un nuovo programma?'))return;
 const dialog=el('dialog',{class:'new-program-dialog','aria-label':'Nuovo programma'});
 const form=el('form',{},el('h2',{},'Nuovo programma'),el('p',{},'Inserisci l’identificativo assegnato all’atleta. Per l’accesso reale, associa poi questo ID al suo account.'),field('ID atleta',el('input',{name:'clientId',required:'',maxlength:160,placeholder:'es. mario-rossi',autocomplete:'off'})),el('div',{class:'actions'},button('Annulla',()=>dialog.close(),'quiet',{type:'button'}),el('button',{type:'submit',class:'primary'},'Continua')));
 form.addEventListener('submit',event=>{event.preventDefault();const value=form.elements.clientId.value.trim();try{validateId(value);dialog.close();if(athletes.some(a=>(a.client_id||a.email_cliente)===value)){open(value);return;}id=value;rows=[];program=[{titolo:'Giorno A',esercizi:[]}];day=0;changed();render();}catch(e){error(e);}});
 dialog.addEventListener('close',()=>dialog.remove());dialog.append(form);document.body.append(dialog);dialog.showModal();form.elements.clientId.focus();
}
function accountDialog(action){
 const creating=action==='create';
 const dialog=el('dialog',{class:'new-program-dialog','aria-label':creating?'Registra atleta':'Reimposta password atleta'});
 const name=el('input',{name:'fullName',required:'',maxlength:100,autocomplete:'name',placeholder:'Nome e cognome'});
 const username=el('input',{name:'username',required:'',maxlength:32,autocomplete:'off',placeholder:'es. mariorossi',pattern:'[a-z][a-z0-9._-]{2,31}'});
 const password=el('input',{name:'password',type:'password',required:'',minlength:12,maxlength:128,autocomplete:'new-password',placeholder:'Almeno 12 caratteri'});
 let changedByCoach=false;
 name.oninput=()=>{if(!changedByCoach)username.value=name.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');};
 username.oninput=()=>{changedByCoach=true;username.value=username.value.toLowerCase().replace(/[^a-z0-9._-]/g,'');};
 const submit=el('button',{type:'submit',class:'primary'},creating?'Registra atleta':'Aggiorna password');
 const form=el('form',{},el('h2',{},creating?'Registra atleta':'Reimposta password'),el('p',{},creating?'Crea nome utente e password per l’atleta. Dopo potrai preparare la sua scheda.':'Assegna una nuova password all’atleta dopo aver verificato la sua identità.'),...(creating?[field('Nome e cognome',name)]:[]),field('Nome utente',username),field('Password',password),el('div',{class:'actions'},button('Annulla',()=>dialog.close(),'quiet',{type:'button'}),submit));
 form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;submit.textContent='Attendi…';try{const value=username.value.trim();await coachAccount(action,value,password.value,name.value.trim());password.value='';dialog.close();if(creating){id=value;rows=[];program=[{titolo:'Giorno A',esercizi:[]}];day=0;dirty=false;changed();render();toast(isDemo?'Account simulato nella demo. Crea la scheda.':'Atleta registrato. Crea la sua scheda.');}else toast('Password aggiornata. Comunicala all’atleta in privato.');}catch(e){error(e);}finally{submit.disabled=false;submit.textContent=creating?'Registra atleta':'Aggiorna password';}});
 dialog.addEventListener('close',()=>dialog.remove());dialog.append(form);document.body.append(dialog);dialog.showModal();(creating?name:username).focus();
}
function render(){const root=$('#content');root.className='';root.replaceChildren();const list=el('div',{class:'athlete-list'});const search=el('input',{placeholder:'Cerca atleta…','aria-label':'Cerca atleta'});function filter(){list.replaceChildren();[...new Set(athletes.map(a=>a.client_id||a.email_cliente))].filter(Boolean).filter(a=>a.toLowerCase().includes(search.value.toLowerCase())).forEach(a=>list.append(button(a,()=>open(a),a===id?'primary':'quiet')));}search.oninput=filter;filter();const aside=el('aside',{},el('div',{class:'eyebrow'},'I TUOI ATLETI'),search,list,button('Registra atleta',()=>accountDialog('create'),'primary'),button('+ Nuovo programma',newProgramDialog),button('Reimposta password atleta',()=>accountDialog('reset'),'quiet'),button('Cambia la mia password',()=>location.href='reset.html'));const editor=el('section');root.append(el('div',{class:'coach-layout'},aside,editor));if(!id){editor.append(el('div',{class:'panel empty'},el('h2',{},'Seleziona un atleta'),el('p',{},'Apri una scheda dalla lista o registra un atleta.')));return;}
editor.append(el('div',{class:'row spread'},el('h2',{},id),button('Esporta bozza',exportDraft)));editor.append(recentCoachActivity(program));const tabs=el('div',{class:'tabs',role:'tablist','aria-label':'Giorni della scheda'});program.forEach((d,i)=>tabs.append(button(d.titolo,()=>{day=i;render();},'',{role:'tab','aria-selected':i===day})));tabs.append(button('+ Giorno',()=>{program.push({titolo:`Giorno ${program.length+1}`,esercizi:[]});day=program.length-1;changed();render();}));editor.append(tabs);if(!program.length){editor.append(el('p',{},'Aggiungi un giorno per iniziare.'));return;}const title=el('input',{value:program[day].titolo,maxlength:100});title.oninput=()=>{program[day].titolo=title.value;changed();};editor.append(field('Nome allenamento',title),el('div',{class:'actions',style:'margin-top:12px'},button('Duplica giorno',()=>{program.splice(day+1,0,clone(program[day]));day++;program[day].titolo+=' · copia';program[day].esercizi.forEach(ex=>{delete ex.storico;delete ex.ultimo_peso;});changed();render();}),button('Elimina giorno',()=>{if(confirm('Eliminare questo giorno e il relativo storico dalla scheda? Esporta prima una copia se vuoi conservarlo.')){program.splice(day,1);day=Math.max(0,day-1);changed();render();}},'danger')));program[day].esercizi.forEach((ex,i)=>editor.append(exCard(ex,i)));editor.append(button('+ Aggiungi esercizio',()=>{program[day].esercizi.push({nome:'',target:'3x10',recupero:90,note_coach:'',gifs:[],video:'',storico:[]});changed();render();}));const saveButton=button('Salva programma',save,'primary',{id:'saveProgram'});editor.append(el('div',{class:'sticky-save',style:'margin-top:24px'},el('small',{id:'saveStatus'},dirty?'Modifiche da salvare':'Programma aggiornato'),saveButton));}
function inputField(label,value,fn,type='text'){const n=el('input',{type,value});n.oninput=()=>{fn(n.value);changed();};return field(label,n);}
function noteField(ex){const n=el('textarea',{rows:2,value:ex.note_coach||'','aria-label':'Indicazioni per l’atleta'});n.oninput=()=>{ex.note_coach=n.value;changed();};const wrapper=field('Indicazioni per l’atleta',n);wrapper.classList.add('coach-note-field');return wrapper;}
function resultButton(item,action,verb){const row=button('',()=>action(item),'exercise-result',{'aria-label':`${verb} ${item.name}`});const src=safeURL(item.gif,true);if(src)row.append(el('img',{src,alt:'',loading:'lazy'}));row.append(el('span',{},el('strong',{},item.name),el('small',{},item.note?'GIF e indicazioni pronte':'GIF disponibile')),el('span',{class:'result-action'},verb));return row;}
function exerciseNameField(ex,onNameChange=()=>{}){
 const initialName=ex.nome||'',initialNote=ex.note_coach||'',options=exerciseOptions(media),resultsId='ex-results-'+crypto.randomUUID();
 const input=el('input',{type:'search',value:initialName,autocomplete:'off','aria-label':'Nome esercizio','aria-controls':resultsId,'aria-expanded':'false',placeholder:'Cerca tra gli esercizi A–Z'});
 const results=el('div',{id:resultsId,class:'exercise-results',role:'group','aria-label':'Esercizi disponibili',hidden:''});
 const hint=el('small',{class:'exercise-search-hint','aria-live':'polite'},`${options.length} esercizi disponibili · cerca per nome`);
 function reveal(){requestAnimationFrame(()=>{const first=results.querySelector('button');if(!first)return;const bottom=window.innerHeight-110,rect=first.getBoundingClientRect();if(rect.bottom>bottom)window.scrollBy({top:rect.bottom-bottom+12,behavior:'auto'});});}
 function choose(item){const old=findExercise(initialName,media),changedExercise=item.name!==initialName;ex.nome=item.name;if(changedExercise||!ex.gifs?.length&&!ex.gif){ex.gifs=item.gif?[item.gif]:[];delete ex.gif;}if(!initialNote.trim()||initialNote===old?.note)ex.note_coach=item.note||'';changed();const position=window.scrollY;render();requestAnimationFrame(()=>scrollTo(0,position));if(changedExercise&&initialNote.trim()&&initialNote!==old?.note)toast('Indicazioni personalizzate conservate: controllale.');}
 function update(){const query=input.value.trim().toLocaleLowerCase('it');const found=options.filter(item=>item.name.toLocaleLowerCase('it').includes(query));results.replaceChildren(...found.slice(0,8).map(item=>resultButton(item,choose,'Scegli')));if(!found.length)results.append(el('p',{class:'muted'},'Nessun esercizio trovato. Puoi scrivere un nome libero.'));hint.textContent=query?`${found.length} ${found.length===1?'risultato':'risultati'} · ${Math.min(found.length,8)} mostrati${query!==initialName.toLocaleLowerCase('it')&&(ex.gifs?.length||ex.gif)?' · verifica la GIF associata':''}`:`${options.length} esercizi disponibili · scrivi per filtrare`;}
 input.onfocus=()=>{update();results.hidden=false;input.setAttribute('aria-expanded','true');reveal();};
 input.oninput=()=>{ex.nome=input.value;onNameChange(ex.nome);changed();update();results.hidden=false;input.setAttribute('aria-expanded','true');reveal();};
 input.onkeydown=event=>{if(event.key==='Escape'){results.hidden=true;input.setAttribute('aria-expanded','false');}if(event.key==='Enter'&&!results.hidden&&input.value.trim()){const first=options.find(item=>item.name.toLocaleLowerCase('it').includes(input.value.trim().toLocaleLowerCase('it')));if(first){event.preventDefault();choose(first);}}};
 const wrapper=field('Nome esercizio',input);wrapper.classList.add('exercise-name-field');wrapper.append(hint,results);wrapper.addEventListener('focusout',()=>setTimeout(()=>{if(!wrapper.contains(document.activeElement)){results.hidden=true;input.setAttribute('aria-expanded','false');}},100));return wrapper;
}
function mediaPicker(ex){
 const wrapper=el('div',{class:'media-picker'});
 const search=el('input',{type:'search',placeholder:'Cerca una GIF, es. rematore','aria-label':'Cerca una dimostrazione'});
 const list=el('div',{class:'media-results',role:'group','aria-label':'Risultati dimostrazioni'});
 const hint=el('small',{class:'muted'},'Dimostrazioni disponibili in ordine alfabetico.');
 function update(){
  const query=search.value.trim().toLocaleLowerCase('it');
  const found=exerciseOptions(media).filter(item=>`${item.name} ${item.gif}`.toLocaleLowerCase('it').includes(query));
  list.replaceChildren(...found.slice(0,6).map(item=>resultButton(item,chosen=>{ex.gifs=ex.gifs||(ex.gif?[ex.gif]:[]);if(ex.gifs.includes(chosen.gif)){toast('Questa GIF è già associata.');return;}ex.gifs.push(chosen.gif);changed();render();},'Aggiungi')));
  hint.textContent=found.length?`${found.length} ${found.length===1?'GIF disponibile':'GIF disponibili'} · ${Math.min(found.length,6)} mostrate`:'Nessuna GIF trovata.';
 }
 search.oninput=update;
 update();wrapper.append(search,hint,list);return wrapper;
}
function exCard(ex,i){
 const open=expandedCards.has(ex)?expandedCards.get(ex):window.innerWidth>760||i===0||!ex.nome?.trim();expandedCards.set(ex,open);
 const card=el('article',{class:'editor-card'+(open?'':' is-collapsed')});
 const content=el('div',{class:'editor-content',id:'editor-'+crypto.randomUUID()});content.hidden=!open;
 const summaryName=el('strong',{},ex.nome||'Nuovo esercizio'),summaryMeta=el('small',{},`${ex.target||'3x10'} · Recupero ${ex.recupero??90}s`);
 function refreshSummary(){summaryName.textContent=ex.nome||'Nuovo esercizio';summaryMeta.textContent=`${ex.target||'3x10'} · Recupero ${ex.recupero??90}s`;}
 const toggle=button(open?'Riduci':'Modifica',()=>{const next=content.hidden;content.hidden=!next;expandedCards.set(ex,next);card.classList.toggle('is-collapsed',!next);refreshSummary();toggle.textContent=next?'Riduci':'Modifica';toggle.setAttribute('aria-expanded',String(next));},'editor-toggle',{'aria-expanded':String(open),'aria-controls':content.id});
 card.append(el('div',{class:'editor-head'},el('div',{class:'editor-heading'},el('div',{class:'eyebrow'},`ESERCIZIO ${i+1}`),summaryName,summaryMeta),el('div',{class:'actions'},toggle,button('↑',()=>{if(i){const a=program[day].esercizi;[a[i-1],a[i]]=[a[i],a[i-1]];changed();render();}},'quiet',{'aria-label':'Sposta esercizio su'}),button('↓',()=>{const a=program[day].esercizi;if(i<a.length-1){[a[i+1],a[i]]=[a[i],a[i+1]];changed();render();}},'quiet',{'aria-label':'Sposta esercizio giù'}),button('Duplica',()=>{const copy=clone(ex);delete copy.storico;delete copy.ultimo_peso;expandedCards.set(copy,true);program[day].esercizi.splice(i+1,0,copy);changed();render();}),button('Rimuovi',()=>{if(confirm('Rimuovere questo esercizio e il suo storico dalla scheda?')){program[day].esercizi.splice(i,1);changed();render();}},'danger'))));
 content.append(exerciseNameField(ex,refreshSummary),el('div',{class:'grid2'},inputField('Serie / target',ex.target||'3x10',v=>{ex.target=v;refreshSummary();}),inputField('Recupero (secondi)',ex.recupero??90,v=>{ex.recupero=Number(v);refreshSummary();},'number')),noteField(ex));
 const details=el('details',{},el('summary',{},'Video e dimostrazioni'));if(ex.gifs?.length||ex.gif)details.append(mediaThumb(ex));details.append(inputField('Link video HTTPS',ex.video||'',v=>ex.video=v));details.append(mediaPicker(ex));(ex.gifs||(ex.gif?[ex.gif]:[])).forEach((src,j)=>details.append(el('div',{class:'row spread'},el('small',{},src),button('Rimuovi',()=>{ex.gifs=ex.gifs||(ex.gif?[ex.gif]:[]);ex.gifs.splice(j,1);delete ex.gif;changed();render();}))));content.append(details);card.append(content);return card;
}
function exportDraft(){const a=el('a',{href:URL.createObjectURL(new Blob([JSON.stringify({client_id:id,programma:program},null,2)],{type:'application/json'})),download:`${id}-programma.json`});a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
async function save(){
 if(!program.length||program.some(d=>!d.titolo.trim()||!d.esercizi.length||d.esercizi.some(ex=>!ex.nome.trim()||!ex.target?.trim()||!Number.isFinite(ex.recupero)||ex.recupero<0||ex.recupero>3600))){toast('Completa giorni, nomi, target e recuperi validi (0–3600 s).');return;}
 if(program.some(d=>d.esercizi.some(ex=>ex.video&&!safeURL(ex.video)))){toast('Usa un link HTTPS valido per i video.');return;}
 const b=$('#saveProgram');b.disabled=true;b.textContent='Salvataggio…';
 try{await saveProgram(id,rows,program);}catch(e){error(e);b.disabled=false;b.textContent='Riprova salvataggio';return;}
 dirty=false;
 try{rows=await loadRows(id);program=normalize(rows);athletes=await listAthletes();sessionStorage.removeItem(draftKey());render();toast(isDemo?'Programma salvato nella demo.':'Programma salvato.');}
 catch{const root=$('#content');root.replaceChildren(el('section',{class:'panel empty'},el('h2',{},'Programma salvato'),el('p',{},'Il salvataggio è riuscito, ma la verifica della scheda è stata interrotta. Riaprila prima di altre modifiche.'),el('div',{class:'actions'},button('Riprova verifica',()=>open(id),'primary'),button('Esporta copia',exportDraft))));}
}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});init();




function recentCoachActivity(plan){
 const log=activities(plan),panel=el('details',{class:'coach-activity'},el('summary',{},el('strong',{},'Attività atleta'),el('small',{},daysWithActivity(plan)+' giorni registrati')));
 if(!log.length){panel.append(el('p',{},'Nessuna serie registrata per questo atleta.'));return panel;}
 for(const item of log.slice(0,4))panel.append(el('div',{class:'coach-activity-row'},el('strong',{},item.exercise),el('small',{},item.date+' · '+item.sets+' '+(item.sets===1?'serie':'serie')),item.note?el('p',{},'Nota atleta: '+item.note):null));
 return panel;
}
