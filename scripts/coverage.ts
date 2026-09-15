import {writeFileSync}from'node:fs';
import {events}from'../src/data/events';
import {units}from'../src/data/units';
import {sources}from'../src/data/sources';
import {chapters,kinds,formatDate,formatTime,t}from'../src/model';
const clean=(s:string)=>s.replaceAll('|','／').replaceAll('\n',' ');
const source=(id:string)=>`[${id}](${sources[id].url})`;
let out=`# 事件与来源覆盖表\n\n由当前数据生成，共 ${events.length} 条历史事件。运行 npm run coverage 可重新生成。日期与钟点为 UTC+10；“当日”节点统一放在日期结束，约时是已披露的编排节点。阵营栏为首次允许呈现的时间，不代表全军实时共享消息。\n\n`;
out+='## 逐日与事件类型\n\n| 日期 | 事件数 | 已覆盖的行为类型 | 来源 |\n| --- | ---: | --- | --- |\n';
for(const day of [4,5,6,7,8]){const list=events.filter(e=>e.rawTime.startsWith(`1942-05-0${day}`));out+=`| 5月${day}日 | ${list.length} | ${[...new Set(list.map(e=>kinds[e.kind]))].join('、')} | ${[...new Set(list.flatMap(e=>e.citations.map(c=>c.source)))].map(source).join('、')} |\n`;}
out+='\n## 逐部队\n\n| 部队 | 关联事件数 | 覆盖日期 | 说明 |\n| --- | ---: | --- | --- |\n';
for(const u of units){const list=events.filter(e=>e.units.includes(u.id));out+=`| ${u.name} | ${list.length} | ${[...new Set(list.filter(e=>e.chapter==='battle').map(e=>formatDate(e.at).slice(5)))].join('、')} | ${u.side==='us'?'美军／盟军':'日军'}；位置及损伤另有发生／获知门槛 |\n`;}
for(const chapter of chapters){out+=`\n## ${chapter.name}\n\n| ID／事件 | 战区时间与精度 | 部队 | 美军首次可见 | 日军首次可见 | 来源定位 |\n| --- | --- | --- | --- | --- | --- |\n`;
 for(const e of events.filter(e=>e.chapter===chapter.id).sort((a,b)=>t(a.at)-t(b.at)||a.id.localeCompare(b.id))){const account=(side:'us'|'jp')=>{const a=e.accounts[side]?.[0];return a?`${formatDate(a.availableAt).slice(5)} ${a.precision==='day'?'当日结束':formatTime(a.availableAt)} · ${a.basis}`:'未解锁／无接收证据';};out+=`| ${e.id}<br>${e.title} | ${formatDate(e.at)} ${e.precision==='day'?'当日':formatTime(e.at)} · ${e.precision} | ${e.units.map(id=>units.find(u=>u.id===id)?.name).join('、')||'战区层级'} | ${account('us')} | ${account('jp')} | ${e.citations.map(c=>source(c.source)+' '+clean(c.locator)).join('<br>')} |\n`;}
}
out+='\n## 覆盖口径和留白\n\n此表用于审核事件库的一致性，不能单凭条数证明穷尽史料。重要链条与未覆盖的微观细节见 RESEARCH.md。海图默认为编队、攻击波次和改变指挥认知的报告粒度；个人战果、每一架飞机的航迹、完整电报流水及未对读的日方航海日志不在精确重建范围内。\n';
writeFileSync('docs/COVERAGE.md',out);console.log(`Coverage generated: ${events.length} events.`);
