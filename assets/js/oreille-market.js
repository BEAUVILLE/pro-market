/* DIGIYLYFE — OREILLE MARKET
   Le vendeur parle ou clique. DIGIY formule. Le vendeur valide. MARKET range.
   Rien n’est publié, vendu, promis ou confirmé automatiquement.
*/
(function(){
  'use strict';
  var VERSION='oreille-market-grand-paves-20260524';
  var CLIENTS_KEY='DIGIY_MARKET_CLIENTS_LOCAL_V1';

  var GUIDE='Bienvenue dans Oreille MARKET DIGIYLYFE. Ici, le vendeur peut parler ou cliquer pour préparer un produit, une annonce, une commande, un paiement, une livraison, un retrait ou un message client. MARKET aide à préciser le produit, le prix, le stock, le client, le téléphone, le lieu, le mode cash ou Wave, la preuve et le statut. Mais MARKET ne publie jamais seul une annonce, ne promet jamais un stock, ne confirme jamais un paiement et ne vend jamais à la place du professionnel. Le vendeur vérifie, corrige et valide. L’Oreille prépare. DIGIY formule. MARKET range. Le terrain garde la main.';

  var TEMPLATES=[
    '🛍️ Nouveau produit — produit · prix · stock · lieu · photo/preuve · contact.',
    '💬 Message client — client · téléphone · produit · question · réponse prête.',
    '📦 Commande reçue — client · téléphone · produit · quantité · prix · statut.',
    '🚚 Livraison / retrait — client · téléphone · lieu · heure · détail.',
    '💰 Paiement — montant · mode cash/Wave/autre · client · produit · preuve.',
    '🏷️ Promo / arrivage — produit · prix · durée · stock · message.',
    '📸 Photo produit — produit · détail · couleur/taille · preuve visuelle.',
    '📉 Stock faible — produit · quantité restante · action utile.',
    '✅ Produit disponible — produit · prix · stock · contact · lieu.',
    '⚠️ Brouillon — garder la trace sans publier, vendre ou promettre.'
  ];

  var CONFIG={
    module:'MARKET',
    title:'Oreille MARKET',
    subtitle:'Produit · prix · stock · client · téléphone · retrait/livraison · statut.',
    storagePrefix:'DIGIY_OREILLE_METIER',
    guideText:GUIDE,
    templates:TEMPLATES
  };

  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();}
  function core(){return window.DigiyOreilleMetier||null;}
  function norm(v){var c=core();return c&&c.normalizeText?c.normalizeText(v):String(v||'').replace(/\s+/g,' ').trim();}
  function low(v){return norm(v).toLowerCase();}
  function findTarget(){return document.querySelector('#digiy-oreille-market')||document.querySelector('[data-digiy-oreille-market]')||document.querySelector('[data-digiy-market-oreille]')||document.querySelector('#digiy-oreille-metier')||document.querySelector('[data-digiy-oreille]');}

  function field(text,labels){
    var clean=norm(text);
    for(var i=0;i<labels.length;i++){
      var label=labels[i];
      var re=new RegExp('(?:^|[\\s;,.|—-])'+label+'\\s*[:\\-]?\\s*([^;|\\n]+?)(?=\\s+(?:produit|article|client|source|nom|tel|tél|telephone|téléphone|prix|tarif|montant|stock|quantité|quantite|lieu|endroit|adresse|livraison|retrait|heure|date|mode|paiement|preuve|photo|détail|detail|statut|message|question|réponse|reponse)\\s*[:\\-]|$)','i');
      var m=clean.match(re);if(m&&m[1])return norm(m[1]);
    }
    return '';
  }
  function phone(text){var clean=norm(text);var e=clean.match(/(?:tel|tél|telephone|téléphone|phone|numéro|numero|whatsapp)\s*[:\-]?\s*((?:\+?\d[\d\s().-]{6,}\d))/i);if(e&&e[1])return norm(e[1]);var any=clean.match(/(?:\+?\d[\d\s().-]{7,}\d)/);return any?norm(any[0]):'';}
  function product(text){var x=field(text,['produit','article','marchandise','objet']);if(x)return x;var m=norm(text).match(/\b(?:vente|vendre|commande|réserver|reserver|acheter|achat|produit)\s+([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\s'.-]{1,55})/i);return m?norm(m[1]).replace(/\b(?:prix|stock|quantité|quantite|cash|wave|fcfa|cfa|livraison|retrait)\b.*$/i,'').trim():'';}
  function client(text){var x=field(text,['client','source','nom','personne']);if(x)return x;var m=norm(text).match(/\b(?:client|pour|avec|chez)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'.-]{1,40})/i);return m?norm(m[1]).replace(/\b(?:tel|produit|prix|stock|quantité|quantite|livraison|retrait|cash|wave)\b.*$/i,'').trim():'';}
  function price(text){var x=field(text,['prix','tarif','montant']);if(x)return x;var m=norm(text).match(/\b(\d[\d\s.,]*)\s*(fcfa|f\s*cfa|xof|cfa|€|eur|euro|euros)\b/i);return m?norm(m[1]+' '+(m[2]||'')):'';}
  function qty(text){var x=field(text,['quantité','quantite','stock','nombre']);if(x)return x;var m=norm(text).match(/\b(\d{1,4})\s*(pièces|pieces|pcs|unités|unites|articles|stock)?\b/i);return m?m[1]:'';}
  function place(text){return field(text,['lieu','endroit','adresse','zone','retrait','livraison','point retrait','point de retrait']);}
  function payMode(text){var x=field(text,['mode','paiement','mode paiement']);if(x)return x;var t=low(text);if(/wave|wav/.test(t))return 'Wave';if(/cash|espèce|espece|liquide/.test(t))return 'cash';if(/orange money|om\b/.test(t))return 'Orange Money';if(/virement|banque|carte|mobile money|autre/.test(t))return 'autre';return '';}
  function proof(text){var x=field(text,['preuve','photo','reçu','recu','capture']);if(x)return x;return /photo|preuve|capture|reçu|recu/i.test(text)?'à vérifier':'';}
  function detail(text){return field(text,['détail','detail','description','message','question','réponse','reponse','note','taille','couleur','marque']);}
  function status(text){var t=low(text);if(/disponible|en stock|stock ok|reste/.test(t))return 'disponible à vérifier';if(/rupture|plus de stock|indisponible|épuisé|epuise/.test(t))return 'stock indisponible';if(/commande|commandé|commande reçue|commande recue|réservé|reserve/.test(t))return 'commande à vérifier';if(/livraison|livrer|retrait|à retirer|a retirer/.test(t))return 'livraison/retrait à organiser';if(/payé|paye|paiement|wave|cash|reçu|recu/.test(t))return 'paiement à vérifier';if(/publier|annonce|promo|arrivage/.test(t))return 'annonce à préparer';return 'brouillon market';}

  function draft(text){
    var clean=norm(text);
    var d={module:'MARKET',raw_text:clean,product:product(clean),price:price(clean),quantity:qty(clean),client_name:client(clean),client_phone:phone(clean),location:place(clean),payment_mode:payMode(clean),detail:detail(clean),proof:proof(clean),status:status(clean),created_at:new Date().toISOString(),warning:'À vérifier par le vendeur avant publication, vente ou promesse client.'};
    d.missing=[];
    if(!d.product)d.missing.push('produit');
    if(!d.price)d.missing.push('prix');
    if(!d.quantity)d.missing.push('stock/quantité');
    if(!d.client_name)d.missing.push('client/source');
    if(!d.client_phone)d.missing.push('téléphone');
    if(!d.location)d.missing.push('lieu retrait/livraison');
    if(!d.payment_mode)d.missing.push('mode cash/Wave/autre');
    if(!d.detail)d.missing.push('détail');
    if(!d.proof)d.missing.push('preuve/photo');
    return d;
  }
  function line(label,value){return ' · '+label+' : '+(value||'à préciser');}
  function format(d){
    if(!d||!d.raw_text)return 'MARKET · Note vide : préciser produit, prix, stock, client, téléphone, lieu, mode, détail et preuve avant validation.';
    var missing=d.missing&&d.missing.length?'Manque : '+d.missing.join(', ')+'. ':'Trace complète à vérifier. ';
    var warning='MARKET ne publie pas seul. Le vendeur doit vérifier prix, stock, client, preuve et message avant publication ou réponse.';
    if(d.status==='paiement à vérifier')warning='Paiement à vérifier avant de compter l’argent comme reçu ou de confirmer la commande.';
    if(d.status==='stock indisponible')warning='Stock à vérifier avant d’annoncer une disponibilité au client.';
    return 'MARKET · Trace préparée — '+line('Produit',d.product)+line('Prix',d.price)+line('Stock/quantité',d.quantity)+line('Client/source',d.client_name)+line('Téléphone',d.client_phone)+line('Lieu retrait/livraison',d.location)+line('Mode',d.payment_mode||'cash / Wave / autre à choisir')+line('Détail',d.detail)+line('Preuve/photo',d.proof||'à vérifier')+line('Statut',d.status)+'. '+missing+warning+' Texte d’origine : '+d.raw_text;
  }
  function formulate(text){return format(draft(text));}

  function getClients(){try{var a=JSON.parse(localStorage.getItem(CLIENTS_KEY)||'[]');return Array.isArray(a)?a:[];}catch(_){return [];}}
  function setClients(list){try{localStorage.setItem(CLIENTS_KEY,JSON.stringify((list||[]).slice(0,200)));}catch(_){}}
  function upsertClient(d){if(!d||(!d.client_name&&!d.client_phone))return null;var list=getClients();var phone=norm(d.client_phone);var name=norm(d.client_name)||'Client sans nom';var found=null;if(phone)found=list.find(function(c){return norm(c.phone)===phone;});if(!found&&name)found=list.find(function(c){return low(c.name)===low(name);});var now=new Date().toISOString();if(found){found.name=found.name||name;found.phone=found.phone||phone;found.last_product=d.product||found.last_product||'';found.last_price=d.price||found.last_price||'';found.last_quantity=d.quantity||found.last_quantity||'';found.last_location=d.location||found.last_location||'';found.last_payment_mode=d.payment_mode||found.last_payment_mode||'';found.last_status=d.status||found.last_status||'';found.updated_at=now;}else{found={id:'market_client_'+Date.now(),name:name,phone:phone,last_product:d.product||'',last_price:d.price||'',last_quantity:d.quantity||'',last_location:d.location||'',last_payment_mode:d.payment_mode||'',last_status:d.status||'brouillon market',notes:'',created_at:now,updated_at:now};list.unshift(found);}setClients(list);return found;}

  function injectStrongStyles(){
    var old=document.getElementById('digiyOreilleMarketStrongStyles');if(old)old.remove();
    var s=document.createElement('style');s.id='digiyOreilleMarketStrongStyles';
    s.textContent=`
      .digiy-oreille-box{border-radius:30px!important;padding:18px!important;background:#fff8e8!important;color:#182014!important;box-shadow:0 18px 42px rgba(0,0,0,.22)!important}
      .digiy-oreille-head strong{font-size:1.70rem!important;line-height:1.02!important;font-weight:1000!important;letter-spacing:-.055em!important;color:#102015!important}
      .digiy-oreille-head span{font-size:1.10rem!important;font-weight:1000!important;line-height:1.32!important;color:#51472f!important}
      .digiy-oreille-actions{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;margin:15px 0!important}
      .digiy-oreille-actions button{width:100%!important;min-height:70px!important;border-radius:22px!important;padding:13px 10px!important;font-size:1.10rem!important;font-weight:1000!important;line-height:1.08!important;text-align:center!important;box-shadow:0 10px 24px rgba(32,24,8,.12)!important}
      .digiy-oreille-status{font-size:1.08rem!important;font-weight:1000!important;line-height:1.34!important;padding:14px 15px!important;border-radius:20px!important}
      .digiy-oreille-text{min-height:138px!important;font-size:1.08rem!important;font-weight:1000!important;line-height:1.44!important;border-radius:22px!important;padding:15px!important}
      .digiy-market-help{font-size:1.04rem!important;font-weight:1000!important;line-height:1.34!important;border-radius:20px!important;padding:14px!important;background:rgba(250,204,21,.16)!important;color:#25351f!important}
      .digiy-oreille-templates{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important;max-height:none!important;overflow:visible!important;padding:0!important;border:0!important;background:transparent!important;scroll-snap-type:none!important}
      .digiy-oreille-template{min-height:104px!important;width:100%!important;border-radius:24px!important;padding:16px 17px!important;font-size:1.16rem!important;font-weight:1000!important;line-height:1.20!important;letter-spacing:-.02em!important;white-space:normal!important;overflow:visible!important;background:linear-gradient(160deg,#fffdf4,#fff0b8)!important;color:#102015!important;border:2px solid rgba(15,107,66,.20)!important;box-shadow:0 14px 30px rgba(32,24,8,.12)!important}
      .digiy-market-client-mini{font-size:1.04rem!important;font-weight:1000!important;line-height:1.34!important;border-radius:20px!important;padding:14px!important}
      .digiy-oreille-note{min-height:96px!important;border-radius:24px!important;padding:16px 17px!important;font-size:1.08rem!important;font-weight:1000!important;line-height:1.34!important}
      .digiy-oreille-note b{font-size:1.25rem!important;font-weight:1000!important}
      .digiy-oreille-note span,.digiy-oreille-note div{font-size:1.06rem!important;font-weight:1000!important;line-height:1.34!important}
      @media(max-width:760px){.digiy-oreille-actions{grid-template-columns:repeat(2,minmax(0,1fr))!important}.digiy-oreille-templates{grid-template-columns:1fr!important}.digiy-oreille-template{min-height:98px!important;font-size:1.12rem!important}.digiy-oreille-actions button{min-height:66px!important;font-size:1.06rem!important}}
      @media(max-width:430px){.digiy-oreille-box{padding:15px!important}.digiy-oreille-head strong{font-size:1.52rem!important}.digiy-oreille-head span{font-size:1.02rem!important}.digiy-oreille-template{min-height:94px!important;font-size:1.08rem!important;padding:15px!important}.digiy-oreille-actions button{min-height:64px!important;font-size:1.03rem!important}.digiy-oreille-text{font-size:1.03rem!important}}
    `;
    document.head.appendChild(s);
  }

  function addHelp(target){if(!target||target.querySelector('.digiy-market-help'))return;var status=target.querySelector('.digiy-oreille-status');if(!status)return;var help=document.createElement('div');help.className='digiy-market-help';help.innerHTML='<b>MARKET demande une trace complète.</b><br>Produit · prix · stock · client/source · téléphone · retrait/livraison · mode cash/Wave/autre · preuve. Aucune annonce ou promesse client n’est validée sans le vendeur.';status.insertAdjacentElement('afterend',help);}
  function addPreview(target){if(!target||target.querySelector('.digiy-market-client-mini'))return;var notes=target.querySelector('.digiy-oreille-notes');if(!notes)return;var box=document.createElement('div');box.className='digiy-market-client-mini';box.innerHTML='<b>📇 Fichier client MARKET local</b><span>Quand tu ranges une commande avec nom ou téléphone, MARKET garde une trace client sur cet appareil.</span>';notes.insertAdjacentElement('beforebegin',box);}
  function patchButtons(target,c){if(!target)return;target.addEventListener('click',function(e){var a=e.target.closest('[data-action]');if(!a)return;var action=a.getAttribute('data-action');var text=target.querySelector('.digiy-oreille-text');var statusBox=target.querySelector('.digiy-oreille-status');if(!text)return;if(action==='formulate'){setTimeout(function(){text.value=formulate(text.value);if(statusBox)statusBox.textContent='Trace MARKET préparée. Complète les champs manquants puis valide.';},0);}if(action==='save'){setTimeout(function(){var d=draft(text.value);upsertClient(d);if(statusBox)statusBox.textContent=d.missing&&d.missing.length?'Trace rangée en brouillon. Il manque : '+d.missing.join(', ')+'.':'Trace rangée. Client local mis à jour si nom ou téléphone présent.';if(c&&typeof c.showToast==='function')c.showToast('MARKET rangé en brouillon');},0);}},true);}

  function expose(c){window.DigiyOreilleMARKET={version:VERSION,config:CONFIG,templates:TEMPLATES.slice(),guideText:GUIDE,clientsKey:CLIENTS_KEY,detect:draft,formulate:formulate,getClients:getClients,setClients:setClients,saveDraft:function(text){var d=draft(text);var msg=format(d);upsertClient(d);return c&&c.saveNote?c.saveNote(CONFIG,msg,{market_draft:d,order:d,annonce:d}):null;},speakGuide:function(){if(c&&c.speak)c.speak(GUIDE);},stopVoice:function(){if(c&&c.stopVoice)c.stopVoice();}};}
  function mount(c){var target=findTarget();expose(c);if(!target){console.info('[DIGIY Oreille MARKET] Aucun conteneur trouvé.');return;}if(target.getAttribute('data-digiy-oreille-mounted')==='1')return;target.setAttribute('data-digiy-oreille-mounted','1');var inst=c.mount({target:target,module:CONFIG.module,title:CONFIG.title,subtitle:CONFIG.subtitle,storagePrefix:CONFIG.storagePrefix,guideText:CONFIG.guideText,templates:CONFIG.templates});window.DigiyOreilleMARKET.instance=inst||null;addHelp(target);addPreview(target);patchButtons(target,c);injectStrongStyles();console.info('[DIGIY Oreille MARKET] montée grand pavés.');}
  function boot(){var tries=0;function attempt(){tries++;var c=core();if(c&&typeof c.mount==='function'){mount(c);return;}if(tries>=30){console.warn('[DIGIY Oreille MARKET] Core introuvable.');return;}setTimeout(attempt,100);}attempt();}
  ready(boot);
})();