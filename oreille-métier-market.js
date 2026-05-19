/* DIGIY OREILLE MÉTIER — MARKET / JE VENDS V1
   Le pro parle ou écrit court.
   DIGIY met en forme.
   Le pro valide.
   Le logiciel range.
*/
(function(){
  'use strict';

  const BUILD='oreille-metier-market-v1-conteneur-safe-20260519';

  let lastDraft=null;
  let recognition=null;
  let listening=false;

  const $=id=>document.getElementById(id);

  const esc=v=>String(v??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');

  const strip=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const norm=v=>strip(String(v||'').toLowerCase()).replace(/[’']/g,' ').replace(/\s+/g,' ').trim();

  const toast=m=>{
    if(typeof window.showToast==='function'){
      window.showToast(m);
      return;
    }
    try{
      const n=document.createElement('div');
      n.textContent=m;
      n.style.cssText='position:fixed;left:14px;right:14px;bottom:92px;z-index:99999;padding:13px 15px;border-radius:18px;background:#062612;color:#f0fff5;border:1px solid rgba(250,204,21,.35);font:900 15px system-ui;box-shadow:0 16px 38px rgba(0,0,0,.28);';
      document.body.appendChild(n);
      setTimeout(()=>n.remove(),2600);
    }catch(_){
      alert(m);
    }
  };

  function money(text){
    const m=String(text||'').match(/(\d[\d\s.,]*)\s*(?:f|fcfa|francs?|xof|€|eur|euro)?/i);
    return m ? Number(String(m[1]).replace(/[^\d]/g,'')) || 0 : 0;
  }

  function parseDate(text){
    const t=norm(text);
    const d=new Date();
    const iso=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;

    if(t.includes('aujourd hui')) return iso(d);
    if(t.includes('demain')){ d.setDate(d.getDate()+1); return iso(d); }
    if(t.includes('apres demain') || t.includes('apres-demain')){ d.setDate(d.getDate()+2); return iso(d); }
    if(t.includes('fin du mois')) return iso(new Date(d.getFullYear(),d.getMonth()+1,0));

    const w={dimanche:0,lundi:1,mardi:2,mercredi:3,jeudi:4,vendredi:5,samedi:6};
    for(const [name,target] of Object.entries(w)){
      if(t.includes(name)){
        let add=(target-d.getDay()+7)%7;
        if(add===0) add=7;
        d.setDate(d.getDate()+add);
        return iso(d);
      }
    }

    const m=String(text||'').match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
    if(m){
      const y=m[3] ? Number(String(m[3]).length===2 ? '20'+m[3] : m[3]) : d.getFullYear();
      return iso(new Date(y,Number(m[2])-1,Number(m[1])));
    }

    return '';
  }

  function cleanName(text){
    return String(text||'')
      .replace(/\b(client|commande|produit|article|prix|stock|vente|vendu|vends|vend|ajoute|ajouter|publier|publie|photo|photos|livraison|demain|aujourd hui|tel|telephone|téléphone|whatsapp|wa|fcfa|francs|f)\b/gi,' ')
      .replace(/\d+/g,' ')
      .replace(/[.,;:!?]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function cleanClient(text){
    const raw=String(text||'')
      .replace(/(?:tel|tél|telephone|téléphone|whatsapp|wa)\s*[:\-]?\s*[+0-9][0-9\s().-]{6,}/ig,' ')
      .replace(/\d[\d\s.,]*/g,' ');

    const stop=new Set('market boutique produit produits commande client demande vente vendu vends vend prix stock photo photos livraison demain aujourd hui paiement acompte solde note rappel tel telephone téléphone whatsapp wa'.split(' '));

    for(const w of raw.replace(/[.,;:!?()]/g,' ').split(/\s+/).filter(Boolean)){
      const k=norm(w);
      if(k.length>=2 && !stop.has(k)) return w.charAt(0).toUpperCase()+w.slice(1);
    }

    return 'Client';
  }

  function hasContact(text){
    const s=String(text||'');
    return /(?:tel|tél|telephone|téléphone|whatsapp|wa)\s*[:\-]?\s*[+0-9][0-9\s().-]{6,}/i.test(s)
      || /(?:\+?221)?\s*(7[05678])[\s.-]?(\d{3})[\s.-]?(\d{2})[\s.-]?(\d{2})/.test(s);
  }

  function qty(text){
    const m=norm(text).match(/\b(\d+)\s+(?:x\s+)?([a-z0-9\- ]{2,})/);
    return m ? Number(m[1]) || 1 : 1;
  }

  function routeDraft(title,href,note){
    return { type:'route', title, href, note:note||'' };
  }

  function parse(text){
    const original=String(text||'').trim();
    const t=norm(original);
    if(!original) return null;

    if(/\b(hub|menu|portes|navigation)\b/.test(t)) return routeDraft('🧭 Ouvrir le HUB MARKET','./hub.html','Retour aux pavés.');
    if(/\b(session|acces|accès|nettoyer|code pin|pin)\b/.test(t)) return routeDraft('🛡️ Ouvrir ma session','./session.html','Contrôler l’accès sans afficher les identifiants.');
    if(/\b(gestion|cockpit|tableau|vendeur)\b/.test(t)) return routeDraft('🛍️ Ouvrir ma gestion','./cockpit.html','Retour à la page de travail vendeur.');
    if(/\b(produits?|articles?|stock|marchandises?)\b/.test(t) && !/\d/.test(t)) return routeDraft('📦 Ouvrir mes produits','./produits.html','Gérer les articles, prix et stock.');
    if(/\b(boutique|identite|identité|profil|contact|visibilite|visibilité)\b/.test(t)) return routeDraft('🏪 Ouvrir ma boutique','./boutique.html','Régler identité et visibilité.');
    if(/\b(qr|code qr|partager|lien client)\b/.test(t)) return routeDraft('🔳 Ouvrir mon QR','./qr.html','Partager la boutique ou la fiche.');
    if(/\b(pay|argent|paiement|acompte|solde|dette|depense|dépense|recette)\b/.test(t)){
      return {type:'payment',title:'💰 Préparer Mon Argent',href:'https://pro-pay.digiylyfe.com/admin.html',amount:money(original),date:parseDate(original),note:original};
    }

    if(/\b(ajoute|ajouter|nouveau produit|produit|article|prix|stock|publier|publie|photo)\b/.test(t)){
      return {
        type:'product',
        title:'📦 Produit à préparer',
        product:cleanName(original) || 'Produit',
        qty:qty(original),
        amount:money(original),
        publish:/\b(publier|publie|visible|mettre en ligne)\b/.test(t),
        note:original
      };
    }

    if(/\b(commande|client veut|client demande|demande client|livraison|réserver|reserver)\b/.test(t)){
      return {
        type:'order',
        title:'🛒 Demande client',
        client:cleanClient(original),
        contact:hasContact(original),
        date:parseDate(original),
        amount:money(original),
        note:original
      };
    }

    if(/\b(note|rappel|rappelle|a faire|à faire|message|demande)\b/.test(t)){
      return {
        type:'note',
        title:'📝 Note vendeur',
        client:cleanClient(original),
        contact:hasContact(original),
        date:parseDate(original),
        amount:money(original),
        note:original
      };
    }

    return {
      type:'note',
      title:'📝 Note à préciser',
      client:cleanClient(original),
      contact:hasContact(original),
      date:parseDate(original),
      amount:money(original),
      note:original
    };
  }

  function saveDraftLocal(d){
    try{
      const key='digiy_market_oreille_notes';
      const list=JSON.parse(localStorage.getItem(key)||'[]');

      const row={
        id:Date.now(),
        date:new Date().toISOString(),
        type:d.type||'note',
        title:d.title||'Note MARKET',
        client:d.client||'Client',
        product:d.product||'',
        qty:Number(d.qty||0),
        contact:!!d.contact,
        dueDate:d.date||'',
        amount:Number(d.amount||0),
        text:d.note||''
      };

      list.unshift(row);
      localStorage.setItem(key,JSON.stringify(list.slice(0,100)));
      localStorage.setItem('digiy_market_oreille_last_note',JSON.stringify(row));

      try{
        const legacy=JSON.parse(localStorage.getItem('digiy_market_notes')||'[]');
        legacy.unshift(row);
        localStorage.setItem('digiy_market_notes',JSON.stringify(legacy.slice(0,100)));
      }catch(_){}
    }catch(_){}
  }

  function renderDraft(d){
    const box=$('digiyMarketDraft');
    const btn=$('digiyMarketValidate');
    if(!box || !btn) return;

    lastDraft=d;
    btn.disabled=!d;

    if(!d){
      box.innerHTML='<strong>Doctrine</strong><span>Le pro parle ou écrit. DIGIY met en forme. Le pro valide. Le logiciel range.</span>';
      return;
    }

    if(d.type==='route'){
      box.innerHTML=`<strong>${esc(d.title)}</strong><span>Chemin : ${esc(d.href)}</span><em>${esc(d.note||'Valide pour ouvrir la bonne porte.')}</em>`;
      return;
    }

    if(d.type==='product'){
      box.innerHTML=`<strong>${esc(d.title)}</strong><span>Produit : ${esc(d.product||'Produit')}</span><span>Quantité : ${d.qty||'—'}</span><span>Prix entendu : ${d.amount?esc(d.amount.toLocaleString('fr-FR'))+' F':'à compléter'}</span><span>Publication : ${d.publish?'à publier':'à vérifier'}</span><em>Valide pour garder la note produit et ouvrir Produits.</em>`;
      return;
    }

    if(d.type==='order'){
      box.innerHTML=`<strong>${esc(d.title)}</strong><span>Client : ${esc(d.client||'Client')}</span><span>Contact : ${d.contact?'renseigné':'—'}</span><span>Date : ${esc(d.date||'à préciser')}</span><span>Montant : ${d.amount?esc(d.amount.toLocaleString('fr-FR'))+' F':'—'}</span><em>Valide pour garder la demande client.</em>`;
      return;
    }

    if(d.type==='payment'){
      box.innerHTML=`<strong>${esc(d.title)}</strong><span>Montant entendu : ${d.amount?esc(d.amount.toLocaleString('fr-FR'))+' F':'à compléter'}</span><span>Trace gardée localement avant ouverture.</span><em>Valide pour ouvrir Mon Argent.</em>`;
      return;
    }

    box.innerHTML=`<strong>${esc(d.title)}</strong><span>Client : ${esc(d.client||'Client')}</span><span>Contact : ${d.contact?'renseigné':'—'}</span><span>Date : ${esc(d.date||'à préciser')}</span><span>Montant : ${d.amount?esc(d.amount.toLocaleString('fr-FR'))+' F':'—'}</span><em>Valide pour garder la note dans MARKET.</em>`;
  }

  function executeDraft(){
    const d=lastDraft;
    if(!d) return;

    if(d.type==='note' || d.type==='order' || d.type==='product' || d.type==='payment'){
      saveDraftLocal(d);
    }

    if(d.type==='product'){
      toast('📦 Note produit gardée. Ouverture Produits.');
      setTimeout(()=>{ location.href='./produits.html'; },180);
      return;
    }

    if(d.type==='order' || d.type==='note'){
      toast('📝 Note MARKET gardée dans le logiciel.');
      try{
        if(typeof window.renderNotes==='function') window.renderNotes();
        if(typeof window.showPanel==='function') window.showPanel('notes');
      }catch(_){}
      return;
    }

    if(d.href){
      toast('🧭 Porte ouverte');
      setTimeout(()=>{ location.href=d.href; },160);
      return;
    }

    toast('Geste préparé.');
  }

  function startVoice(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    const btn=$('digiyMarketMic');
    const input=$('digiyMarketInput');

    if(!SR){
      toast('Voix non disponible sur ce navigateur. Écris court, ça marche aussi.');
      return;
    }

    try{
      if(recognition && listening){
        recognition.stop();
        return;
      }

      recognition=new SR();
      recognition.lang='fr-FR';
      recognition.interimResults=false;
      recognition.maxAlternatives=1;

      recognition.onstart=()=>{
        listening=true;
        if(btn) btn.textContent='🎧 J’écoute…';
      };

      recognition.onend=()=>{
        listening=false;
        if(btn) btn.textContent='🎙️ Parler';
      };

      recognition.onerror=()=>{
        listening=false;
        if(btn) btn.textContent='🎙️ Parler';
        toast('Voix non comprise. Écris la phrase courte.');
      };

      recognition.onresult=e=>{
        const said=e?.results?.[0]?.[0]?.transcript||'';
        if(input && said){
          input.value=said;
          renderDraft(parse(said));
          toast('Phrase captée. Vérifie puis valide.');
        }
      };

      recognition.start();
    }catch(_){
      toast('Micro déjà ouvert ou navigateur bloqué.');
    }
  }

  function inject(){
    if($('digiyMarketEar')) return;

    const anchor =
      document.querySelector('.hero') ||
      document.querySelector('.bigActions') ||
      document.querySelector('main') ||
      document.body;

    if(!anchor) return;

    const css=document.createElement('style');
    css.textContent=`
      .digiy-market-ear{margin:12px 0;padding:14px;border:2px solid rgba(250,204,21,.34);border-radius:22px;background:linear-gradient(160deg,rgba(255,255,255,.10),rgba(34,197,94,.08));box-shadow:0 14px 32px rgba(0,0,0,.24);display:grid;gap:10px;color:#ecfff4}
      .digiy-market-ear summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;font-weight:1000;color:#fff8dc}
      .digiy-market-ear summary::-webkit-details-marker{display:none}
      .digiy-market-ear-title{font-size:19px;font-weight:1000;line-height:1.1}
      .digiy-market-ear-sub{margin-top:4px;font-size:14.5px;font-weight:950;color:rgba(236,255,244,.78);line-height:1.35}
      .digiy-market-ear-chevron{font-size:20px;color:#facc15;font-weight:1000}
      .digiy-market-ear[open] .digiy-market-ear-chevron{transform:rotate(180deg)}
      .digiy-market-ear-body{display:grid;gap:10px;margin-top:12px}
      .digiy-market-chips{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .digiy-market-chip{min-height:54px;border-radius:16px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:#ecfff4;padding:10px 11px;font-size:15px;font-weight:1000;text-align:center;cursor:pointer}
      .digiy-market-chip.gold{background:rgba(250,204,21,.13);border-color:rgba(250,204,21,.28);color:#fff1a8}
      .digiy-market-chip.green{background:rgba(34,197,94,.13);border-color:rgba(34,197,94,.28);color:#bbf7d0}
      .digiy-market-input-grid{display:grid;grid-template-columns:1fr .85fr;gap:10px;align-items:start}
      .digiy-market-ear textarea{width:100%;min-height:98px;border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:12px;font-size:18px;font-weight:950;color:#ecfff4;background:rgba(0,0,0,.20);resize:vertical;outline:none}
      .digiy-market-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
      .digiy-market-actions button{min-height:44px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:#ecfff4;padding:9px 12px;font-size:15px;font-weight:1000;cursor:pointer}
      .digiy-market-actions button.primary{background:#facc15;border-color:#eab308;color:#1a1200}
      .digiy-market-actions button.ok{background:#22c55e;border-color:#16a34a;color:#04160e}
      .digiy-market-actions button:disabled{opacity:.52;cursor:not-allowed}
      .digiy-market-draft{min-height:98px;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(0,0,0,.18);padding:12px;display:grid;gap:5px;font-size:15px;line-height:1.4;color:rgba(236,255,244,.78);font-weight:950}
      .digiy-market-draft strong{color:#fff;font-size:18px;font-weight:1000}
      .digiy-market-draft em{color:#fff1a8;font-style:normal;font-weight:1000}
      @media(max-width:760px){.digiy-market-input-grid{grid-template-columns:1fr}.digiy-market-chips{grid-template-columns:1fr 1fr}}
      @media(max-width:520px){.digiy-market-ear-title{font-size:18px}.digiy-market-chip{font-size:14px;min-height:52px}.digiy-market-ear textarea{font-size:17px}.digiy-market-actions button{font-size:14.5px}}
    `;
    document.head.appendChild(css);

    const panel=document.createElement('details');
    panel.className='digiy-market-ear';
    panel.id='digiyMarketEar';
    panel.open=false;

    panel.innerHTML=`
      <summary>
        <span>
          <span class="digiy-market-ear-title">🎙️ Mes oreilles MARKET</span>
          <span class="digiy-market-ear-sub">Tu parles ou tu écris. DIGIY met en forme. Le pro valide.</span>
        </span>
        <span class="digiy-market-ear-chevron">⌄</span>
      </summary>

      <div class="digiy-market-ear-body">
        <div class="digiy-market-chips">
          <button class="digiy-market-chip green" type="button" data-market-example="Client veut deux sacs prix 15000 livraison demain">🛒 Demande client</button>
          <button class="digiy-market-chip" type="button" data-market-example="Ajouter produit sac à 15000 stock 4">📦 Produit</button>
          <button class="digiy-market-chip gold" type="button" data-market-example="Vente reçue 15000">💰 Recette</button>
          <button class="digiy-market-chip" type="button" data-market-example="Ouvrir ma boutique">🏪 Boutique</button>
          <button class="digiy-market-chip" type="button" data-market-example="Ouvrir mes produits">📦 Produits</button>
          <button class="digiy-market-chip gold" type="button" data-market-example="Note client livraison demain">📝 Note</button>
        </div>

        <div class="digiy-market-input-grid">
          <div>
            <textarea id="digiyMarketInput" placeholder="Ex. client veut deux sacs prix 15000 livraison demain / ajouter produit / vente reçue 15000"></textarea>

            <div class="digiy-market-actions">
              <button id="digiyMarketMic" type="button">🎙️ Parler</button>
              <button class="primary" id="digiyMarketPrepare" type="button">⚡ Préparer</button>
              <button class="ok" id="digiyMarketValidate" type="button" disabled>✅ Valider</button>
              <button id="digiyMarketClear" type="button">Effacer</button>
            </div>
          </div>

          <div class="digiy-market-draft" id="digiyMarketDraft">
            <strong>Doctrine</strong>
            <span>Le pro parle ou écrit. DIGIY met en forme. Le pro valide. Le logiciel range.</span>
          </div>
        </div>
      </div>
    `;

    if(anchor.classList?.contains('hero')){
      anchor.appendChild(panel);
    }else{
      anchor.prepend(panel);
    }

    $('digiyMarketMic')?.addEventListener('click',startVoice);
    $('digiyMarketPrepare')?.addEventListener('click',()=>renderDraft(parse($('digiyMarketInput')?.value||'')));
    $('digiyMarketValidate')?.addEventListener('click',executeDraft);
    $('digiyMarketClear')?.addEventListener('click',()=>{
      if($('digiyMarketInput')) $('digiyMarketInput').value='';
      renderDraft(null);
    });

    panel.querySelectorAll('[data-market-example]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const v=btn.getAttribute('data-market-example')||'';
        const input=$('digiyMarketInput');
        if(input) input.value=v;
        renderDraft(parse(v));
      });
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',inject);
  else inject();

  window.DIGIY_OREILLE_METIER_MARKET={BUILD,parse,renderDraft,executeDraft};
})();
