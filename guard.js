// guard.js — DIGIY MARKET PRO access gate (cockpit-compatible, preview-safe)
(() => {
  "use strict";

  const SUPABASE_URL =
    window.DIGIY_SUPABASE_URL ||
    "https://wesqmwjjtsefyjnluosj.supabase.co";

  const SUPABASE_ANON_KEY =
    window.DIGIY_SUPABASE_ANON ||
    window.DIGIY_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlc3Ftd2pqdHNlZnlqbmx1b3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzg4ODIsImV4cCI6MjA4MDc1NDg4Mn0.dZfYOc2iL2_wRYL3zExZFsFSBK6AbMeOid2LrIjcTdA";

  const MODULE_CODE = "MARKET";
  const MODULE_KEY = MODULE_CODE.toLowerCase();
  const PAY_URL = "https://commencer-a-payer.digiylyfe.com/";

  // true  => cockpit peut tomber en aperçu
  // false => redirection vers paiement si accès non prouvé
  const ALLOW_PREVIEW_WITHOUT_IDENTITY = true;
  const ALLOW_PREVIEW_IF_NO_ACCESS = true;

  const qs = new URLSearchParams(location.search);

  function stripAccents(v) {
    return String(v || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function normPhone(v) {
    const d = String(v || "").replace(/[^\d]/g, "").trim();
    return d.length >= 9 ? d : "";
  }

  function normSlug(v) {
    return stripAccents(v)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function isSubSlug(v) {
    const s = normSlug(v);
    return s.startsWith(`${MODULE_KEY}-`);
  }

  function getStorage(key) {
    return (
      sessionStorage.getItem(key) ||
      localStorage.getItem(key) ||
      ""
    );
  }

  function setStorage(key, value) {
    if (!value) return;
    sessionStorage.setItem(key, value);
    localStorage.setItem(key, value);
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

  async function fetchPublicSubBySlug(subSlug) {
    const s = normSlug(subSlug);
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
      subSlug: normSlug(arr[0].slug || ""),
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
      subSlug: normSlug(arr[0].slug || ""),
      module: String(arr[0].module || "")
    };
  }

  function rememberIdentity({ phone, subSlug, profileSlug }) {
    const p = normPhone(phone);
    const ss = normSlug(subSlug);
    const ps = normSlug(profileSlug);

    if (p) {
      setStorage(`digiy_${MODULE_KEY}_phone`, p);
    }

    if (ss) {
      setStorage(`digiy_${MODULE_KEY}_sub_slug`, ss);
    }

    if (ps) {
      setStorage(`digiy_${MODULE_KEY}_profile_slug`, ps);
      setStorage(`digiy_${MODULE_KEY}_slug`, ps);
      setStorage(`digiy_${MODULE_KEY}_last_slug`, ps);
    }
  }

  function readRememberedIdentity() {
    return {
      phone: normPhone(getStorage(`digiy_${MODULE_KEY}_phone`)),
      subSlug: normSlug(getStorage(`digiy_${MODULE_KEY}_sub_slug`)),
      profileSlug:
        normSlug(getStorage(`digiy_${MODULE_KEY}_profile_slug`)) ||
        normSlug(getStorage(`digiy_${MODULE_KEY}_slug`)) ||
        normSlug(getStorage(`digiy_${MODULE_KEY}_last_slug`))
    };
  }

  function enrichUrl({ subSlug, profileSlug, phone }) {
    const u = new URL(location.href);

    const ss = normSlug(subSlug);
    const ps = normSlug(profileSlug);
    const p = normPhone(phone);

    if (ss && !u.searchParams.get("sub")) {
      u.searchParams.set("sub", ss);
    }

    if (ps) {
      if (!u.searchParams.get("pslug")) {
        u.searchParams.set("pslug", ps);
      }
      if (!u.searchParams.get("slug") || isSubSlug(u.searchParams.get("slug"))) {
        u.searchParams.set("slug", ps);
      }
    }

    if (p && !u.searchParams.get("phone")) {
      u.searchParams.set("phone", p);
    }

    history.replaceState(null, "", u.toString());
  }

  function goPay({ phone, subSlug, profileSlug }) {
    const u = new URL(PAY_URL);
    const p = normPhone(phone);
    const ss = normSlug(subSlug);
    const ps = normSlug(profileSlug);

    u.searchParams.set("module", MODULE_CODE);
    if (p) u.searchParams.set("phone", p);
    if (ss) u.searchParams.set("sub", ss);
    if (ps) u.searchParams.set("pslug", ps);
    u.searchParams.set("return", location.href);

    location.replace(u.toString());
  }

  const guard = {
    state: {
      preview: true,
      access_ok: false,
      reason: "booting",
      phone: "",
      slug: "",      // IMPORTANT: ici = slug boutique / profil
      sub_slug: "",  // IMPORTANT: ici = slug abonnement MARKET-...
      module: MODULE_CODE
    },
    ready: null
  };

  window.DIGIY_GUARD = guard;

  guard.ready = (async () => {
    let slugParam = normSlug(qs.get("slug") || "");
    let pslugParam = normSlug(qs.get("pslug") || "");
    let subParam = normSlug(qs.get("sub") || "");
    let phoneParam = normPhone(qs.get("phone") || "");

    // compat : si ?slug=market-221...
    if (!subParam && isSubSlug(slugParam)) {
      subParam = slugParam;
      slugParam = "";
    }

    const remembered = readRememberedIdentity();

    let profileSlug = pslugParam || slugParam || remembered.profileSlug || "";
    let subSlug = subParam || remembered.subSlug || "";
    let phone = phoneParam || remembered.phone || "";

    // 1) si on a un sub slug mais pas phone => résoudre phone
    if (subSlug && !phone) {
      const sub = await fetchPublicSubBySlug(subSlug);
      if (sub?.phone) phone = normPhone(sub.phone);
      if (sub?.subSlug) subSlug = normSlug(sub.subSlug);
    }

    // 2) si on a phone mais pas sub slug => résoudre sub slug
    if (phone && !subSlug) {
      const sub = await fetchPublicSubByPhone(phone);
      if (sub?.subSlug) subSlug = normSlug(sub.subSlug);
    }

    // 3) mémoriser ce qu’on sait
    rememberIdentity({ phone, subSlug, profileSlug });
    enrichUrl({ phone, subSlug, profileSlug });

    // 4) aucun identifiant exploitable
    if (!phone && !subSlug && !profileSlug) {
      guard.state = {
        preview: true,
        access_ok: false,
        reason: "preview_no_identity",
        phone: "",
        slug: "",
        sub_slug: "",
        module: MODULE_CODE
      };

      if (!ALLOW_PREVIEW_WITHOUT_IDENTITY) {
        goPay({ phone: "", subSlug: "", profileSlug: "" });
      }
      return;
    }

    // 5) si on a un phone, la vérité backend décide
    if (phone) {
      const res = await rpc("digiy_has_access", {
        p_phone: phone,
        p_module: MODULE_CODE
      });

      if (res.ok && res.data === true) {
        guard.state = {
          preview: false,
          access_ok: true,
          reason: "access_ok",
          phone,
          slug: profileSlug || "",
          sub_slug: subSlug || "",
          module: MODULE_CODE
        };
        return;
      }

      guard.state = {
        preview: true,
        access_ok: false,
        reason: "no_subscription",
        phone,
        slug: profileSlug || "",
        sub_slug: subSlug || "",
        module: MODULE_CODE
      };

      if (!ALLOW_PREVIEW_IF_NO_ACCESS) {
        goPay({ phone, subSlug, profileSlug });
      }
      return;
    }

    // 6) on a un slug boutique seulement, mais pas de phone prouvé
    guard.state = {
      preview: true,
      access_ok: false,
      reason: "unknown_identity",
      phone: "",
      slug: profileSlug || "",
      sub_slug: subSlug || "",
      module: MODULE_CODE
    };

    if (!ALLOW_PREVIEW_WITHOUT_IDENTITY) {
      goPay({ phone: "", subSlug, profileSlug });
    }
  })().catch((err) => {
    console.error("DIGIY_GUARD error:", err);

    const slugParam = normSlug(qs.get("slug") || "");
    const pslugParam = normSlug(qs.get("pslug") || "");
    const subParam = normSlug(qs.get("sub") || "");
    const phoneParam = normPhone(qs.get("phone") || "");

    const profileSlug = pslugParam || (isSubSlug(slugParam) ? "" : slugParam);
    const subSlug = subParam || (isSubSlug(slugParam) ? slugParam : "");

    guard.state = {
      preview: true,
      access_ok: false,
      reason: "guard_error",
      phone: phoneParam || "",
      slug: profileSlug || "",
      sub_slug: subSlug || "",
      module: MODULE_CODE
    };

    if (!ALLOW_PREVIEW_WITHOUT_IDENTITY && !ALLOW_PREVIEW_IF_NO_ACCESS) {
      goPay({ phone: phoneParam, subSlug, profileSlug });
    }
  });
})();
