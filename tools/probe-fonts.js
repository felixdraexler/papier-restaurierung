// Lists the font faces the live site actually loads (pages and chat frame).
const {chromium,devices}=require('playwright');
(async()=>{const b=await chromium.launch();
  for(const [prof,o] of [['desktop',{viewport:{width:1280,height:900}}],['mobile',devices['iPhone 13']]]){
    const p=await (await b.newContext(o)).newPage();const fontUrls=new Set();
    p.on('response',r=>{if(/\.(woff2?|ttf|otf|eot)(\?|$)/.test(r.url())||/font/.test(r.headers()['content-type']||''))fontUrls.add(r.status()+' '+r.url().replace(/^https:\/\/static\.(parastorage|wixstatic)\.com/,''))});
    await p.goto('https://www.papier-restaurierung.at/',{waitUntil:'load'});
    const h=await p.evaluate(()=>document.body.scrollHeight);for(let y=0;y<h;y+=400){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(60);}
    if(prof==='desktop')await p.mouse.click(1140,867);else await p.locator('#dynamicAction-QUICK_ACTION_BAR-0').click();
    await p.waitForTimeout(5000);
    for(const f of p.frames()){const l=await f.evaluate(()=>[...document.fonts].filter(x=>x.status==='loaded').map(x=>x.family+' '+x.weight+' '+x.style)).catch(()=>[]);if(l.length)console.log(prof,f===p.mainFrame()?'page':'frame',[...new Set(l)].join(' | '));}
    console.log(prof,'font responses:\n  '+[...fontUrls].join('\n  '));
    await p.context().close();}
  await b.close();})();
