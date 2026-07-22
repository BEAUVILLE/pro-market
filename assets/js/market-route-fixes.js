/* MARKET route fixes — public shop and PRO CARNET links */
(() => {
  "use strict";

  const PUBLIC_ORIGIN = "https://market.digiylyfe.com";
  const CARNET_SIGNUP = "https://digiy-carnet-pro.digiylyfe.com/inscription-pay.html";
  let publicUrl = "";
  let resolving = null;

  const cleanSlug = value => String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const digits = value => String(value || "").replace(/\D/g, "");
  const phoneLike = value => /\d{7,}/.test(cleanSlug(value));

  function extractSlug(value){
    let row = Array.isArray(value) ? value[0] : value;
    if(!row || typeof row !== "object") return "";
    row = row.data || row.profile || row.shop || row;
    return cleanSlug(row.slug || row.workspace_slug || row.shop_slug || row.public_slug || "");
  }

  async function resolvePublicUrl(){
    if(publicUrl) return publicUrl;
    if(resolving) return resolving;

    resolving = (async () => {
      try{
        const guard = window.DIGIY_GUARD;
        if(!guard) return "";
        const session = await guard.ready();
        if(!guard.isAuthenticated() || !session?.access_ok) return "";

        let slug = cleanSlug(session.slug);
        const phone = digits(session.phone);
        const client = guard.getSb && guard.getSb();

        if(client){
          const attempts = [];
          if(phone) attempts.push({p_phone:phone},{p_identity:phone});
          if(slug) attempts.push({p_slug:slug},{p_identity:slug});

          for(const args of attempts){
            try{
              const {data,error} = await client.rpc("digiy_market_resolve_identity", args);
              if(error || !data) continue;
              const found = extractSlug(data);
              if(found && !phoneLike(found)){ slug = found; break; }
            }catch(_){}
          }
        }

        if(!slug || phoneLike(slug)) return "";
        const url = new URL("/fiche.html", PUBLIC_ORIGIN);
        url.searchParams.set("slug", slug);
        publicUrl = url.toString();
        return publicUrl;
      }catch(_){
        return "";
      }finally{
        resolving = null;
      }
    })();

    return resolving;
  }

  function patchCarnetLinks(root=document){
    root.querySelectorAll?.('a[href]').forEach(a => {
      try{
        const u = new URL(a.getAttribute("href") || "", location.href);
        if(u.hostname !== "pro-pay.digiylyfe.com") return;
        a.href = CARNET_SIGNUP;
        a.removeAttribute("target");
        if(/envoyer vers mon argent/i.test(a.textContent || "")){
          a.textContent = "💰 Ouvrir / activer Mon argent";
        }
      }catch(_){}
    });

    root.querySelectorAll?.('.memoryPayHint').forEach(el => {
      el.textContent = "La note reste sur ce téléphone. PRO CARNET s’ouvre séparément et le professionnel décide de ce qu’il enregistre.";
    });
  }

  async function patchPublicLinks(root=document){
    const url = await resolvePublicUrl();
    if(!url) return;

    const ids = ["btnPublic","linkPublic","btnMorePublic"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if(el) el.href = url;
    });

    root.querySelectorAll?.('a[href="https://market.digiylyfe.com/"],a[href="https://market.digiylyfe.com"]').forEach(a => {
      const label = String(a.textContent || "").toLowerCase();
      if(/ma vitrine|ouvrir public|voir boutique|voir ma vitrine/.test(label)) a.href = url;
    });
  }

  function run(root=document){
    patchCarnetLinks(root);
    patchPublicLinks(root);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", () => run(document), {once:true});
  }else{
    run(document);
  }

  new MutationObserver(mutations => {
    for(const mutation of mutations){
      mutation.addedNodes.forEach(node => {
        if(node.nodeType === 1) run(node);
      });
    }
  }).observe(document.documentElement,{childList:true,subtree:true});
})();