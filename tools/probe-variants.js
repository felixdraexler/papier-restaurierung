// Records which image URLs the live site loads per viewport width / pixel ratio / device.
const {chromium,devices}=require('playwright');const fs=require('fs');
const cfgs={
  'd1280x1':{viewport:{width:1280,height:900}},'d1280x1.25':{viewport:{width:1280,height:900},deviceScaleFactor:1.25},
  'd1280x1.5':{viewport:{width:1280,height:900},deviceScaleFactor:1.5},'d1280x1.75':{viewport:{width:1280,height:900},deviceScaleFactor:1.75},
  'd1280x2':{viewport:{width:1280,height:900},deviceScaleFactor:2},'d1280x3':{viewport:{width:1280,height:900},deviceScaleFactor:3},
  'iPadPro11':devices['iPad Pro 11'],'GalaxyTabS4':devices['Galaxy Tab S4'],'iPadMacUA':{...devices['iPad Pro 11'],userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'},
  'iPhone13':devices['iPhone 13'],'iPhoneSE':devices['iPhone SE'],'GalaxyS9':devices['Galaxy S9+'],
};
(async()=>{const b=await chromium.launch();const res={};
  for(const [k,o] of Object.entries(cfgs)){const ctx=await b.newContext(o);const p=await ctx.newPage();const urls=new Set();
    p.on('response',r=>{if(/static\.wixstatic\.com\/media/.test(r.url()))urls.add(r.url())});
    await p.goto('https://www.papier-restaurierung.at/',{waitUntil:'load'});await p.waitForTimeout(2500);
    const h=await p.evaluate(()=>document.body.scrollHeight);for(let y=0;y<h;y+=300){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(80);}
    await p.waitForTimeout(2500);
    res[k]={variant:await p.evaluate(()=>document.body.className),vp:await p.evaluate(()=>document.querySelector('meta[name=viewport]')?.content),
      w:await p.evaluate(()=>innerWidth),urls:[...urls].sort()};await ctx.close();}
  fs.writeFileSync(process.argv[2],JSON.stringify(res,null,1));await b.close();})();
