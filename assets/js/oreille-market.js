/* ==========================================================================
   DIGIYLYFE — OREILLE MARKET V1
   Fichier : assets/js/oreille-market.js
   Version : 2026-05-24 · produit + prix + stock + client + livraison
   Dépendance : assets/js/oreille-metier-core.js

   Doctrine :
   L’Oreille écoute.
   DIGIY formule.
   Le vendeur valide.
   MARKET range.
   Aucun produit, prix, stock, paiement ou engagement n’est publié automatiquement.
   ========================================================================== */

(function () {
  "use strict";

  var VERSION = "oreille-market-v1-20260524";
  var CLIENTS_KEY = "DIGIY_MARKET_CLIENTS_LOCAL_V1";

  var MARKET_GUIDE =
    "Bienvenue dans Oreille MARKET DIGIYLYFE. " +
    "Ici, le vendeur peut parler ou cliquer pour préparer une annonce, une commande ou un message client. " +
    "MARKET aide à préciser le produit, le prix, le stock, le client ou la source, le téléphone, le lieu de retrait ou livraison, le mode de paiement, la preuve et le statut. " +
    "Mais MARKET ne publie jamais seul une annonce, ne promet jamais un stock, ne confirme jamais un paiement et ne vend jamais à la place du professionnel. " +
    "Le vendeur vérifie le prix, la disponibilité, le client, la preuve et le message avant de publier, copier ou ranger. " +
    "L’Oreille prépare. DIGIY formule. Le vendeur relit. Le vendeur valide. MARKET range. " +
    "Le terrain garde la main.";

  var MARKET_TEMPLATES = [
    "🛍️ Nouveau produit — produit · prix · stock · lieu · photo/preuve · contact.",
    "💬 Message client — client · téléphone · produit · question · réponse prête.",
    "📦 Commande reçue — client · téléphone · produit · quantité · prix · statut.",
    "🚚 Livraison / retrait — client · téléphone · lieu · heure · détail.",
    "💰 Paiement — montant · mode cash/Wave/autre · client · produit · preuve.",
    "🏷️ Promo / arrivage — produit · prix · durée · stock · message.",
    "📸 Photo produit — produit · détail · couleur/taille · preuve visuelle.",
    "📉 Stock faible — produit · quantité restante · action utile.",
    "✅ Produit disponible — produit · prix · stock · contact · lieu.",
    "⚠️ Doute / brouillon — garder en note, ne pas publier sans validation."
  ];

  var MARKET_CONFIG = {
    module: "MARKET",
    title: "Oreille MARKET",
    subtitle: "Produit · prix · stock · client · téléphone · retrait/livraison · statut.",
    storagePrefix: "DIGIY_OREILLE_METIER",
    guideText: MARKET_GUIDE,
    templates: MARKET_TEMPLATES
  };

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/\s+([,.!?;:])/g, "$1")
      .trim();
  }

  function lower(value) {
    return normalizeText(value).toLowerCase();
  }

  function findMountTarget() {
    return (
      document.querySelector("#digiy-oreille-market") ||
      document.querySelector("[data-digiy-oreille-market]") ||
      document.querySelector("[data-digiy-market-oreille]") ||
      document.querySelector("#digiy-oreille-metier") ||
      document.querySelector("[data-digiy-oreille]")
    );
  }

  function extractField(text, labels) {
    var clean = normalizeText(text);

    for (var i = 0; i < labels.length; i += 1) {
      var label = labels[i];

      var re = new RegExp(
        "(?:^|[\\s;,.|—-])" +
          label +
          "\\s*[:\\-]?\\s*([^;|\\n]+?)(?=\\s+(?:produit|article|client|source|nom|tel|tél|telephone|téléphone|prix|tarif|montant|stock|quantité|quantite|lieu|endroit|adresse|livraison|retrait|heure|date|mode|paiement|preuve|photo|détail|detail|statut|message|question|réponse|reponse)\\s*[:\\-]|$)",
        "i"
      );

      var match = clean.match(re);
      if (match && match[1]) return normalizeText(match[1]);
    }

    return "";
  }

  function extractPhone(text) {
    var clean = normalizeText(text);
    var explicit = clean.match(/(?:tel|tél|telephone|téléphone|phone|numéro|numero)\s*[:\-]?\s*((?:\+?\d[\d\s().-]{6,}\d))/i);
    if (explicit && explicit[1]) return normalizeText(explicit[1]);

    var any = clean.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
    return any ? normalizeText(any[0]) : "";
  }

  function extractClientName(text) {
    var explicit = extractField(text, ["client", "source", "nom", "personne"]);
    if (explicit) return explicit;

    var clean = normalizeText(text);
    var match = clean.match(/\b(?:client|pour|avec|chez)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'.-]{1,40})/i);

    if (match && match[1]) {
      var candidate = normalizeText(match[1])
        .replace(/\b(?:tel|produit|prix|stock|quantité|quantite|livraison|retrait|cash|wave)\b.*$/i, "")
        .trim();

      if (candidate && candidate.length <= 45) return candidate;
    }

    return "";
  }

  function extractProduct(text) {
    var explicit = extractField(text, ["produit", "article", "marchandise", "objet"]);
    if (explicit) return explicit;

    var clean = normalizeText(text);
    var match = clean.match(/\b(?:vente|vendre|commande|réserver|reserver|acheter|achat)\s+([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\s'.-]{1,50})/i);

    if (match && match[1]) {
      var candidate = normalizeText(match[1])
        .replace(/\b(?:prix|stock|quantité|quantite|cash|wave|fcfa|cfa|livraison|retrait)\b.*$/i, "")
        .trim();

      if (candidate && candidate.length <= 60) return candidate;
    }

    return "";
  }

  function extractPrice(text) {
    var explicit = extractField(text, ["prix", "tarif", "montant"]);
    if (explicit) return explicit;

    var clean = normalizeText(text);
    var match = clean.match(/\b(\d[\d\s.,]*)\s*(fcfa|f\s*cfa|xof|cfa|€|eur|euro|euros)\b/i);

    if (match && match[1]) {
      return normalizeText(match[1] + " " + (match[2] || ""));
    }

    return "";
  }

  function extractQuantity(text) {
    var explicit = extractField(text, ["quantité", "quantite", "stock", "nombre"]);
    if (explicit) return explicit;

    var clean = normalizeText(text);
    var match = clean.match(/\b(\d{1,4})\s*(pièces|pieces|pcs|unités|unites|articles|stock)?\b/i);

    if (match && match[1]) {
      var n = Number(match[1]);
      if (n > 0 && n < 10000) return String(n);
    }

    return "";
  }

  function extractLocation(text) {
    return extractField(text, [
      "lieu",
      "endroit",
      "adresse",
      "zone",
      "retrait",
      "livraison",
      "point retrait",
      "point de retrait"
    ]);
  }

  function extractDate(text) {
    var explicit = extractField(text, ["date", "jour"]);
    if (explicit) return explicit;

    var clean = normalizeText(text);

    var numeric = clean.match(/\b(\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?)\b/);
    if (numeric && numeric[1]) return numeric[1];

    var natural = clean.match(/\b(aujourd'hui|demain|après-demain|apres-demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i);
    if (natural && natural[1]) return natural[1];

    return "";
  }

  function extractTime(text) {
    var explicit = extractField(text, ["heure", "horaire"]);
    if (explicit) return explicit;

    var clean = normalizeText(text);
    var match = clean.match(/\b(\d{1,2}\s*h(?:\s*\d{2})?|\d{1,2}:\d{2})\b/i);
    return match && match[1] ? normalizeText(match[1]) : "";
  }

  function extractPaymentMode(text) {
    var explicit = extractField(text, ["mode", "paiement", "mode paiement"]);
    if (explicit) return explicit;

    var t = lower(text);

    if (/wave|wav/.test(t)) return "Wave";
    if (/cash|espèce|espece|liquide/.test(t)) return "cash";
    if (/orange money|om\b/.test(t)) return "Orange Money";
    if (/virement|banque|carte|chèque|cheque|autre|mobile money/.test(t)) return "autre";

    return "";
  }

  function extractProof(text) {
    var proof = extractField(text, ["preuve", "photo", "reçu", "recu", "capture"]);
    if (proof) return proof;

    var t = lower(text);
    if (/photo|preuve|capture|reçu|recu/.test(t)) return "à vérifier";
    return "";
  }

  function extractDetail(text) {
    return extractField(text, [
      "détail",
      "detail",
      "description",
      "message",
      "question",
      "réponse",
      "reponse",
      "note",
      "taille",
      "couleur",
      "marque"
    ]);
  }

  function guessStatus(text) {
    var t = lower(text);

    if (/disponible|en stock|stock ok|reste/.test(t)) return "disponible à vérifier";
    if (/rupture|plus de stock|indisponible|épuisé|epuise/.test(t)) return "stock indisponible";
    if (/commande|commandé|commande reçue|commande recue|réservé|reserve/.test(t)) return "commande à vérifier";
    if (/livraison|livrer|retrait|à retirer|a retirer/.test(t)) return "livraison/retrait à organiser";
    if (/payé|paye|paiement|wave|cash|reçu|recu/.test(t)) return "paiement à vérifier";
    if (/publier|annonce|promo|arrivage/.test(t)) return "annonce à préparer";

    return "brouillon market";
  }

  function missingFields(draft) {
    var missing = [];

    if (!draft.product) missing.push("produit");
    if (!draft.price) missing.push("prix");
    if (!draft.quantity) missing.push("stock/quantité");
    if (!draft.client_name) missing.push("client/source");
    if (!draft.client_phone) missing.push("téléphone");
    if (!draft.location) missing.push("lieu retrait/livraison");
    if (!draft.payment_mode) missing.push("mode cash/Wave/autre");
    if (!draft.detail) missing.push("détail");
    if (!draft.proof) missing.push("preuve/photo");

    return missing;
  }

  function buildMarketDraft(text) {
    var clean = normalizeText(text);

    var draft = {
      module: "MARKET",
      raw_text: clean,
      product: extractProduct(clean),
      price: extractPrice(clean),
      quantity: extractQuantity(clean),
      client_name: extractClientName(clean),
      client_phone: extractPhone(clean),
      location: extractLocation(clean),
      date: extractDate(clean),
      time: extractTime(clean),
      payment_mode: extractPaymentMode(clean),
      detail: extractDetail(clean),
      proof: extractProof(clean),
      status: guessStatus(clean),
      created_at: new Date().toISOString(),
      warning: "À vérifier par le vendeur avant publication, vente ou promesse client."
    };

    draft.missing = missingFields(draft);
    return draft;
  }

  function formatMarketDraftMessage(draft) {
    if (!draft || !draft.raw_text) {
      return "MARKET · Note vide : préciser produit, prix, stock, client, téléphone, lieu, mode, détail et preuve avant validation.";
    }

    var productPart = "Produit : " + (draft.product || "à préciser");
    var pricePart = "Prix : " + (draft.price || "à préciser");
    var quantityPart = "Stock/quantité : " + (draft.quantity || "à préciser");
    var clientPart = "Client/source : " + (draft.client_name || "à préciser");
    var phonePart = "Téléphone : " + (draft.client_phone || "à préciser");
    var locationPart = "Lieu retrait/livraison : " + (draft.location || "à préciser");
    var datePart = "Date : " + (draft.date || "à préciser si utile");
    var timePart = "Heure : " + (draft.time || "à préciser si utile");
    var modePart = "Mode : " + (draft.payment_mode || "cash / Wave / autre à choisir");
    var detailPart = "Détail : " + (draft.detail || "à préciser");
    var proofPart = "Preuve/photo : " + (draft.proof || "à vérifier");
    var statusPart = "Statut : " + (draft.status || "brouillon market");

    var missing =
      draft.missing && draft.missing.length
        ? "Manque : " + draft.missing.join(", ") + ". "
        : "Trace complète à vérifier. ";

    var warning =
      "MARKET ne publie pas seul. Le vendeur doit vérifier prix, stock, client, preuve et message avant publication ou réponse.";

    if (draft.status === "paiement à vérifier") {
      warning = "Paiement à vérifier avant de compter l’argent comme reçu ou de confirmer la commande.";
    }

    if (draft.status === "stock indisponible") {
      warning = "Stock à vérifier avant d’annoncer une disponibilité au client.";
    }

    return (
      "MARKET · Trace préparée — " +
      productPart +
      " · " +
      pricePart +
      " · " +
      quantityPart +
      " · " +
      clientPart +
      " · " +
      phonePart +
      " · " +
      locationPart +
      " · " +
      datePart +
      " · " +
      timePart +
      " · " +
      modePart +
      " · " +
      detailPart +
      " · " +
      proofPart +
      " · " +
      statusPart +
      ". " +
      missing +
      warning +
      " Texte d’origine : " +
      draft.raw_text
    );
  }

  function formulateMarketDeep(text) {
    return formatMarketDraftMessage(buildMarketDraft(text));
  }

  function getClients() {
    try {
      var raw = localStorage.getItem(CLIENTS_KEY) || "[]";
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  }

  function setClients(clients) {
    try {
      localStorage.setItem(CLIENTS_KEY, JSON.stringify((clients || []).slice(0, 200)));
    } catch (_err) {}
  }

  function upsertClientFromDraft(draft) {
    if (!draft || (!draft.client_name && !draft.client_phone)) return null;

    var clients = getClients();
    var phone = normalizeText(draft.client_phone);
    var name = normalizeText(draft.client_name) || "Client sans nom";
    var found = null;

    if (phone) {
      found = clients.find(function (c) {
        return normalizeText(c.phone) === phone;
      });
    }

    if (!found && name) {
      found = clients.find(function (c) {
        return lower(c.name) === lower(name);
      });
    }

    var now = new Date().toISOString();

    if (found) {
      found.name = found.name || name;
      found.phone = found.phone || phone;
      found.last_product = draft.product || found.last_product || "";
      found.last_price = draft.price || found.last_price || "";
      found.last_quantity = draft.quantity || found.last_quantity || "";
      found.last_location = draft.location || found.last_location || "";
      found.last_payment_mode = draft.payment_mode || found.last_payment_mode || "";
      found.last_status = draft.status || found.last_status || "";
      found.updated_at = now;
    } else {
      found = {
        id: "market_client_" + Date.now(),
        name: name,
        phone: phone,
        last_product: draft.product || "",
        last_price: draft.price || "",
        last_quantity: draft.quantity || "",
        last_location: draft.location || "",
        last_payment_mode: draft.payment_mode || "",
        last_status: draft.status || "brouillon market",
        notes: "",
        created_at: now,
        updated_at: now
      };

      clients.unshift(found);
    }

    setClients(clients);
    return found;
  }

  function injectMarketStyles() {
    if (document.getElementById("digiyOreilleMarketStyles")) return;

    var style = document.createElement("style");
    style.id = "digiyOreilleMarketStyles";
    style.textContent =
      ".digiy-market-help{" +
        "margin:10px 0 0;" +
        "border:1px dashed rgba(83,58,26,.24);" +
        "border-radius:16px;" +
        "background:rgba(250,204,21,.13);" +
        "padding:10px;" +
        "color:#25351f;" +
        "font-weight:950;" +
        "line-height:1.32;" +
        "font-size:14px;" +
      "}" +

      ".digiy-market-help b{color:#6b4e09;font-weight:1000}" +

      ".digiy-oreille-templates{" +
        "display:grid!important;" +
        "grid-template-columns:repeat(2,minmax(0,1fr))!important;" +
        "gap:7px!important;" +
        "max-height:220px!important;" +
        "overflow-y:auto!important;" +
        "padding-right:5px!important;" +
        "scroll-snap-type:y proximity!important;" +
        "-webkit-overflow-scrolling:touch!important;" +
        "border:1px solid rgba(83,58,26,.18)!important;" +
        "border-radius:18px!important;" +
        "background:rgba(255,255,255,.38)!important;" +
        "padding:8px!important;" +
      "}" +

      ".digiy-oreille-template{" +
        "min-height:52px!important;" +
        "display:flex!important;" +
        "align-items:center!important;" +
        "justify-content:flex-start!important;" +
        "border-radius:14px!important;" +
        "font-size:12px!important;" +
        "font-weight:1000!important;" +
        "line-height:1.14!important;" +
        "padding:8px!important;" +
        "letter-spacing:-.01em!important;" +
        "scroll-snap-align:start!important;" +
        "overflow:hidden!important;" +
      "}" +

      ".digiy-market-client-mini{" +
        "margin-top:10px;" +
        "border:1px solid rgba(24,32,20,.14);" +
        "border-radius:16px;" +
        "background:#fffdf4;" +
        "padding:10px;" +
        "font-weight:900;" +
        "color:#182014;" +
        "line-height:1.32;" +
        "font-size:14px;" +
      "}" +

      ".digiy-market-client-mini b{" +
        "display:block;" +
        "margin-bottom:4px;" +
        "color:#14532d;" +
        "font-weight:1000;" +
      "}" +

      "@media(min-width:760px){" +
        ".digiy-oreille-templates{max-height:245px!important;}" +
        ".digiy-oreille-template{min-height:56px!important;font-size:12.5px!important;}" +
      "}" +

      "@media(max-width:360px){" +
        ".digiy-oreille-templates{max-height:205px!important;}" +
        ".digiy-oreille-template{min-height:49px!important;font-size:11.5px!important;}" +
      "}";

    document.head.appendChild(style);
  }

  function addMarketHelp(target) {
    if (!target || target.querySelector(".digiy-market-help")) return;

    var status = target.querySelector(".digiy-oreille-status");
    if (!status) return;

    var help = document.createElement("div");
    help.className = "digiy-market-help";
    help.innerHTML =
      "<b>MARKET demande une trace complète.</b><br>" +
      "Produit · prix · stock · client/source · téléphone · retrait/livraison · mode cash/Wave/autre · preuve. " +
      "Aucune annonce ou promesse client n’est validée sans le vendeur.";

    status.insertAdjacentElement("afterend", help);
  }

  function addClientPreview(target) {
    if (!target || target.querySelector(".digiy-market-client-mini")) return;

    var notes = target.querySelector(".digiy-oreille-notes");
    if (!notes) return;

    var box = document.createElement("div");
    box.className = "digiy-market-client-mini";
    box.innerHTML =
      "<b>📇 Fichier client MARKET local</b>" +
      "<span>Quand tu ranges une commande avec nom ou téléphone, MARKET garde une trace client sur cet appareil.</span>";

    notes.insertAdjacentElement("beforebegin", box);
  }

  function patchInstanceButtons(target, core) {
    if (!target) return;

    target.addEventListener(
      "click",
      function (event) {
        var actionEl = event.target.closest("[data-action]");
        if (!actionEl) return;

        var action = actionEl.getAttribute("data-action");
        var textArea = target.querySelector(".digiy-oreille-text");
        var status = target.querySelector(".digiy-oreille-status");

        if (!textArea) return;

        if (action === "formulate") {
          window.setTimeout(function () {
            textArea.value = formulateMarketDeep(textArea.value);
            if (status) status.textContent = "Trace MARKET préparée. Complète les champs manquants puis valide.";
          }, 0);
        }

        if (action === "save") {
          window.setTimeout(function () {
            var draft = buildMarketDraft(textArea.value);
            upsertClientFromDraft(draft);

            if (status) {
              status.textContent =
                draft.missing && draft.missing.length
                  ? "Trace rangée en brouillon. Il manque : " + draft.missing.join(", ") + "."
                  : "Trace rangée. Client local mis à jour si nom ou téléphone présent.";
            }

            if (core && typeof core.showToast === "function") {
              core.showToast("MARKET rangé en brouillon");
            }
          }, 0);
        }
      },
      true
    );
  }

  function exposeMarketApi(core) {
    window.DigiyOreilleMARKET = {
      version: VERSION,
      config: MARKET_CONFIG,
      templates: MARKET_TEMPLATES.slice(),
      guideText: MARKET_GUIDE,
      clientsKey: CLIENTS_KEY,

      detect: function (text) {
        return buildMarketDraft(text);
      },

      formulate: function (text) {
        return formulateMarketDeep(text);
      },

      getClients: getClients,
      setClients: setClients,

      saveDraft: function (text) {
        var draft = buildMarketDraft(text);
        var message = formatMarketDraftMessage(draft);

        upsertClientFromDraft(draft);

        if (!core || typeof core.saveNote !== "function") return null;

        return core.saveNote(MARKET_CONFIG, message, {
          market_draft: draft,
          order: draft,
          annonce: draft
        });
      },

      speakGuide: function () {
        if (core && typeof core.speak === "function") core.speak(MARKET_GUIDE);
      },

      stopVoice: function () {
        if (core && typeof core.stopVoice === "function") core.stopVoice();
      }
    };
  }

  function mountMarketOreille(core) {
    var target = findMountTarget();

    exposeMarketApi(core);
    injectMarketStyles();

    if (!target) {
      console.info("[DIGIY Oreille MARKET] Aucun conteneur trouvé. Ajoute <div id=\"digiy-oreille-market\"></div> pour afficher l’oreille.");
      return;
    }

    if (target.getAttribute("data-digiy-oreille-mounted") === "1") return;

    target.setAttribute("data-digiy-oreille-mounted", "1");

    var instance = core.mount({
      target: target,
      module: MARKET_CONFIG.module,
      title: MARKET_CONFIG.title,
      subtitle: MARKET_CONFIG.subtitle,
      storagePrefix: MARKET_CONFIG.storagePrefix,
      guideText: MARKET_CONFIG.guideText,
      templates: MARKET_CONFIG.templates
    });

    window.DigiyOreilleMARKET.instance = instance || null;

    addMarketHelp(target);
    addClientPreview(target);
    patchInstanceButtons(target, core);

    console.info("[DIGIY Oreille MARKET] montée avec succès.");
  }

  function bootMarketOreille() {
    var tries = 0;
    var maxTries = 30;

    function attempt() {
      tries += 1;

      var core = window.DigiyOreilleMetier;

      if (core && typeof core.mount === "function") {
        mountMarketOreille(core);
        return;
      }

      if (tries >= maxTries) {
        console.warn("[DIGIY Oreille MARKET] Core introuvable. Vérifie que oreille-metier-core.js est chargé avant oreille-market.js.");
        return;
      }

      window.setTimeout(attempt, 100);
    }

    attempt();
  }

  ready(bootMarketOreille);
})();
