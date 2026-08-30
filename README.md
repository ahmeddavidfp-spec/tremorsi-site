# Tre Mor Si — Food Truck Italiano 🇮🇹

Site vitrine one-page pour **Tre Mor Si**, food truck italien (Charleroi & alentours).
Instagram : [@tre.mor.si](https://www.instagram.com/tre.mor.si/)

## Stack

Site 100 % statique — un seul `index.html` (CSS et JS inclus dedans), aucune dépendance, aucun build.

- **Typos** : Anton (titres affiche), Instrument Sans (texte), Caveat (annotations manuscrites) via Google Fonts
- **Palette** : panna `#FFFDF6` · basilico `#157A43` · pomodoro `#E23A2E` · sole `#FFC93C`

## Développement local

```bash
python3 -m http.server 8765
```

Puis ouvrir http://localhost:8765

## Déploiement (Render + Cloudflare)

1. Pousser ce dépôt sur GitHub
2. Render → **New → Static Site** → connecter le repo (le `render.yaml` est détecté ; publish path `.`, pas de build)
3. Cloudflare → DNS : `CNAME` du domaine vers l'URL `*.onrender.com`, proxy activé (orange)
4. Render → Settings → Custom Domain : ajouter le domaine

## Contact client (source : page Facebook)

- Base : Fleurus · tél 0495 80 22 01 · Tressy_colombo@hotmail.com
- Facebook : https://www.facebook.com/profile.php?id=61590317361492
- Photos dans `assets/` récupérées de leur page Facebook (cover illustrée + plats)

## À valider avec le client

- [ ] Ratios du « Calcolatore di Festa » (3 arrosticini / 1 puccia / 1,5 spritz / 1 cannolo par convive — à ajuster avec eux)

- [ ] Prénom de « son complice » (section Chi siamo — elle : Tressy ; lui : à compléter)
- [ ] Valider le texte « Chi siamo » avec le couple

- [ ] Menu réel + prix (placeholders actuellement)
- [ ] Agenda hebdo réel (emplacements/horaires placeholders) - à mettre à jour à DEUX endroits dans `index.html` : la liste « Dove siamo » et l'objet JS `AGENDA_OGGI`/`RIPOSO_OGGI` (bandeau dynamique du jour)
- [ ] Photos en meilleure résolution (celles récupérées sont des miniatures Facebook)
- [ ] Nom de domaine
