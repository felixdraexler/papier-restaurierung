// Measures anchor scrolling (target, duration curve) and the menu's selected item per scroll position on the live site.
const {chromium,devices}=require('playwright');const fs=require('fs');
const ANCH=['comp-izmrbemw','comp-izmrbemy','comp-j6rvbbj1','comp-izmrbeo5'];
(async()=>{
  const b=await chromium.launch();const res={};
  for(const [prof,opts] of [['desktop',{viewport:{width:1280,height:900}}],['mobile',devices['iPhone 13']]]){
    const p=await (await b.newContext(opts)).newPage();
    await p.goto('https://www.papier-restaurierung.at/',{waitUntil:'load'});await p.waitForTimeout(3000);
    const h=await p.evaluate(()=>document.body.scrollHeight);
    for(let y=0;y<h;y+=300){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(80);}
    await p.waitForTimeout(1500);
    const r=res[prof]={anchors:await p.evaluate(a=>a.map(id=>{const e=document.getElementById(id);return [id,Math.round(e.getBoundingClientRect().top+scrollY)]}),ANCH),
      maxScroll:await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight),clicks:[],sel:[]};
    const items=prof==='desktop'?['TÄTIGKEITSBEREICHE','ATELIER','REFERENZEN','KONTAKT']:['TÄTIGKEITSBEREICHE','ATELIER','REFERENZEN','KONTAKT'];
    for(const start of [0,3000])for(const t of items){
      await p.evaluate(y=>scrollTo(0,y),start);await p.waitForTimeout(800);
      if(prof==='mobile'){await p.locator('#MENU_AS_CONTAINER_TOGGLE').click();await p.waitForTimeout(1200);}
      await p.evaluate(()=>{window.__t=[];const t0=performance.now();const f=()=>{window.__t.push([Math.round(performance.now()-t0),Math.round(scrollY)]);if(performance.now()-t0<3500)requestAnimationFrame(f)};requestAnimationFrame(f)});
      await p.locator(prof==='desktop'?'nav a':'#MENU_AS_CONTAINER a',{hasText:t}).first().click();await p.waitForTimeout(3700);
      const tr=await p.evaluate(()=>window.__t);const moving=tr.filter((x,i)=>i&&x[1]!==tr[i-1][1]);
      r.clicks.push({start,item:t,end:tr.at(-1)[1],t0:moving[0]?.[0],t1:moving.at(-1)?.[0],mid:tr.filter((x,i)=>i%8==0)});
    }
    for(let y=0;y<=r.maxScroll;y+=100){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(250);
      r.sel.push([y,await p.evaluate(()=>[...document.querySelectorAll('[data-state*="selected"],[aria-current="page"]')].map(e=>(e.id||e.textContent.trim().slice(0,12))).join(','))]);}
    await p.context().close();
  }
  fs.writeFileSync(process.argv[2],JSON.stringify(res));await b.close();
})();
