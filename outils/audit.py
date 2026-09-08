#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Audit d'un site vitrine : SEO, accessibilite, liens, coherence.

Interroge les pages EN LIGNE, pas les fichiers locaux : c'est ce que voient
Google et les visiteurs qui compte.

Lecon a ne pas reperdre : une premiere version ne mesurait que la LONGUEUR des
meta-descriptions, jamais leur CONTENU. Deux pages generees depuis contact.html
avaient herite de sa description mot pour mot, et l'audit annoncait « tout est
en ordre ». On verifie donc la qualite et l'unicite entre les pages, pas la
simple presence d'une balise.

Usage : python3 outils/audit.py [https://domaine.tld]
"""
import html
import json
import re
import ssl
import sys
import urllib.request
from collections import defaultdict

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://tremorsi.com").rstrip("/")
CTX = ssl.create_default_context()

PAGES = [
    "/", "/menu.html", "/privatisation.html", "/contact.html", "/reseaux.html",
    "/faq.html", "/dove-andiamo.html", "/passaporto.html",
    "/blog/", "/blog/la-puccia-salentine.html", "/blog/arrosticini-abruzzes.html",
]

soucis = []
notes = []


def alerte(page, quoi):
    soucis.append((page, quoi))


def info(page, quoi):
    notes.append((page, quoi))


def get(chemin):
    """Parametre anti-cache : apres un deploiement le CDN sert encore l'ancienne version."""
    url = BASE + chemin + ("&" if "?" in chemin else "?") + "cb=audit"
    r = urllib.request.urlopen(url, context=CTX, timeout=25)
    return r.read().decode("utf-8", "replace"), r.status


def txt(s):
    return html.unescape(re.sub(r"\s+", " ", s or "")).strip()


def un(motif, s, groupe=1):
    m = re.search(motif, s, re.S | re.I)
    return txt(m.group(groupe)) if m else None


# ---------------------------------------------------------------- chargement
docs = {}
for p in PAGES:
    try:
        corps, code = get(p)
        if code != 200:
            alerte(p, f"HTTP {code}")
        docs[p] = corps
    except Exception as e:
        alerte(p, f"INJOIGNABLE : {e}")

print("=" * 74)
print(f"AUDIT {BASE} - {len(docs)} pages chargees")
print("=" * 74)

# ------------------------------------------------------------------ collecte
meta = {}
for p, d in docs.items():
    meta[p] = {
        "title": un(r"<title>(.*?)</title>", d),
        "desc": un(r'<meta\s+name="description"\s+content="(.*?)"', d),
        "canonical": un(r'<link\s+rel="canonical"\s+href="(.*?)"', d),
        "ogtitle": un(r'<meta\s+property="og:title"\s+content="(.*?)"', d),
        "ogimage": un(r'<meta\s+property="og:image"\s+content="(.*?)"', d),
        "h1": [txt(x) for x in re.findall(r"<h1[^>]*>(.*?)</h1>", d, re.S | re.I)],
        "titres": re.findall(r"<h([1-6])[^>]*>", d, re.I),
        "lang": un(r'<html[^>]+lang="(.*?)"', d),
        "viewport": bool(re.search(r'name="viewport"', d, re.I)),
        "charset": bool(re.search(r"<meta\s+charset", d, re.I)),
        "robots": un(r'<meta\s+name="robots"\s+content="(.*?)"', d),
    }

# ------------------------------------------------------- 1. unicite du contenu
print("\n1. UNICITE DU CONTENU (le test qui manquait la premiere fois)")
print("-" * 74)
for champ, nom in (("title", "TITRE"), ("desc", "DESCRIPTION"), ("h1", "H1")):
    vus = defaultdict(list)
    for p, m in meta.items():
        v = m[champ][0] if champ == "h1" and m[champ] else (m[champ] if champ != "h1" else None)
        if not v:
            alerte(p, f"{nom} absent")
            continue
        vus[v].append(p)
    doublons = {v: ps for v, ps in vus.items() if len(ps) > 1}
    total = len(docs)
    if doublons:
        print(f"  {nom:12} : {len(vus)}/{total} uniques  <-- DOUBLONS")
        for v, ps in doublons.items():
            print(f"      « {v[:58]} » partage par {', '.join(ps)}")
            for x in ps:
                alerte(x, f"{nom} en doublon")
    else:
        print(f"  {nom:12} : {len(vus)}/{total} uniques  OK")

# ------------------------------------------------------------- 2. longueurs
print("\n2. LONGUEURS (titre 50-60, description 140-160)")
print("-" * 74)
for p, m in meta.items():
    t, d_ = m["title"] or "", m["desc"] or ""
    et = "OK" if 50 <= len(t) <= 60 else ("court" if len(t) < 50 else "long")
    ed = "OK" if 140 <= len(d_) <= 160 else ("courte" if len(d_) < 140 else "longue")
    if et != "OK":
        alerte(p, f"titre {len(t)} caracteres ({et})")
    if ed != "OK":
        alerte(p, f"description {len(d_)} caracteres ({ed})")
    print(f"  {p:32} titre {len(t):3} {et:6} desc {len(d_):3} {ed}")

# ------------------------------------------------------ 3. hierarchie titres
print("\n3. HIERARCHIE DES TITRES")
print("-" * 74)
for p, m in meta.items():
    niveaux = [int(x) for x in m["titres"]]
    struct = "".join(str(n) for n in niveaux)
    pb = []
    if niveaux.count(1) != 1:
        pb.append(f"{niveaux.count(1)} h1")
    precedent = None
    for n in niveaux:
        if precedent is not None and n > precedent + 1:
            pb.append(f"saut h{precedent}->h{n}")
            break
        precedent = n
    if pb:
        alerte(p, "titres : " + ", ".join(pb))
    print(f"  {p:32} {struct[:34]:36} {'OK' if not pb else ' / '.join(pb)}")

# --------------------------------------------------- 4. canonical et partage
print("\n4. CANONICAL & PARTAGE SOCIAL")
print("-" * 74)
for p, m in meta.items():
    attendu = BASE + ("/" if p == "/" else p)
    c = (m["canonical"] or "").rstrip("/") or ""
    ok = c.rstrip("/") == attendu.rstrip("/")
    if not ok:
        alerte(p, f"canonical incoherent : {m['canonical']}")
    if not m["ogtitle"]:
        alerte(p, "og:title absent")
    if not m["ogimage"]:
        alerte(p, "og:image absent")
    print(f"  {p:32} canonical {'OK' if ok else 'KO ' + str(m['canonical'])}"
          f"  og:title {'OK' if m['ogtitle'] else 'KO'}  og:image {'OK' if m['ogimage'] else 'KO'}")

# ------------------------------------------------------------- 5. techniques
print("\n5. BASES TECHNIQUES")
print("-" * 74)
for p, m in meta.items():
    pb = []
    if not m["lang"]:
        pb.append("lang absent")
    if not m["viewport"]:
        pb.append("viewport absent")
    if not m["charset"]:
        pb.append("charset absent")
    if m["robots"] and "noindex" in m["robots"]:
        pb.append("NOINDEX")
    if pb:
        alerte(p, ", ".join(pb))
    print(f"  {p:32} lang={m['lang'] or '-':6} {'OK' if not pb else ' / '.join(pb)}")

# ---------------------------------------------------------------- 6. images
print("\n6. IMAGES")
print("-" * 74)
for p, d in docs.items():
    imgs = re.findall(r"<img\s[^>]*>", d, re.I)
    sans_alt = [i for i in imgs if not re.search(r'\salt=', i, re.I)]
    # Une image sans src est remplie par JavaScript (galerie, carte postale) : vide au
    # chargement et dans une surcouche masquee, elle ne peut decaler aucune mise en page.
    chargees = [i for i in imgs if re.search(r"\ssrc=", i, re.I)]
    sans_dim = [i for i in chargees if not (re.search(r"\swidth=", i, re.I) and re.search(r"\sheight=", i, re.I))]
    if sans_alt:
        alerte(p, f"{len(sans_alt)} image(s) sans alt")
    if sans_dim:
        alerte(p, f"{len(sans_dim)} image(s) sans dimensions (decalage de mise en page)")
    print(f"  {p:32} {len(imgs):3} images ({len(chargees)} chargees), {len(sans_alt)} sans alt, {len(sans_dim)} sans dimensions")

# ----------------------------------------------------------- 7. liens brisés
print("\n7. LIENS INTERNES")
print("-" * 74)
cibles = set()
entrants = defaultdict(set)
for p, d in docs.items():
    for href in re.findall(r'<a\s[^>]*href="([^"#][^"]*)"', d, re.I):
        if href.startswith(("http", "mailto:", "tel:", "//")):
            continue
        chemin = href.split("#")[0].split("?")[0]
        if not chemin:
            continue
        if not chemin.startswith("/"):
            base = p.rsplit("/", 1)[0]
            chemin = (base + "/" + chemin).replace("//", "/")
        cibles.add(chemin)
        entrants[chemin].add(p)

brises = []
for c in sorted(cibles):
    try:
        _, code = get(c)
        if code != 200:
            brises.append((c, code))
    except Exception as e:
        brises.append((c, str(e)[:40]))
if brises:
    for c, code in brises:
        alerte("liens", f"{c} -> {code} (cible depuis {', '.join(sorted(entrants[c]))})")
        print(f"  BRISE  {c} -> {code}")
else:
    print(f"  {len(cibles)} cibles internes verifiees, aucune brisee")

orphelines = [p for p in PAGES if p not in entrants and p != "/"]
for o in orphelines:
    alerte(o, "aucun lien entrant (page orpheline)")
print(f"  maillage : {min((len(entrants[p]) for p in PAGES if p in entrants), default=0)} lien(s) entrant(s) au minimum")

# --------------------------------------------------------------- 8. sitemap
print("\n8. SITEMAP & ROBOTS")
print("-" * 74)
try:
    sm, _ = get("/sitemap.xml")
    urls = re.findall(r"<loc>(.*?)</loc>", sm)
    chemins = {u.replace(BASE, "") or "/" for u in urls}
    manquantes = set(PAGES) - chemins
    en_trop = chemins - set(PAGES)
    print(f"  sitemap : {len(urls)} URLs")
    for m_ in manquantes:
        alerte("sitemap", f"{m_} absente du sitemap")
        print(f"  MANQUE dans le sitemap : {m_}")
    for e_ in en_trop:
        alerte("sitemap", f"{e_} dans le sitemap mais pas dans la liste auditee")
        print(f"  EN TROP dans le sitemap : {e_}")
    if not manquantes and not en_trop:
        print("  sitemap coherent avec les pages auditees")
except Exception as e:
    alerte("sitemap", str(e))

# --------------------------------------------------------------- 9. JSON-LD
print("\n9. DONNEES STRUCTUREES")
print("-" * 74)
for p, d in docs.items():
    blocs = re.findall(r'<script type="application/ld\+json">(.*?)</script>', d, re.S)
    for b in blocs:
        try:
            o = json.loads(b)
            print(f"  {p:32} {o.get('@type')} OK")
        except Exception as e:
            alerte(p, f"JSON-LD invalide : {e}")
            print(f"  {p:32} JSON-LD INVALIDE : {e}")

# ----------------------------------------------------------------- verdict
print("\n" + "=" * 74)
if soucis:
    print(f"VERDICT : {len(soucis)} POINT(S) A CORRIGER")
    print("=" * 74)
    for p, q in soucis:
        print(f"  {p:32} {q}")
else:
    print("VERDICT : AUCUN PROBLEME DETECTE")
    print("=" * 74)
print()
