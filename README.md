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

## À valider avec le client

- [ ] Menu réel + prix (placeholders actuellement)
- [ ] Agenda hebdo réel (emplacements/horaires placeholders)
- [ ] Email de contact (`contact@tremorsi.be` supposé) + téléphone
- [ ] Vraies photos pour remplacer les tuiles polaroid emoji (section Instagram)
- [ ] Nom de domaine
