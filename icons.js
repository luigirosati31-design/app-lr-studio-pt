const paths={
 dumbbell:['M6 6v12M3 9v6M18 6v12M21 9v6M6 12h12'],
 progress:['M4 4v16h16M8 15l4-5 4 2 4-7'],
 recovery:['M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2','M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
 timer:['M9 3h6M12 3v3M17 6l2-2M12 10v4l3 2','M20 14a8 8 0 1 1-16 0 8 8 0 0 1 16 0'],
 save:['M5 3h12l4 4v14H3V3h2M7 3v6h10V3M7 21v-8h10v8'],
 expand:['M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5'],
 users:['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87','M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M17 3a4 4 0 0 1 0 8'],
 chart:['M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7']
};
export function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [k,v]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',class:'ui-icon'}))svg.setAttribute(k,v);for(const d of paths[name]||paths.dumbbell){const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',d);svg.append(p);}return svg;}
