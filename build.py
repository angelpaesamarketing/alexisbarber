#!/usr/bin/env python3
"""
Genera una página por idioma a partir de src/index.template.html y content/.

    python3 build.py

Escribe index.html en la raíz (castellano) y ca/, en/, fr/, de/, más el
sitemap. El resultado se commitea: Cloudflare Pages no ejecuta nada, sirve
los archivos tal cual.
"""
import json, html, pathlib, sys

RAIZ = pathlib.Path(__file__).parent
cfg  = json.loads((RAIZ / "content/config.json").read_text(encoding="utf-8"))
tpl  = (RAIZ / "src/index.template.html").read_text(encoding="utf-8")

e = lambda s: html.escape(str(s), quote=True)

def wa_href(msg):
    from urllib.parse import quote
    return f"https://wa.me/{cfg['whatsapp']}?text={quote(msg)}"

def url(lang_dir):
    return cfg["dominio"] + "/" + lang_dir

def construir(code):
    t = json.loads((RAIZ / f"content/{code}.json").read_text(encoding="utf-8"))
    yo = next(l for l in cfg["idiomas"] if l["code"] == code)
    base = "/" + yo["dir"]

    # ── alternativas de idioma para buscadores ──
    hl = [f'<link rel="alternate" hreflang="{l["htmlLang"]}" href="{url(l["dir"])}">'
          for l in cfg["idiomas"]]
    hl.append(f'<link rel="alternate" hreflang="x-default" href="{url("")}">')

    # ── pastillas de idioma del hero ──
    pills = []
    for l in cfg["idiomas"]:
        actual = l["code"] == code
        attrs = ' aria-current="page"' if actual else ""
        pills.append(f'        <li><a class="langs__pill{" is-on" if actual else ""}" '
                     f'href="/{l["dir"]}" lang="{l["htmlLang"]}"{attrs}>{e(l["nombre"])}</a></li>')

    foot = []
    for l in cfg["idiomas"]:
        actual = l["code"] == code
        attrs = ' aria-current="page"' if actual else ""
        foot.append(f'        <li><a href="/{l["dir"]}" lang="{l["htmlLang"]}"'
                    f'{" class=\"is-on\"" if actual else ""}{attrs}>{e(l["htmlLang"].upper())}</a></li>')

    chips = "\n".join(f'      <li>{e(c)}</li>' for c in t["hero"]["chips"])

    pasos = "\n".join(
        f'''      <article class="card tilt reveal">
        <span class="card__num">{i+1:02d}</span>
        <h3>{e(s["t"])}</h3>
        <p>{e(s["d"])}</p>
      </article>''' for i, s in enumerate(t["como"]["steps"]))

    servicios = []
    for s in cfg["servicios"]:
        it = t["servicios"]["items"][s["id"]]
        tag = f'        <span class="price__tag">{e(t["servicios"]["tag"])}</span>\n' if s.get("feat") else ""
        servicios.append(
            f'''      <article class="price reveal"{" data-feat" if s.get("feat") else ""}>
{tag}        <h3>{e(it["n"])}</h3>
        <p class="price__desc">{e(it["d"])}</p>
        <p class="price__amount">{s["precio"]}<small>€</small></p>
        <p class="price__time">{s["min"]} {e(t["servicios"]["min"])}</p>
      </article>''')

    ventajas = "\n".join(
        f'''      <article class="bene reveal">
        <h3>{e(b["t"])}</h3>
        <p>{e(b["d"])}</p>
      </article>''' for b in t["porque"]["items"])

    zonas = "\n".join(f'        <li>{e(z)}</li>' for z in cfg["zonas"])

    ig = ""
    if cfg.get("instagram"):
        u = cfg["instagram"].lstrip("@")
        ig = (f'      <a class="foot__ig" href="https://instagram.com/{e(u)}" target="_blank" rel="noopener">\n'
              f'        <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ig"/></svg>\n'
              f'        <span>@{e(u)}</span>\n      </a>')

    ld = {
      "@context": "https://schema.org", "@type": "HairSalon", "name": "Alexis Barber",
      "description": t["ld"]["desc"], "url": url(yo["dir"]),
      "image": cfg["dominio"] + "/assets/img/og.jpg",
      "logo": cfg["dominio"] + "/assets/img/icon-512.png",
      "telephone": "+" + cfg["whatsapp"], "priceRange": "€€",
      "areaServed": {"@type": "City", "name": "Barcelona", "address": {
        "@type": "PostalAddress", "addressLocality": "Barcelona",
        "addressRegion": "Catalunya", "addressCountry": "ES"}},
      "availableLanguage": [l["htmlLang"] for l in cfg["idiomas"]],
      "makesOffer": [{"@type": "Offer",
                      "itemOffered": {"@type": "Service", "name": t["servicios"]["items"][s["id"]]["n"]},
                      "price": s["precio"], "priceCurrency": "EUR"} for s in cfg["servicios"]],
    }

    v = {
      "htmlLang": yo["htmlLang"], "ogLocale": yo["ogLocale"], "dominio": cfg["dominio"],
      "canonical": url(yo["dir"]), "home": base, "hreflang": "\n".join(hl),
      "metaTitle": e(t["meta"]["title"]), "metaDesc": e(t["meta"]["desc"]),
      "ogTitle": e(t["meta"]["ogTitle"]), "ogDesc": e(t["meta"]["ogDesc"]),
      "navSkip": e(t["nav"]["skip"]), "navInicio": e(t["nav"]["inicio"]),
      "navPrincipal": e(t["nav"]["principal"]), "navComo": e(t["nav"]["como"]),
      "navServicios": e(t["nav"]["servicios"]), "navZona": e(t["nav"]["zona"]),
      "navReservar": e(t["nav"]["reservar"]), "navIdioma": e(t["nav"]["idioma"]),
      "navBajar": e(t["nav"]["bajar"]),
      "waHref": e(wa_href(t["wa"]["msg"])), "waAria": e(t["wa"]["aria"]),
      "heroEyebrow": e(t["hero"]["eyebrow"]), "heroH1a": e(t["hero"]["h1a"]),
      "heroH1b": e(t["hero"]["h1b"]), "heroLede": e(t["hero"]["lede"]),
      "heroCta1": e(t["hero"]["cta1"]), "heroCta2": e(t["hero"]["cta2"]),
      "heroLangs": e(t["hero"]["langs"]), "heroLangsNota": e(t["hero"]["langsNota"]),
      "langPills": "\n".join(pills), "footLangs": "\n".join(foot), "heroChips": chips,
      "comoEyebrow": e(t["como"]["eyebrow"]), "comoH2": e(t["como"]["h2"]), "comoSteps": pasos,
      "servEyebrow": e(t["servicios"]["eyebrow"]), "servH2": e(t["servicios"]["h2"]),
      "servLede": e(t["servicios"]["lede"]), "servNota": e(t["servicios"]["nota"]),
      "servItems": "\n".join(servicios),
      "porqueEyebrow": e(t["porque"]["eyebrow"]), "porqueH2": e(t["porque"]["h2"]),
      "porqueItems": ventajas,
      "zonaEyebrow": e(t["zona"]["eyebrow"]), "zonaH2": e(t["zona"]["h2"]),
      "zonaLede": e(t["zona"]["lede"]), "zonaItems": zonas,
      "finalH2": e(t["final"]["h2"]), "finalLede": e(t["final"]["lede"]),
      "finalCta": e(t["final"]["cta"]), "finalHorario": e(t["final"]["horario"]),
      "footLegal": e(t["foot"]["legal"]), "footIg": ig,
      "jsonld": json.dumps(ld, ensure_ascii=False, indent=2),
    }

    out = tpl
    for k, val in v.items():
        out = out.replace("{{" + k + "}}", str(val))
    sobran = set(__import__("re").findall(r"\{\{(\w+)\}\}", out))
    if sobran:
        sys.exit(f"ERROR: marcadores sin sustituir en {code}: {sorted(sobran)}")
    return out

def main():
    for l in cfg["idiomas"]:
        destino = RAIZ / l["dir"] / "index.html"
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(construir(l["code"]), encoding="utf-8")
        print(f"  {str(destino.relative_to(RAIZ)):20s} {destino.stat().st_size:>7,} bytes")

    urls = "\n".join(
      f'  <url>\n    <loc>{url(l["dir"])}</loc>\n'
      + "".join(f'    <xhtml:link rel="alternate" hreflang="{o["htmlLang"]}" href="{url(o["dir"])}"/>\n'
                for o in cfg["idiomas"])
      + '    <changefreq>monthly</changefreq>\n'
      + f'    <priority>{"1.0" if l["dir"]=="" else "0.9"}</priority>\n  </url>'
      for l in cfg["idiomas"])
    (RAIZ / "sitemap.xml").write_text(
      '<?xml version="1.0" encoding="UTF-8"?>\n'
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
      '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + urls + "\n</urlset>\n",
      encoding="utf-8")
    print("  sitemap.xml")

if __name__ == "__main__":
    print("Generando páginas:")
    main()
