// Runs the same interactions on the live site and the copy and saves viewport screenshots for diffing.
// node verify-interactions.js <outdir> <copyBase>
const {chromium,devices}=require('playwright');const fs=require('fs');
const [out,copy]=process.argv.slice(2);const live='https://www.papier-restaurierung.at/';
const settle=async p=>{const h=await p.evaluate(()=>document.body.scrollHeight);for(let y=0;y<h;y+=300){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(60);}await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(2500);};
const chatFrame=p=>p.frames().find(f=>/chat/.test(f.url())&&f!==p.mainFrame());
const scenarios={
  'd-menu-taetigkeit':['desktop',async p=>{await p.locator('nav a',{hasText:'TÄTIGKEITSBEREICHE'}).first().click();await p.waitForTimeout(3500);}],
  'd-menu-atelier':['desktop',async p=>{await p.locator('nav a',{hasText:'ATELIER'}).first().click();await p.waitForTimeout(3500);}],
  'd-menu-kontakt':['desktop',async p=>{await p.locator('nav a',{hasText:'KONTAKT'}).first().click();await p.waitForTimeout(4000);}],
  'd-hover-menu':['desktop',async p=>{await p.locator('nav a',{hasText:'REFERENZEN'}).first().hover();await p.waitForTimeout(800);}],
  'd-expand':['desktop',async p=>{const l=p.locator('text=Mehr erfahren').first();await l.scrollIntoViewIfNeeded();await p.waitForTimeout(800);await l.click();await p.waitForTimeout(1500);}],
  'd-chat-open':['desktop',async p=>{await p.waitForTimeout(3000);await p.mouse.click(1140,867);await p.waitForTimeout(3000);}],
  'd-chat-hover':['desktop',async p=>{await p.waitForTimeout(3000);await p.mouse.move(1140,867);await p.waitForTimeout(1000);}],
  'd-impressum-to-atelier':['desktop',async p=>{await p.locator('nav a',{hasText:'ATELIER'}).first().click();await p.waitForTimeout(6000);},'impressum'],
  't-chat-open':['tablet',async p=>{await p.waitForTimeout(3000);const b=await p.evaluate(()=>{const r=document.querySelector('#comp-kh08gc5c').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});await p.mouse.click(b[0],b[1]);await p.waitForTimeout(3000);}],
  'm-menu-open':['mobile',async p=>{await p.locator('#MENU_AS_CONTAINER_TOGGLE').click();await p.waitForTimeout(2000);}],
  'm-menu-referenzen':['mobile',async p=>{await p.locator('#MENU_AS_CONTAINER_TOGGLE').click();await p.waitForTimeout(1500);await p.locator('#MENU_AS_CONTAINER a',{hasText:'REFERENZEN'}).click();await p.waitForTimeout(4000);}],
  'm-menu-after-referenzen':['mobile',async p=>{await p.locator('#MENU_AS_CONTAINER_TOGGLE').click();await p.waitForTimeout(1500);await p.locator('#MENU_AS_CONTAINER a',{hasText:'REFERENZEN'}).click();await p.waitForTimeout(4000);await p.locator('#MENU_AS_CONTAINER_TOGGLE').click();await p.waitForTimeout(2000);}],
  'm-chat-open':['mobile',async p=>{await p.waitForTimeout(3000);await p.locator('#dynamicAction-QUICK_ACTION_BAR-0').click();await p.waitForTimeout(3000);}],
  'm-backtotop':['mobile',async p=>{for(let y=0;y<=2000;y+=100){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(30);}await p.waitForTimeout(600);}],
  'm-expand':['mobile',async p=>{const l=p.locator('text=Mehr erfahren').first();await l.scrollIntoViewIfNeeded();await p.waitForTimeout(2500);await l.click();await p.waitForTimeout(1500);}],
};
const profiles={desktop:{viewport:{width:1280,height:900}},tablet:devices['Galaxy Tab S4'],mobile:devices['iPhone 13']};
(async()=>{const b=await chromium.launch();const only=process.argv[4]?process.argv[4].split(','):null;
  for(const [name,[prof,fn,path]] of Object.entries(scenarios)){if(only&&!only.includes(name))continue;
    for(const [tag,base] of [['ref',live],['copy',copy]]){
      const ctx=await b.newContext(profiles[prof]);const p=await ctx.newPage();
      await p.goto(base+(path||''),{waitUntil:'load'});await p.waitForTimeout(2000);await settle(p);
      try{await fn(p);}catch(e){console.log(name,tag,'ERROR',e.message.split('\n')[0]);}
      fs.mkdirSync(`${out}/${tag}`,{recursive:true});await p.screenshot({path:`${out}/${tag}/${name}.png`});
      console.log(name,tag,'scrollY',await p.evaluate(()=>scrollY));await ctx.close();}}
  await b.close();})();
