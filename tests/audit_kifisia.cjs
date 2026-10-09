const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.equal((html.match(/ — Bio \(/g)||[]).length,27);
 assert.equal((html.match(/Official hours \(Bioagores\):/g)||[]).length,25);
 assert.equal((html.match(/TEMPORARILY CLOSED — no trading hours/g)||[]).length,2);
 assert.equal((html.match(/Bioagores — official market page/g)||[]).length,27);
 const id='37c418631785bebb222eab0981187987';
 assert(html.includes('Kokkinara Street, between K. Karamanli and Panagias Eleftherotrias'));
 const browser=await chromium.launch({headless:true});
 for(const vp of [{width:1280,height:800,name:'desktop'},{width:390,height:844,name:'mobile'}]){
  const page=await browser.newPage({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#market-count')?.textContent.includes('Bio'));
  const first=await page.evaluate((id)=>{
   const map=window.map_602b3e032ea0b867c861696733b322fa,m=window['marker_'+id];
   const p=m.getLatLng();return {inMap:map.hasLayer(m),withinInitialViewport:map.getBounds().contains(p),popup:(typeof m.getPopup().getContent()==='string'?m.getPopup().getContent():m.getPopup().getContent()?.outerHTML||String(m.getPopup().getContent())),point:[p.lat,p.lng],bounds:{north:map.getBounds().getNorth(),south:map.getBounds().getSouth(),east:map.getBounds().getEast(),west:map.getBounds().getWest()},count:document.getElementById('market-count').textContent};
  },id);
  console.log(JSON.stringify({debug:vp.name,details:first}));
  assert.equal(first.inMap,true);assert(first.popup.includes('Kokkinara'));
  assert.deepEqual(first.point,[38.0813534,23.8307477]);
  await page.locator('#market-day').selectOption('Monday');
  await page.locator('#show-closed').uncheck();
  const after=await page.evaluate(id=>{
    const map=window.map_602b3e032ea0b867c861696733b322fa;return {visible:map.hasLayer(window['marker_'+id]),count:document.getElementById('market-count').textContent};
  },id);
  assert.equal(after.visible,true);
  assert.equal(errors.length,0);
  console.log(JSON.stringify({viewport:vp.name,kifisia:first,afterMonday:after,jsErrors:errors}));
  await page.close();
 }
 console.log(JSON.stringify({status:'PASS',individualHours:25,bio:27,closed:2}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
