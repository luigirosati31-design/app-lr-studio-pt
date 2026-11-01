import {glyph} from './portal.js?v=20261101.1';
for(const b of document.querySelectorAll('[data-view]')){const labels={home:'Dashboard',training:'Allenamenti',progress:'Progressi',checkin:'Check-in'};b.replaceChildren(glyph(b.dataset.view),document.createTextNode(labels[b.dataset.view]||b.dataset.view));}
