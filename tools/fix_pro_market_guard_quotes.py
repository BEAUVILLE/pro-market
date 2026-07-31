from pathlib import Path

FILES = ["index.html", "fiche.html", "produits.html", "boutique.html"]
BAD = 'window.DIGIY_PRO_MARKET_LOGIN_URL||"./pin.html"'
GOOD = "window.DIGIY_PRO_MARKET_LOGIN_URL||'./pin.html'"

changed = False
for filename in FILES:
    path = Path(filename)
    source = path.read_text(encoding="utf-8")
    if BAD in source:
        source = source.replace(BAD, GOOD)
        path.write_text(source, encoding="utf-8")
        changed = True
        print(f"CORRIGÉ: {filename}")

print("GUILLEMETS GUARD SÉCURISÉS" if changed else "AUCUN GUILLEMET À CORRIGER")
