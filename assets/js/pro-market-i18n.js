(() => {
  "use strict";
  if(window.__DIGIY_PRO_MARKET_I18N_LOADED)return;
  window.__DIGIY_PRO_MARKET_I18N_LOADED=true;
  const DATA=window.DIGIY_PRO_MARKET_I18N_DATA||{};
  const SUPPORTED=DATA.supported||["fr","en","es","de","it","nl","ar"];
  const INDEX={fr:0,en:1,es:2,de:3,it:4,nl:5,ar:6};
  const FLAGS={fr:"🇫🇷",en:"🇬🇧",es:"🇪🇸",de:"🇩🇪",it:"🇮🇹",nl:"🇳🇱",ar:"🇸🇦"};
  function detect(){
    try{
      const q=String(new URLSearchParams(location.search).get("lang")||"").toLowerCase();
      if(SUPPORTED.includes(q))return q;
      for(const key of ["digiy-pro-market-lang","digiy-market-lang","digiy-lang"]){
        const value=String(localStorage.getItem(key)||"").toLowerCase();
        if(SUPPORTED.includes(value))return value;
      }
      const browser=String(navigator.language||"fr").slice(0,2).toLowerCase();
      if(SUPPORTED.includes(browser))return browser;
    }catch(_){}
    return "fr";
  }
  const lang=detect(),column=INDEX[lang]??0;
  const exact=new Map(),pairs=[];
  for(const row of DATA.rows||[]){
    const source=String(row[0]||"").replace(/\s+/g," ").trim();
    const target=String(row[column]||row[0]||"");
    if(source){exact.set(source,target);pairs.push([source,target])}
  }
  pairs.sort((a,b)=>b[0].length-a[0].length);
  const prefixes=(DATA.prefixes||[]).map(row=>[String(row[0]||""),String(row[column]||row[0]||"")]).sort((a,b)=>b[0].length-a[0].length);
  try{
    localStorage.setItem("digiy-pro-market-lang",lang);
    localStorage.setItem("digiy-market-lang",lang);
    localStorage.setItem("digiy-lang",lang);
  }catch(_){}
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==="ar"?"rtl":"ltr";
  window.DIGIY_PRO_MARKET_LOCALE=(DATA.locales&&DATA.locales[lang])||"fr-FR";

  function keepSpace(raw,value){
    const left=(String(raw).match(/^\s*/)||[""])[0];
    const right=(String(raw).match(/\s*$/)||[""])[0];
    return left+value+right;
  }
  function translateString(value){
    const raw=String(value??"");
    if(lang==="fr"||!raw.trim())return raw;
    const compact=raw.replace(/\s+/g," ").trim();
    if(exact.has(compact))return keepSpace(raw,exact.get(compact));
    for(const [source,target] of prefixes){
      if(compact.startsWith(source))return keepSpace(raw,target+compact.slice(source.length));
    }
    let out=compact;
    for(const [source,target] of pairs){
      if(source.length<8||!out.includes(source))continue;
      out=out.split(source).join(target);
    }
    return out===compact?raw:keepSpace(raw,out);
  }
  function translateMessage(value){
    return String(value||"").split("\n").map(translateString).join("\n");
  }
  window.DIGIY_PRO_MARKET_TRANSLATE_MESSAGE=translateMessage;

  function addLanguage(url){
    const u=new URL(url,location.href);
    u.searchParams.set("lang",lang);
    return u;
  }
  function proUrl(path){
    try{
      const raw=String(path||"./index.html");
      const u=new URL(raw,location.href);
      if(u.origin===location.origin||u.hostname==="pro-market.digiylyfe.com"){
        u.searchParams.set("lang",lang);
        return u.pathname+u.search+u.hash;
      }
      if(["market.digiylyfe.com","pro-espace.digiylyfe.com","digiy-hub.digiylyfe.com","digiylyfe.com","tarifs.digiylyfe.com"].includes(u.hostname)){
        u.searchParams.set("lang",lang);
        return u.toString();
      }
      return raw;
    }catch(_){return String(path||"")}
  }
  window.DIGIY_PRO_MARKET_URL=proUrl;

  function rewriteUrl(value){
    if(!value)return value;
    const raw=String(value);
    try{
      if(/^javascript:/i.test(raw))return raw;
      if(/^(mailto:|tel:)/i.test(raw))return raw;
      if(/^sms:/i.test(raw)){
        const separator=raw.match(/([?&]body=)/i);
        if(!separator)return raw;
        const index=raw.indexOf(separator[0]);
        const head=raw.slice(0,index+separator[0].length);
        const body=raw.slice(index+separator[0].length);
        try{return head+encodeURIComponent(translateMessage(decodeURIComponent(body)))}catch(_){return raw}
      }
      const u=new URL(raw,location.href);
      if(/(^|\.)wa\.me$/i.test(u.hostname)||/(^|\.)whatsapp\.com$/i.test(u.hostname)){
        const text=u.searchParams.get("text");
        if(text)u.searchParams.set("text",translateMessage(text));
        return u.toString();
      }
      if(u.origin===location.origin||u.hostname==="pro-market.digiylyfe.com"){
        u.searchParams.set("lang",lang);
        return u.toString();
      }
      if(["market.digiylyfe.com","pro-espace.digiylyfe.com","digiy-hub.digiylyfe.com","digiylyfe.com","tarifs.digiylyfe.com"].includes(u.hostname)){
        u.searchParams.set("lang",lang);
        return u.toString();
      }
      return raw;
    }catch(_){return raw}
  }

  function translateNode(node){
    if(!node)return;
    if(node.nodeType===Node.TEXT_NODE){
      const parent=node.parentElement;
      if(!parent||["SCRIPT","STYLE","NOSCRIPT","TEXTAREA"].includes(parent.tagName))return;
      const next=translateString(node.nodeValue);
      if(next!==node.nodeValue)node.nodeValue=next;
      return;
    }
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    const el=node;
    if(["SCRIPT","STYLE","NOSCRIPT"].includes(el.tagName))return;
    for(const attr of ["placeholder","title","aria-label","alt"]){
      if(!el.hasAttribute(attr))continue;
      const old=el.getAttribute(attr),next=translateString(old);
      if(next!==old)el.setAttribute(attr,next);
    }
    if(el.tagName==="A"&&el.hasAttribute("href")){
      const old=el.getAttribute("href"),next=rewriteUrl(old);
      if(next&&next!==old)el.setAttribute("href",next);
    }
    if(el.tagName==="FORM"&&el.hasAttribute("action")){
      const old=el.getAttribute("action"),next=rewriteUrl(old);
      if(next&&next!==old)el.setAttribute("action",next);
    }
    for(const child of el.childNodes)translateNode(child);
  }

  function installSwitcher(){
    if(document.getElementById("digiyProMarketLangSwitcher"))return;
    const box=document.createElement("div");
    box.id="digiyProMarketLangSwitcher";
    box.setAttribute("aria-label","Langue PRO MARKET");
    box.innerHTML=SUPPORTED.map(code=>`<button type="button" data-pro-market-lang="${code}" aria-pressed="${code===lang}">${FLAGS[code]}<span>${code.toUpperCase()}</span></button>`).join("");
    const style=document.createElement("style");
    style.textContent=`
      #digiyProMarketLangSwitcher{position:fixed;z-index:2147483000;top:max(8px,env(safe-area-inset-top));right:8px;display:flex;gap:3px;flex-wrap:wrap;justify-content:flex-end;max-width:min(350px,calc(100vw - 16px));padding:5px;border:1px solid rgba(250,204,21,.45);border-radius:15px;background:rgba(5,16,12,.96);box-shadow:0 12px 32px rgba(0,0,0,.38);backdrop-filter:blur(10px)}
      #digiyProMarketLangSwitcher button{min-width:39px;min-height:36px;padding:3px 6px;border:0;border-radius:10px;background:transparent;color:#ecfff4;font:900 11px system-ui;display:grid;place-items:center;gap:1px;cursor:pointer}#digiyProMarketLangSwitcher button[aria-pressed="true"]{background:linear-gradient(135deg,#facc15,#22c55e);color:#041b12}#digiyProMarketLangSwitcher span{font-size:9px;line-height:1}[dir="rtl"] #digiyProMarketLangSwitcher{right:auto;left:8px}@media(max-width:560px){#digiyProMarketLangSwitcher{top:auto;bottom:max(76px,calc(8px + env(safe-area-inset-bottom)))}}
    `;
    document.head.appendChild(style);
    document.body.appendChild(box);
    box.addEventListener("click",event=>{
      const btn=event.target.closest("[data-pro-market-lang]");
      if(!btn)return;
      const next=String(btn.dataset.proMarketLang||"").toLowerCase();
      if(!SUPPORTED.includes(next)||next===lang)return;
      try{
        localStorage.setItem("digiy-pro-market-lang",next);
        localStorage.setItem("digiy-market-lang",next);
        localStorage.setItem("digiy-lang",next);
      }catch(_){}
      document.documentElement.lang=next;
      document.documentElement.dir=next==="ar"?"rtl":"ltr";
      const u=new URL(location.href);
      u.searchParams.set("lang",next);
      u.searchParams.set("_digiy_lang",Date.now().toString(36));
      location.replace(u.toString());
    });
  }

  const nativeOpen=window.open?window.open.bind(window):null;
  if(nativeOpen)window.open=function(url,target,features){return nativeOpen(rewriteUrl(url),target,features)};
  document.addEventListener("click",event=>{
    const anchor=event.target.closest?.("a[href]");
    if(!anchor)return;
    const old=anchor.getAttribute("href"),next=rewriteUrl(old);
    if(next&&next!==old)anchor.setAttribute("href",next);
  },true);

  let scheduled=false;
  const observer=new MutationObserver(records=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      for(const record of records){
        if(record.type==="characterData")translateNode(record.target);
        for(const node of record.addedNodes||[])translateNode(node);
        if(record.type==="attributes")translateNode(record.target);
      }
    });
  });
  function start(){
    installSwitcher();
    if(lang!=="fr"){
      document.title=translateString(document.title);
      translateNode(document.body);
    }else{
      document.querySelectorAll("a[href]").forEach(a=>{const next=rewriteUrl(a.getAttribute("href"));if(next)a.setAttribute("href",next)});
    }
    observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["href","action","placeholder","title","aria-label","alt"]});
    setInterval(()=>{
      document.querySelectorAll("a[href]").forEach(a=>{const old=a.getAttribute("href"),next=rewriteUrl(old);if(next&&next!==old)a.setAttribute("href",next)});
      if(lang!=="fr")translateNode(document.body);
    },1600);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();