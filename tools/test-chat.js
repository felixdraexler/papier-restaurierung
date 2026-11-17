// End-to-end chat test: open chat, attach a file, send a message, leave contact details, expect confirmation.
// node test-chat.js <siteBase> <screenshot>
const {chromium}=require('playwright');const fs=require('fs');const [base,shot]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
  await p.goto(base,{waitUntil:'load'});await p.waitForTimeout(1500);
  const f=p.frames().find(x=>/chat\/desktop/.test(x.url()));
  await f.locator('[data-hook="minimized-chat"]').click();await p.waitForTimeout(500);
  fs.writeFileSync('/tmp/claude-1000/anhangD.txt','Testanhang D aus dem Chat\n');
  await f.locator('[data-hook="file-upload-input"]').setInputFiles('/tmp/claude-1000/anhangD.txt');await p.waitForTimeout(500);
  await f.locator('[data-hook="input"]').fill('Test D: Chat mit Anhang (bitte ignorieren).');
  await f.locator('[data-hook="input"]').press('Enter');await p.waitForTimeout(500);
  await f.locator('input[name=name]').fill('Test D');await f.locator('input[name=email]').fill('fdraexler@gmail.com');
  await f.locator('form button').click();await p.waitForTimeout(15000);
  console.log(await f.locator('#chat-messages-list').innerText());
  await p.screenshot({path:shot});await b.close();})();
