import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext();
const page=await context.newPage();
page.setDefaultTimeout(7000);
const errors=[],results=[];
let expectedNetworkFailure=false;
page.on('pageerror',e=>errors.push(e.message));
page.on('console',message=>{if(message.type()==='error'&&!expectedNetworkFailure)errors.push(message.text());});
const go=async(time='1942-05-07T08:45:00+10:00',view='god',event)=>{
 await page.goto('http://127.0.0.1:5173/?'+new URLSearchParams({time,view,...event?{event}:{}}));
 await page.locator('.sea-map').waitFor();
};
const check=async(name,fn)=>{try{await fn();results.push({name,pass:true});console.log('PASS '+name);}catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL '+name+': '+e.message);await page.screenshot({animations:'disabled',path:'docs/browser-failure.png',timeout:5000}).catch(()=>{});}};
const view=async(name)=>page.getByRole('button',{name:new RegExp(name+'$')}).click();
const time=()=>page.locator('.date-control strong').textContent();
await page.setViewportSize({width:1440,height:900});
await check('三视角同刻切换保留海图缩放与中心；敌方真实部队消失',async()=>{
 await go();await page.getByRole('button',{name:'放大海图',exact:true}).click();
 const camera=await page.locator('.sea-map > g').first().getAttribute('transform');
 await view('美军视角');assert.equal(await time(),'08:45');assert.equal(await page.locator('.sea-map > g').first().getAttribute('transform'),camera);
 assert.equal(await page.locator('.fleet-marker').count(),4);assert.equal(await page.getByRole('button',{name:/第五航空战队，/}).count(),0);
 await view('日军视角');assert.equal(await time(),'08:45');assert.equal(await page.locator('.sea-map > g').first().getAttribute('transform'),camera);
 assert.equal(await page.getByRole('button',{name:/约克城号，/}).count(),0);
});
await check('隐藏对象深链接不可打开，搜索也不泄漏身份',async()=>{
 await go('1942-05-07T10:00:00+10:00','us','07-shoho-find');
 assert.equal(await page.locator('.detail-panel').count(),0);
 await page.getByRole('textbox',{name:'搜索当前可见事件'}).fill('祥凤');
 assert.equal(await page.locator('.event-row').count(),0);
 assert.match(await page.locator('.empty-state').innerText(),/没有匹配/);
});
await check('美军原始误报与修正版均可阅读，回退撤销修正',async()=>{
 await go('1942-05-07T11:30:00+10:00','us');
 assert.equal(await page.locator('.event-row').filter({hasText:'西北方报告两艘航母'}).count(),1);
 await page.locator('.event-row').filter({hasText:'修正：原报告中的航母并不存在'}).click();
 assert.equal(await page.locator('.account-history>div').count(),2);
 await page.getByRole('slider',{name:'拖动回放时间'}).fill('600');
 assert.equal(await page.locator('.event-row').filter({hasText:'修正：'}).count(),0);
 assert.equal(await time(),'10:00');
});
await check('从修正后点击原报、刷新版本链接、回到历史记录时刻',async()=>{
 await go('1942-05-07T12:00:00+10:00','us');
 await page.locator('.event-row').filter({hasText:'西北方报告两艘航母'}).click();
 assert.equal(await time(),'08:45');assert.equal(await page.locator('.detail-panel h2').textContent(),'西北方报告两艘航母');
 await page.reload();assert.equal(await page.locator('.detail-panel h2').textContent(),'西北方报告两艘航母');
 await page.getByRole('slider').fill('720');
 await page.locator('.event-row').filter({hasText:'修正：原报告中的航母并不存在'}).click();
 await page.reload();assert.match(await page.locator('.detail-panel h2').textContent(),/修正/);
 await page.locator('.account-history button').first().click();assert.equal(await time(),'08:45');assert.equal(await page.locator('.detail-panel h2').textContent(),'西北方报告两艘航母');
});
await check('阵营接收约时不冒充源文钟点；搜索方向与记录一致',async()=>{
 await go('1942-05-08T13:00:00+10:00','jp');
 await page.locator('.event-row').filter({hasText:'翔鹤号遭袭受损'}).click();
 assert.match(await page.locator('.detail-date').textContent(),/约/);assert.equal(await page.locator('.source-clock').count(),0);
 await go('1942-05-07T06:45:00+10:00','jp');await page.getByRole('button',{name:'地图图层',exact:true}).click();await page.getByRole('checkbox',{name:'搜索方向（示意）',exact:true}).check();
 assert.equal(await page.locator('.search-sector').getAttribute('data-bearing'),'180');assert.equal(await page.locator('.search-sector').getAttribute('data-arc'),'unknown');
 assert.ok(await page.locator('.search-sector g[transform*="rotate(180)"]').count()>0);
 await page.screenshot({animations:'disabled',path:'docs/search-south-iteration4.png'});
 await go('1942-05-08T06:45:00+10:00','us');await page.getByRole('button',{name:'地图图层',exact:true}).click();await page.getByRole('checkbox',{name:'搜索方向（示意）',exact:true}).check();
 assert.equal(await page.locator('.search-sector').getAttribute('data-arc'),'360');
 await page.screenshot({animations:'disabled',path:'docs/search-all-iteration4.png'});
});
await check('缩小时段后拖动不会让窗口持续跟着滑块偏移',async()=>{
 await go();await page.getByRole('combobox',{name:'时间线缩放'}).selectOption('2');
 const ticks=await page.locator('.time-ticks').textContent();
 await page.getByRole('slider').fill('55');assert.equal(await time(),'08:55');assert.equal(await page.locator('.time-ticks').textContent(),ticks);
 await page.getByRole('slider').fill('50');assert.equal(await time(),'08:50');assert.equal(await page.locator('.time-ticks').textContent(),ticks);
});
await check('日军误报接收门槛与纠正，旧接触停留原报告坐标',async()=>{
 await go('1942-05-07T08:59:00+10:00','jp');assert.equal(await page.locator('.contact-marker').count(),0);
 await page.getByRole('slider',{name:'拖动回放时间'}).fill('540');
 assert.match(await page.locator('.contact-marker').textContent(),/疑似航母/);
 const marker=await page.locator('.contact-marker').getAttribute('transform');
 await page.getByRole('slider',{name:'拖动回放时间'}).fill('600');
 assert.equal(await page.locator('.contact-marker').getAttribute('transform'),marker);
 await page.getByRole('slider',{name:'拖动回放时间'}).fill('960');
 assert.equal(await page.locator('.contact-marker').filter({hasText:'疑似航母与巡洋舰'}).count(),0);
 assert.equal(await page.locator('.contact-marker').filter({hasText:'修正：非航母目标'}).count(),1);
});
await check('前后事件到达真实记录节点；键盘及输入保护',async()=>{
 await go('1942-05-07T08:45:00+10:00','us');
 await page.getByRole('button',{name:'下一个事件',exact:true}).click();assert.equal(await time(),'09:03');
 await page.getByRole('button',{name:'上一个事件',exact:true}).click();assert.equal(await time(),'08:45');
 await page.locator('body').click({position:{x:1400,y:80}});await page.keyboard.press('ArrowRight');assert.equal(await time(),'09:03');
 await page.keyboard.press('Escape');assert.equal(await page.locator('.detail-panel').count(),0);
 await page.getByRole('textbox',{name:'搜索当前可见事件'}).fill('Fletcher');await page.keyboard.press('ArrowRight');assert.equal(await time(),'09:03');
});
await check('播放、暂停、速度和引导自动暂停',async()=>{
 await go('1942-05-07T08:45:00+10:00','us');
 await page.getByRole('combobox',{name:'播放速度'}).selectOption('120');
 await page.getByRole('checkbox',{name:'引导回放'}).check();await page.getByRole('button',{name:'开始回放',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.date-control strong')?.textContent==='11:00');
 await page.getByRole('button',{name:'开始回放',exact:true}).waitFor();
 assert.equal(await page.locator('.detail-panel h2').textContent(),'修正：原报告中的航母并不存在');
 assert.match(await page.locator('.detail-body').textContent(),/返航侦察员解释/);
 assert.equal(new URL(page.url()).searchParams.get('event'),'07-us-error~1');
 await page.screenshot({animations:'disabled',path:'docs/guided-correction-iteration4.png'});
 await page.reload();assert.equal(await time(),'11:00');assert.equal(await page.locator('.detail-panel h2').textContent(),'修正：原报告中的航母并不存在');
 assert.equal(await page.locator('.account-history>div').count(),2);
 await page.getByRole('checkbox',{name:'引导回放'}).uncheck();await page.getByRole('combobox',{name:'播放速度'}).selectOption('5');
 await page.locator('body').click({position:{x:1400,y:80}});await page.keyboard.press('Space');
 await page.getByRole('button',{name:'暂停回放',exact:true}).waitFor();await page.keyboard.press('Space');
 await page.getByRole('button',{name:'开始回放',exact:true}).waitFor();
});
await check('7日航空方向随已知报告修订，回退还原原目标',async()=>{
 await go('1942-05-07T10:30:00+10:00','us');
 const routes=page.locator('.air-route');assert.equal(await routes.count(),2);
 const before=await routes.locator('path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));
 assert.ok((await routes.allTextContents()).every(s=>s.includes('按原报出击')));
 await page.screenshot({animations:'disabled',path:'docs/routes-initial-iteration4.png'});
 await page.getByRole('slider').fill('682');assert.deepEqual(await routes.locator('path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d'))),before);
 await page.getByRole('slider').fill('683');
 const after=await routes.locator('path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));assert.notDeepEqual(after,before);
 assert.ok((await routes.allTextContents()).every(s=>s.includes('按新报调整')));
 await page.screenshot({animations:'disabled',path:'docs/routes-revised-iteration4.png'});
 await page.getByRole('slider').fill('630');assert.deepEqual(await routes.locator('path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d'))),before);
 assert.ok((await routes.allTextContents()).every(s=>s.includes('按原报出击')));
});
await check('战略章节末端可直接恢复、播放到达并拖回过去',async()=>{
 for(const [end,event]of [['1942-05-03T23:59:00+10:00',undefined],['1943-02-09T23:59:00+10:00','a-end']])for(const side of ['god','us','jp']){
  await go(end,side,event);
  const slider=page.getByRole('slider'),max=Number(await slider.getAttribute('max'));assert.ok(max>10000);
  assert.ok(new Set(await page.locator('.time-ticks span').allTextContents()).size>1);
  assert.equal(Number(await slider.inputValue()),max);
  assert.equal(await page.locator('.time-cursor').evaluate(el=>el.style.left),'100%');
  await slider.fill(String(max-1));assert.equal(await time(),'23:58');
  await page.getByRole('button',{name:'开始回放',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.date-control strong')?.textContent==='23:59');
  await page.getByRole('button',{name:'开始回放',exact:true}).waitFor();
  assert.equal(Number(await slider.getAttribute('max')),max);
  assert.equal(await page.locator('.time-cursor').evaluate(el=>el.style.left),'100%');
  if(event&&side==='god')await page.screenshot({animations:'disabled',path:'docs/chapter-end-iteration4.png'});
  await slider.fill(String(Math.floor(max/2)));assert.ok(new Date(new URL(page.url()).searchParams.get('time')).getTime()<new Date(end).getTime());
 }
});
await check('早期袭击地图与详情定位吉尔伯特／马绍尔目标区',async()=>{
 await go('1942-02-01T23:59:00+10:00','god','b-carrier-raids');
 assert.match(await page.locator('.detail-place').textContent(),/吉尔伯特.*马绍尔.*区域示意/);
 assert.doesNotMatch(await page.locator('.detail-place').textContent(),/珍珠港/);
 const center=await page.locator('.selection-ring').getAttribute('transform');
 await page.screenshot({animations:'disabled',path:'docs/early-raids-iteration4.png'});
 await page.locator('.event-row').filter({hasText:'珍珠港：太平洋战争爆发'}).click();
 assert.notEqual(await page.locator('.selection-ring').getAttribute('transform'),center);
});
await check('地图双向联动、部队跟随，手动拖动解除跟随',async()=>{
 await go();await page.getByRole('button',{name:/第五航空战队，/}).locator('circle').first().click();
 assert.match(await page.locator('.detail-panel h2').textContent(),/第五航空战队/);
 await page.getByRole('button',{name:'跟随此部队',exact:true}).click();
 assert.match(await page.locator('.map-disclaimer').textContent(),/跟随所选对象/);
 await page.mouse.move(940,550);await page.mouse.down();await page.mouse.move(890,580,{steps:8});await page.mouse.up();
 assert.match(await page.locator('.map-disclaimer').textContent(),/自由探索/);
 const camera=await page.locator('.sea-map > g').first().getAttribute('transform');
 await page.getByRole('slider',{name:'拖动回放时间'}).fill('600');
 assert.equal(await page.locator('.sea-map > g').first().getAttribute('transform'),camera);
});
await check('图层、筛选、时间尺度及日期选择',async()=>{
 await go();await page.getByRole('button',{name:'地图图层',exact:true}).click();
 await page.getByRole('checkbox',{name:'情报接触',exact:true}).uncheck();assert.equal(await page.locator('.contact-marker').count(),0);
 await page.getByRole('checkbox',{name:'搜索方向（示意）',exact:true}).check();assert.ok(await page.locator('.search-sector').count()>0);
 await page.getByRole('checkbox',{name:'200 海里参考圈',exact:true}).check();
 await page.getByRole('combobox',{name:'筛选事件类型'}).selectOption('report');
 assert.ok((await page.locator('.event-row .event-meta small').allTextContents()).every(t=>t==='情报报告'));
 await page.getByRole('combobox',{name:'时间线缩放'}).selectOption('2');assert.equal(await page.getByRole('slider').getAttribute('max'),'120');
 await page.getByLabel('选择回放日期').fill('1942-05-05');assert.equal(await page.getByLabel('选择回放日期').inputValue(),'1942-05-05');
});
await check('聚合事件可展开并选择',async()=>{
 await go();await page.locator('.timeline-point').filter({hasText:'2'}).first().click();
 assert.ok(await page.locator('.cluster-popup>button:not(.cluster-close)').count()>1);
 await page.locator('.cluster-popup>button:not(.cluster-close)').first().click();assert.equal(await page.locator('.detail-panel').count(),1);
});
await check('源时钟及同刻损管知识差异、链接刷新恢复',async()=>{
 await go('1942-05-08T12:00:00+10:00','god','08-explosion');
 assert.match(await page.locator('.source-clock').textContent(),/12:47.*UTC\+11.*减1小时/);
 assert.equal(await page.locator('.detail-panel h2').textContent(),'列克星敦号内部发生严重爆炸');
 await view('美军视角');assert.equal(await page.locator('.detail-panel').count(),0);
 await go('1942-05-08T13:52:00+10:00','us','08-explosion');await page.reload();
 assert.equal(await time(),'13:52');assert.match(await page.locator('.detail-panel h2').textContent(),/火灾失控/);
});
await check('章节导航、战略尺度、跨章因果链接',async()=>{
 await go();await page.getByRole('button',{name:'03战斗之后',exact:true}).click();
 await page.getByRole('combobox',{name:'时间线缩放'}).selectOption('1');
 await page.getByRole('combobox',{name:'时间线缩放'}).selectOption('0');
 await page.locator('.event-row').filter({hasText:'第五航空战队需要整补'}).click();
 await page.locator('.relation').first().click();assert.equal(await page.getByLabel('选择回放日期').inputValue(),'1942-05-08');
 await page.getByRole('button',{name:'01走向珊瑚海',exact:true}).click();
 await page.locator('.event-row').filter({hasText:'珍珠港：太平洋战争爆发'}).click();assert.match(await page.locator('.detail-body').textContent(),/12 月 7 日/);
});
await check('史料弹窗焦点与Escape关闭',async()=>{
 await go();await page.getByRole('button',{name:'史料与说明',exact:true}).click();
 assert.equal(await page.getByRole('dialog').count(),1);await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>!!document.activeElement.closest('[role="dialog"]')),true);
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
});
for(const [width,height]of [[1280,800],[1440,900],[1920,1080],[2560,1440]])await check(`桌面 ${width}×${height} 默认与详情布局`,async()=>{
 await page.setViewportSize({width,height});await go();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({animations:'disabled',path:`docs/desktop-${width}-iteration4.png`});
 await page.locator('.event-row').filter({hasText:'美军收到“两艘航母”的错误报告'}).click();
 await page.locator('.detail-panel').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
 const bounds=await page.locator('.detail-panel').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y+bounds.height<=height);
 await page.getByRole('button',{name:'关闭详情',exact:true}).click();
});
await check('外部网络不可用时保留完整海图与事件',async()=>{
 expectedNetworkFailure=true;
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:5173')?route.continue():route.abort());
 await go();assert.ok((await page.locator('.sea-map path').count())>15);assert.ok(await page.locator('.event-row').count()>20);
 await page.unroute('**/*');expectedNetworkFailure=false;
});
await check('低动画偏好与窄屏提示',async()=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:900,height:700});
 assert.equal(await page.locator('.mobile-message').isVisible(),true);
 await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'no-preference'});
});
await check('核心流程没有运行时异常',async()=>assert.deepEqual(errors,[]));
await go('1942-05-07T11:30:00+10:00','us','07-us-error~1');
await page.screenshot({animations:'disabled',path:'docs/report-history-iteration4.png'});
await go();
writeFileSync('docs/browser-results.json',JSON.stringify({date:new Date().toISOString(),browser:'Playwright / system Chrome',results,errors},null,2));
console.log(`${results.filter(r=>r.pass).length}/${results.length} passed`);
await browser.close();
process.exitCode=results.some(r=>!r.pass)?1:0;
