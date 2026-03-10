async function loadProfile() {
  const phone = window.DIGIY_GUARD?.state?.phone || "";
  if (!phone) throw new Error("phone_missing");

  const { data, error } = await sb
    .from("digiy_market_public_profiles")
    .select("slug, phone, display_name, category, city, whatsapp, bio")
    .eq("phone", phone)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("profile_not_found");

  PROFILE = {
    slug: data.slug || "",
    business_name: data.display_name || "Boutique DIGIY",
    category: data.category || "Boutique locale",
    city: data.city || "Saly",
    public_phone: data.phone || phone,
    whatsapp: data.whatsapp || data.phone || phone,
    address_text: "Adresse à confirmer",
    description: data.bio || "Boutique locale, produits utiles et bons.",
    open_hours: "Horaires à confirmer",
    delivery_note: "Livraison locale selon zone."
  };

  return PROFILE;
}
