(() => {
  "use strict";

  const MODULE = "MARKET";
  const MAX_AGE = 8 * 60 * 60 * 1000;
  const MODULE_ALIASES = Array.from(new Set([
    "MARKET", "market", "PRO_MARKET", "pro_market", "PRO-MARKET", "pro-market",
    "MARKET_PRO", "market_pro", "DIGIY_MARKET", "digiy_market",
    "QR_PRO", "qr_pro", "QR_PRO_MARKET", "qr_pro_market",
    "JE_VENDS", "je_vends", "JE VENDS", "VENDS", "vends",
    "MON_COMMERCE", "mon_commerce", "COMMERCE", "commerce", "MARKETPLACE", "marketplace"
  ]));
  const PIN_MODULES = Array.from(new Set(MODULE_ALIASES.map(v => String(v).toUpperCase())));
  const SESSION_KEYS = [
    "DIGIY_MARKET_PIN_SESSION", "DIGIY_MARKET_SESSION", "DIGIY_SESSION_MARKET",
    "DIGIY_PIN_SESSION", "DIGIY_ACCESS", "digiy_market_session", "digiy_access", "digiy_session"
  ];
  const PHONE_KEYS = ["digiy_market_phone", "digiy_market_last_phone", "market_phone", "digiy_last_phone", "digiy_phone"];
  const SLUG_KEYS = ["digiy_market_slug", "digiy_market_last_slug", "market_slug", "digiy_last_slug", "DIGIY_MARKET_SLUG", "DIGIY_CURRENT_SLUG", "DIGIY_PRO_SLUG", "DIGIY_SLUG", "digiy_slug", "slug"];
  const $ = id => document.getElementById(id);

  let pin = "";
  let confirmedPhone = "";
  let busy = false;
  let sb = null;

  const digits = value => String(value || "").replace(/\D/g, "");
  const cleanSlug = value => String(value || "").trim().replace(/^['"]+|['"]+$/g, "").replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
  const positive = value => value === true || value === 1 || ["true", "t", "1", "ok", "active", "allowed", "valid", "verified", "granted", "yes"].includes(String(value || "").trim().toLowerCase());

  function phoneVariants(value) {
    const d = digits(value);
    const out = [];
    const add = v => { v = digits(v); if (v && !out.includes(v)) out.push(v); };
    add(d);
    if (d.length === 9) add("221" + d);
    if (d.length === 12 && d.startsWith("221")) add(d.slice(3));
    if (d.length === 10 && d.startsWith("0")) { add(d.slice(1)); add("221" + d.slice(1)); }
    return out;
  }

  function moduleLooksMarket(value) {
    const code = String(value || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ");
    return ["MARKET", "PRO MARKET", "MARKET PRO", "DIGIY MARKET", "QR PRO", "QR PRO MARKET", "JE VENDS", "VENDS", "MON COMMERCE", "COMMERCE", "MARKETPLACE"].includes(code);
  }

  function getSb() {
    if (sb) return sb;
    if (!window.supabase?.createClient) throw new Error("Librairie Supabase absente.");
    sb = window.supabase.createClient(window.DIGIY_SUPABASE_URL, window.DIGIY_SUPABASE_ANON_KEY || window.DIGIY_SUPABASE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return sb;
  }

  function parseVerifyPayload(data, fallbackPhone) {
    let row = Array.isArray(data) ? data[0] : data;
    if (positive(row)) return { ok: true, phone: digits(fallbackPhone), slug: "", session_token: "" };

    if (typeof row === "string") {
      const txt = row.trim();
      if (positive(txt)) return { ok: true, phone: digits(fallbackPhone), slug: "", session_token: "" };
      if (txt.startsWith("(") && txt.endsWith(")")) {
        const parts = txt.slice(1, -1).split(",").map(v => String(v || "").trim().replace(/^"|"$/g, ""));
        if (positive(parts[0])) {
          const second = parts[1] || "";
          return {
            ok: true,
            phone: digits(parts[2] || fallbackPhone),
            slug: moduleLooksMarket(second) ? cleanSlug(parts[5] || "") : cleanSlug(second),
            label: parts[3] || "",
            session_token: parts[4] || ""
          };
        }
      }
      try { row = JSON.parse(txt); } catch (_) { return null; }
    }

    if (!row || typeof row !== "object") return null;
    if (row.data && typeof row.data === "object") row = row.data;
    if (row.result && typeof row.result === "object") row = row.result;
    if (row.session && typeof row.session === "object") row = row.session;

    const decisionKeys = ["ok", "success", "valid", "is_valid", "verified", "authenticated", "allowed", "access", "access_ok", "has_access", "can_access", "digiy_verify_pin"];
    const hasDecision = decisionKeys.some(key => Object.prototype.hasOwnProperty.call(row, key));
    const values = Object.values(row);
    const status = String(row.status || "").trim().toLowerCase();
    const ok = hasDecision
      ? decisionKeys.some(key => positive(row[key]))
      : positive(values[0]) || positive(row.active) || positive(row.is_active) || ["ok", "active", "allowed", "valid"].includes(status);

    if (!ok) return null;
    return {
      ok: true,
      phone: digits(row.phone || row.p_phone || row.market_phone || row.owner_phone || fallbackPhone),
      slug: cleanSlug(row.slug || row.identifiant || row.market_slug || row.workspace_slug || row.shop_slug || row.owner_slug || ""),
      label: String(row.label || row.business_name || row.shop_name || "").trim(),
      session_token: String(row.session_token || row.token || "").trim(),
      access_until: row.access_until || row.pin_access_until || row.expires_at || null,
      owner_id: row.owner_id || row.ownerId || null
    };
  }

  function parseAccessPayload(data) {
    let row = Array.isArray(data) ? data[0] : data;
    if (positive(row)) return true;
    if (!row || typeof row !== "object") return false;
    if (Object.prototype.hasOwnProperty.call(row, "data")) return parseAccessPayload(row.data);
    if (Object.prototype.hasOwnProperty.call(row, "result")) return parseAccessPayload(row.result);
    return ["ok", "success", "active", "is_active", "allowed", "access", "access_ok", "has_access", "can_access"].some(key => positive(row[key]));
  }

  function readStoredSlug(key) {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const raw = storage.getItem(key) || "";
        const direct = cleanSlug(raw);
        if (direct && direct !== "null" && direct !== "undefined" && !direct.startsWith("{")) return direct;
        const parsed = JSON.parse(raw || "null");
        const nested = cleanSlug(parsed?.slug || parsed?.market_slug || parsed?.workspace_slug || parsed?.shop_slug || "");
        if (nested) return nested;
      } catch (_) {}
    }
    return "";
  }

  async function resolveMarketSlugs(client, phone) {
    const out = [];
    const add = value => { value = cleanSlug(value); if (value && !out.includes(value)) out.push(value); };
    const phones = phoneVariants(phone);

    for (const p of phones) {
      for (const args of [{ p_phone: p }, { p_identity: p }]) {
        try {
          const { data, error } = await client.rpc("digiy_market_resolve_identity", args);
          if (error || !data) continue;
          const row = Array.isArray(data) ? data[0] : data;
          const obj = row?.data || row?.profile || row?.shop || row;
          add(obj?.slug); add(obj?.workspace_slug); add(obj?.shop_slug); add(obj?.market_slug);
        } catch (_) {}
      }
    }

    const tables = ["digiy_market_public_fiches", "digiy_market_public_shops", "digiy_market_profiles", "digiy_market_pros", "digiy_market_shops"];
    for (const table of tables) {
      try {
        const filters = phones.flatMap(p => [`phone.eq.${p}`, `whatsapp.eq.${p}`]).join(",");
        const { data, error } = await client.from(table).select("slug,workspace_slug,shop_slug,market_slug,phone,whatsapp").or(filters).limit(10);
        if (!error && Array.isArray(data)) data.forEach(row => { add(row.slug); add(row.workspace_slug); add(row.shop_slug); add(row.market_slug); });
      } catch (_) {}
    }

    SLUG_KEYS.forEach(key => add(readStoredSlug(key)));
    phones.forEach(p => { add(`market-${p}`); add(`pro-market-${p}`); add(`pro_market-${p}`); add(p); });
    return out;
  }

  async function verifyByPhone(client, phone, code) {
    let lastError = null;
    let hadResponse = false;
    let matchedAccess = false;
    const phones = phoneVariants(phone);

    for (const p of phones) {
      for (const module of PIN_MODULES) {
        try {
          const { data, error } = await client.rpc("digiy_verify_pin", { p_phone: p, p_module: module, p_pin: code });
          if (error) { lastError = error; continue; }
          hadResponse = true;
          const raw = Array.isArray(data) ? data[0] : data;
          if (raw && typeof raw === "object" && (raw.label || raw.session_token || raw.access_ok || raw.has_access)) matchedAccess = true;
          const parsed = parseVerifyPayload(data, p);
          if (parsed?.ok) return { ok: true, row: parsed, phone: parsed.phone || p, module, slug: parsed.slug || "", rail: "phone" };
        } catch (error) { lastError = error; }
      }
    }
    return { ok: false, lastError, hadResponse, matchedAccess, phones };
  }

  async function verifyByHistoricSlug(client, phone, code) {
    let lastError = null;
    let hadResponse = false;
    const candidates = await resolveMarketSlugs(client, phone);
    for (const candidate of candidates) {
      try {
        const { data, error } = await client.rpc("digiy_verify_access", { p_slug: candidate, p_pin: code });
        if (error) { lastError = error; continue; }
        hadResponse = true;
        const parsed = parseVerifyPayload(data, phone);
        if (parsed?.ok) return { ok: true, row: parsed, phone: parsed.phone || digits(phone), module: MODULE, slug: parsed.slug || candidate, rail: "historic_slug" };
      } catch (error) { lastError = error; }
    }
    return { ok: false, lastError, hadResponse };
  }

  async function findMarketAccess(client, phones) {
    let checked = false;
    const rpcNames = ["digiy_has_module_access_from_abos", "digiy_has_access"];
    for (const rpcName of rpcNames) {
      for (const p of phones) {
        for (const module of PIN_MODULES) {
          try {
            const { data, error } = await client.rpc(rpcName, { p_phone: p, p_module: module });
            if (error) continue;
            checked = true;
            if (parseAccessPayload(data)) return { found: true, checked: true, module };
          } catch (_) {}
        }
      }
    }
    return { found: false, checked, module: "" };
  }

  async function verifyCompatible(client, phone, code) {
    const byPhone = await verifyByPhone(client, phone, code);
    if (byPhone.ok) return byPhone;

    const bySlug = await verifyByHistoricSlug(client, phone, code);
    if (bySlug.ok) return bySlug;

    if (!byPhone.hadResponse && !bySlug.hadResponse) {
      const err = bySlug.lastError || byPhone.lastError;
      if (err) return { ok: false, reason: "rpc_error", detail: err.message || String(err) };
    }

    const access = byPhone.matchedAccess
      ? { found: true, checked: true }
      : await findMarketAccess(client, byPhone.phones || phoneVariants(phone));
    return { ok: false, reason: access.found ? "access_found" : access.checked ? "access_not_found" : "access_unknown" };
  }

  function saveSession(result) {
    const now = Date.now();
    const parsedExpires = Date.parse(String(result.row?.access_until || ""));
    const expires = Number.isFinite(parsedExpires) && parsedExpires > now ? Math.min(parsedExpires, now + MAX_AGE) : now + MAX_AGE;
    const phone = digits(result.phone || confirmedPhone);
    const slug = cleanSlug(result.slug || result.row?.slug || "") || (phone ? `market-${phone}` : "");
    const payload = {
      slug, phone, module: MODULE, pin_module: result.module || MODULE,
      validated_at: now, verified_at: now, ts: now,
      expires_at: expires, access_until: expires, pin_access_until: expires,
      session_token: String(result.row?.session_token || "").trim(),
      owner_id: result.row?.owner_id || null,
      access: true, access_ok: true, has_access: true, pin_access: true,
      pin_session_ok: true, ok: true, verified: true,
      verification_rail: result.rail || "phone", source: "market-pin-build-compatible-v2"
    };
    const raw = JSON.stringify(payload);
    SESSION_KEYS.forEach(key => {
      try { sessionStorage.setItem(key, raw); } catch (_) {}
      try { localStorage.setItem(key, raw); } catch (_) {}
    });
    PHONE_KEYS.forEach(key => { try { sessionStorage.setItem(key, phone); } catch (_) {} });
    if (slug) SLUG_KEYS.forEach(key => { try { localStorage.setItem(key, slug); sessionStorage.setItem(key, slug); } catch (_) {} });
    try { window.DIGIY_ACCESS = { ...(window.DIGIY_ACCESS || {}), ...payload }; } catch (_) {}
  }

  function show(id, message, kind) {
    const el = $(id);
    el.textContent = message;
    el.className = "status show " + kind;
  }
  function clear(id) { const el = $(id); el.textContent = ""; el.className = "status"; }
  function updateDots() {
    for (let i = 0; i < 4; i++) {
      const dot = $("d" + i);
      dot.classList.toggle("filled", i < pin.length);
      dot.classList.remove("err");
    }
    $("btnEnter").disabled = busy || pin.length !== 4;
  }
  function setBusy(active) {
    busy = active;
    $("btnEnter").disabled = active || pin.length !== 4;
    $("keypad").querySelectorAll("button").forEach(button => { button.disabled = active; });
  }

  $("phoneInput").addEventListener("input", () => {
    const d = digits($("phoneInput").value);
    $("btnContinue").disabled = d.length < 9;
    clear("status1");
  });
  $("btnContinue").addEventListener("click", () => {
    const d = digits($("phoneInput").value);
    if (d.length < 9) { show("status1", "❌ Numéro trop court.", "err"); return; }
    confirmedPhone = d;
    $("phoneDisplay").textContent = d.length === 12 && d.startsWith("221") ? `${d.slice(0,3)} ${d.slice(3,5)} ${d.slice(5,8)} ${d.slice(8,10)} ${d.slice(10)}` : d;
    $("step1").classList.remove("active");
    $("step2").classList.add("active");
    pin = "";
    updateDots();
  });
  $("btnBack").addEventListener("click", () => {
    $("step2").classList.remove("active");
    $("step1").classList.add("active");
    pin = ""; setBusy(false); updateDots(); clear("status2");
  });
  $("keypad").addEventListener("click", event => {
    if (busy) return;
    const key = event.target.closest("[data-v]");
    if (!key) return;
    const value = key.dataset.v;
    if (value === "DEL") pin = pin.slice(0, -1);
    else if (pin.length < 4) pin += value;
    updateDots(); clear("status2");
    if (pin.length === 4) setTimeout(login, 120);
  });
  $("btnEnter").addEventListener("click", login);

  async function login() {
    if (busy || pin.length !== 4 || !confirmedPhone) return;
    setBusy(true);
    show("status2", "⏳ Vérification sécurisée MARKET…", "spin");
    try {
      const verified = await verifyCompatible(getSb(), confirmedPhone, pin);
      if (!verified.ok) {
        pin = ""; setBusy(false); updateDots();
        for (let i = 0; i < 4; i++) $("d" + i).classList.add("err");
        let message = "❌ Code MARKET non reconnu.";
        if (verified.reason === "access_found") message = "❌ Ton accès PRO MARKET existe, mais ce code ne correspond pas.";
        else if (verified.reason === "access_not_found") message = "❌ Aucun accès PRO MARKET actif n’est relié à ce numéro.";
        else if (verified.reason === "rpc_error") message = "❌ Erreur Supabase : " + String(verified.detail || "fonction indisponible");
        show("status2", message, "err");
        return;
      }
      saveSession(verified);
      show("status2", "✅ Accès validé. Ouverture de JE VENDS…", "ok");
      setTimeout(() => location.replace("./cockpit.html"), 300);
    } catch (error) {
      pin = ""; setBusy(false); updateDots();
      show("status2", "❌ Vérification indisponible : " + (error?.message || "erreur inconnue"), "err");
      console.error("[MARKET PIN V2]", error);
    }
  }
})();
