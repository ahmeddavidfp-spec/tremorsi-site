#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Icones de l'app Tre Mor Si.

Genere les variantes « maskable » a partir de l'icone existante. Android applique
un masque (cercle, goutte, carre arrondi) et ne garantit que le cercle central de
80 % : l'illustration doit donc tenir dans cette zone, sur un fond opaque plein bord.

Usage : python3 outils/icones-app.py
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
ICONES = os.path.normpath(os.path.join(ICI, "..", "assets", "icons"))
SOURCE = os.path.join(ICONES, "icon-512.png")
FOND = (247, 242, 231)   # le creme de l'icone d'origine

# 62 % : l'illustration tient dans le cercle de securite avec un peu de marge
ECHELLE = 0.62


def maskable(taille):
    src = Image.open(SOURCE).convert("RGBA")
    cote = round(taille * ECHELLE)
    art = src.resize((cote, cote), Image.LANCZOS)
    fond = Image.new("RGB", (taille, taille), FOND)
    pos = (taille - cote) // 2
    fond.paste(art, (pos, pos), art)
    return fond


def main():
    faits = []
    for taille in (192, 512):
        chemin = os.path.join(ICONES, f"icon-{taille}-maskable.png")
        maskable(taille).save(chemin, optimize=True)
        faits.append((chemin, taille))

    # Icone des raccourcis du manifeste : le meme repere de marque, en petit
    src = Image.open(SOURCE).convert("RGB")
    court = os.path.join(ICONES, "shortcut-96.png")
    src.resize((96, 96), Image.LANCZOS).save(court, optimize=True)
    faits.append((court, 96))

    for chemin, taille in faits:
        print(f"  {taille:>3} px  {os.path.getsize(chemin)//1024:>3} Ko  {os.path.relpath(chemin, os.path.join(ICI, '..'))}")


if __name__ == "__main__":
    main()
