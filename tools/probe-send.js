// Live chat input with text typed (the paperclip becomes a send button), and the focus after picking an emoji.
const {chromium}=require('playwright');const fs=require('fs');const out=process.argv[2];
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
  await p.goto('https://www.papier-restaurierung.at/',{waitUntil:'load'});await p.waitForTimeout(8000);
  await p.mouse.click(1140,867);await p.waitForTimeout(3000);
  const f=p.frames().find(x=>/chat-widget-server/.test(x.url()));
  await f.locator('[data-hook="input"]').type('Hallo');await p.waitForTimeout(800);
  fs.writeFileSync(`${out}/chat-input-typed.html`,await f.evaluate(()=>document.querySelector('[data-hook="textarea-wrapper"]').outerHTML));
  await f.locator('[data-hook="input"]').fill('');await p.waitForTimeout(500);
  await f.locator('button[data-hook="emoji-keyboard"]').click();await p.waitForTimeout(1000);
  console.log('focus after open:',await f.evaluate(()=>document.activeElement.outerHTML.slice(0,200)));
  await f.locator('[data-hook="emoji"]').nth(3).click();await p.waitForTimeout(800);
  console.log('focus after pick:',await f.evaluate(()=>document.activeElement.outerHTML.slice(0,200)));
  await b.close();})();
