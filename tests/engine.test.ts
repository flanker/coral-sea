import {test} from 'node:test';
import assert from 'node:assert/strict';
import {visibleEvents,visibleContacts,visibleUnits,unitSnapshot,searchEvents,chapterAt,distanceNM,visibleRecords,nextRecordTime} from '../src/engine';
import {units} from '../src/data/units';
import {iso,t,type View} from '../src/model';
const time=(s:string)=>t(iso(s));
test('日军收到报告前没有南方接触，收到后保持错误舰种，不泄漏真实油船名',()=>{
 assert.equal(visibleContacts(time('1942-05-07 08:59'),'jp').length,0);
 const events=visibleEvents(time('1942-05-07 09:00'),'jp','battle');
 assert.equal(events.find(e=>e.id==='07-jp-error')?.title,'南方发现疑似航母');
 assert.doesNotMatch(events.map(e=>e.title+e.body).join(''),/尼奥肖|西姆斯/);
});
test('美军误报只有在11时回舰解释后才修正，回退会恢复原报告',()=>{
 const before=visibleEvents(time('1942-05-07 10:30'),'us','battle').find(e=>e.id==='07-us-error');
 const after=visibleEvents(time('1942-05-07 11:00'),'us','battle').find(e=>e.id==='07-us-error');
 assert.equal(before?.title,'西北方报告两艘航母');assert.match(after?.title??'',/修正/);
 visibleEvents(time('1942-05-08 23:59'),'god','battle');
 assert.deepEqual(visibleEvents(time('1942-05-07 10:30'),'us','battle').find(e=>e.id==='07-us-error'),before);
});
test('旧接触保留报告坐标，时间推进不跟踪真实敌舰',()=>{
 const first=visibleContacts(time('1942-05-08 08:30'),'us').find(c=>c.id==='us-carrier8')!;
 const later=visibleContacts(time('1942-05-08 16:30'),'us').find(c=>c.id==='us-carrier8')!;
 assert.deepEqual(first.location,later.location);assert.equal(later.ageMinutes,550);assert.equal(later.stale,true);
});
test('收到纠正后撤回旧接触，回到过去撤销修正',()=>{
 const later=visibleContacts(time('1942-05-07 16:00'),'jp');
 assert.equal(later.some(c=>c.id==='jp-false'),false);assert.equal(later.some(c=>c.id==='jp-corrected'),true);
 assert.equal(visibleContacts(time('1942-05-07 10:00'),'jp').some(c=>c.id==='jp-false'),true);
});
test('舰钟12:47爆炸换算11:47；13:52通知前指挥部不知' ,()=>{
 const earlier=time('1942-05-08 13:51');
 assert.equal(visibleEvents(earlier,'us','battle').some(e=>e.id==='08-explosion'),false);
 assert.equal(visibleEvents(earlier,'god','battle').some(e=>e.id==='08-explosion'),true);
 const lex=units.find(u=>u.id==='lexington')!;
 assert.doesNotMatch(unitSnapshot(lex,earlier,'us')!.state,/爆炸/);
 assert.match(unitSnapshot(lex,earlier,'god')!.state,/爆炸/);
 assert.equal(visibleEvents(time('1942-05-08 13:52'),'us','battle').some(e=>e.id==='08-explosion'),true);
});
test('敌方真实部队及其精确状态在阵营中不可获得',()=>{
 for(const side of ['us','jp'] as const){assert.ok(visibleUnits(time('1942-05-08 23:59'),side).every(u=>u.side===side));}
 const us=visibleEvents(time('1942-05-07 13:45'),'us','battle');
 assert.equal(searchEvents(us,'祥凤').length,0);
 const god=visibleEvents(time('1942-05-07 13:45'),'god','battle');
 assert.ok(searchEvents(god,'祥凤').length>0);
});
test('报告击沉和确知舰名分离；未来状态不能倒灌',()=>{
 const report=visibleEvents(time('1942-05-07 13:45'),'us','battle').find(e=>e.id==='07-shoho-loss')!;
 assert.match(report.title,/报告/);assert.doesNotMatch(report.title+report.body,/祥凤/);
 const before=visibleUnits(time('1942-05-08 17:00'),'us').find(u=>u.id==='lexington')!;
 assert.doesNotMatch(before.state,/沉没/);
 const after=visibleUnits(time('1942-05-08 20:00'),'us').find(u=>u.id==='lexington')!;
 assert.match(after.state,/沉没/);
});
test('阵营视角不能借由未来导航参数取得未来事件',()=>{
 assert.equal(visibleEvents(time('1942-05-06 12:00'),'us','battle',true).some(e=>e.id==='08-lex-loss'),false);
 assert.equal(visibleEvents(time('1942-05-06 12:00'),'god','battle',false).some(e=>e.id==='08-lex-loss'),false);
});
test('直接跳转与逐步播放的最终状态一致，跨章日期正确',()=>{
 const target=time('1942-05-08 15:00');
 for(const view of ['god','us','jp']as View[]){const direct=visibleEvents(target,view);for(let now=time('1942-05-04 00:00');now<target;now+=3600000)visibleEvents(now,view);assert.deepEqual(visibleEvents(target,view),direct);}
 assert.equal(chapterAt(time('1942-05-03 23:59')),'background');assert.equal(chapterAt(time('1942-05-04 00:00')),'battle');assert.equal(chapterAt(time('1942-05-09 00:00')),'aftermath');
});
test('日期级事件不会在当天早晨提前出现在阵营视角',()=>{
 assert.equal(visibleEvents(time('1942-04-25 08:00'),'us').some(e=>e.id==='b-intel'),false);
 assert.equal(visibleEvents(time('1942-04-25 23:59'),'us').some(e=>e.id==='b-intel'),true);
});
test('地理距离以海里计，跨换日线采用短距离',()=>{
 assert.ok(Math.abs(distanceNM([0,0],[1,0])-60)<.1);
 assert.ok(distanceNM([179,0],[-179,0])<121);
});

