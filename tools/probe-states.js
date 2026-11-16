// Saves the live DOM before/after interactions so the differences can be replicated: node probe-states.js <outdir>
const {chromium,devices}=require('playwright');const fs=require('fs');const out=process.argv[2];
const save=async(p,n)=>fs.writeFileSync(`${out}/${n}.html`,await p.evaluate(()=>document.body.outerHTML));
(async()=>{
  const b=await chromium.launch();
  const d=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
  await d.goto('https://www.papier-restaurierung.at/',{waitUntil:'load'});await d.waitForTimeout(4000);
  await save(d,'d-top');
  await d.evaluate(()=>scrollTo(0,3000));await d.waitForTimeout(2000);await save(d,'d-scrolled');
  for(let y=3000;y<=5600;y+=200){await d.evaluate(y=>scrollTo(0,y),y);await d.waitForTimeout(150);}
  await d.waitForTimeout(1500);const l=d.locator('text=Mehr erfahren').first();await l.scrollIntoViewIfNeeded();await d.waitForTimeout(1000);await save(d,'d-collapsed');
  await l.click();await d.waitForTimeout(2000);await save(d,'d-expanded');
  await d.screenshot({path:`${out}/d-expanded.png`});
  // trajectory of a menu scroll
  await d.evaluate(()=>scrollTo(0,0));await d.waitForTimeout(1000);
  await d.evaluate(()=>{window.__t=[];const t0=performance.now();const f=()=>{window.__t.push([Math.round(performance.now()-t0),scrollY]);if(performance.now()-t0<3000)requestAnimationFrame(f)};requestAnimationFrame(f)});
  await d.locator('nav a',{hasText:'ATELIER'}).first().click();await d.waitForTimeout(3200);
  fs.writeFileSync(`${out}/traj.json`,JSON.stringify(await d.evaluate(()=>window.__t)));
  const m=await (await b.newContext(devices['iPhone 13'])).newPage();
  await m.goto('https://www.papier-restaurierung.at/',{waitUntil:'load'});await m.waitForTimeout(4000);
  await save(m,'m-top');
  await m.evaluate(()=>scrollTo(0,3000));await m.waitForTimeout(2000);await save(m,'m-scrolled');
  await m.evaluate(()=>scrollTo(0,0));await m.waitForTimeout(1500);
  await m.locator('#MENU_AS_CONTAINER_TOGGLE').click();await m.waitForTimeout(2000);await save(m,'m-menu');
  await m.screenshot({path:`${out}/m-menu.png`});
  await b.close();
})();
