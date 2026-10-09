const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.goto("http://127.0.0.1:8765/",{waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>!!window.L&&document.querySelector("#market-count")?.textContent?.includes("Bio"),{timeout:60000});
 const count=()=>page.locator("#market-count").textContent();
 let bio=await count();
 assert.match(bio,/27 visible \(27 Bio · 0 Regular\)/,"Default bio market count");
 await page.locator("#show-closed").uncheck();
 await page.waitForTimeout(200);
 assert.match(await count(),/25 visible \(25 Bio · 0 Regular\)/,"2 closed markets hide");
 const kifisiaVisible=await page.evaluate(()=>{
  const id="37c418631785bebb222eab0981187987";
  return window["marker_"+id] && window.map_602b3e032ea0b867c861696733b322fa.hasLayer(window["marker_"+id]);
 });
 assert.equal(kifisiaVisible,true,"Kifisia is active");
 await page.locator("#market-type").selectOption("regular");
 await page.locator("#market-day").selectOption("all");
 await page.waitForTimeout(350);
 const all=await count();
 const n=Number(all.match(/^(\d+) visible/)?.[1]);
 assert(n>220&&n<=264,"Regular market count 220–264, got "+all);
 await page.locator("#market-day").selectOption("Sunday");
 await page.waitForTimeout(200);
 assert.match(await count(),/^0 visible/,"No official Sunday regular markets");
 await page.locator("#market-day").selectOption("Monday");
 await page.waitForTimeout(200);
 const monday=await count();
 assert(Number(monday.match(/^(\d+) visible/)?.[1])>35,"Monday day filter works");
 assert.deepEqual(errors,[],"No runtime JavaScript errors");
 console.log(JSON.stringify({status:"PASS",bio,withoutClosed:25,allRegular:all,sunday:0,monday,errors}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
