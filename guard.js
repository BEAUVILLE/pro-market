// guard.js — DIGIY MARKET PRO
// Version coffre sûre : aucune redirection brutale, aucune fuite phone/slug dans l'URL.
// Le guard lit la session 8h ouverte par pin.html via digiy_market_open_with_pin.
// Si la session n'est pas ouverte, les pages affichent leur coque protégée.

(() => {
  "use strict";

  const CFG = {
    SUPABASE_URL:
      window.DIGIY_SUPABASE_URL ||
      "https://wesqmwjjtsefyjnluosj.supabase.co",

    SUPABASE_ANON_KEY:
      window.DIGIY_SUPABASE_ANON ||
      window.DIGIY_SUPABASE_ANON_KEY ||
      "sb_publishable_tGHItRgeWDmGjnd0CK1DVQ_BIep4Ug3",

    MODULE: "MARKET",
    SESSION_MAX_AGE_MS: 8 * 60 * 60 * 1000,

    PIN_PATH: "./pin.html",
    PAY_PATH: "https://pro-pay.digiylyfe.com/admin.html",

    RPC: {
      RESOLVE_IDENTITY: "digiy_market_resolve_identity",
      OPEN_WITH_PIN: "digiy_market_open_with_pin"
    },

    SESSION_KEYS: [
      "DIGIY_MARKET_PIN_SESSION",
      "DIGIY_MARKET_SESSION",
      "DIGIY_SESSION_MARKET",
      "DIGIY_PIN_SESSION",
      "DIGIY_ACCESS",
      "digiy_market_session",
      "digiy_access",
      "digiy_session"
    ],

    SLUG_KEYS: [
      "digiy_market_slug",
      "digiy_market_last_slug",
      "market_slug",
      "digiy_last_slug"
    ],

    PHONE_KEYS: [
      "digiy_market_phone",
      "digiy_market_last_phone",
      "market_phone",
      "digiy_last_phone",
      "digiy_phone"
    ],

    OWNER_KEYS: [
      "digiy_market_owner_id",
      "DIGIY_PRO_ID"
    ],

    FLAGS: {
      PIN_ACCESS: "digiy_market_pin_access",
      ACCESS_OK: "digiy_market_access_ok",
      HAS_ACCESS: "digiy_market_has_access",
      ACCESS: "digiy_market_access",
      PIN_ACCESS_UNTIL: "digiy_market_pin_access_until",
      ACCESS_UNTIL: "digiy_market_access_until"
    },

    URL_SENSITIVE_KEYS: [
      "phone",
      "tel",
      "p_phone",
      "owner_phone",
      "checkout_phone",
      "subscription_phone",
      "market_phone",
      "msisdn",
      "slug",
      "market_slug",
      "subscription_slug",
      "pro_slug",
      "owner",
      "owner_id",
      "source_slug",
      "module",
      "from"
    ]
  };

  let supabaseClient = null;
  let readyPromise = null;

  const state = {
    module: CFG.MODULE,
    slug: "",
    phone: "",
    owner_id: null,

    access: false,
    access_ok: false,
    has_access: false,
    pin_access: false,
    preview: true,

    ready_flag: false,
    error: null,
    source: "boot",

    verified_at: null,
    validated_at: null,
    access_until: null,

    pin_url: CFG.PIN_PATH,
    pay_url: CFG.PAY_PATH
  };

  function normSlug(value) {
    const clean = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (clean && !clean.startsWith("market-")) return "";
    return clean;
  }

  function normPhone(value) {
    const digits = String(value || "").replace(/[^\d]/g, "");
    if (!digits) return "";
    if (digits.startsWith("221") && digits.length === 12) return digits;
    if (digits.length === 9) return "221" + digits;
    return digits;
  }

  function nowMs() {
    return Date.now();
  }

  function parseTime(value) {
    if (!value) return 0;

    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;

    const d = Date.parse(String(value));
    return Number.isFinite(d) ? d : 0;
  }

  function isFuture(value) {
    return parseTime(value) > nowMs();
  }

  function isFresh(value) {
    const t = parseTime(value);
    return t > 0 && (nowMs() - t) <= CFG.SESSION_MAX_AGE_MS;
  }

  function truthy(value) {
    if (value === true || value === 1) return true;
    const s = String(value == null ? "" : value).trim().toLowerCase();
    return s === "true" || s === "1" || s === "ok" || s === "yes";
  }

  function safeJson(raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function moduleMatches(obj) {
    const m = String(
      obj?.module ||
      obj?.module_code ||
      obj?.moduleCode ||
      obj?.product ||
      obj?.plan_module ||
      ""
    ).trim().toUpperCase();

    return !m || m === CFG.MODULE;
  }

  function readStore(key) {
    try {
      const v = sessionStorage.getItem(key);
      if (v) return v;
    } catch (_) {}

    try {
      const v = localStorage.getItem(key);
      if (v) return v;
    } catch (_) {}

    return "";
  }

  function writeStore(key, value) {
    if (value == null || value === "") return;

    try {
      sessionStorage.setItem(key, String(value));
    } catch (_) {}

    try {
      localStorage.setItem(key, String(value));
    } catch (_) {}
  }

  function removeStore(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (_) {}

    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }

  function readMany(keys) {
    for (const key of keys) {
      const v = readStore(key);
      if (v) return v;
    }
    return "";
  }

  function cleanVisibleUrl() {
    const params = new URLSearchParams(location.search);
    const dirty = CFG.URL_SENSITIVE_KEYS.some((key) => params.has(key));

    if (!dirty) return;

    const keep = new URLSearchParams();
    const target = params.get("target");
    const saleId = params.get("sale_id") || params.get("id");

    if (target) keep.set("target", target);
    if (saleId && /ticket\.html$/i.test(location.pathname)) keep.set("sale_id", saleId);

    const clean =
      location.pathname +
      (keep.toString() ? "?" + keep.toString() : "") +
      location.hash;

    try {
      history.replaceState({}, document.title, clean);
    } catch (_) {}
  }

  function client() {
    if (supabaseClient) return supabaseClient;

    if (!window.supabase || !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) return null;

    supabaseClient = window.supabase.createClient(
      CFG.SUPABASE_URL,
      CFG.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );

    return supabaseClient;
  }

  async function rpc(name, args) {
    const sb = client();
    if (!sb) return { data: null, error: new Error("supabase_missing") };

    try {
      const { data, error } = await sb.rpc(name, args || {});
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  function rememberIdentity(slug, phone, ownerId) {
    const s = normSlug(slug);
    const p = normPhone(phone);

    if (s) {
      writeStore("digiy_market_slug", s);
      writeStore("digiy_market_last_slug", s);
      writeStore("market_slug", s);
      writeStore("digiy_last_slug", s);
    }

    if (p) {
      writeStore("digiy_market_phone", p);
      writeStore("digiy_market_last_phone", p);
      writeStore("market_phone", p);
      writeStore("digiy_last_phone", p);
      writeStore("digiy_phone", p);
    }

    if (ownerId) {
      writeStore("digiy_market_owner_id", ownerId);
      writeStore("DIGIY_PRO_ID", ownerId);
    }
  }

  function sessionView() {
    return {
      module: CFG.MODULE,
      slug: state.slug,
      phone: state.phone,
      owner_id: state.owner_id,

      access: state.access,
      access_ok: state.access_ok,
      has_access: state.has_access,
      pin_access: state.pin_access,
      preview: state.preview,

      ready_flag: state.ready_flag,
      error: state.error,
      source: state.source,

      verified_at: state.verified_at,
      validated_at: state.validated_at,
      access_until: state.access_until,

      pin_url: CFG.PIN_PATH,
      pay_url: CFG.PAY_PATH
    };
  }

  function readUrlIdentity() {
    const params = new URLSearchParams(location.search);

    return {
      slug: normSlug(
        params.get("slug") ||
        params.get("market_slug") ||
        params.get("subscription_slug") ||
        params.get("pro_slug") ||
        ""
      ),
      phone: normPhone(
        params.get("phone") ||
        params.get("tel") ||
        params.get("p_phone") ||
        params.get("owner_phone") ||
        params.get("checkout_phone") ||
        params.get("market_phone") ||
        params.get("subscription_phone") ||
        params.get("msisdn") ||
        ""
      )
    };
  }

  function extractNestedIdentity(obj, depth = 0) {
    if (!obj || typeof obj !== "object" || depth > 4) {
      return { slug: "", phone: "", owner_id: null };
    }

    const slugFields = ["slug", "market_slug", "subscription_slug", "pro_slug", "workspace_slug", "shop_slug", "boutique_slug"];
    const phoneFields = ["phone", "market_phone", "p_phone", "owner_phone", "checkout_phone", "subscription_phone", "tel", "telephone", "whatsapp", "msisdn"];
    const ownerFields = ["owner_id", "ownerId", "pro_id", "proId"];

    let slug = "";
    let phone = "";
    let owner_id = null;

    for (const key of slugFields) {
      if (!slug && obj[key]) slug = normSlug(obj[key]);
    }

    for (const key of phoneFields) {
      if (!phone && obj[key]) phone = normPhone(obj[key]);
    }

    for (const key of ownerFields) {
      if (!owner_id && obj[key]) owner_id = obj[key];
    }

    if (slug || phone || owner_id) return { slug, phone, owner_id };

    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") {
        const found = extractNestedIdentity(value, depth + 1);
        if (found.slug || found.phone || found.owner_id) return found;
      }
    }

    return { slug: "", phone: "", owner_id: null };
  }

  function readSessionObject() {
    for (const key of CFG.SESSION_KEYS) {
      const candidates = [];

      try {
        candidates.push(sessionStorage.getItem(key));
      } catch (_) {}

      try {
        candidates.push(localStorage.getItem(key));
      } catch (_) {}

      for (const raw of candidates) {
        const obj = safeJson(raw);
        if (!obj || typeof obj !== "object" || !moduleMatches(obj)) continue;

        const found = extractNestedIdentity(obj, 0);
        const slug = found.slug || normSlug(obj.slug || obj.market_slug || "");
        const phone = found.phone || normPhone(obj.phone || obj.market_phone || "");
        const owner_id = found.owner_id || obj.owner_id || null;

        if (!slug && !phone) continue;

        const access =
          truthy(obj.access) ||
          truthy(obj.access_ok) ||
          truthy(obj.ok) ||
          truthy(obj.has_access) ||
          truthy(obj.pin_access) ||
          truthy(obj.verified);

        const alive =
          isFuture(obj.access_until) ||
          isFuture(obj.pin_access_until) ||
          isFuture(obj.expires_at) ||
          isFresh(obj.verified_at) ||
          isFresh(obj.validated_at) ||
          isFresh(obj.ts);

        if (!access || !alive) continue;

        return {
          slug,
          phone,
          owner_id,
          access: true,
          access_until:
            parseTime(obj.access_until || obj.pin_access_until || obj.expires_at) ||
            nowMs() + CFG.SESSION_MAX_AGE_MS,
          verified_at: parseTime(obj.verified_at || obj.validated_at || obj.ts) || nowMs(),
          validated_at: obj.validated_at || new Date().toISOString(),
          source: key
        };
      }
    }

    const slug = normSlug(readMany(CFG.SLUG_KEYS));
    const phone = normPhone(readMany(CFG.PHONE_KEYS));
    const owner_id = readMany(CFG.OWNER_KEYS) || null;

    const flag =
      truthy(readStore(CFG.FLAGS.PIN_ACCESS)) ||
      truthy(readStore(CFG.FLAGS.ACCESS_OK)) ||
      truthy(readStore(CFG.FLAGS.HAS_ACCESS)) ||
      truthy(readStore(CFG.FLAGS.ACCESS));

    const until =
      parseTime(readStore(CFG.FLAGS.ACCESS_UNTIL)) ||
      parseTime(readStore(CFG.FLAGS.PIN_ACCESS_UNTIL));

    if (flag && until > nowMs() && (slug || phone)) {
      return {
        slug,
        phone,
        owner_id,
        access: true,
        access_until: until,
        verified_at: Math.max(until - CFG.SESSION_MAX_AGE_MS, 0),
        validated_at: null,
        source: "plain_flags"
      };
    }

    return null;
  }

  async function resolveIdentity(slug, phone) {
    let s = normSlug(slug);
    let p = normPhone(phone);

    const identity = s || p || "";
    if (!identity) return { slug: "", phone: "" };

    const attempts = [
      { p_identity: identity },
      { p_slug: s },
      { p_phone: p }
    ].filter((args) => Object.values(args).some(Boolean));

    for (const args of attempts) {
      const { data, error } = await rpc(CFG.RPC.RESOLVE_IDENTITY, args);

      if (!error && data?.ok) {
        s = normSlug(data.slug || data.workspace_slug || s);
        p = normPhone(data.phone || data.market_phone || p);
        return { slug: s, phone: p };
      }
    }

    return { slug: s, phone: p };
  }

  function saveSession(payload = {}) {
    const t = nowMs();

    const slug = normSlug(payload.slug || payload.workspace_slug || state.slug || "");
    const phone = normPhone(payload.phone || payload.market_phone || state.phone || "");
    const ownerId = payload.owner_id || payload.ownerId || state.owner_id || null;

    const accessUntil =
      parseTime(payload.access_until || payload.pin_access_until || payload.expires_at) ||
      t + CFG.SESSION_MAX_AGE_MS;

    const session = {
      module: CFG.MODULE,
      slug,
      phone,
      owner_id: ownerId,

      access: true,
      access_ok: true,
      ok: true,
      has_access: true,
      pin_access: true,
      verified: true,

      verified_at: t,
      validated_at: payload.validated_at || new Date(t).toISOString(),
      access_until: accessUntil,
      pin_access_until: accessUntil,
      expires_at: accessUntil,
      ts: t,
      reason: payload.reason || "market_session_ok"
    };

    const raw = JSON.stringify(session);

    for (const key of CFG.SESSION_KEYS) {
      try {
        sessionStorage.setItem(key, raw);
      } catch (_) {}

      try {
        localStorage.setItem(key, raw);
      } catch (_) {}
    }

    rememberIdentity(slug, phone, ownerId);

    writeStore(CFG.FLAGS.PIN_ACCESS, "true");
    writeStore(CFG.FLAGS.ACCESS_OK, "true");
    writeStore(CFG.FLAGS.HAS_ACCESS, "true");
    writeStore(CFG.FLAGS.ACCESS, "true");
    writeStore(CFG.FLAGS.PIN_ACCESS_UNTIL, String(accessUntil));
    writeStore(CFG.FLAGS.ACCESS_UNTIL, String(accessUntil));

    Object.assign(state, {
      slug,
      phone,
      owner_id: ownerId,

      access: true,
      access_ok: true,
      has_access: true,
      pin_access: true,
      preview: false,

      ready_flag: true,
      error: null,
      source: payload.source || "saveSession",

      verified_at: session.verified_at,
      validated_at: session.validated_at,
      access_until: accessUntil,

      pin_url: CFG.PIN_PATH,
      pay_url: CFG.PAY_PATH
    });

    try {
      window.DIGIY_ACCESS = Object.assign({}, window.DIGIY_ACCESS || {}, session);
    } catch (_) {}

    cleanVisibleUrl();
    return sessionView();
  }

  function setPreview(error, source, identity = {}) {
    const slug = normSlug(identity.slug || "");
    const phone = normPhone(identity.phone || "");

    if (slug || phone) rememberIdentity(slug, phone, identity.owner_id || null);

    Object.assign(state, {
      slug,
      phone,
      owner_id: identity.owner_id || null,

      access: false,
      access_ok: false,
      has_access: false,
      pin_access: false,
      preview: true,

      ready_flag: true,
      error: error || null,
      source: source || "preview",

      verified_at: null,
      validated_at: null,
      access_until: null,

      pin_url: CFG.PIN_PATH,
      pay_url: CFG.PAY_PATH
    });

    cleanVisibleUrl();
    return sessionView();
  }

  function clearSessionsOnly() {
    for (const key of CFG.SESSION_KEYS) removeStore(key);
    for (const key of Object.values(CFG.FLAGS)) removeStore(key);
  }

  function clearAllLocalState() {
    clearSessionsOnly();

    for (const key of CFG.SLUG_KEYS) removeStore(key);
    for (const key of CFG.PHONE_KEYS) removeStore(key);
    for (const key of CFG.OWNER_KEYS) removeStore(key);

    try {
      delete window.DIGIY_ACCESS;
    } catch (_) {}
  }

  async function check() {
    cleanVisibleUrl();

    const stored = readSessionObject();

    if (stored?.access) {
      saveSession({
        ...stored,
        source: stored.source || "stored_session"
      });
      return sessionView();
    }

    const fromUrl = readUrlIdentity();
    const storedSlug = normSlug(readMany(CFG.SLUG_KEYS));
    const storedPhone = normPhone(readMany(CFG.PHONE_KEYS));

    let slug = fromUrl.slug || storedSlug || "";
    let phone = fromUrl.phone || storedPhone || "";

    if (slug || phone) {
      const resolved = await resolveIdentity(slug, phone);
      slug = resolved.slug || slug;
      phone = resolved.phone || phone;

      return setPreview("Session fermée.", "identity_known", { slug, phone });
    }

    return setPreview("Compte MARKET non reconnu.", "none", {});
  }

  function ready() {
    if (state.ready_flag) return Promise.resolve(sessionView());

    if (!readyPromise) {
      readyPromise = check().finally(() => {
        readyPromise = null;
        try {
          document.documentElement.style.visibility = "";
        } catch (_) {}
      });
    }

    return readyPromise;
  }

  async function refresh() {
    state.ready_flag = false;
    state.error = null;
    readyPromise = null;
    return ready();
  }

  async function loginWithPin(identityInput, pinInput) {
    const identityRaw = String(identityInput || state.slug || state.phone || "").trim();
    const pin = String(pinInput || "").trim();

    if (!identityRaw) return { ok: false, error: "Compte MARKET introuvable." };
    if (!pin) return { ok: false, error: "Code manquant." };

    const slug = normSlug(identityRaw);
    const phone = normPhone(identityRaw);
    const identity = slug || phone || identityRaw;

    const payloads = [
      { p_identity: identity, p_pin: pin },
      { p_slug: slug, p_pin: pin },
      { p_phone: phone, p_pin: pin },
      { p_slug: slug, p_phone: phone, p_pin: pin },
      { p_module: CFG.MODULE, p_identity: identity, p_pin: pin },
      { p_module: CFG.MODULE, p_slug: slug, p_phone: phone, p_pin: pin }
    ];

    let lastError = null;

    for (const payload of payloads) {
      const clean = {};
      Object.entries(payload).forEach(([key, value]) => {
        if (value) clean[key] = value;
      });

      if (!Object.keys(clean).some((key) => key !== "p_pin" && key !== "p_module")) continue;

      const { data, error } = await rpc(CFG.RPC.OPEN_WITH_PIN, clean);

      if (error) {
        lastError = error;
        continue;
      }

      if (!data?.ok) {
        lastError = data || new Error("Accès refusé.");
        continue;
      }

      const session = saveSession({
        slug: data.slug || data.workspace_slug || slug,
        phone: data.phone || data.market_phone || phone,
        owner_id: data.owner_id || data.ownerId || data.profile?.owner_id || null,
        access_until: data.access_until || data.pin_access_until || data.expires_at,
        validated_at: data.validated_at,
        reason: data.reason || "market_pin_ok",
        source: "market_open_with_pin"
      });

      return { ok: true, ...session };
    }

    return {
      ok: false,
      error: lastError?.reason || lastError?.error || lastError?.message || "Accès refusé.",
      detail: lastError || null
    };
  }

  function logout() {
    clearAllLocalState();

    Object.assign(state, {
      slug: "",
      phone: "",
      owner_id: null,

      access: false,
      access_ok: false,
      has_access: false,
      pin_access: false,
      preview: true,

      ready_flag: true,
      error: "Déconnecté.",
      source: "logout",

      verified_at: null,
      validated_at: null,
      access_until: null,

      pin_url: CFG.PIN_PATH,
      pay_url: CFG.PAY_PATH
    });

    location.href = CFG.PIN_PATH;
  }

  function buildCleanInternalPath(path) {
    const u = new URL(path || "./cockpit.html", location.href);
    u.search = "";
    return u.pathname + u.hash;
  }

  function isAuthenticated() {
    if (!state.access_ok) return false;
    if (!state.access_until) return true;
    return parseTime(state.access_until) > nowMs();
  }

  window.DIGIY_GUARD = {
    state,

    ready,
    refresh,

    getSession() {
      return sessionView();
    },

    getSlug() {
      return normSlug(state.slug);
    },

    getPhone() {
      return normPhone(state.phone);
    },

    getOwnerId() {
      return state.owner_id || null;
    },

    getModule() {
      return CFG.MODULE;
    },

    isAuthenticated,

    saveSession,

    loginWithPin,

    clearSession() {
      clearSessionsOnly();
      state.access = false;
      state.access_ok = false;
      state.has_access = false;
      state.pin_access = false;
      state.preview = true;
      state.ready_flag = false;
      state.error = null;
    },

    clearAll() {
      clearAllLocalState();
      setPreview("Compte MARKET non reconnu.", "clearAll", {});
    },

    clearAllLocalState,

    logout,

    cleanVisibleUrl,

    buildPinUrl() {
      return CFG.PIN_PATH;
    },

    goPin() {
      location.href = CFG.PIN_PATH;
    },

    buildPayUrl() {
      return CFG.PAY_PATH;
    },

    goPay() {
      location.href = CFG.PAY_PATH;
    },

    buildCleanInternalPath
  };

  cleanVisibleUrl();

  try {
    document.documentElement.style.visibility = "";
  } catch (_) {}

  ready();
})();
