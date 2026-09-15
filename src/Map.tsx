import {memo,useMemo,useRef,useEffect,type PointerEvent} from 'react';
import {geoMercator,geoPath,geoGraticule10,geoCircle} from 'd3-geo';
import {searchBoundary} from './search';
import {feature} from 'topojson-client';
import landTopology from 'world-atlas/land-50m.json';
import type {Topology,GeometryCollection} from 'topojson-specification';
import {bases} from './data/units';
import {visibleUnits,visibleContacts} from './engine';
import {t,formatTime,formatDate,type Chapter,type View,type VisibleEvent,type Point} from './model';
const land=feature(landTopology as unknown as Topology,landTopology.objects.land as unknown as GeometryCollection);
const grid=geoGraticule10();
export type Camera={x:number;y:number;k:number};
export type Layers={trails:boolean;contacts:boolean;air:boolean;search:boolean;bases:boolean;range:boolean};
type Props={now:number;view:View;chapter:Chapter;events:VisibleEvent[];selected?:VisibleEvent;camera:Camera;setCamera:(c:Camera)=>void;onManual:()=>void;onEvent:(id:string)=>void;onContact:(id:string)=>void;onUnit:(id:string)=>void;layers:Layers;followPoint?:Point};
export const SeaMap=memo(function SeaMap({now,view,chapter,events,selected,camera,setCamera,onManual,onEvent,onContact,onUnit,layers,followPoint}:Props){
 const svg=useRef<SVGSVGElement>(null),drag=useRef<{x:number;y:number;cx:number;cy:number;moved:boolean}|null>(null);
 const projection=useMemo(()=>geoMercator().rotate([chapter==='battle'?-155:-170,0]).center([0,chapter==='battle'?-12:0]).scale(chapter==='battle'?1650:470).translate([780,360]),[chapter]);
 const path=useMemo(()=>geoPath(projection),[projection]);
 const landPath=useMemo(()=>path(land)??'',[path]);const gridPath=useMemo(()=>path(grid)??'',[path]);
 const fleets=chapter==='battle'?visibleUnits(now,view):[];
 const reports=chapter==='battle'&&layers.contacts?visibleContacts(now,view):[];
 const mapEvents=events.filter(e=>e.location&&t(e.at)<=now&&(chapter!=='battle'||now-t(e.at)<21600000));
 const transform=`translate(${camera.x},${camera.y}) scale(${camera.k})`;
 const project=(p:Point)=>projection(p)??[0,0];
 useEffect(()=>{if(followPoint){const p=projection(followPoint);if(p)setCamera({x:780-p[0]*camera.k,y:360-p[1]*camera.k,k:camera.k});}},[followPoint?.[0],followPoint?.[1],projection]);
 function down(e:PointerEvent<SVGSVGElement>){if((e.target as Element).closest('[role="button"]'))return;drag.current={x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y,moved:false};e.currentTarget.setPointerCapture(e.pointerId);}
 function move(e:PointerEvent<SVGSVGElement>){if(!drag.current||!svg.current)return;const ratio=1400/svg.current.getBoundingClientRect().width;const dx=(e.clientX-drag.current.x)*ratio,dy=(e.clientY-drag.current.y)*ratio;if(Math.abs(dx)+Math.abs(dy)>3){drag.current.moved=true;onManual();setCamera({...camera,x:drag.current.cx+dx,y:drag.current.cy+dy});}}
 const key=(fn:()=>void)=>(e:React.KeyboardEvent)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}};
 const shipOffset=(id:string):Point=> id==='lexington'?[-35,28]:id==='crace'?[0,58]:id==='oil'?[-30,-28]:[0,0];
 const labelScale=1/camera.k;
 const occupied:{x:number;y:number;w:number;h:number}[]=[...fleets.map(u=>{const p=project(u.point),o=shipOffset(u.id);return{x:p[0]*camera.k+o[0]-23,y:p[1]*camera.k+o[1]-23,w:46,h:46};}),...reports.map(c=>{const p=project(c.location);return{x:p[0]*camera.k-17,y:p[1]*camera.k-17,w:34,h:34};})];
 const labels=new Map<string,Point>();
 function placeLabel(id:string,point:Point,text:string,offset:Point=[0,0]){
  const raw=project(point),anchor:Point=[raw[0]*camera.k+offset[0],raw[1]*camera.k+offset[1]];
  const w=Math.min(260,Math.max(110,text.length*14)),h=34;
  const candidates=[-12,30,-54,72,-96,114,-138,156];
  let box={x:anchor[0]+28,y:anchor[1]-12,w,h};
  placement:for(const dy of candidates){for(const dx of [28,-w-28]){const next={x:anchor[0]+dx,y:anchor[1]+dy,w,h};if(!occupied.some(b=>next.x<b.x+b.w+9&&next.x+next.w+9>b.x&&next.y<b.y+b.h+7&&next.y+next.h+7>b.y)){box=next;break placement;}}}
  occupied.push(box);labels.set(id,[box.x-anchor[0],box.y-anchor[1]]);
 }
 if(layers.bases)for(const b of bases){if(!b.major)placeLabel('base-'+b.name,b.point,b.name);}
 for(const u of fleets)placeLabel(u.id,u.point,u.name,shipOffset(u.id));
 for(const c of reports)placeLabel(c.id,c.location,c.title);

 return <svg ref={svg} className="sea-map" viewBox="0 0 1400 780" aria-label="珊瑚海交互海图，可拖动平移和滚轮缩放" onPointerDown={down} onPointerMove={move} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null} onWheel={e=>{onManual();setCamera({...camera,k:Math.max(.55,Math.min(4,camera.k*(e.deltaY>0?.9:1.1)))});}}>
  <defs><radialGradient id="sea-light"><stop stopColor="#163a47"/><stop offset="1" stopColor="#071c29"/></radialGradient><pattern id="paper" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".45" fill="#76919a" opacity=".12"/></pattern><marker id="arrow-us" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 8 4 0 8" fill="none" stroke="#7ac5d8"/></marker><marker id="arrow-jp" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 8 4 0 8" fill="none" stroke="#e79179"/></marker><filter id="glow"><feGaussianBlur stdDeviation="4"/></filter></defs>
  <rect width="1400" height="780" fill="url(#sea-light)"/><rect width="1400" height="780" fill="url(#paper)"/>
  <g transform={transform}>
   <path d={gridPath} fill="none" stroke="#426472" strokeWidth={.6/camera.k} opacity=".48"/>
   <path d={landPath} fill="#253e41" stroke="#789087" strokeWidth={1/camera.k}/>
   <path d={landPath} fill="url(#paper)"/>
   {chapter==='battle'&&[140,145,150,155,160,165,170].map(lon=>{const p=project([lon,-2]);return <text key={lon} x={p[0]} y={p[1]} className="grid-label" fontSize={11/camera.k}>{lon}° E</text>;})}
   {layers.bases&&bases.map(b=>{const p=project(b.point),label=labels.get('base-'+b.name)??[0,-9];return <g key={b.name} transform={`translate(${p.join(' ')}) scale(${labelScale})`} className={b.major?'region-label':'base-label'}>
    {!b.major&&<><circle r="3" fill="#bec5af"/><path d="M-7 0H7M0-7V7" stroke="#a1b4ad" opacity=".5"/></>}
    <text x={label[0]} y={label[1]}>{b.name}</text><text className="english" x={label[0]} y={label[1]+15}>{b.english}</text>
   </g>;})}
   <g transform={`translate(${project(chapter==='battle'?[156,-19]:[180,-10]).join(' ')}) scale(${labelScale})`} className="ocean-title"><text textAnchor="middle">{chapter==='battle'?'珊 瑚 海':'太 平 洋'}</text><text textAnchor="middle" y="29" className="english">{chapter==='battle'?'C O R A L   S E A':'P A C I F I C   O C E A N'}</text></g>
   {layers.trails&&fleets.map(u=><path key={`trail-${u.id}`} d={path({type:'LineString',coordinates:u.points.map(p=>p.point)})??''} fill="none" stroke={u.side==='us'?'#80c3d3':'#e38c76'} strokeWidth={1.5/camera.k} strokeDasharray={`${5/camera.k} ${6/camera.k}`} opacity=".5"/>)}
   {layers.range&&fleets.filter(u=>['yorktown','car div'].includes(u.id)).map(u=><path key={`range-${u.id}`} d={path(geoCircle().center(u.point).radius(3.3)())??''} fill="none" stroke={u.side==='us'?'#80c3d3':'#e38c76'} strokeWidth={1/camera.k} strokeDasharray={`${2/camera.k} ${8/camera.k}`} opacity=".35"/>)}
   {layers.search&&fleets.map(u=>{const e=events.filter(e=>e.searchPlan&&e.units.includes(u.id)&&t(e.at)<=now&&now-t(e.at)<14400000).at(-1);if(!e?.searchPlan)return null;const plan=e.searchPlan,p=project(u.point),boundary=searchBoundary(u.point,plan),color=u.side==='us'?'#7ac5d8':'#e79179';return <g key={`search-${u.id}`} className="search-sector" data-bearing={plan.bearing} data-arc={plan.arc??'unknown'} aria-label={plan.label}>
    {boundary?<path d={path({type:'Polygon',coordinates:[boundary]})??''} fill={color} fillOpacity=".065" stroke={color} strokeOpacity=".3" strokeWidth={1/camera.k} strokeDasharray="5 5"/>:<g transform={`translate(${p.join(' ')}) rotate(${plan.bearing})`}><path d="M0-22V-150M-8-138 0-150 8-138" fill="none" stroke={color} strokeOpacity=".5" strokeWidth={1.5/camera.k} strokeDasharray="5 4"/></g>}
    <text x={p[0]} y={p[1]+(plan.bearing>90&&plan.bearing<270?175:-185)} textAnchor="middle" fill="#adc3c9" fontSize={12/camera.k}>{plan.label}</text>
   </g>;})}

   {layers.air&&events.filter(e=>e.route&&t(e.at)<=now&&now-t(e.at)<10800000).map(e=>{const from=project(e.route!.from),to=project(e.route!.to);return <g key={`air-${e.id}`} className="air-route" data-event={e.id} aria-label={e.route!.label}><path d={`M${from} Q${(from[0]+to[0])/2+30},${(from[1]+to[1])/2} ${to}`} stroke={e.side==='jp'?'#e79179':'#7ac5d8'} fill="none" opacity=".65" strokeWidth={1.5/camera.k} strokeDasharray="6 5" markerEnd={`url(#arrow-${e.side==='jp'?'jp':'us'})`}/><text x={(from[0]+to[0])/2+15} y={(from[1]+to[1])/2} fill="#c0cacc" fontSize={11/camera.k}>{e.route!.label??'出击方向（示意）'}</text></g>;})}
   {mapEvents.filter(e=>e.id!==selected?.id).slice(-12).map((e,i)=>{const p=project(e.location!);return <g key={`event-${e.id}`} transform={`translate(${p[0]+(i%3-1)*10},${p[1]+Math.floor(i%6/3)*10}) scale(${labelScale})`} role="button" tabIndex={0} aria-label={e.title} onClick={()=>onEvent(e.id)} onKeyDown={key(()=>onEvent(e.id))} className="map-event"><circle r="10" fill="#ddbd78" fillOpacity=".06"/><circle r="3" fill="#ddbd78"/><title>{e.title}</title></g>;})}
   {fleets.map(u=>{const p=project(u.point),o=shipOffset(u.id),label=labels.get(u.id)??[28,-2],color=u.side==='us'?'#8bcede':'#efa38d';return <g key={u.id} transform={`translate(${p.join(' ')})`}>
    <g transform={`scale(${labelScale}) translate(${o.join(' ')})`} role="button" tabIndex={0} aria-label={`${u.name}，${u.state}`} onClick={()=>onUnit(u.id)} onKeyDown={key(()=>onUnit(u.id))} className="fleet-marker">
     <circle r="19" fill="#0b2430" stroke={color} strokeOpacity=".24"/><circle r="24" stroke={color} strokeOpacity=".08" fill="none"/>
     {u.side==='us'?<path d="M-5 9V-7L0-13 5-7V9Z" fill={color}/>:<path d="M0-12 7 0 0 12-7 0Z" fill={color}/>}
     <path d="M-8 3H8M0-8V9" stroke="#102530"/>
     <path className="map-leader" d={`M12,0 L${label[0]-5},${label[1]+7}`} stroke={color}/><text x={label[0]} y={label[1]} fill={color}>{u.name}</text><text x={label[0]} y={label[1]+16} className="fleet-time">{u.positionPrecision==='record'?'记录位置':'区域／日期记录'} · {u.positionPrecision==='record'?formatTime(u.lastFix):formatDate(u.lastFix).slice(5)}</text>
    </g></g>;})}
   {reports.map(c=>{const p=project(c.location),label=labels.get(c.id)??[21,-17];return <g key={c.id} transform={`translate(${p.join(' ')}) scale(${labelScale})`} role="button" tabIndex={0} aria-label={`${c.title}，${c.stale?'旧接触':'新接触'}`} onClick={()=>onContact(c.eventId)} onKeyDown={key(()=>onContact(c.eventId))} className="contact-marker">
    <circle r="43" stroke="#d8b979" strokeDasharray="3 7" fill="#d8b979" fillOpacity=".035" opacity={c.stale?.5:1}/><path d="M0-15 15 0 0 15-15 0Z" fill="#0b2430" stroke="#d8b979"/><text textAnchor="middle" y="5" fill="#d8b979">?</text>
    <path className="map-leader" d={`M12,0 L${label[0]-5},${label[1]+7}`} stroke="#d8b979"/><text x={label[0]} y={label[1]} className="contact-title">{c.title}</text><text x={label[0]} y={label[1]+17} className="fleet-time">{c.stale?'旧接触':'情报'} · {c.ageMinutes} 分钟前</text>
   </g>;})}
   {selected?.location&&t(selected.at)<=now&&<g transform={`translate(${project(selected.location).join(' ')}) scale(${labelScale})`} className="selection-ring"><circle r="33" fill="none" stroke="#e6ca8c" strokeWidth="1.5"/><circle r="40" fill="none" stroke="#e6ca8c" opacity=".25"/><path d="M-49 0H-36M36 0H49M0-49V-36M0 36V49" stroke="#e6ca8c"/></g>}
  </g>
  <g transform="translate(1315 95)" className="compass"><circle r="32"/><path d="M0-25 7 0 0 25-7 0Z"/><path d="M-25 0H25"/><text y="-42" textAnchor="middle">N</text></g>
  <g transform="translate(960 724)" className="scale"><path d="M0-5V0H100V-5M50 0V-3"/><text y="20">{Math.round(100/(chapter==='battle'?1650:470)/camera.k*3440)} 海里 · 赤道近似比例</text></g>
 </svg>;
});
