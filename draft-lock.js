// Una sola scheda modifica la bozza dell'account. Nessun dato esce dal browser.
export async function acquireDraftLock(key,onLost=()=>{}){
 const name='lr-workspace-'+key;
 if(globalThis.navigator?.locks){
  const result=await new Promise(resolve=>{
   let held=false,finish;
   const release=()=>{held=false;finish?.();};
   navigator.locks.request(name,{ifAvailable:true},async lock=>{
    if(!lock){resolve({held:false,check:()=>false,release:()=>{}});return;}
    held=true;const gate=new Promise(done=>finish=done);
    window.addEventListener('pagehide',release,{once:true});
    resolve({held:true,check:()=>held,release});
    try{await gate;}finally{held=false;}
   }).catch(()=>resolve(null));
  });
  if(result)return result;
 }
 // Compatibilità con browser senza Web Locks: lease e controllo a ogni scrittura.
 const owner=crypto.randomUUID(),storageKey=name+'-lease',ttl=30000;
 let held=false,heartbeat;
 const read=()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'null');}catch{return null;}};
 const release=()=>{const current=read();if(current?.owner===owner)localStorage.removeItem(storageKey);held=false;clearInterval(heartbeat);window.removeEventListener('storage',watch);};
 const check=()=>{
  if(!held)return false;
  const current=read();
  if(current?.owner!==owner){held=false;clearInterval(heartbeat);onLost();return false;}
  try{localStorage.setItem(storageKey,JSON.stringify({owner,expires:Date.now()+ttl}));}catch{}
  return true;
 };
 function watch(event){if(event.key===storageKey)check();}
 try{
  const current=read();if(current&&current.expires>Date.now())return {held:false,check:()=>false,release:()=>{}};
  localStorage.setItem(storageKey,JSON.stringify({owner,expires:Date.now()+ttl}));held=read()?.owner===owner;
 }catch{
  // Senza localStorage le bozze sono già separate per sessione/scheda.
  return {held:true,check:()=>true,release:()=>{}};
 }
 if(held){heartbeat=setInterval(check,8000);window.addEventListener('storage',watch);window.addEventListener('pagehide',release,{once:true});}
 return {held,check,release};
}
if(typeof window!=='undefined')window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
