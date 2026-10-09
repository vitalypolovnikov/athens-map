const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const MARKER_ID='37c418631785bebb222eab0981187987';
const browserUrl='http://127.0.0.1:8765/';
const screenshots=path.join(process.cwd(),'qa-screenshots');
fs.mkdirSync(screenshots,{recursive:true});
const mapName='map_602b3e032ea0b867c861696733b322fa';
const suite=async()=>{
 const browser=await chromium.launch({headless:true});
 const summaries=[];
 for(const v of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844},{name:'small-mobile',width:320,height:690}]){
   const page=await browser.newPage({viewport:{width:v.width,height:v.height},deviceScaleFactor:1});
   const pageErrors=[];
   page.on('pageerror',e=>pageErrors.push(e.message));
   await page.goto(browserUrl,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>document.getElementById('market-count')?.textContent.includes('Bio'));
   const init=await page.evaluate(id=>{
     const m=window.map_602b3e032ea0b867c861696733b322fa, k=window['marker_'+id], popup=k.getPopup();
     const layerArray=[];m.eachLayer(l=>{if(l instanceof L.Marker&&l.getPopup)layerArray.push(l);});
     const cards=layerArray.filter(l=>l.getPopup()?.getContent()?.classList?.contains('market-popup'));
     return {zoom:m.getZoom(),isKifisiaInViewport:m.getBounds().contains(k.getLatLng()),bioCount:cards.length,correctKifisiaContent:popup.getContent().textContent.includes('Kokkinara'),dataPopupWidthType:typeof popup.options.maxWidth,panelHeight:document.getElementById('athens-tools').getBoundingClientRect().height};
   },MARKER_ID);
   assert.equal(init.bioCount,27);
   assert.equal(init.correctKifisiaContent,true);
   assert.equal(init.dataPopupWidthType,'number');
   assert(init.panelHeight<220,'Initial toolbar is too tall: '+init.panelHeight);
   assert.equal(init.isKifisiaInViewport,true,'Kifisia must be in initial Athens viewport');
   // Open a Bio marker through a real user control and inspect actual rendered box.
   await page.locator('#focus-kifisia').click();
   await page.waitForTimeout(200);
   const k=await page.evaluate(id=>{
     const m=window.map_602b3e032ea0b867c861696733b322fa,mark=window['marker_'+id],p=mark.getPopup();
     const outer=p.getElement().getBoundingClientRect(), panel=document.getElementById('athens-tools').getBoundingClientRect();
     const inner=p.getElement().querySelector('.leaflet-popup-content').getBoundingClientRect();
     return {visible:mark.isPopupOpen(),zoom:m.getZoom(),width:inner.width,height:inner.height,
       top:outer.top,left:outer.left,right:outer.right,bottom:outer.bottom,toolbarBottom:panel.bottom,
       contentText:p.getElement().innerText,moreOpen:!!p.getElement().querySelector('details[open]')};
   },MARKER_ID);
   assert.equal(k.visible,true);assert(k.zoom>=14);
   assert(k.width>195&&k.width<=330,'Kifisia popup width invalid '+k.width);
   assert(k.height<270,'Kifisia popup too tall '+k.height);
   assert(k.top>=k.toolbarBottom-5,'Kifisia popup obscured by toolbar '+JSON.stringify(k));
   assert(k.left>=0&&k.right<=v.width+3,'Popup outside viewport horizontally');
   assert(k.contentText.includes('14:00–18:00'));
   assert(!k.moreOpen,'Technical details must be collapsed by default');
   if(v.name!=='small-mobile'){
     await page.screenshot({path:path.join(screenshots,v.name+'-kifisia.jpg'),type:'jpeg',quality:62,animations:'disabled'});
     const bytes=await page.screenshot({type:'jpeg',quality:55,animations:'disabled'});
     console.log('QA_IMAGE_'+v.name.toUpperCase()+':'+bytes.toString('base64'));
   }
   await page.locator('.leaflet-popup-content details summary').click();
   assert.equal(await page.locator('.leaflet-popup-content details').getAttribute('open'),'');
   assert((await page.locator('.leaflet-popup-content a[href*="bioagores.org"]').count())>0);
   await page.locator('#reset-athens').click();
   const reset=await page.evaluate(()=>({zoom:window.map_602b3e032ea0b867c861696733b322fa.getZoom(),center:window.map_602b3e032ea0b867c861696733b322fa.getCenter(),popups:document.querySelectorAll('.leaflet-popup').length}));
   assert.equal(reset.zoom,11);
   assert.equal(reset.popups,0);
   // Exhaustive Bio card opening: all 27 including temporarily closed, not just the favourite.
   const allBio=await page.evaluate(()=>{
     const map=window.map_602b3e032ea0b867c861696733b322fa,res=[],errors=[];
     const candidates=[];map.eachLayer(layer=>{if(layer instanceof L.Marker&&layer.getPopup)candidates.push(layer)});
     for(const layer of candidates){
       if(!(layer instanceof L.Marker)||!layer.getPopup)continue;
       const p=layer.getPopup(),content=p?.getContent();
       if(!content?.classList?.contains('market-popup')||!content.classList.contains('bio'))return;
       // Geometry QA: avoid hundreds of tile fetches while still actually mounting the popup DOM.
       p.options.autoPan=false;
       layer.openPopup();
       const el=p.getElement(),rect=el.querySelector('.leaflet-popup-content').getBoundingClientRect();
       const detail=content.querySelector('details');
       if(rect.width<195||rect.width>330||rect.height>300||!detail||detail.open)errors.push({name:content.querySelector('.name')?.textContent,width:rect.width,height:rect.height,details:!!detail});
       const link=content.querySelector('a[href^="https://www.bioagores.org/"]');
       if(!link)errors.push({missingSource:content.textContent.slice(0,60)});
       res.push({name:content.querySelector('.name')?.textContent,closed:!!content.querySelector('.closed'),width:rect.width,height:rect.height});
       layer.closePopup();
     }
     return {results:res,errors};
   });
   assert.equal(allBio.results.length,27,'All 27 Bio popups must be opened and rendered');
   assert.deepEqual(allBio.errors,[],'Bio card geometry issues');
   assert.equal(allBio.results.filter(x=>x.closed).length,2);
   await page.locator('#market-type').selectOption('regular');
   await page.locator('#market-day').selectOption('all');
   await page.waitForTimeout(100);
   const allRegular=await page.evaluate(()=>{
      const map=window.map_602b3e032ea0b867c861696733b322fa,res=[],errors=[];
      const candidates=[];map.eachLayer(l=>{if(l instanceof L.CircleMarker&&l.getPopup)candidates.push(l)});
      for(const l of candidates){
        if(!(l instanceof L.CircleMarker)||!l.getPopup)continue;
        const p=l.getPopup(),html=p?.getContent();
        if(typeof html!=='string'||!html.includes("market-popup regular"))return;
        p.options.autoPan=false;
        l.openPopup();
        const root=p.getElement(),inner=root?.querySelector('.leaflet-popup-content');
        if(!inner){errors.push("missing DOM "+res.length);return}
        const box=inner.getBoundingClientRect(),card=root.querySelector('.market-popup.regular');
        if(box.width<195||box.height>290||!card.querySelector('details')||!card.querySelector('a[href*="foreaslaikon.gov.gr"]'))
          errors.push({i:res.length,width:box.width,height:box.height,text:card.textContent.slice(0,90)});
        res.push(box.width);l.closePopup();
      }
      return {checked:res.length,errors};
   });
   assert(allRegular.checked>=240&&allRegular.checked<=264,'Not all visible regular markers were checked '+allRegular.checked);
   assert.deepEqual(allRegular.errors,[],'Regular popups fail geometry/content tests');
   assert.deepEqual(pageErrors,[],'Runtime errors');
   summaries.push({viewport:v.name,initialZoom:init.zoom,initialKifisiaVisible:init.isKifisiaInViewport,
      panelHeight:init.panelHeight,kifisiaPopupWidth:k.width,kifisiaPopupHeight:k.height,
      openedBio:allBio.results.length,openedRegular:allRegular.checked,errors:0});
   await page.close();
 }
 await browser.close();
 console.log('VISUAL_QA_PASS:'+JSON.stringify(summaries));
};
suite().catch(e=>{console.error('VISUAL_QA_FAIL:',e);process.exit(1)});
