// Renders each live Wix page fully (lazy images loaded), saves the final DOM and a reference screenshot.
// Usage: node capture.js <outdir> [baseUrl]   (baseUrl defaults to the live site)
const {chromium,devices}=require('playwright');
const fs=require('fs'),crypto=require('crypto');
// Asset bytes exactly as the browser received them; build.py reads this as its download cache.
const cache=process.env.HOME+'/data/papier-restaurierung/cache';fs.mkdirSync(cache,{recursive:true});
async function keep(res){const u=res.url();if(!/^https:\/\/(static\.wixstatic\.com|static\.parastorage\.com)\//.test(u)||res.status()!==200)return;
  try{const body=await res.body();const k=crypto.createHash('sha1').update(u).digest('hex');
    fs.writeFileSync(`${cache}/${k}`,body);fs.writeFileSync(`${cache}/${k}.type`,res.headers()['content-type']||'');}catch(e){}}
// Optional: node capture.js <outdir> <desktopBase> <mobileBase> <ext> to capture the local copy.
const out=process.argv[2], live='https://www.papier-restaurierung.at/';
const bases={desktop:process.argv[3]||live,desktop2x:process.argv[3]||live,tablet:process.argv[3]||live,mobile:process.argv[4]||live}, ext=process.argv[5]||'';
const pages={index:'',impressum:'impressum',agb:'agb',datenschutz:'datenschutz'};
// desktop2x and tablet differ from desktop only in image resolution / viewport; build.py checks that.
const profiles={desktop:{viewport:{width:1280,height:900}},desktop2x:{viewport:{width:1280,height:900},deviceScaleFactor:2},
  tablet:devices['Galaxy Tab S4'],mobile:devices['iPhone 13']};
const only=(process.env.PROFILES||'').split(',').filter(Boolean);
(async()=>{
  const b=await chromium.launch();
  for(const [prof,opts] of Object.entries(profiles)){
    if(only.length&&!only.includes(prof))continue;
    const ctx=await b.newContext(opts);
    if(bases[prof]===live)ctx.on('response',keep);
    for(const [name,path] of Object.entries(pages)){
      const p=await ctx.newPage();
      await p.goto(bases[prof]+(path||(ext?'index':''))+(path||ext?ext:''),{waitUntil:'load'});
      await p.waitForTimeout(3000);
      const h=await p.evaluate(()=>document.body.scrollHeight);
      for(let y=0;y<h+900;y+=300){await p.evaluate(y=>window.scrollTo(0,y),y);await p.waitForTimeout(120);}
      await p.waitForTimeout(3000);
      await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(1500);
      fs.writeFileSync(`${out}/${prof}.${name}.html`,'<!DOCTYPE html>\n'+await p.evaluate(()=>document.documentElement.outerHTML));
      await p.screenshot({path:`${out}/${prof}.${name}.png`,fullPage:true});
      await p.close();
    }
    await ctx.close();
  }
  await b.close();
})();
