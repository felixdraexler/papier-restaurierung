// Captures the live Wix chat widget (closed/open, desktop/mobile): screenshots plus the iframe's DOM.
const {chromium,devices}=require('playwright');const fs=require('fs');const out=process.argv[2];
(async()=>{const b=await chromium.launch();
  for(const [prof,o] of [['desktop',{viewport:{width:1280,height:900}}],['mobile',devices['iPhone 13']]]){
    const p=await (await b.newContext(o)).newPage();
    await p.goto('https://www.papier-restaurierung.at/',{waitUntil:'load'});await p.waitForTimeout(8000);
    const fr=()=>p.frames().find(f=>/chat-widget-server/.test(f.url()));
    await p.screenshot({path:`${out}/chat-${prof}-closed.png`});
    const ifr=await p.evaluate(()=>{const i=document.querySelector('iframe[title="Wix Chat"]');const r=i.getBoundingClientRect();return {r:[r.x,r.y,r.width,r.height],style:i.getAttribute('style'),parent:i.parentElement.getAttribute('style')}});
    console.log(prof,'closed iframe',JSON.stringify(ifr));
    if(fr())fs.writeFileSync(`${out}/chat-${prof}-closed.html`,await fr().content());
    if(prof==='desktop'){await p.mouse.click(1140,867);}
    else{await p.locator('#dynamicAction-QUICK_ACTION_BAR-0').click();}
    await p.waitForTimeout(4000);
    await p.screenshot({path:`${out}/chat-${prof}-open.png`});
    console.log(prof,'open iframe',JSON.stringify(await p.evaluate(()=>{const i=document.querySelector('iframe[title="Wix Chat"]');const r=i.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})));
    if(fr())fs.writeFileSync(`${out}/chat-${prof}-open.html`,await fr().content());
    await p.context().close();}
  await b.close();})();
