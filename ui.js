import {icon} from './icons.js?v=20261028.2';
export const $=s=>document.querySelector(s);
export function el(tag,attrs={},...children){const n=document.createElement(tag);for(const [key,value]of Object.entries(attrs)){if(key.startsWith('on'))n.addEventListener(key.slice(2),value);else if(key==='class')n.className=value;else if(key==='value')n.value=value;else n.setAttribute(key,value);}for(const c of children.flat()){if(c!==null&&c!==undefined)n.append(c instanceof Node?c:document.createTextNode(String(c)));}return n;}
export function button(text,fn,cls='quiet',attrs={}){return el('button',{type:'button',class:cls,onclick:fn,...attrs},text);}
export function toast(text){const n=$('#toast');n.textContent=text;n.hidden=false;clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>n.hidden=true,3500);}
export function error(err){const n=$('#error');n.className='error';n.replaceChildren(document.createTextNode(err.message||String(err)),el('p',{},el('a',{href:'index.html'},'Torna all’accesso')));}
export function field(label,input){const id=input.id||'field-'+crypto.randomUUID();input.id=id;return el('div',{},el('label',{for:id},label),input);}
export function hero(eyebrow,title,subtitle){return el('div',{class:'hero'},el('div',{},el('div',{class:'eyebrow'},eyebrow),el('h1',{},icon(title==='Misure e progressi'?'progress':title==='Massaggi e recupero'?'recovery':'dumbbell'),title),el('p',{},subtitle)));}
