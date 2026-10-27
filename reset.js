import {client,config,updatePassword} from './data.js';
const message=document.querySelector('#message'),form=document.querySelector('#newPassword');
async function init(){
 if(!config.liveEnabled){message.textContent='La reimpostazione sarà disponibile dopo l’attivazione dell’accesso reale.';return;}
 try{const {data,error}=await client().auth.getSession();if(error||!data.session)throw Error();form.hidden=false;message.textContent='Accesso verificato. Usa un PIN di 6–8 cifre oppure una password di almeno 12 caratteri.';}
 catch{message.textContent='Accedi allo studio e apri di nuovo questa pagina. Se hai perso il PIN o la password, contatta Luigi.';}
}
form.addEventListener('submit',async event=>{event.preventDefault();const password=document.querySelector('#password').value;if(password!==document.querySelector('#confirm').value){message.textContent='I due valori non coincidono.';return;}const submit=form.querySelector('button');submit.disabled=true;try{await updatePassword(password);form.hidden=true;message.textContent='Credenziale aggiornata. Ora puoi accedere con il nuovo PIN o la nuova password.';history.replaceState(null,'',location.pathname);}catch(error){message.textContent=error.message;}finally{submit.disabled=false;}});
init();
