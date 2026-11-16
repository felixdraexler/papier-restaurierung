// Captures the live chat emoji picker: frame DOM with the picker open, each category's panel, and the
// widget-input markup (the emoji button turns into a "close" chevron while the picker is open).
const {chromium}=require('playwright');const fs=require('fs');const out=process.argv[2];
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
  await p.goto('https://www.papier-restaurierung.at/',{waitUntil:'load'});await p.waitForTimeout(8000);
  await p.mouse.click(1140,867);await p.waitForTimeout(3000);
  const f=p.frames().find(x=>/chat-widget-server/.test(x.url()));
  const before=await f.evaluate(()=>document.querySelector('[data-hook="widget-input"]').outerHTML);
  await f.locator('[data-hook="emoji-keyboard"]').first().click();await p.waitForTimeout(2000);
  await p.screenshot({path:`${out}/chat-desktop-emoji.png`});
  fs.writeFileSync(`${out}/chat-desktop-emoji.html`,await f.content());
  const panels=[];
  for(let i=0;i<7;i++){await f.locator(`#emojis-tab-${i}`).click();await p.waitForTimeout(700);
    panels.push(await f.evaluate(i=>{const el=document.getElementById('emojis-tab-content-'+i);const ip=document.querySelector('[data-hook=inner-panel]');return {html:el?el.outerHTML:null,scrollTop:ip.scrollTop,visible:[...document.querySelectorAll('[role=tabpanel]')].map(x=>x.id)}},i));
    if(i===1)await p.screenshot({path:`${out}/chat-desktop-emoji-tab1.png`});}
  fs.writeFileSync(`${out}/emoji-panels.json`,JSON.stringify(panels));
  console.log(panels.map((x,i)=>i+': '+(x.html?x.html.length:0)+' scroll='+x.scrollTop+' panels='+x.visible.join(',')).join('\n'));
  const after=await f.evaluate(()=>document.querySelector('[data-hook="widget-input"]').outerHTML.replace(/<div data-hook="input-keyboards".*?<\/div><div data-hook="textarea-wrapper"/s,'<KEYBOARD/><div data-hook="textarea-wrapper"'));
  fs.writeFileSync(`${out}/emoji-input-before.html`,before);fs.writeFileSync(`${out}/emoji-input-after.html`,after);
  // pick an emoji: what lands in the textarea, does the picker stay open?
  await f.locator('#emojis-tab-0').click();await p.waitForTimeout(500);
  await f.locator('[data-hook="emoji"]').nth(2).click();await p.waitForTimeout(800);
  console.log('textarea after pick:',JSON.stringify(await f.evaluate(()=>document.querySelector('[data-hook=input]').value)),'picker open:',await f.evaluate(()=>!!document.querySelector('[data-hook=emoji-panel]')));
  await b.close();})();
