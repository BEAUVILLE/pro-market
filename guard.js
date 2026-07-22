/* DIGIY MARKET PRO — adaptateur PIN à signature exacte */
(() => {
  "use strict";

  const VERSION = "market-pin-exact-v5-20260722";
  document.write(`<script src="./guard-core.js?v=${VERSION}"><\/script>`);

  const digits = value => String(value || "").replace(/\D/g, "");
  const normPhone = value => {
    const d = digits(value);
    if (d.length === 9) return "221" + d;
    if (d.length === 12 && d.startsWith("221")) return d;
    return d;
  };
  const normSlug = value => String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  const positive = value => value === true || value === 1 || ["true", "t", "1", "ok", "active", "allowed", "valid", "verified", "granted", "yes"].includes(String(value || "").trim().toLowerCase());

  function unwrap(data) {
    let row = Array.isArray(data) ? data[0] : data;
    if (typeof row === "string") {
      const text = row.trim();
      try { row = JSON.parse(text); }
      catch (_) { return positive(text) ? { ok: true } : { ok: false, reason: text }; }
    }
    if (!row || typeof row !== "object") return { ok: positive(row) };
    if (row.data && typeof row.data === "object") row = row.data;
    if (row.result && typeof row.result === "object") row = row.result;
    return row;
  }

  let attempts = 0;
  function installExactPinRail() {
    const guard = window.DIGIY_GUARD;
    if (!guard || typeof guard.getSb !== "function" || typeof guard.saveSession !== "function") {
      attempts += 1;
      if (attempts < 120) setTimeout(installExactPinRail, 25);
      return;
    }
    if (guard.__MARKET_EXACT_PIN_V5__) return;

    guard.loginWithPin = async function loginWithPinExact(identityInput, pinInput) {
      const rawIdentity = String(identityInput || guard.getSlug?.() || guard.getPhone?.() || "").trim();
      const pin = String(pinInput || "").replace(/\D/g, "").slice(0, 4);
      if (!rawIdentity) return { ok: false, error: "Compte MARKET introuvable." };
      if (pin.length !== 4) return { ok: false, error: "Code MARKET incomplet." };

      const phoneCandidate = normPhone(rawIdentity);
      const identity = phoneCandidate || normSlug(rawIdentity) || rawIdentity;
      const client = guard.getSb();
      if (!client) return { ok: false, error: "Supabase indisponible." };

      const { data, error } = await client.rpc("digiy_market_open_with_pin", {
        p_identity: identity,
        p_pin: pin
      });

      if (error) {
        return {
          ok: false,
          error: error.message || "Vérification MARKET indisponible.",
          detail: error
        };
      }

      const row = unwrap(data);
      const accepted = positive(row.ok) || positive(row.success) || positive(row.valid) || positive(row.allowed) || positive(row.access) || positive(row.access_ok) || positive(row.has_access);
      if (!accepted) {
        return {
          ok: false,
          error: row.reason || row.error || row.message || "Numéro ou code MARKET non reconnu.",
          detail: row
        };
      }

      const finalPhone = normPhone(row.phone || row.market_phone || phoneCandidate);
      const finalSlug = normSlug(row.slug || row.workspace_slug || row.shop_slug || (finalPhone ? `market-${finalPhone}` : ""));
      const ownerId = row.owner_id || row.ownerId || row.profile?.owner_id || null;

      if (finalPhone && typeof guard.checkAccess === "function") {
        const accessOk = await guard.checkAccess(finalPhone);
        if (!accessOk) return { ok: false, error: "Abonnement MARKET inactif." };
      }

      const session = guard.saveSession({
        slug: finalSlug,
        phone: finalPhone,
        owner_id: ownerId,
        access_until: row.access_until || row.pin_access_until || row.expires_at,
        validated_at: row.validated_at,
        reason: row.reason || "market_pin_ok",
        source: "market_open_with_pin_exact_v5"
      });

      return { ok: true, ...session };
    };

    guard.__MARKET_EXACT_PIN_V5__ = true;
    guard.VERSION = VERSION;
  }

  installExactPinRail();
})();
