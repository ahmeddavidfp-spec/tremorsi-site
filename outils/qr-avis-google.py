#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QR code brandé Tre Mor Si pour récolter les avis Google.

Produit deux fichiers dans outils/sortie/ :
  - qr-avis-google.png      le QR seul, fond transparent, à réutiliser partout
  - affiche-avis-google.png l'affichette prête à imprimer (A6, 300 dpi)

Usage : python3 outils/qr-avis-google.py
"""
import os
import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image, ImageDraw, ImageFont

LIEN = "https://g.page/r/CeF2pgK9rkCaEBM/review"

# Palette du site (assets/style.css)
VERDE = (35, 75, 51)
ROSSO = (201, 46, 31)
LIMONE = (233, 185, 59)
INK = (26, 26, 22)
CREMA = (255, 253, 247)
CREMA2 = (255, 243, 220)

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, "sortie")
DIDOT = "/System/Library/Fonts/Supplemental/Didot.ttc"
AVENIR = "/System/Library/Fonts/Avenir Next.ttc"


def police(chemin, taille, index=0):
    try:
        return ImageFont.truetype(chemin, taille, index=index)
    except Exception:
        return ImageFont.load_default()


def degrade(taille, haut, bas):
    """Dégradé vertical vert -> rouge, avec un passage par le jaune."""
    l, h = taille
    img = Image.new("RGB", (1, h))
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        if t < 0.5:
            u = t / 0.5
            c = tuple(round(haut[i] + (LIMONE[i] - haut[i]) * u) for i in range(3))
        else:
            u = (t - 0.5) / 0.5
            c = tuple(round(LIMONE[i] + (bas[i] - LIMONE[i]) * u) for i in range(3))
        px[0, y] = c
    return img.resize((l, h), Image.BICUBIC)


def qr_arrondi(donnees, module=30, marge=2):
    """QR à modules arrondis, dessiné en masque puis colorisé par un dégradé."""
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_H, box_size=1, border=marge)
    qr.add_data(donnees)
    qr.make(fit=True)
    m = qr.get_matrix()
    n = len(m)
    cote = n * module

    masque = Image.new("L", (cote, cote), 0)
    d = ImageDraw.Draw(masque)
    r = module * 0.5  # rayon des coins : modules parfaitement ronds

    def plein(x, y):
        return 0 <= x < n and 0 <= y < n and m[y][x]

    for y in range(n):
        for x in range(n):
            if not m[y][x]:
                continue
            x0, y0 = x * module, y * module
            x1, y1 = x0 + module, y0 + module
            # Modules isolés : ronds. Modules voisins : on soude pour garder la lisibilité.
            d.rounded_rectangle([x0, y0, x1 - 1, y1 - 1], radius=r, fill=255)
            if plein(x + 1, y):
                d.rectangle([x0 + module // 2, y0, x1 + module // 2, y1 - 1], fill=255)
            if plein(x, y + 1):
                d.rectangle([x0, y0 + module // 2, x1 - 1, y1 + module // 2], fill=255)

    couleur = degrade((cote, cote), VERDE, ROSSO)
    img = Image.new("RGBA", (cote, cote), (0, 0, 0, 0))
    img.paste(couleur, (0, 0), masque)
    return img, n, module


def pastille_si(img, n, module):
    """Pastille centrale « Sì » - la correction d'erreur H encaisse largement."""
    cote = img.size[0]
    d = ImageDraw.Draw(img)
    r = cote * 0.115
    cx = cy = cote / 2
    # halo crème pour détacher la pastille des modules
    d.ellipse([cx - r * 1.16, cy - r * 1.16, cx + r * 1.16, cy + r * 1.16], fill=CREMA + (255,))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CREMA + (255,), outline=INK + (255,), width=max(2, int(module * 0.16)))
    f = police(DIDOT, int(r * 1.15), index=1)  # index 1 = italique
    txt = "Sì"
    bb = d.textbbox((0, 0), txt, font=f)
    d.text((cx - (bb[2] - bb[0]) / 2 - bb[0], cy - (bb[3] - bb[1]) / 2 - bb[1]), txt, font=f, fill=ROSSO)
    return img


