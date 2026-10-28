import {login,config} from './data.js?v=20261028.2';
const form=document.querySelector('#login'),message=document.querySelector('#message');
if(!config.liveEnabled){message.className='notice';message.textContent='Anteprima · Accesso reale disponibile dopo la messa in sicurezza.';}
form.addEventListener('submit',async e=>{e.preventDefault();const btn=document.querySelector('#submit');btn.disabled=true;message.className='muted';message.textContent='Accesso in corso…';try{const user=await login(document.querySelector('#username').value.trim(),document.querySelector('#password').value);location.href=user.app_metadata.role==='coach'?'admin.html':'dashboard.html';}catch(err){message.className='error';message.textContent=err.message;}finally{btn.disabled=false;}});
