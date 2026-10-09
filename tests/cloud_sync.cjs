const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const BASE="http://127.0.0.1:8765/";
const K="bio:37c418631785bebb222eab0981187987";
const store={profiles:new Set(),items:new Map(),initCounts:new Map()};
const uid=email=>email==="a@example.test"?"00000000-0000-4000-8000-000000000001":"00000000-0000-4000-8000-000000000002";
async function cloud({op,user,seed,market_key,selected}){
 if(op==="initialize"){
  store.initCounts.set(user.id,(store.initCounts.get(user.id)||0)+1);
  if(store.profiles.has(user.id))return{data:false,error:null};
  store.profiles.add(user.id);
  store.items.set(user.id,new Map(seed.map(k=>[k,true])));
  return{data:true,error:null};
 }
 if(op==="list")return{data:[...(store.items.get(user.id)||new Map())].map(([market_key,selected])=>({market_key,selected})),error:null};
 if(op==="upsert"){store.items.get(user.id).set(market_key,selected);return{error:null}};
 throw Error("Unexpected fake backend command "+op);
}
const fakeSDK="window.supabase={createClient(){\n const callbacks=[];\n const getSession=()=>JSON.parse(localStorage.getItem(\"__mock_session\")||\"null\");\n return {\n auth:{\n  async getSession(){return {data:{session:getSession()},error:null}},\n  onAuthStateChange(fn){callbacks.push(fn);queueMicrotask(()=>fn(\"INITIAL_SESSION\",getSession()));return {data:{subscription:{unsubscribe(){}}}}},\n  async signInWithOtp({email,options}){\n   const id=email===\"a@example.test\"?\"00000000-0000-4000-8000-000000000001\":\"00000000-0000-4000-8000-000000000002\";\n   const session={user:{id,email}};\n   localStorage.setItem(\"__mock_session\",JSON.stringify(session));\n   callbacks.forEach(cb=>cb(\"SIGNED_IN\",session));\n   return {error:null,data:{}};\n  },\n  async signOut(){localStorage.removeItem(\"__mock_session\");callbacks.forEach(cb=>cb(\"SIGNED_OUT\",null));return {error:null}}\n },\n rpc(name,args){return window.__cloudCall({op:\"initialize\",user:getSession().user,seed:args.seed_keys})},\n from(){return{\n   select(){return{eq(){return window.__cloudCall({op:\"list\",user:getSession().user})}}},\n   upsert(row){return window.__cloudCall({op:\"upsert\",user:getSession().user,market_key:row.market_key,selected:row.selected})}\n }},\n channel(){return{on(){return this},subscribe(cb){setTimeout(()=>cb(\"SUBSCRIBED\"),0);return this}}},\n removeChannel(){}\n };\n}};";
async function device(browser,width,height){
 const context=await browser.newContext({viewport:{width,height}});
 await context.exposeBinding("__cloudCall",(_source,data)=>cloud(data));
 await context.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2/,route=>route.fulfill({status:200,contentType:"application/javascript",body:fakeSDK}));
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.goto(BASE,{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>!!window.athensFavoritesBridge&&!!document.querySelector("#cloud-status"));
 return{context,page,errors};
}
async function login(page,email){
 await page.locator("#favorites-menu > summary").click();
 await page.locator("#cloud-open-login").click();
 await page.locator("#cloud-email").fill(email);
 await page.locator("#cloud-send-link").click();
 await page.waitForFunction(()=>document.querySelector("#cloud-status")?.textContent.includes("synced"),{timeout:12000});
}
async function starFor(page,name){
 await page.locator("#market-type").selectOption("bio");
 await page.locator("#market-day").selectOption("all");
 const key=await page.evaluate(name=>{
  const rec=window.athensBioFavoritesRecords.find(x=>x.name===name);
  const m=window.map_602b3e032ea0b867c861696733b322fa,marker=window["marker_"+rec.id];
  m.closePopup();m.setView(marker.getLatLng(),14,{animate:false});marker.openPopup();
  return "bio:"+rec.id;
 },name);
 return page.locator('.leaflet-popup .fav-star[data-favorite-id="'+key+'"]');
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const a=await device(browser,1440,900),b=await device(browser,390,844),other=await device(browser,390,844);
  await login(a.page,"a@example.test");
  assert.deepEqual([...store.items.get(uid("a@example.test")).keys()],[K]);
  assert.equal(store.initCounts.get(uid("a@example.test")),1,"Duplicate auth bootstrap on initial session");
  const star=await starFor(a.page,"Χαλάνδρι"),second=await star.getAttribute("data-favorite-id");
  await star.click();
  await a.page.waitForFunction(()=>document.querySelector("#cloud-status").textContent.includes("synced"));
  assert.equal(store.items.get(uid("a@example.test")).get(second),true);
  await login(b.page,"a@example.test");
  await b.page.waitForFunction(ids=>ids.every(id=>window.athensFavoritesBridge.getSelected().includes(id)),[K,second]);
  assert.equal(store.initCounts.get(uid("a@example.test")),2,"Each device should initialize once");
  const bStar=await starFor(b.page,"Χαλάνδρι");
  assert.equal(await bStar.getAttribute("aria-pressed"),"true");
  await bStar.click();
  await b.page.waitForFunction(()=>document.querySelector("#cloud-status").textContent.includes("synced"));
  assert.equal(store.items.get(uid("a@example.test")).get(second),false);
  await a.page.evaluate(()=>window.dispatchEvent(new Event("online")));
  await a.page.waitForFunction(id=>!window.athensFavoritesBridge.getSelected().includes(id),second,{timeout:12000});
  await login(other.page,"b@example.test");
  assert.equal(store.items.get(uid("b@example.test")).has(second),false);
  assert.equal(store.initCounts.get(uid("b@example.test")),1);
  for(const x of [a,b,other])assert.deepEqual(x.errors,[]);
  console.log("CLOUD_QA_PASS:"+JSON.stringify({accounts:2,devices:3,separateUsers:true,initialImport:true,remoteUpdate:true,automaticRefresh:true,duplicateSessionEventsHandled:true,runtimeErrors:0}));
  await Promise.all([a.context.close(),b.context.close(),other.context.close()]);
 }finally{await browser.close()}
})().catch(e=>{console.error("CLOUD_QA_FAIL:",e);process.exit(1)});
