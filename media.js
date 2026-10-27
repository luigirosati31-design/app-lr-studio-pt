import {el,button} from './ui.js';
import {safeURL} from './core.js?v=20261027.2';
import {icon} from './icons.js';
function player(src,name,large=false){const video=/\.mp4(?:\?|$)/i.test(src);const node=video?el('video',{src,...(large?{controls:'',autoplay:'',muted:'',playsinline:''}:{muted:'',preload:'metadata',playsinline:''}),'aria-label':name}):el('img',{src,alt:`Dimostrazione: ${name}`,loading:'lazy'});return node;}
export function mediaThumb(ex){
 const urls=(ex.gifs?.length?ex.gifs:ex.gif?[ex.gif]:[]).map(s=>safeURL(s,true)).filter(Boolean);
 if(!urls.length)return el('div',{class:'media-thumb empty'},icon('dumbbell'),el('small',{},'Nessuna GIF'));
 let dialog;
 const thumb=button('',()=>{
  dialog=el('dialog',{class:'media-dialog','aria-label':`Dimostrazione di ${ex.nome}`});
  const close=button('Chiudi',()=>dialog.close());
  dialog.append(el('div',{class:'row'},el('h2',{},ex.nome),close),el('div',{class:'media-stage'},...urls.map(u=>player(u,ex.nome,true))));
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{dialog.remove();thumb.focus();});
  document.body.append(dialog);dialog.showModal();
 },'media-thumb',{'aria-label':`Ingrandisci dimostrazione di ${ex.nome}`});
 const preview=player(urls[0],ex.nome);preview.addEventListener('error',()=>{thumb.replaceChildren(icon('dumbbell'),el('small',{},'Apri tecnica'));thumb.classList.add('empty');});
 thumb.append(preview,icon('expand'));return thumb;
}