import {recordTime} from '../src/time';
import {events as historical} from '../src/data/events';
test('舰钟转换保留原文：7日调钟前后与8日损管链统一为UTC+10',()=>{
 assert.equal(time('1942-05-07 16:53'),t(recordTime('1942-05-07 16:53','oni3')));
 assert.equal(time('1942-05-07 16:47'),t(recordTime('1942-05-07 17:47','oni3')));
 const explosion=historical.find(e=>e.id==='08-explosion')!;
 assert.equal(explosion.rawTime,'1942-05-08 12:47');assert.equal(explosion.sourceOffset,11);
 assert.equal(t(explosion.at),time('1942-05-08 11:47'));
 assert.equal(t(explosion.accounts.us![0].availableAt),time('1942-05-08 13:52'));
});
test('修正后原报告仍存在于日志和详情，回退只移除修正版',()=>{
 const later=visibleRecords(time('1942-05-07 12:00'),'us','battle');
 assert.ok(later.some(e=>e.title==='西北方报告两艘航母'&&t(e.at)===time('1942-05-07 08:45')));
 assert.equal(later.find(e=>e.id==='07-us-error~1')!.history!.length,2);
 const past=visibleRecords(time('1942-05-07 10:00'),'us','battle');
 assert.equal(past.some(e=>e.title.startsWith('修正：')),false);
});
test('下一事件跳到未来首次允许的记录时间，不预先展示标题',()=>{
 const before=time('1942-05-07 08:45');
 assert.equal(nextRecordTime(before,'us','battle',1),time('1942-05-07 09:03'));
 assert.equal(visibleRecords(before,'us','battle').some(e=>e.id==='07-cap-first'),false);
});
test('早期部队简介与整补账户不提前描述后续分遣或中途岛结果',()=>{
 const crace=unitSnapshot(units.find(u=>u.id==='crace')!,time('1942-05-04 12:00'),'us')!;
 assert.doesNotMatch(crace.composition+crace.task,/5月7|阻截|水道/);
 const refit=visibleEvents(time('1942-05-20 23:59'),'jp').find(e=>e.id==='a-jp-carriers')!;
 assert.doesNotMatch(refit.body,/中途岛|未参加/);
});
test('原始接触采用ONI经纬度，日期级账户不因调钟提前解锁',()=>{
 assert.deepEqual(visibleContacts(time('1942-05-07 10:00'),'us')[0].location,[152.45,-10.05]);
 assert.equal(visibleEvents(time('1942-05-07 23:00'),'jp').some(e=>e.id==='07-convoy-turn'),false);
 assert.equal(visibleEvents(time('1942-05-07 23:59'),'jp').some(e=>e.id==='07-convoy-turn'),true);
});

