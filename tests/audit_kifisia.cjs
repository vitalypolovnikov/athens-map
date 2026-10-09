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
  // From any other market view, the shortcut must restore the correct layer,
  // day, map centre and readable popup, with no overlay obstruction.
  await page.locator('#market-type').selectOption('regular');
  await page.locator('#market-day').selectOption('Friday');
  await page.locator('#focus-kifisia').click();
  await page.waitForTimeout(350);
  const shortcut=await page.evaluate(id=>{
   const map=window.map_602b3e032ea0b867c861696733b322fa;
   const marker=window['marker_'+id], p=marker.getLatLng();
   const popup=marker.getPopup().getElement();
   const panel=document.getElementById('athens-tools');
   const popupBox=popup.getBoundingClientRect(),panelBox=panel.getBoundingClientRect();
   return {hasLayer:map.hasLayer(marker),inViewport:map.getBounds().contains(p),
    isOpen:marker.isPopupOpen(),type:document.querySelector('#market-type').value,
    day:document.querySelector('#market-day').value,popupTop:popupBox.top,
    panelBottom:panelBox.bottom,point:[p.lat,p.lng],count:document.getElementById('market-count').textContent};
  },id);
  assert.equal(shortcut.hasLayer,true);
  assert.equal(shortcut.inViewport,true);
  assert.equal(shortcut.isOpen,true);
  assert.equal(shortcut.type,'bio');assert.equal(shortcut.day,'Monday');
  console.log(JSON.stringify({shortcut:vp.name,details:shortcut}));
  const motion=await page.evaluate(id=>{
    const map=window.map_602b3e032ea0b867c861696733b322fa, marker=window['marker_'+id];
    const pos=()=>{
      const popup=marker.getPopup().getElement().getBoundingClientRect();
      const icon=marker._icon.getBoundingClientRect();
      return {popup:{top:popup.top,height:popup.height,bottom:popup.bottom},icon:{top:icon.top,height:icon.height},center:map.getCenter()};
    };
    const before=pos();
    map.panBy([0,180],{animate:false});
    const after=pos();
    return {before,after};
  },id);
  console.log(JSON.stringify({motion:vp.name,details:motion}));
  assert(shortcut.popupTop>=shortcut.panelBottom-2,'Popup obscured by controls');
  assert.equal(errors.length,0);
  console.log(JSON.stringify({viewport:vp.name,kifisia:first,afterMonday:after,jsErrors:errors}));
  await page.close();
 }
 console.log(JSON.stringify({status:'PASS',individualHours:25,bio:27,closed:2}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
