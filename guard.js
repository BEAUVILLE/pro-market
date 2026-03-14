async function loadProfile() {
  const qs = new URLSearchParams(location.search);

  const slug =
    (qs.get("slug") || "")
      .trim()
      .toLowerCase();

  if (!slug) throw new Error("slug_missing");

  const { data, error } = await sb
    .from("digiy_market_public_profiles")
    .select("slug, phone, display_name, category, city, whatsapp, bio")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("profile_not_found");

  PROFILE = {
    slug: data.slug || slug,
    shop_name: data.display_name || "Boutique DIGIY",
    business_name: data.display_name || "Boutique DIGIY",
    category: data.category || "Boutique locale",
    categories_text: data.category || "Boutique locale",
    city: data.city || "Saly",
    phone: data.phone || "",
    public_phone: data.phone || "",
    whatsapp: data.whatsapp || data.phone || "",
    address: "Adresse à confirmer",
    address_text: "Adresse à confirmer",
    description: data.bio || "Boutique locale, produits utiles et bons.",
    bio: data.bio || "Boutique locale, produits utiles et bons.",
    open_hours: "Horaires à confirmer",
    delivery_note: "Livraison locale selon zone."
  };

  return PROFILE;
}
