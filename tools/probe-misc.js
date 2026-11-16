// Chat holder styles per state, back-to-top threshold (mobile).
const {chromium,devices}=require('playwright');
const holder=p=>p.evaluate(()=>{const i=document.querySelector('iframe[title="Wix Chat"]');return {iframe:i.getAttribute('style')||'',cls:i.className,holder:i.parentElement.getAttribute('style'),hid:i.parentElement.id,hcls:i.parentElement.className,gp:i.parentElement.parentElement.id+' '+i.parentElement.parentElement.getAttribute('style')}});
(async()=>{const b=await chromium.launch();
  const d=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
  await d.goto('https://www.papier-restaurierung.at/',{waitUntil:'load'});await d.waitForTimeout(8000);
  console.log('desktop closed',JSON.stringify(await holder(d)));
  await d.mouse.click(1140,867);await d.waitForTimeout(3000);console.log('desktop open',JSON.stringify(await holder(d)));
  await d.mouse.click(1235,341);await d.waitForTimeout(3000);console.log('desktop closed again',JSON.stringify(await holder(d)));
  const m=await (await b.newContext(devices['iPhone 13'])).newPage();
  await m.goto('https://www.papier-restaurierung.at/',{waitUntil:'load'});await m.waitForTimeout(8000);
  console.log('mobile closed',JSON.stringify(await holder(m)));
  let prev=null;for(let y=0;y<1500;y+=10){await m.evaluate(y=>scrollTo(0,y),y);await m.waitForTimeout(40);const c=await m.evaluate(()=>document.getElementById('BACK_TO_TOP_BUTTON').className);if(c!==prev){console.log('backtotop',y,c);prev=c}}
  for(let y=1500;y>=0;y-=10){await m.evaluate(y=>scrollTo(0,y),y);await m.waitForTimeout(40);const c=await m.evaluate(()=>document.getElementById('BACK_TO_TOP_BUTTON').className);if(c!==prev){console.log('backtotop down',y,c);prev=c}}
  await m.evaluate(()=>scrollTo(0,2000));await m.waitForTimeout(500);
  await m.locator('#BACK_TO_TOP_BUTTON').click();await m.evaluate(()=>{window.__t=[];const t0=performance.now();const f=()=>{window.__t.push([Math.round(performance.now()-t0),Math.round(scrollY)]);if(performance.now()-t0<2500)requestAnimationFrame(f)};requestAnimationFrame(f)});
  await m.waitForTimeout(2700);console.log('btt traj',JSON.stringify((await m.evaluate(()=>window.__t)).filter((x,i)=>i%5==0)));
  await m.locator('#dynamicAction-QUICK_ACTION_BAR-0').click();await m.waitForTimeout(3000);console.log('mobile open',JSON.stringify(await holder(m)));
  console.log('quick bar',await m.evaluate(()=>document.getElementById('QUICK_ACTION_BAR').className));
  await b.close();})();
