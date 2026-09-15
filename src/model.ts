export type Side = 'us' | 'jp';
export type View = Side | 'god';
export type Chapter = 'background' | 'battle' | 'aftermath';
export type Kind = 'strategy' | 'search' | 'report' | 'decision' | 'movement' | 'launch' | 'attack' | 'recovery' | 'damage';
export type Point = [number, number];
export type Precision = 'record' | 'approx' | 'day' | 'range';
export interface Citation { source: string; locator: string }
export interface SearchPlan { bearing:number; arc?:number; radiusNM?:number; southRadiusNM?:number; label:string }
export interface FlightRoute {
  from:Point; to:Point; label?:string;
  revisions?:{eventId:string;label:string}[];
}
export interface Account {
  availableAt: string; title: string; body: string; location?: Point; units: string[];
  basis: '指挥部记录' | '阵营层面重建' | '报告接收记录' | '保守解锁'; note?: string;
  rawTime?:string; precision?:Precision; sourceOffset?:number|null;
}
export interface HistoricalEvent {
  id: string; chapter: Chapter; at: string; end?: string; precision: Precision; rawTime: string;
  side: Side | 'both'; kind: Kind; title: string; body: string; location: Point; place: string;
  units: string[]; citations: Citation[]; importance: boolean; accounts: Partial<Record<Side, Account[]>>;
  relation?: {id:string; type:'直接影响'|'背景条件'|'历史解释'; text:string}[];
  uncertainty?: string; route?: FlightRoute; sourceOffset?:number|null; searchPlan?:SearchPlan;
}
export interface VisibleEvent {
  id:string; at:string; eventAt:string; precision:Precision; title:string; body:string; location?:Point;
  place:string; side:Side|'both'; kind:Kind; units:string[]; citations:Citation[]; importance:boolean;
  basis:string; note?:string; route?:Omit<FlightRoute,'revisions'>; relation?:HistoricalEvent['relation'];
  history?:Account[]; rawTime?:string; sourceOffset?:number|null; searchPlan?:SearchPlan; eventId?:string;
}
export interface Contact {
  id:string; side:Side; observedAt:string; receivedAt:string; title:string; body:string; location:Point;
  certainty:string; eventId:string; supersedes?:string; expiresAt?:string;
}
export interface TrackPoint { at:string; point:Point; note:string; source:string; knownAt?:string; precision?:Precision }
export interface Unit {
  id:string; side:Side; name:string; english:string; commander:string; composition:string; task:string;
  points:TrackPoint[]; changes:{at:string; text:string; knownAt?:string}[];
  formations?:{at:string;composition:string;task:string}[];
}
export const kinds:Record<Kind,string> = {strategy:'战略背景',search:'侦察搜索',report:'情报报告',decision:'判断与命令',movement:'机动补给',launch:'航空出击',attack:'攻击交战',recovery:'回收救援',damage:'损伤与损管'};
export const views:Record<View,string> = {god:'上帝视角',us:'美军视角',jp:'日军视角'};
export const t = (date:string) => new Date(date).getTime();
export const iso = (v:string) => v.includes('+') || v.endsWith('Z') ? v : v.replace(' ','T') + (v.length === 10 ? 'T23:59:00+10:00' : ':00+10:00');
export const chapters:{id:Chapter;name:string;sub:string;start:string;end:string;intro:string}[] = [
  {id:'background',name:'走向珊瑚海',sub:'1941.12 — 1942.05',start:iso('1941-12-07 00:00'),end:iso('1942-05-03 23:59'),intro:'从珍珠港到南太平洋，追溯双方在这片海域相遇的原因。'},
  {id:'battle',name:'珊瑚海海战',sub:'1942.05.04 — 05.08',start:iso('1942-05-04 00:00'),end:iso('1942-05-08 23:59'),intro:'五天的搜索、误判与攻击。在同一时刻，观察三个不同的战场。'},
  {id:'aftermath',name:'战斗之后',sub:'1942.05 — 1943.02',start:iso('1942-05-09 00:00'),end:iso('1943-02-09 23:59'),intro:'从受损的飞行甲板，到中途岛、瓜达尔卡纳尔与新几内亚。'}
];
const dateFormat = new Intl.DateTimeFormat('zh-CN',{timeZone:'Etc/GMT-10',year:'numeric',month:'2-digit',day:'2-digit'});
const timeFormat = new Intl.DateTimeFormat('en-GB',{timeZone:'Etc/GMT-10',hour:'2-digit',minute:'2-digit',hour12:false});
export function formatDate(v:string|number){return dateFormat.format(new Date(v));}
export function formatTime(v:string|number){return timeFormat.format(new Date(v));}
export function timeLabel(e:{at:string;precision:Precision}){return e.precision==='day'?'当日': `${e.precision==='approx'||e.precision==='range'?'约 ':''}${formatTime(e.at)}`;}
