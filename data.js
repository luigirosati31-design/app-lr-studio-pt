import {clone,demoProgram} from './core.js';
const demo=new URLSearchParams(location.search).get('demo')==='1';
export const isDemo=demo;
export const config=window.LR_CONFIG;
let db;
export function client(){
 if(!config.liveEnabled || !config.publishableKey) throw Error('Accesso reale in preparazione. Puoi esplorare la demo.');
 if(!window.supabase) throw Error('Connessione non disponibile. Riprova.');
 return db ||= window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:true,storage:sessionStorage,storageKey:'lr-studio-auth',autoRefreshToken:true}});
}
export async function login(username,password){
 const name=username.trim().toLowerCase();
 if(!/^[a-z][a-z0-9._-]{2,31}$/.test(name))throw Error('Controlla il nome utente.');
 const {data,error}=await client().functions.invoke('username-login',{body:{username:name,password}});
 if(error||!data?.access_token||!data?.refresh_token)throw Error('Nome utente o password non validi.');
 const {error:sessionError}=await client().auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});
 if(sessionError)throw Error('Accesso non riuscito. Riprova.');
 const {data:verified,error:userError}=await client().auth.getUser();
 if(userError||!verified.user){await client().auth.signOut();throw Error('Accesso non riuscito. Riprova.');}
 if(!['coach','athlete'].includes(verified.user.app_metadata?.role)){await client().auth.signOut();throw Error('Account non ancora associato. Contatta Luigi.');}
 return verified.user;
}
export async function updatePassword(password){const {error}=await client().auth.updateUser({password});if(error)throw Error('Impossibile aggiornare la password. Richiedi un nuovo link.');await client().auth.signOut();}
export async function coachAccount(action,username,password,fullName=''){
 if(demo)return {ok:true,username};
 const {data,error}=await client().functions.invoke('coach-account',{body:{action,username,password,fullName}});
 if(error||!data?.ok){let message=data?.error;try{message ||= (await error?.context?.json())?.error;}catch{}throw Error(message||'Operazione non riuscita. Riprova.');}
 return data;
}
export async function identity(coach=false){
 if(demo) return {id:'demo',app_metadata:{role:coach?'coach':'athlete',client_id:'atleta-demo'}};
 const {data,error:err}=await client().auth.getUser();if(err||!data.user)throw Error('Accedi per continuare.');
 const meta=data.user.app_metadata;
 if(coach?meta.role!=='coach':meta.role!=='athlete'||!meta.client_id) throw Error('Account non ancora associato. Contatta il coach.');
 return data.user;
}
export async function logout(){try{if(db)await db.auth.signOut();}finally{sessionStorage.removeItem('lr-auth');sessionStorage.removeItem('lr-studio-auth');location.href='index.html';}}
function check(result){if(result.error){if(result.error.message?.includes('Scheda aggiornata altrove'))throw Error('La scheda è stata aggiornata altrove. La bozza locale è conservata: ricarica e verifica gli aggiornamenti prima di salvare.');throw Error('Operazione non riuscita. Riprova; i dati locali sono conservati.');}return result.data;}
const columns='id,created_at,client_id,email_cliente,titolo_sessione,dati_scheda';
function queryOwner(query,id){return query.or(`client_id.eq.${id},email_cliente.eq.${id}`);}
export function validateId(id){if(!/^[a-z0-9@._ -]{1,160}$/i.test(id))throw Error('Identificativo atleta non valido.');return id;}
export async function loadRows(id){
 validateId(id);
 if(demo)return clone(JSON.parse(sessionStorage.getItem('lr-demo-rows')||'null')||[{id:1,client_id:'atleta-demo',email_cliente:'atleta-demo',titolo_sessione:'PROGRAMMA_COMPLETO',dati_scheda:JSON.stringify(demoProgram)}]);
 return check(await queryOwner(client().from('schede_clienti').select(columns),id).order('id'));
}
export async function listAthletes(){
 if(demo)return [{client_id:'atleta-demo',email_cliente:'Atleta Demo'}];
 const rows=check(await client().from('schede_clienti').select('client_id,email_cliente').order('client_id'));
 const {data,error}=await client().functions.invoke('coach-account',{body:{action:'list'}});
 if(error||!data?.ok)throw Error('Impossibile caricare gli atleti. Riprova.');
 return [...rows,...data.usernames.filter(name=>!rows.some(row=>row.client_id===name||row.email_cliente===name)).map(name=>({client_id:name,email_cliente:name}))];
}
export async function saveProgram(id,rows,program){
 if(demo){sessionStorage.setItem('lr-demo-rows',JSON.stringify([{id:1,client_id:id,email_cliente:id,titolo_sessione:'PROGRAMMA_COMPLETO',dati_scheda:JSON.stringify(program)}]));return;}
 check(await client().rpc('lr_save_program',{p_client:validateId(id),p_expected:rows.map(r=>({id:r.id,dati_scheda:r.dati_scheda})),p_program:program}));
}
export async function saveWorkout(rows,program){
 if(demo){await saveProgram('atleta-demo',rows,program);return;}
 check(await client().rpc('lr_save_workout',{p_expected:rows.map(r=>({id:r.id,dati_scheda:r.dati_scheda})),p_program:program}));
}
export async function measurements(id){if(demo)return [...JSON.parse(sessionStorage.getItem('lr-demo-measures')||'[]'),{created_at:'2026-10-22',peso:'78.5',vita:'82'},{created_at:'2026-10-01',peso:'79.2',vita:'83'}];return check(await queryOwner(client().from('misure_clienti').select('*'),validateId(id)).order('id',{ascending:false}).limit(60));}
export async function saveMeasurements(id,values){if(demo){const saved=JSON.parse(sessionStorage.getItem('lr-demo-measures')||'[]');saved.unshift({...values,created_at:new Date().toISOString()});sessionStorage.setItem('lr-demo-measures',JSON.stringify(saved));return;}check(await client().from('misure_clienti').insert({...values,client_id:id,email_cliente:id}));}
export async function massage(id){if(demo)return [{nome_pacchetto:'Recupero sportivo',sedute_rimaste:3}];return check(await queryOwner(client().from('pacchetti_massaggi').select('nome_pacchetto,sedute_rimaste'),validateId(id)).order('id',{ascending:false}).limit(1));}
