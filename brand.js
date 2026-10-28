import {icon} from './icons.js?v=20261028.2';
for(const b of document.querySelectorAll('[data-view]')){const labels={training:'Allenamento',progress:'Progressi',recovery:'Recupero'};const names={training:'dumbbell',progress:'progress',recovery:'recovery'};b.replaceChildren(icon(names[b.dataset.view]),document.createTextNode(labels[b.dataset.view]));}
const h=document.querySelector('body>main>.hero h1');if(h)h.prepend(icon('users'));
