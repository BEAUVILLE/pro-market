/* MARKET guard loader — policy first, métier second */
(() => {
  "use strict";
  document.write('<script src="./assets/js/market-session-policy.js?v=20260722"><\/script>');
  document.write('<script src="./guard-core.js?v=market-core-20260716"><\/script>');
  document.write('<script>(()=>{const url="https://digiy-carnet-pro.digiylyfe.com/inscription-pay.html";const apply=()=>{const g=window.DIGIY_GUARD;if(!g)return setTimeout(apply,0);if(g.state)g.state.pay_url=url;g.buildPayUrl=()=>url;g.goPay=()=>{location.href=url}};apply()})();<\/script>');
})();