def etoiles(d, cx, y, taille, couleur, n=5, ecart=1.35):
    """Cinq étoiles pleines, dessinées à la main (pas de dépendance à une police d'emoji)."""
    import math
    pas = taille * ecart
    depart = cx - pas * (n - 1) / 2
    for i in range(n):
        c = depart + i * pas
        pts = []
        for k in range(10):
            rr = taille / 2 if k % 2 == 0 else taille / 4.6
            a = -math.pi / 2 + k * math.pi / 5
            pts.append((c + rr * math.cos(a), y + rr * math.sin(a)))
        d.polygon(pts, fill=couleur)


def affiche(qr_img):
    """Affichette A6 a 300 dpi (1240 x 1748), mise en page en flux vertical."""
    L, H = 1240, 1748
    img = Image.new("RGB", (L, H), CREMA)
    d = ImageDraw.Draw(img)

    f_sur = police(AVENIR, 30, index=0)
    f_titre = police(DIDOT, 88, index=0)
    f_titre_it = police(DIDOT, 88, index=1)
    f_txt = police(AVENIR, 33, index=0)
    f_mini = police(AVENIR, 26, index=0)
    f_marque = police(DIDOT, 82, index=0)
    f_it = police(DIDOT, 42, index=1)

    def ligne(txt, y, f, fill, interligne=1.28):
        """Ecrit une ligne centree et rend le y de la ligne suivante."""
        d.text((L / 2, y), txt, font=f, fill=fill, anchor="mt")
        bb = d.textbbox((0, 0), txt, font=f)
        return y + round((bb[3] - bb[1]) * interligne) + 6

    def bande(y0):
        t = L / 3
        d.rectangle([0, y0, t, y0 + 18], fill=(47, 122, 69))
        d.rectangle([t, y0, 2 * t, y0 + 18], fill=(232, 226, 210))
        d.rectangle([2 * t, y0, L, y0 + 18], fill=ROSSO)

    bande(0)
    bande(H - 18)

    y = 108
    y = ligne("VOUS AVEZ AIMÉ ?", y, f_sur, ROSSO) + 14
    y = ligne("Dites-le en", y, f_titre, INK)
    y = ligne("dix secondes.", y, f_titre_it, ROSSO) + 22

    etoiles(d, L / 2, y + 28, 54, LIMONE)
    y += 74

    y = ligne("Votre avis Google aide une jeune", y, f_txt, (96, 93, 84), 1.35)
    y = ligne("aventure italienne à grandir.", y, f_txt, (96, 93, 84), 1.35) + 26

    # Panneau creme dimensionne sur son contenu
    qr_px = 560
    marge = 46
    bb_mini = d.textbbox((0, 0), "Ouvrez l\u2019appareil photo et visez le code", font=f_mini)
    h_mini = bb_mini[3] - bb_mini[1]
    panneau_h = marge + qr_px + 26 + h_mini + marge
    d.rounded_rectangle([88, y, L - 88, y + panneau_h], radius=40, fill=CREMA2)

    q = qr_img.resize((qr_px, qr_px), Image.LANCZOS)
    fond = Image.new("RGB", (qr_px, qr_px), CREMA2)
    fond.paste(q, (0, 0), q)
    img.paste(fond, (round(L / 2 - qr_px / 2), y + marge))

    ligne("Ouvrez l\u2019appareil photo et visez le code", y + marge + qr_px + 24, f_mini, (128, 125, 115))
    y += panneau_h + 54

    y = ligne("Tre Mor Si", y, f_marque, INK)
    y = ligne("ogni morso racconta l\u2019Italia", y, f_it, (152, 148, 136)) + 16
    ligne("grazie mille !", y, f_it, ROSSO)
    return img


def main():
    os.makedirs(SORTIE, exist_ok=True)
    qr, n, module = qr_arrondi(LIEN)
    qr = pastille_si(qr, n, module)
    a = os.path.join(SORTIE, "qr-avis-google.png")
    qr.save(a)
    b = os.path.join(SORTIE, "affiche-avis-google.png")
    affiche(qr).save(b, dpi=(300, 300))
    print(f"  QR      : {qr.size[0]}x{qr.size[1]} px, {n} modules -> {a}")
    print(f"  Affiche : A6 300 dpi -> {b}")


if __name__ == "__main__":
    main()
