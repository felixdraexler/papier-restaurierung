// Fine-grained probe of the menu's selected item on the live site (desktop + mobile).
const {chromium,devices}=require('playwright');
const sel=p=>p.evaluate(()=>[...document.querySelectorAll('[data-state*="selected"],[aria-current="page"]')].map(e=>e.id||e.textContent.trim().slice(0,12)).join(','));
(async()=>{const b=await chromium.launch();
  for(const [prof,o] of [['desktop',{viewport:{width:1280,height:900}}],['mobile',devices['iPhone 13']]]){
  const p=await (await b.newContext(o)).newPage();
  await p.goto('https://www.papier-restaurierung.at/',{waitUntil:'load'});await p.waitForTimeout(3000);
  const h=await p.evaluate(()=>document.body.scrollHeight);for(let y=0;y<h;y+=300){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(60);}
  // all anchor-like elements: wix anchors are role=region with an inner div id
  console.log(prof,'anchors',JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('[role=region]')].filter(e=>e.firstElementChild&&!e.firstElementChild.className).map(e=>[e.id,e.getAttribute('aria-label'),Math.round(e.getBoundingClientRect().top+scrollY)]))));
  let prev='';for(let y=0;y<=h;y+=20){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(60);const s=await sel(p);if(s!==prev){console.log(' ',y,s);prev=s}}
  if(prof==='desktop'){for(const t of ['TÄTIGKEITSBEREICHE','ATELIER','REFERENZEN','KONTAKT','START']){await p.locator('nav a',{hasText:t}).first().click();await p.waitForTimeout(3500);
    const a=await sel(p);await p.mouse.wheel(0,40);await p.waitForTimeout(800);console.log(' click',t,await p.evaluate(()=>scrollY),a,'| after wheel:',await sel(p));}}
  await p.context().close();}
  await b.close();})();
