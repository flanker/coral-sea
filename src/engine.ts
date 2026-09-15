import {events} from './data/events';
import {units} from './data/units';
import {contacts} from './data/contacts';
import {t,type Chapter,type View,type VisibleEvent,type Unit,type Point,type FlightRoute} from './model';
/** Route revisions use the report available to this observer, never a future attack position. */
function knownRoute(route:FlightRoute|undefined,now:number,view:View):VisibleEvent['route']{
 if(!route)return undefined;
 let to=route.to,label=route.label??'出击方向（示意）';
 for(const revision of route.revisions??[]){
  const report=events.find(e=>e.id===revision.eventId);
  if(!report)continue;
  const position=view==='god'?(t(report.at)<=now?report.location:undefined):report.accounts[view]?.filter(a=>t(a.availableAt)<=now).at(-1)?.location;
  if(position){to=position;label=revision.label;}
 }
 return {from:route.from,to,label};
}
export function visibleEvents(now:number,view:View,chapter?:Chapter,includeFuture=false):VisibleEvent[]{
  return events.filter(e=>!chapter||e.chapter===chapter).flatMap<VisibleEvent>(e=>{
    if(view==='god') return t(e.at)<=now||includeFuture ? [{id:e.id,at:e.at,eventAt:e.at,precision:e.precision,title:e.title,body:e.body,location:e.location,place:e.place,side:e.side,kind:e.kind,units:e.units,citations:e.citations,importance:e.importance,basis:'史料重建',note:e.uncertainty,route:knownRoute(e.route,now,view),relation:e.relation,rawTime:e.rawTime,sourceOffset:e.sourceOffset,searchPlan:e.searchPlan}] : [];
    const account=e.accounts[view]?.filter(a=>t(a.availableAt)<=now).sort((a,b)=>t(b.availableAt)-t(a.availableAt))[0];
    if(!account)return [];
    return [{id:e.id,at:account.availableAt,eventAt:account.availableAt,precision:account.precision??'approx',title:account.title,body:account.body,location:account.location,place:'当时已知的事件／报告位置',side:view,kind:e.kind,units:account.units.filter(id=>units.find(u=>u.id===id)?.side===view),citations:e.citations,importance:e.importance,basis:account.basis,note:account.note,history:e.accounts[view]?.filter(a=>t(a.availableAt)<=now),searchPlan:e.searchPlan,rawTime:account.rawTime,sourceOffset:account.sourceOffset,route:account.units.some(id=>units.find(u=>u.id===id)?.side===view)?knownRoute(e.route,now,view):undefined}];
  }).sort((a,b)=>t(a.at)-t(b.at)||a.id.localeCompare(b.id));
}
/** The latest account drives the current contact; earlier versions remain in the readable log. */
export function visibleRecords(now:number,view:View,chapter?:Chapter,includeFuture=false):VisibleEvent[]{
 return visibleEvents(now,view,chapter,includeFuture).flatMap(e=>!e.history?[{...e,eventId:e.id}]:e.history.map((a,i)=>({...e,eventId:e.id,id:i===0?e.id:`${e.id}~${i}`,at:a.availableAt,eventAt:a.availableAt,title:a.title,body:a.body,location:a.location,units:a.units,precision:a.precision??'approx',basis:a.basis,note:a.note,history:e.history!.slice(0,i+1),rawTime:a.rawTime,sourceOffset:a.sourceOffset,route:i===e.history!.length-1?e.route:undefined}))).sort((a,b)=>t(a.at)-t(b.at)||a.id.localeCompare(b.id));
}
export function visibleContacts(now:number,view:View){
 const arrived=contacts.filter(c=>(view==='god'||c.side===view)&&t(c.receivedAt)<=now&&(!c.expiresAt||t(c.expiresAt)>now));
 const replaced=new Set(arrived.map(c=>c.supersedes));
 return arrived.filter(c=>!replaced.has(c.id)).map(c=>({...c,ageMinutes:Math.max(0,Math.floor((now-t(c.observedAt))/60000)),stale:now-t(c.observedAt)>3600000}));
}
export function unitSnapshot(unit:Unit,now:number,view:View){
 if(view!=='god'&&view!==unit.side)return null;
 const points=unit.points.filter(p=>t(view==='god'?p.at:p.knownAt??p.at)<=now);
 const point=points.at(-1); if(!point)return null;
 const state=unit.changes.filter(p=>t(view==='god'?p.at:p.knownAt??p.at)<=now).at(-1);
 const formation=unit.formations?.filter(f=>t(f.at)<=now).at(-1);
 const note=view!=='god'&&unit.side==='jp'&&point.source.startsWith('oni')?'区域位置示意；本方航海日志尚未核对，不能视作精确定位':point.note;
 return {...unit,...formation,point:point.point,lastFix:point.at,note,positionPrecision:note.includes('示意')?'approx':point.precision??'approx',points,state:state?.text??'状态记录不足'};
}
export function visibleUnits(now:number,view:View){return units.map(u=>unitSnapshot(u,now,view)).filter(u=>u!==null);}
export function searchEvents(list:VisibleEvent[],query:string){
 const q=query.trim().toLocaleLowerCase();
 return !q?list:list.filter(e=>[e.title,e.body,...e.units.map(id=>{const u=units.find(u=>u.id===id);return u?`${u.name} ${u.english} ${u.commander}`:'';})].join(' ').toLocaleLowerCase().includes(q));
}
export function distanceNM(a:Point,b:Point){const r=Math.PI/180,dy=(b[1]-a[1])*r,dx=(b[0]-a[0])*r;return 3440.065*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dy/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dx/2)**2)));}
export function chapterAt(now:number):Chapter{return now<t('1942-05-04T00:00:00+10:00')?'background':now<t('1942-05-09T00:00:00+10:00')?'battle':'aftermath';}
export function nextRecordTime(now:number,view:View,chapter:Chapter,direction:1|-1):number|undefined{
 const times=events.filter(e=>e.chapter===chapter).flatMap(e=>view==='god'?[t(e.at)]:(e.accounts[view]??[]).map(a=>t(a.availableAt))).filter(v=>direction===1?v>now:v<now).sort((a,b)=>a-b);
 return direction===1?times[0]:times.at(-1);
}
