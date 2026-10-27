function dateValue(value){
  const match=String(value||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match?Number(match[3])*10000+Number(match[2])*100+Number(match[1]):0;
}
function activityDate(value){
 const match=String(value||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
 if(!match)return null;
 const date=new Date(Number(match[3]),Number(match[2])-1,Number(match[1]));
 return date.getFullYear()===Number(match[3])&&date.getMonth()===Number(match[2])-1&&date.getDate()===Number(match[1])?date:null;
}

export function activities(program){
  const items=[];
  for(const [dayIndex,day] of program.entries()){
    for(const ex of day.esercizi||[]){
      for(const record of Array.isArray(ex.storico)?ex.storico:[]){
        if(!Array.isArray(record.serie)||!record.serie.length)continue;
        items.push({dayIndex,day:day.titolo,exercise:ex.nome||'Esercizio',date:record.data||'',savedAt:record.saved_at||'',sets:record.serie.length,note:record.note||'',series:record.serie});
      }
    }
  }
  return items.sort((a,b)=>dateValue(b.date)-dateValue(a.date)||b.savedAt.localeCompare(a.savedAt));
}

export function daysWithActivity(program){return new Set(activities(program).map(a=>a.date).filter(Boolean)).size;}
export function weeklyTraining(program,weeks=6,now=new Date()){
 const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate());monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
 const result=Array.from({length:weeks},(_,index)=>{const start=new Date(monday);start.setDate(start.getDate()-(weeks-1-index)*7);return {start,label:`${start.getDate()}/${start.getMonth()+1}`,count:0};});
 const uniqueDates=new Set(activities(program).map(item=>item.date));
 for(const value of uniqueDates){const date=activityDate(value);if(!date)continue;const index=result.findIndex((bucket,i)=>date>=bucket.start&&(i===result.length-1||date<result[i+1].start));if(index>=0)result[index].count++;}
 return result.map(({label,count})=>({label,count}));
}
export function strengthChanges(program){
 const result=[];
 for(const day of program)for(const ex of day.esercizi||[]){
  const points=(Array.isArray(ex.storico)?ex.storico:[]).map(record=>({date:record.data,value:Math.max(0,...(record.serie||[]).map(set=>Number(String(set.kg||'').replace(',','.'))||0))})).filter(point=>activityDate(point.date)&&point.value>0).sort((a,b)=>dateValue(a.date)-dateValue(b.date));
  if(points.length<2)continue;
  const current=points.at(-1),previous=points.at(-2);
  result.push({exercise:ex.nome||'Esercizio',current:current.value,previous:previous.value,difference:current.value-previous.value,date:current.date,previousDate:previous.date});
 }
 return result.sort((a,b)=>dateValue(b.date)-dateValue(a.date));
}

export function measurementTrend(rows,key){
  const valid=(rows||[]).map(row=>({date:row.created_at,value:Number(String(row[key]||'').replace(',','.'))})).filter(item=>item.value>0&&Number.isFinite(item.value));
  if(valid.length<2)return null;
  const difference=valid[0].value-valid[1].value;
  return {current:valid[0].value,previous:valid[1].value,difference,previousDate:valid[1].date};
}
