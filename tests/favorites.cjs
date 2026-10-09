const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const K='bio:37c418631785bebb222eab0981187987';
const KEY='athens-map:favorites:v1';
const BASE='http://127.0.0.1:8765/';
async function ready(page){
 await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#market-count')?.textContent.includes('Bio')&&!!document.querySelector('#favorites-menu'));
}
async function menu(page){if(await page.locator('#favorites-menu').getAttribute('open')===null)await page.locator('#favorites-menu > summary').click();}
async function favs(page){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY)}
async function openBio(page,name){
 await page.locator('#market-type').selectOption('bio');
 await page.locator('#market-day').selectOption('all');
 const result=await page.evaluate(target=>{
  const rec=window.athensBioFavoritesRecords.find(x=>x.name===target);
  if(!rec)throw Error("Missing Bio "+target);
  const marker=window['marker_'+rec.id],map=window.map_602b3e032ea0b867c861696733b322fa;
  if(!map.hasLayer(marker))throw Error("Bio not in visible layer "+target);
  map.closePopup();map.setView(marker.getLatLng(),14,{animate:false});marker.openPopup();return 'bio:'+rec.id;
 },name);
 await page.locator('.leaflet-popup .fav-star[data-favorite-id="'+result+'"]').waitFor();
 return result;
}
async function openRegular(page){
 await page.locator('#market-type').selectOption('regular');
 await page.locator('#market-day').selectOption('all');
 const market=await page.evaluate(()=>{
  const map=window.map_602b3e032ea0b867c861696733b322fa;
  const item=window.athensOfficialMarketMarkers.find(x=>x.r.weekday==='Friday'&&map.hasLayer(x.marker));
  if(!item)throw Error('No official Friday market visible');
  map.closePopup();map.setView(item.marker.getLatLng(),14,{animate:false});item.marker.openPopup();
  return {key:'regular:'+item.r.id,weekday:item.r.weekday};
 });
 await page.locator('.leaflet-popup .fav-star[data-favorite-id="'+market.key+'"]').waitFor();
 return market;
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const report=[];
 for(const vp of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844},{name:'small-mobile',width:320,height:690}]){
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height}});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await ready(page);
  assert.deepEqual(await favs(page),[K],'First visit seeds Kokkinara only');
  assert.match(await page.locator('#favorites-menu > summary').textContent(),/Favorites.*1/);
  await menu(page);
  const panel=await page.locator('.favorites-panel').boundingBox();
  assert(panel&&panel.x>=0&&panel.x+panel.width<=vp.width+1,'Favorites dropdown overflow '+JSON.stringify(panel));
  assert.equal(await page.locator('.fav-go').count(),1);
  await page.locator('.fav-go[data-favorite-id="'+K+'"]').click();
  assert.equal(await page.locator('#market-type').inputValue(),'bio');
  assert.equal(await page.locator('#market-day').inputValue(),'Monday');
  assert.equal(await page.evaluate(()=>window['marker_37c418631785bebb222eab0981187987'].isPopupOpen()),true);
  assert.equal(await page.locator('.leaflet-popup .fav-star[data-favorite-id="'+K+'"]').getAttribute('aria-pressed'),'true');
  // Removing the initial favorite is permanent, including when the array is empty.
  await page.locator('.leaflet-popup .fav-star[data-favorite-id="'+K+'"]').click();
  assert.deepEqual(await favs(page),[]);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#favorites-menu'));
  assert.deepEqual(await favs(page),[],'Explicitly empty list must NOT reseed after reload');
  await menu(page);
  assert.match(await page.locator('#favorites-items').textContent(),/No favorites yet/);
  await page.locator('#favorites-menu > summary').click();
  // Two independent Bio identities + one official regular market.
  await openBio(page,'Κηφισιά');
  await page.locator('.leaflet-popup .fav-star[data-favorite-id="'+K+'"]').click();
  await openBio(page,'Χαλάνδρι');
  const otherBio=await page.locator('.leaflet-popup .fav-star').last().getAttribute('data-favorite-id');
  assert(otherBio.startsWith('bio:')&&otherBio!==K);
  await page.locator('.leaflet-popup .fav-star[data-favorite-id="'+otherBio+'"]').click();
  const regular=await openRegular(page);
  await page.locator('.leaflet-popup .fav-star[data-favorite-id="'+regular.key+'"]').click();
  assert.deepEqual(await favs(page),[K,otherBio,regular.key]);
  await menu(page);
  assert.equal(await page.locator('.fav-go').count(),3);
  // Favorites navigation corrects wrong active type/day and opens the target popup.
  await page.locator('#market-type').selectOption('bio');
  await page.locator('#market-day').selectOption('Sunday');
  await page.locator('.fav-go[data-favorite-id="'+regular.key+'"]').click();
  assert.equal(await page.locator('#market-type').inputValue(),'regular');
  assert.equal(await page.locator('#market-day').inputValue(),'Friday');
  assert(await page.locator('.leaflet-popup .market-popup.regular').isVisible());
  assert.equal(await page.locator('.leaflet-popup .fav-star[data-favorite-id="'+regular.key+'"]').getAttribute('aria-pressed'),'true');
  // Stored IDs must survive refresh, including regular market identities.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#favorites-menu'));
  assert.deepEqual(await favs(page),[K,otherBio,regular.key]);
  await menu(page);
  await page.locator('.fav-remove[data-remove-favorite="'+otherBio+'"]').click();
  assert.deepEqual(await favs(page),[K,regular.key]);
  // An official record whose start date is still in the future must stay unavailable.
  const future=await page.evaluate(()=>{
   const item=window.athensOfficialMarketMarkers.find(x=>{
     const d=window.athensNextTradingDate(x.r.weekday);
     return x.r.start&&x.r.start>d;
   });
   return item?('regular:'+item.r.id):null;
  });
  if(future){
   await page.evaluate(({key,ids})=>localStorage.setItem(key,JSON.stringify(ids)),{key:KEY,ids:[K,regular.key,future]});
   await page.reload({waitUntil:'domcontentloaded'});
   await menu(page);
   assert.equal(await page.locator('.fav-go[data-favorite-id="'+future+'"]').isDisabled(),true);
   await page.locator('.fav-remove[data-remove-favorite="'+future+'"]').click();
   assert.deepEqual(await favs(page),[K,regular.key]);
  }
  assert.deepEqual(errors,[]);
  report.push({viewport:vp.name,initialSeed:true,emptyPersisted:true,bioFavorites:2,regularFavorites:1,sourceBasedDisabled:!!future,scriptErrors:0});
  await context.close();
 }
 console.log('FAVORITES_QA_PASS:'+JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{console.error('FAVORITES_QA_FAIL:',e);process.exit(1)});
