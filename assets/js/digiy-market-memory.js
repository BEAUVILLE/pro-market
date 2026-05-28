/* DIGIYLYFE — Mémoire locale métier MARKET
   Le téléphone garde les gestes vendeur quand le réseau flanche. */
(function(){
  "use strict";
  const ROOT = "digiy_market_memory_v1";

  function readRoot(){
    try{return JSON.parse(localStorage.getItem(ROOT) || "{}") || {}}
    catch(_){return {}}
  }

  function writeRoot(data){
    try{
      localStorage.setItem(ROOT, JSON.stringify(Object.assign({}, data || {}, {updated_at: Date.now()})));
      return true;
    }catch(_){return false}
  }

  function get(key, fallback){
    const r = readRoot();
    return Object.prototype.hasOwnProperty.call(r,key) ? r[key] : fallback;
  }

  function set(key, value){
    const r = readRoot();
    r[key] = value;
    return writeRoot(r);
  }

  function push(key, value, limit){
    const arr = Array.isArray(get(key, [])) ? get(key, []) : [];
    arr.unshift(Object.assign({id: Date.now(), saved_at: Date.now()}, value || {}));
    set(key, arr.slice(0, limit || 120));
    return arr[0];
  }

  function remove(key){
    const r = readRoot();
    delete r[key];
    return writeRoot(r);
  }

  function snapshot(){ return readRoot(); }

  function saveNote(note){ return push("notes", note || {}, 120); }
  function saveProductDraft(product){ return push("product_drafts", product || {}, 80); }
  function rememberProfile(profile){ return set("profile", profile || {}); }

  function injectMarketGoPaves(){
    try{
      var path = String(location.pathname || "").toLowerCase();
      if(path.indexOf("hub") === -1 && !/\/$/.test(path)) return;
      var grid = document.querySelector(".tileGrid");
      if(!grid) return;

      if(!document.getElementById("doorDigiyGoMarket")){
        var go = document.createElement("a");
        go.id = "doorDigiyGoMarket";
        go.className = "tile primary metierTileClair";
        go.href = "./action.html";
        go.innerHTML = '<div class="tileTop"><div class="tileIcon">🎙️</div><div class="tileTag">GO</div></div><div><b>DIGIY GO MARKET</b><span>Le vendeur parle. MARKET prépare l’offre.</span></div>';
        var before = document.getElementById("goCockpit") || grid.firstElementChild;
        if(before) grid.insertBefore(go, before);
        else grid.appendChild(go);
      }

      if(!document.getElementById("doorMarketPayTransition")){
        var pay = document.createElement("a");
        pay.id = "doorMarketPayTransition";
        pay.className = "tile pay";
        pay.href = "./pay-transition.html";
        pay.innerHTML = '<div class="tileTop"><div class="tileIcon">💳</div><div class="tileTag">PAY</div></div><div><b>Vente vers PAY</b><span>Argent réel seulement. PAY valide.</span></div>';
        var payDoor = document.getElementById("goPay");
        if(payDoor && payDoor.parentNode) payDoor.parentNode.insertBefore(pay, payDoor);
        else grid.appendChild(pay);
      }
    }catch(e){
      console.warn("[DIGIY MARKET] pavés GO/PAY non injectés", e && e.message ? e.message : e);
    }
  }

  function bootMarketGoPaves(){
    injectMarketGoPaves();
    setTimeout(injectMarketGoPaves, 500);
  }

  window.DIGIY_MARKET_MEMORY = {get,set,push,remove,snapshot,writeRoot,readRoot,saveNote,saveProductDraft,rememberProfile,injectMarketGoPaves};

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bootMarketGoPaves);
  }else{
    bootMarketGoPaves();
  }
})();