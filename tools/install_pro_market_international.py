from pathlib import Path
import re

PAGES = ["index.html", "pin.html", "produits.html", "boutique.html", "fiche.html"]
BOOT_MARKER = "<!-- DIGIY PRO MARKET — amorce langue avant guard -->"
BOOT = r'''  <!-- DIGIY PRO MARKET — amorce langue avant guard -->
  <script>
  (()=>{
    const supported=["fr","en","es","de","it","nl","ar"];
    let lang="fr";
    try{
      const query=String(new URLSearchParams(location.search).get("lang")||"").toLowerCase();
      const stored=String(localStorage.getItem("digiy-pro-market-lang")||localStorage.getItem("digiy-market-lang")||localStorage.getItem("digiy-lang")||"").toLowerCase();
      const browser=String(navigator.language||"fr").slice(0,2).toLowerCase();
      lang=supported.includes(query)?query:supported.includes(stored)?stored:supported.includes(browser)?browser:"fr";
      localStorage.setItem("digiy-pro-market-lang",lang);
      localStorage.setItem("digiy-market-lang",lang);
      localStorage.setItem("digiy-lang",lang);
    }catch(_){}
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==="ar"?"rtl":"ltr";
    window.DIGIY_PRO_MARKET_LANG=lang;
    const login=new URL("./pin.html",location.href);
    login.searchParams.set("lang",lang);
    window.DIGIY_PRO_MARKET_LOGIN_URL=login.pathname+login.search;
  })();
  </script>
'''
TAGS_MARKER = "<!-- DIGIY PRO MARKET — cockpit international 7 langues -->"
TAGS = r'''  <!-- DIGIY PRO MARKET — cockpit international 7 langues -->
  <script src="./assets/js/pro-market-i18n-data.js?v=20260731"></script>
  <script src="./assets/js/pro-market-i18n.js?v=20260731"></script>
'''


def inject_page(path: Path) -> bool:
    source = path.read_text(encoding="utf-8")
    changed = False
    if BOOT_MARKER not in source:
        source = re.sub(r"<head([^>]*)>", lambda m: m.group(0) + "\n" + BOOT, source, count=1, flags=re.I)
        changed = True
    if TAGS_MARKER not in source:
        if "</body>" not in source:
            raise SystemExit(f"Balise </body> absente: {path}")
        source = source.replace("</body>", TAGS + "</body>", 1)
        changed = True

    source2 = re.sub(
        r'window\.DIGIY_LOGIN_URL\s*=\s*["\']\.\/pin\.html["\']\s*;',
        'window.DIGIY_LOGIN_URL=window.DIGIY_PRO_MARKET_LOGIN_URL||"./pin.html";',
        source,
    )
    if source2 != source:
        source, changed = source2, True

    source2 = re.sub(
        r"location\.replace\([\"']\.\/pin\.html(?:\?[^\"']*)?[\"']\)",
        'location.replace(window.DIGIY_PRO_MARKET_LOGIN_URL||"./pin.html")',
        source,
    )
    if source2 != source:
        source, changed = source2, True

    if path.name == "pin.html":
        old = 'setTimeout(()=>location.replace("./cockpit.html"),450);'
        new = 'setTimeout(()=>location.replace(typeof window.DIGIY_PRO_MARKET_URL==="function"?window.DIGIY_PRO_MARKET_URL("./cockpit.html"):"./cockpit.html?lang="+encodeURIComponent(window.DIGIY_PRO_MARKET_LANG||"fr")),450);'
        if old in source:
            source = source.replace(old, new)
            changed = True
        if new not in source:
            raise SystemExit("Redirection PIN internationalisée absente")

    if path.name == "index.html":
        old = 'setStatus("Ouverture de WhatsApp…",false);location.href="https://wa.me/?text="+encodeURIComponent("Bonjour, voici ma boutique DIGIY MARKET : "+publicUrl)'
        new = 'setStatus("Ouverture de WhatsApp…",false);const rawShare="Bonjour, voici ma boutique DIGIY MARKET : "+publicUrl;const translatedShare=typeof window.DIGIY_PRO_MARKET_TRANSLATE_MESSAGE==="function"?window.DIGIY_PRO_MARKET_TRANSLATE_MESSAGE(rawShare):rawShare;location.href="https://wa.me/?text="+encodeURIComponent(translatedShare)'
        if old in source:
            source = source.replace(old, new, 1)
            changed = True

    if path.name == "fiche.html":
        old = 'currentUrl=safe;'
        new = 'const localized=new URL(safe);localized.searchParams.set("lang",window.DIGIY_PRO_MARKET_LANG||"fr");currentUrl=localized.toString();'
        if old in source and new not in source:
            source = source.replace(old, new, 1)
            changed = True
        old_share = 'location.href="https://wa.me/?text="+encodeURIComponent("Voici ma boutique DIGIY MARKET : "+currentUrl)'
        new_share = 'const rawShare="Voici ma boutique DIGIY MARKET : "+currentUrl;const translatedShare=typeof window.DIGIY_PRO_MARKET_TRANSLATE_MESSAGE==="function"?window.DIGIY_PRO_MARKET_TRANSLATE_MESSAGE(rawShare):rawShare;location.href="https://wa.me/?text="+encodeURIComponent(translatedShare)'
        if old_share in source:
            source = source.replace(old_share, new_share, 1)
            changed = True

    if changed:
        path.write_text(source, encoding="utf-8")
        print(f"INSTALLÉ: {path}")
    return changed


