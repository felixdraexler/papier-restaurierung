// Loads every copy page in each device profile and prints console errors / failed requests.
const {chromium,devices}=require('playwright');const base=process.argv[2];
(async()=>{const b=await chromium.launch();
  for(const [prof,o] of [['desktop',{viewport:{width:1280,height:900}}],['tablet',devices['Galaxy Tab S4']],['mobile',devices['iPhone 13']]]){
    const ctx=await b.newContext(o);
    for(const path of ['','impressum','agb','datenschutz']){const p=await ctx.newPage();const errs=[];
      p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text())});p.on('pageerror',e=>errs.push('pageerror: '+e.message));
      p.on('requestfailed',r=>errs.push('failed: '+r.url()));p.on('response',r=>{if(r.status()>=400)errs.push(r.status()+' '+r.url())});
      await p.goto(base+path,{waitUntil:'load'});await p.waitForTimeout(1500);
      console.log(prof,path||'index','->',p.url().replace(base,''),errs.length?'\n   '+errs.join('\n   '):'ok');await p.close();}
    await ctx.close();}
  await b.close();})();
