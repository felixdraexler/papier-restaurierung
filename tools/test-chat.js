// End-to-end chat test on the copy: open chat, send a message, leave contact details, expect confirmation.
const {chromium}=require('playwright');const base=process.argv[2];
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
  await p.goto(base,{waitUntil:'load'});await p.waitForTimeout(1500);
  const f=p.frames().find(x=>/chat\/desktop/.test(x.url()));
  await f.locator('[data-hook="minimized-chat"]').click();await p.waitForTimeout(500);
  await f.locator('[data-hook="input"]').fill('Testnachricht vom statischen Nachbau (bitte ignorieren).');
  await f.locator('[data-hook="input"]').press('Enter');await p.waitForTimeout(500);
  await f.locator('input[name=name]').fill('Test Nachbau');await f.locator('input[name=email]').fill('fdraexler@gmail.com');
  await f.locator('form button').click();await p.waitForTimeout(6000);
  console.log(await f.locator('#chat-messages-list').innerText());
  await p.screenshot({path:process.argv[3]});await b.close();})();
