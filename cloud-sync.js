/* Athens Markets Favorites: isolated browser-side Supabase integration.
 * Never embed a secret/service_role key in this public GitHub Pages site.
 * Offline local Favorites always continue to work.
 */
(function(){
"use strict";
const bridge=window.athensFavoritesBridge;
const status=document.getElementById("cloud-status");
const open=document.getElementById("cloud-open-login");
const form=document.getElementById("cloud-login-form");
const email=document.getElementById("cloud-email");
const importButton=document.getElementById("cloud-import-local");
const signout=document.getElementById("cloud-signout");
const storageKey="athens-map:cloud-pending:";
const linkedKey="athens-map:cloud-linked-user";
const defaults=["bio:37c418631785bebb222eab0981187987"];
const setStatus=(message)=>{status.textContent=message};
const getLocal=(key,orElse=null)=>{try{return localStorage.getItem(key)??orElse}catch(_){return orElse}};
const putLocal=(key,value)=>{try{localStorage.setItem(key,value);return true}catch(_){return false}};
if(!bridge||!status||!window.supabase?.createClient){
 setStatus("Cloud sync unavailable. Favorites still work on this device.");
 open.hidden=true;
 return;
}
const client=window.supabase.createClient("https://ctqiscyorobaoiamvswa.supabase.co","sb_publishable_hLR8Bv5jZHU8Bka17IeoDg_5mv_fC-W",{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
let active=null,channel=null,ready=false,flushing=false,initialized=false,epoch=0;
let pending={};
let pendingImport=[];
let poll=null;
function readPending(userId){
 try{
  const val=JSON.parse(getLocal(storageKey+userId,"{}"));
  return val&&typeof val==="object"&&!Array.isArray(val)?Object.fromEntries(Object.entries(val).filter(([k,v])=>typeof k==="string"&&typeof v==="boolean")):{};
 }catch(_){return {}}
}
function savePending(){
 if(!active)return;
 putLocal(storageKey+active.id,JSON.stringify(pending));
}
function refreshControls(){
 const signed=!!active;
 open.hidden=signed;
 signout.hidden=!signed;
 form.hidden=true;
 importButton.hidden=!(signed&&pendingImport.length);
 importButton.textContent=pendingImport.length?
   "Import "+pendingImport.length+" favorites from this device":"";
 window.athensCloudLinked=signed&&ready;
 document.getElementById("favorites-hint").textContent=signed&&ready?
   "Cloud sync active · this browser keeps an offline copy.":
   "Favorites are stored in this browser.";
}
function setOffline(error){
 console.warn("Athens Favorites cloud:",error);
 setStatus("Sync offline · local changes will retry");
 refreshControls();
}
function refreshStatus(){
 if(!active)return;
 const count=Object.keys(pending).length;
 setStatus((ready?"Cloud sync · ":"Connecting · ")+active.email+(count?" · "+count+" pending":" · synced"));
 refreshControls();
}
async function fetchRemote(expectedEpoch=epoch){
 if(!active||expectedEpoch!==epoch)return;
 const {data,error}=await client.from("athens_favorite_items")
  .select("market_key,selected,updated_at")
  .eq("user_id",active.id);
 if(error)throw error;
 if(expectedEpoch!==epoch||!active)return;
 const selected=new Set((data||[]).filter(x=>x.selected).map(x=>x.market_key));
 for(const [key,yes] of Object.entries(pending)){
  if(yes)selected.add(key);else selected.delete(key);
 }
 bridge.applyCloud([...selected]);
}
async function flush(){
 if(!active||flushing)return;
 flushing=true;
 const generation=epoch;
 try{
  for(const [key,yes] of Object.entries(pending)){
   if(epoch!==generation||!active)return;
   const {error}=await client.from("athens_favorite_items")
    .upsert({user_id:active.id,market_key:key,selected:yes},{onConflict:"user_id,market_key"});
   if(error)throw error;
   if(pending[key]===yes)delete pending[key];
   savePending();
  }
  await fetchRemote(generation);
  ready=true;
  refreshStatus();
 }catch(error){setOffline(error.message||String(error))}
 finally{flushing=false}
}
async function refresh(){
 if(!active)return;
 try{await fetchRemote();await flush()}
 catch(error){setOffline(error.message||String(error))}
}
function stopRealtime(){
 if(channel){client.removeChannel(channel);channel=null}
 if(poll){clearInterval(poll);poll=null}
}
function startRealtime(){
 stopRealtime();
 if(!active)return;
 const userId=active.id;
 channel=client.channel("athens-favorites-"+userId)
  .on("postgres_changes",{event:"*",schema:"public",table:"athens_favorite_items",filter:"user_id=eq."+userId},
    ()=>{void refresh()})
  .subscribe(state=>{
    if(state==="CHANNEL_ERROR"||state==="TIMED_OUT")setStatus("Live connection interrupted · retrying");
    if(state==="SUBSCRIBED")void refresh();
  });
 poll=setInterval(()=>{
  if(document.visibilityState!=="hidden"&&navigator.onLine!==false)void refresh();
 },30000);
}
async function connect(session){
 if(!session?.user){
  epoch++;ready=false;active=null;pending={};pendingImport=[];stopRealtime();
  setStatus("Local favorites · sign in to sync Mac and iPhone");
  window.athensCloudLinked=false;refreshControls();
  return;
 }
 if(active?.id===session.user.id&&initialized)return;
 epoch++;
 const currentEpoch=epoch;
 const before=bridge.getSelected();
 const user=session.user;
 active={id:user.id,email:user.email||"your account"};
 ready=false;initialized=false;pending=readPending(user.id);pendingImport=[];
 setStatus("Connecting to cloud…");
 refreshControls();
 try{
  const {data:created,error}=await client.rpc("athens_initialize_favorites",{seed_keys:before});
  if(error)throw error;
  if(epoch!==currentEpoch)return;
  await fetchRemote(currentEpoch);
  if(epoch!==currentEpoch)return;
  // An unlinked device may contain deliberate local picks.
  // Never silently restore default Kokkinara if the cloud user removed it.
  if(!created&&getLocal(linkedKey)!==user.id){
    const remoteSelected=new Set(bridge.getSelected());
    const localAdditions=before.filter(x=>!remoteSelected.has(x));
    pendingImport=localAdditions.filter(x=>!(before.length===1&&defaults.includes(x)));
  }
  putLocal(linkedKey,user.id);
  ready=true;initialized=true;
  startRealtime();
  if(Object.keys(pending).length)await flush();
  refreshStatus();
 }catch(error){setOffline(error.message||String(error))}
}
bridge.onLocalChange((key,selected)=>{
 if(!active)return;
 pending[key]=selected;savePending();
 refreshStatus();
 void flush();
});
open.addEventListener("click",()=>{
 form.hidden=!form.hidden;
 if(!form.hidden)email.focus();
});
form.addEventListener("submit",async event=>{
 event.preventDefault();
 const address=email.value.trim();
 if(!address)return;
 const send=form.querySelector('button[type="submit"]');
 send.disabled=true;
 setStatus("Sending secure sign-in link…");
 try{
  const {error}=await client.auth.signInWithOtp({
   email:address,options:{emailRedirectTo:window.location.origin+window.location.pathname}
  });
  if(error)throw error;
  setStatus("Check your email for the sign-in link. Open it on this device.");
  form.hidden=true;
 }catch(error){setStatus("Sign-in failed: "+(error.message||String(error)))}
 finally{send.disabled=false}
});
importButton.addEventListener("click",async()=>{
 if(!active||!pendingImport.length)return;
 for(const id of pendingImport)pending[id]=true;
 pendingImport=[];
 savePending();
 refreshControls();
 await flush();
});
signout.addEventListener("click",async()=>{
 signout.disabled=true;
 try{
  const {error}=await client.auth.signOut();
  if(error)throw error;
  // Don't leave a signed-out account's cloud set visible as a local copy.
  bridge.applyCloud([]);
  await connect(null);
 }catch(error){setOffline(error.message||String(error))}
 finally{signout.disabled=false}
});
window.addEventListener("online",()=>{void flush();void refresh()});
document.addEventListener("visibilitychange",()=>{
 if(document.visibilityState==="visible")void refresh();
});
client.auth.onAuthStateChange((_event,session)=>{
 // Don't await Supabase calls inside auth-state callback.
 setTimeout(()=>{void connect(session)},0);
});
void client.auth.getSession().then(({data,error})=>{
 if(error)setOffline(error.message||String(error));
 else void connect(data.session);
}).catch(error=>setOffline(error.message||String(error)));
})();
