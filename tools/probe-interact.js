// Records what the live site changes in the DOM when menu items, expanders and the mobile menu are used.
const {chromium,devices}=require('playwright');
const watch=()=>{window.__m=[];new MutationObserver(ms=>{for(const m of ms){const t=m.target;const id=t.id||(t.parentElement&&t.parentElement.id)||t.tagName;
  if(m.type==='attributes')window.__m.push(`${id} @${m.attributeName}=${String(t.getAttribute(m.attributeName)).slice(0,160)}`);
  else window.__m.push(`${id} children +${m.addedNodes.length} -${m.removedNodes.length}`);}}).observe(document.body,{subtree:true,attributes:true,childList:true});};
async function step(p,label,fn){await p.evaluate(()=>window.__m=[]);await fn();await p.waitForTimeout(2500);
  const m=await p.evaluate(()=>[...new Set(window.__m)].filter(s=>!/comp-kh08gc5c|TPA|@data-motion|@style=.*opacity/.test(s)));
  console.log(`--- ${label} scrollY=${await p.evaluate(()=>scrollY)}`);console.log(m.slice(0,40).join('\n'));}
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();
  await p.goto('https://www.papier-restaurierung.at/',{waitUntil:'load'});await p.waitForTimeout(4000);await p.evaluate(watch);
  for(const t of ['TÄTIGKEITSBEREICHE','ATELIER','REFERENZEN','KONTAKT','START'])
    await step(p,'menu '+t,()=>p.locator('nav a',{hasText:t}).first().click());
  await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(500);
  console.log('expanders',await p.locator('text=Mehr erfahren').count());
  await step(p,'expand 1',async()=>{const l=p.locator('text=Mehr erfahren').first();await l.scrollIntoViewIfNeeded();await l.click();});
  console.log('after expand, link texts:',await p.evaluate(()=>[...document.querySelectorAll('[data-testid="collapsible-text"],[class*=Collapsible] *')].length));
  const m=await b.newContext(devices['iPhone 13']);const q=await m.newPage();
  await q.goto('https://www.papier-restaurierung.at/',{waitUntil:'load'});await q.waitForTimeout(4000);await q.evaluate(watch);
  await step(q,'hamburger',()=>q.locator('[aria-label*="Menü"],[aria-label*="menu"],#MENU_AS_CONTAINER_TOGGLE,[data-testid*="toggle"]').first().click());
  await q.screenshot({path:process.argv[2]+'/mobile-menu-open.png'});
  await step(q,'mobile menu KONTAKT',()=>q.locator('a',{hasText:'KONTAKT'}).first().click());
  await b.close();
})();