import {searchBoundary}from'../src/search';
test('原始报告版本ID在纠正前后稳定，逐条回到当时可取到同一版本',()=>{
 const later=visibleRecords(time('1942-05-07 12:00'),'us','battle').filter(e=>e.eventId==='07-us-error');
 assert.equal(later.length,2);
 for(const record of later){const restored=visibleRecords(t(record.at),'us','battle').find(e=>e.id===record.id);assert.ok(restored);assert.equal(restored.title,record.title);assert.equal(restored.body,record.body);}
});
test('账户接收精度独立于实际攻击；未知日方时区不继承美方时区',()=>{
 const a=visibleEvents(time('1942-05-08 13:00'),'jp').find(e=>e.id==='08-shokaku1')!;
 assert.equal(a.precision,'approx');assert.equal(a.rawTime,undefined);assert.equal(a.sourceOffset,null);
 assert.equal(t(a.at),time('1942-05-08 11:30'));
 for(const e of historical)for(const accounts of Object.values(e.accounts))for(const a of accounts)assert.ok(a.precision,e.id+' 接收精度不能为空');
});
test('日军来源文字与行动账户不披露敌方搜索时间和空中动作',()=>{
 const unit=unitSnapshot(units.find(u=>u.id==='car div')!,time('1942-05-08 13:00'),'jp')!;
 assert.doesNotMatch(unit.note,/美方|08:20/);
 const launch=visibleEvents(time('1942-05-08 12:00'),'jp').find(e=>e.id==='08-jp-launch')!;
 assert.doesNotMatch(launch.body,/相向|两支攻击群/);
 const early=unitSnapshot(units.find(u=>u.id==='crace')!,time('1942-05-04 12:00'),'us')!;
 assert.doesNotMatch(early.composition,/5月6|5月7|芝加哥/);
});
test('搜索记录体现南向和全向；未知范围不伪造扇区边界',()=>{
 const south=historical.find(e=>e.id==='07-jp-search')!.searchPlan!;
 assert.equal(south.bearing,180);assert.equal(searchBoundary([157,-13],south),null);
 const all=historical.find(e=>e.id==='08-us-search')!.searchPlan!;
 assert.equal(all.arc,360);assert.equal(all.radiusNM,200);assert.equal(all.southRadiusNM,150);
 const boundary=searchBoundary([154,-14],all)!;
 assert.ok(boundary.some(p=>p[1]>-13)&&boundary.some(p=>p[1]<-15)&&boundary.some(p=>p[0]<153)&&boundary.some(p=>p[0]>155));
});
test('8日撤退判断链按报告和约时决策逐步解锁',()=>{
 assert.equal(visibleEvents(time('1942-05-08 13:21'),'us').some(e=>e.id==='08-extra-carrier'),false);
 assert.ok(visibleEvents(time('1942-05-08 13:22'),'us').some(e=>e.id==='08-extra-carrier'));
 assert.equal(visibleEvents(time('1942-05-08 13:30'),'us').find(e=>e.id==='08-assess-options')?.precision,'approx');
 assert.ok(visibleEvents(time('1942-05-08 13:45'),'us').some(e=>e.id==='08-retire-decision'));
});


test('7日出击先按原报位置，新目标传达后才调整，回退恢复原方向',()=>{
 for(const view of ['us','god'] as View[])for(const id of ['07-us-launch1','07-us-launch2']){
  const routeAt=(at:string)=>visibleRecords(time(at),view,'battle').find(e=>e.id===id)!.route!;
  const initial=routeAt('1942-05-07 10:30');
  assert.deepEqual(initial.to,[152.45,-10.05]);assert.match(initial.label!,/原报/);
  assert.deepEqual(routeAt('1942-05-07 11:22'),initial);
  const revised=routeAt('1942-05-07 11:23');
  assert.deepEqual(revised.to,[152.4333,-10.5667]);assert.match(revised.label!,/新报/);
  assert.deepEqual(routeAt('1942-05-07 10:30'),initial);
  assert.equal('revisions' in initial,false);
 }
 assert.equal(visibleRecords(time('1942-05-07 11:30'),'jp','battle').some(e=>e.id==='07-us-launch1'),false);
});
test('早期突袭定位目标岛群而非珍珠港，阵营记录采用同一地区概括',()=>{
 const fact=historical.find(e=>e.id==='b-carrier-raids')!;
 assert.ok(fact.location[0]>165&&fact.location[0]<175&&fact.location[1]>0&&fact.location[1]<12);
 assert.match(fact.place,/吉尔伯特.*马绍尔.*区域示意/);
 assert.ok(distanceNM(fact.location,[-157.95,21.35])>1500);
 assert.deepEqual(visibleRecords(time('1942-02-01 23:59'),'us').find(e=>e.id===fact.id)!.location,fact.location);
});
