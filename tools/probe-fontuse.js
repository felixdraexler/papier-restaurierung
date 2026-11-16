// Which visible texts use which font family on the live site.
const {chromium,devices}=require('playwright');
(async()=>{const b=await chromium.launch();
  for(const [prof,o] of [['desktop',{viewport:{width:1280,height:900}}],['mobile',devices['iPhone 13']]]){
    for(const path of ['','impressum','agb','datenschutz']){
    const p=await (await b.newContext(o)).newPage();
    await p.goto('https://www.papier-restaurierung.at/'+path,{waitUntil:'load'});await p.waitForTimeout(2000);
    const h=await p.evaluate(()=>document.body.scrollHeight);for(let y=0;y<h;y+=300){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(80);}await p.waitForTimeout(1500);
    const r=await p.evaluate(()=>{const out={};const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
      while(n=w.nextNode()){const t=n.textContent.trim();if(!t)continue;const e=n.parentElement;const cs=getComputedStyle(e);const r=e.getBoundingClientRect();
        if(cs.visibility==='hidden'||cs.display==='none'||r.width===0||r.height===0||cs.opacity==='0'||e.closest('[aria-hidden=true]'))continue;
        const fam=cs.fontFamily.split(',')[0].replace(/['"]/g,'');(out[fam]=out[fam]||[]).push(t.slice(0,40));}
      return out});
    for(const [f,ts] of Object.entries(r))if(!/^(lato|raleway)/i.test(f))console.log(prof,path||'index',f,ts.length,JSON.stringify(ts.slice(0,6)));
    await p.context().close();}}
  await b.close();})();