changed = False
for filename in PAGES:
    path = Path(filename)
    if not path.exists():
        raise SystemExit(f"Fichier absent: {filename}")
    changed |= inject_page(path)

lang_html = r'''<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,follow">
  <title>DIGIYLYFE PRO MARKET · Langue</title>
  <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#06140f;color:#fff;font-family:system-ui;text-align:center;font-weight:900}</style>
</head>
<body>
  <p>PRO MARKET…</p>
  <script>
  (()=>{
    const supported=["fr","en","es","de","it","nl","ar"];
    const params=new URLSearchParams(location.search);
    let lang=String(params.get("lang")||"fr").toLowerCase();
    let page=String(params.get("page")||"index.html").replace(/^\/+/,"");
    if(!supported.includes(lang))lang="fr";
    if(!/^[A-Za-z0-9._-]+\.html$/.test(page)||page.includes(".."))page="index.html";
    try{localStorage.setItem("digiy-pro-market-lang",lang);localStorage.setItem("digiy-market-lang",lang);localStorage.setItem("digiy-lang",lang)}catch(_){}
    const target=new URL("./"+page,location.href);
    for(const [key,value] of params.entries())if(key!=="page"&&key!=="lang")target.searchParams.append(key,value);
    target.searchParams.set("lang",lang);
    target.hash=location.hash;
    location.replace(target.pathname+target.search+target.hash);
  })();
  </script>
</body>
</html>
'''
lang_path = Path("lang.html")
if not lang_path.exists() or lang_path.read_text(encoding="utf-8") != lang_html:
    lang_path.write_text(lang_html, encoding="utf-8")
    changed = True
    print("INSTALLÉ: lang.html")

qr_html = r'''<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
  <meta name="digiy-build" content="market-qr-international-20260731">
  <title>MARKET PRO — QR protégé</title>
</head>
<body>
  <main><h1>QR MARKET</h1><p><a id="openQr" href="./fiche.html#qr">Ouvrir le QR dans ma fiche protégée</a></p></main>
  <script>
  (()=>{
    const supported=["fr","en","es","de","it","nl","ar"];
    let lang="fr";
    try{const q=String(new URLSearchParams(location.search).get("lang")||"").toLowerCase();const s=String(localStorage.getItem("digiy-pro-market-lang")||localStorage.getItem("digiy-lang")||"").toLowerCase();lang=supported.includes(q)?q:supported.includes(s)?s:"fr"}catch(_){}
    const target=new URL("./fiche.html",location.href);target.searchParams.set("lang",lang);target.hash="qr";
    document.getElementById("openQr").href=target.pathname+target.search+target.hash;
    location.replace(target.pathname+target.search+target.hash);
  })();
  </script>
</body>
</html>
'''
qr_path = Path("qr.html")
if not qr_path.exists() or qr_path.read_text(encoding="utf-8") != qr_html:
    qr_path.write_text(qr_html, encoding="utf-8")
    changed = True
    print("INSTALLÉ: qr.html")

print("PRO MARKET INTERNATIONAL PRÊT" if changed else "AUCUNE MODIFICATION NÉCESSAIRE")
