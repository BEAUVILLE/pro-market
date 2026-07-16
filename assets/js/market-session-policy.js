/* MARKET session policy — strict local storage hygiene */
(() => {
  "use strict";
  const MODULE="MARKET",MAX=8*60*60*1000,SKEW=60000;
  const sessions=["DIGIY_MARKET_PIN_SESSION","DIGIY_MARKET_SESSION","DIGIY_SESSION_MARKET","digiy_market_session"];
  const generic=["DIGIY_PIN_SESSION","DIGIY_ACCESS","digiy_access","digiy_session","digiy_phone","digiy_last_phone","digiy_last_slug","digiy_market_pin_access","digiy_market_access_ok","digiy_market_has_access","digiy_market_access","digiy_market_pin_access_until","digiy_market_access_until"];
  const phoneKeys=["digiy_market_phone","digiy_market_last_phone","market_phone"];
  const slugKeys=["digiy_market_slug","digiy_market_last_slug","market_slug"];
  const ownerKeys=["digiy_market_owner_id","DIGIY_PRO_ID"];
  const queryKeys=["phone","tel","p_phone","owner_phone","checkout_phone","subscription_phone","market_phone","msisdn","slug","market_slug","subscription_slug","pro_slug","owner","owner_id","source_slug","module","from","return","pin","code","token"];
  const parse=raw=>{try{return JSON.parse(raw||"null")}catch(_){return null}};
  const time=v=>{if(v==null||v==="")return 0;if(typeof v==="number"&&Number.isFinite(v))return v<1e11?v*1000:v;const s=String(v).trim();if(/^\d+$/.test(s)){const n=Number(s);return Number.isFinite(n)?(n<1e11?n*1000:n):0}const d=Date.parse(s);return Number.isFinite(d)?d:0};
  const remove=(storage,key)=>{try{storage.removeItem(key)}catch(_){}};
  const strict=o=>{if(!o||typeof o!=="object"||String(o.module||"").trim().toUpperCase()!==MODULE)return null;const phone=String(o.phone||o.market_phone||"").replace(/\D/g,"");if(phone.length<9)return null;const verified=time(o.verified_at)||time(o.validated_at)||time(o.ts),expires=time(o.expires_at||o.access_until||o.pin_access_until),now=Date.now();if(!verified||!expires||verified>now+SKEW||now-verified>MAX||expires<=now||expires<verified||expires-verified>MAX+SKEW)return null;if(o.access!==true||o.access_ok!==true||!(o.pin_access===true||o.pin_session_ok===true)||o.verified!==true)return null;o.module=MODULE;o.phone=phone;o.access=true;o.access_ok=true;o.has_access=true;o.pin_access=true;o.pin_session_ok=true;o.ok=true;o.verified=true;o.verified_at=verified;o.validated_at=new Date(verified).toISOString();o.expires_at=expires;o.access_until=expires;o.pin_access_until=expires;return o};
  try{const u=new URL(location.href);let changed=false;queryKeys.forEach(k=>{if(u.searchParams.has(k)){u.searchParams.delete(k);changed=true}});if(changed)history.replaceState({},document.title,u.pathname+u.search+u.hash)}catch(_){}
  for(const storage of[localStorage,sessionStorage]){for(const key of generic)remove(storage,key)}
  for(const key of [...phoneKeys,...slugKeys,...ownerKeys])remove(localStorage,key);
  for(const key of sessions){for(const storage of[sessionStorage,localStorage]){let raw="";try{raw=storage.getItem(key)||""}catch(_){}if(!raw)continue;const value=strict(parse(raw));if(!value)remove(storage,key);else try{storage.setItem(key,JSON.stringify(value))}catch(_){}}}
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){const k=String(key);if(generic.includes(k))return;if(this===localStorage&&(phoneKeys.includes(k)||slugKeys.includes(k)||ownerKeys.includes(k)))return;if(sessions.includes(k)){const o=parse(String(value));if(!o)return;const now=Date.now(),verified=time(o.verified_at)||time(o.validated_at)||time(o.ts)||now,requested=time(o.expires_at||o.access_until||o.pin_access_until),expires=Math.min(requested>verified?requested:verified+MAX,verified+MAX);o.module=MODULE;o.access=true;o.access_ok=true;o.has_access=true;o.pin_access=true;o.pin_session_ok=true;o.ok=true;o.verified=true;o.verified_at=verified;o.validated_at=new Date(verified).toISOString();o.expires_at=expires;o.access_until=expires;o.pin_access_until=expires;o.source=String(o.source||"market_open_with_pin");value=JSON.stringify(o)}return original.call(this,k,String(value))};
})();