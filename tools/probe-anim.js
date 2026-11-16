// Records the entrance animations Wix runs while scrolling the live page.
const {chromium,devices}=require('playwright');
(async()=>{
  const b=await chromium.launch();
  for(const [prof,opts] of [['desktop',{viewport:{width:1280,height:900}}],['mobile',devices['iPhone 13']]]){
    const ctx=await b.newContext(opts);const p=await ctx.newPage();
    await p.addInitScript(()=>{window.__anims={};const orig=Element.prototype.animate;
      Element.prototype.animate=function(k,o){const id=this.id||this.className;(window.__anims[id]=window.__anims[id]||[]).push({k,o:typeof o==='object'?o:{duration:o}});return orig.call(this,k,o)};
      setInterval(()=>{for(const a of document.getAnimations()){const t=a.effect&&a.effect.target;if(!t)continue;const id=t.id||String(t.className).slice(0,40);const key=id+'|'+(a.animationName||'');if(window.__anims[key])continue;window.__anims[key]=[{name:a.animationName,kf:a.effect.getKeyframes(),timing:a.effect.getTiming(),css:getComputedStyle(t).animation}]}},30)});
    await p.goto('https://www.papier-restaurierung.at/',{waitUntil:'load'});await p.waitForTimeout(2500);
    const h=await p.evaluate(()=>document.body.scrollHeight);
    for(let y=0;y<h;y+=200){await p.evaluate(y=>window.scrollTo(0,y),y);await p.waitForTimeout(100);}
    await p.waitForTimeout(2000);
    console.log('=== '+prof);console.log(JSON.stringify(await p.evaluate(()=>window.__anims)).slice(0,6000));
    await ctx.close();
  }
  await b.close();
})();
