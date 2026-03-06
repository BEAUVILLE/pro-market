// guard-pro.js — DIGIY PRO access gate (preview-safe, slug-smart)
(() => {
  "use strict";

  const SUPABASE_URL = "https://wesqmwjjtsefyjnluosj.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlc3Ftd2pqdHNlZnlqbmx1b3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzg4ODIsImV4cCI6MjA4MDc1NDg4Mn0.dZfYOc2iL2_wRYL3zExZFsFSBK6AbMeOid2LrIjcTdA";

  // ✅ À ADAPTER PAR MODULE
  const MODULE_CODE = "MARKET";
  const PAY_URL = "https://commencer-a-payer.digiylyfe.com/";

  // ✅ Très important :
  // true  = autorise le mode aperçu si aucun slug/phone
  // false = protège dur et renvoie vers payer
  const ALLOW_PREVIEW_WITHOUT_IDENTITY = true;

  const qs = new URLSearchParams(location.search);
  const slugQ = (qs.get("slug") || "").trim();
  const phoneQ = (qs.get("phone") || "").trim();

  function normPhone(p) {
    const d = String(p || "").replace(/[^\d]/g, "");
    return d.length >= 9 ? d : "";
  }

  function normSlug(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function buildHeaders() {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json"
    };
  }

  async function rpc(name, params) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(params || {})
    });

    const j = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, data: j };
  }

  async function fetchPublicSubBySlug(slug) {
    const s = normSlug(slug);
    if (!s) return null;

    const url =
      `${SUPABASE_URL}/rest/v1/digiy_subscriptions_public` +
      `?select=phone,slug,module` +
      `&slug=eq.${encodeURIComponent(s)}` +
      `&module=eq.${encodeURIComponent(MODULE_CODE)}` +
      `&limit=1`;

    const r = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    const arr = await r.json().catch(() => []);
    if (!r.ok || !Array.isArray(arr) || !arr[0]) return null;

    return {
      phone: normPhone(arr[0].phone || ""),
      slug: normSlug(arr[0].slug || ""),
      module: String(arr[0].module || "")
    };
  }

  async function fetchPublicSubByPhone(phone) {
    const p = normPhone(phone);
    if (!p) return null;

    const url =
      `${SUPABASE_URL}/rest/v1/digiy_subscriptions_public` +
      `?select=phone,slug,module` +
      `&phone=eq.${encodeURIComponent(p)}` +
      `&module=eq.${encodeURIComponent(MODULE_CODE)}` +
      `&limit=1`;

    const r = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    const arr = await r.json().catch(() => []);
    if (!r.ok || !Array.isArray(arr) || !arr[0]) return null;

    return {
      phone: normPhone(arr[0].phone || ""),
      slug: normSlug(arr[0].slug || ""),
      module: String(arr[0].module || "")
    };
  }

  function rememberIdentity({ phone, slug }) {
    const p = normPhone(phone);
    const s = normSlug(slug);

    if (p) {
      localStorage.setItem(`digiy_${MODULE_CODE.toLowerCase()}_phone`, p);
      sessionStorage.setItem(`digiy_${MODULE_CODE.toLowerCase()}_phone`, p);
    }

    if (s) {
      localStorage.setItem(`digiy_${MODULE_CODE.toLowerCase()}_last_slug`, s);
      sessionStorage.setItem(`digiy_${MODULE_CODE.toLowerCase()}_slug`, s);
      sessionStorage.setItem(`digiy_${MODULE_CODE.toLowerCase()}_last_slug`, s);
    }
  }

  function enrichUrlIfMissingSlug(slug) {
    const s = normSlug(slug);
    if (!s) return;
    if (normSlug(qs.get("slug") || "")) return;

    const u = new URL(location.href);
    u.searchParams.set("slug", s);
    history.replaceState(null, "", u.toString());
  }

  function goPay({ phone, slug }) {
    const u = new URL(PAY_URL);
    const p = normPhone(phone);
    const s = normSlug(slug);

    u.searchParams.set("module", MODULE_CODE);

    if (p) u.searchParams.set("phone", p);
    if (s) u.searchParams.set("slug", s);

    // retour vers la page actuelle
    u.searchParams.set("return", location.href);

    location.replace(u.toString());
  }

  async function go() {
    let slug = normSlug(slugQ);
    let phone = normPhone(phoneQ);

    // 1) slug-first : résoudre phone via slug
    if (!phone && slug) {
      const sub = await fetchPublicSubBySlug(slug);
      if (sub?.phone) phone = normPhone(sub.phone);
      if (sub?.slug) slug = normSlug(sub.slug);
    }

    // 2) phone-only : résoudre slug via phone
    if (phone && !slug) {
      const sub = await fetchPublicSubByPhone(phone);
      if (sub?.slug) slug = normSlug(sub.slug);
    }

    // 3) mémoriser + enrichir URL si slug retrouvé
    if (phone || slug) {
      rememberIdentity({ phone, slug });
      if (slug) enrichUrlIfMissingSlug(slug);
    }

    // 4) aucun identifiant : soit aperçu, soit payer
    if (!phone && !slug) {
      if (ALLOW_PREVIEW_WITHOUT_IDENTITY) return;
      return goPay({ phone: "", slug: "" });
    }

    // 5) si on a un phone, la vérité backend décide
    if (phone) {
      const res = await rpc("digiy_has_access", {
        p_phone: phone,
        p_module: MODULE_CODE
      });

      // ✅ accès OK
      if (res.ok && res.data === true) return;

      // ❌ pas accès
      return goPay({ phone, slug });
    }

    // 6) si on a seulement un slug mais pas de phone résolu
    // preview autorisé si demandé, sinon payer
    if (ALLOW_PREVIEW_WITHOUT_IDENTITY) return;
    return goPay({ phone: "", slug });
  }

  go().catch(() => {
    // safe fallback
    if (ALLOW_PREVIEW_WITHOUT_IDENTITY && !normPhone(phoneQ) && !normSlug(slugQ)) return;
    goPay({ phone: phoneQ, slug: slugQ });
  });
})();
