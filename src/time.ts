import {iso,t} from './model';
/** ONI p.20 footnote: after 7 May 1700, ship clocks use zone description -11 (UTC+11). */
export function sourceOffset(raw:string,source:string):number|null{
 if(source.startsWith('oni')&&raw.length>10)return raw>='1942-05-07 17:00'&&raw<'1942-05-09'?11:10;
 return null;
}
export function recordTime(raw:string,source:string){const offset=sourceOffset(raw,source);return offset===11?new Date(t(iso(raw))-3600000).toISOString():iso(raw);}
export function normalizeONIAccount(value:string,source:string){
 const raw=new Date(t(value)+36000000).toISOString().slice(0,16).replace('T',' ');
 return recordTime(raw,source);
}
