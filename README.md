# Tre Mor Si - Food Truck Italiano 🇮🇹

Site vitrine du food truck italien **Tre Mor Si** (Fleurus, Charleroi & alentours).

- 🌐 Production : **https://tremorsi.com**
- 📦 Repo : https://github.com/ahmeddavidfp-spec/tremorsi-site
- 📱 Instagram : [@tre.mor.si](https://www.instagram.com/tre.mor.si/) · [Facebook](https://www.facebook.com/profile.php?id=61590317361492)

---

## 1. Le client

| | |
|---|---|
| Enseigne | Tre Mor Si (« TremorSi ») |
| Société | **COLOMBO TRESSY** - TVA **BE 1026.396.788** - créée le 01/10/2025 |
| Siège | Chaussée de Gilly 194/1b, 6220 Fleurus |
| Téléphone / WhatsApp | 0495 80 22 01 |
| Email pro | contact@tremorsi.com (routé, voir §6) |
| Spécialités | Pucce salentine, arrosticini d'Abruzzo, moules à la plancha, aperitivo, cannoli |
| Concept | Voyage culinaire du Nord au Sud de l'Italie, préparé à la minute |

---

## 2. Architecture des pages

| Fichier | Rôle |
|---|---|
| `index.html` | **Vitrine** : hero + Fiat 500, La storia, Il viaggio, teaser carte, galerie, quiz Carta d'Identità, cartolina, CTA final |
| `menu.html` | La carte complète (seul endroit où elle vit) |
| `privatisation.html` | Pitch privatisation + **Calcolatore di festa** + formulaire de devis |
| `contact.html` | Coordonnées, **agenda de la semaine** (`#semaine`), formulaire de contact, **avis Google** (`#avis`) |
| `reseaux.html` | Réseaux sociaux : cartes + murs Instagram/Facebook en iframes directes |
| `faq.html` | 14 questions fréquentes en accordéons + JSON-LD FAQPage |
| `dove-andiamo.html` | Vote des communes : les visiteurs réclament le camion chez eux |
| `passaporto.html` | Carte de fidélité : 5 régions à tamponner **avec le code du jour remis au camion**, dolce offert au tour complet |
| `blog/index.html` + 2 articles | La puccia salentine · Arrosticini des Abruzzes |
| `sitemap.xml`, `robots.txt` | SEO |
| `manifest.webmanifest` | PWA (ajout à l'écran d'accueil) |
| `assets/style.css` | **Feuille de style partagée par toutes les pages** |
| `worker/` | Worker Cloudflare : API agenda + bot Telegram (voir §7) |

**Navigation** - desktop : La carte · Privatiser · Blog · Contact · [Réserver], et au-delà de 1080 px aussi Réseaux · Passaporto · Dove andiamo ? · FAQ.
Mobile : burger en 2 groupes (**Il sito** / **Scopri**) + bouton Réserver tricolore.

Le menu complet fait ~770 px : il lui faut plus de 1000 px avec le logo. D'où **trois paliers** :

| Largeur | Barre du haut | Burger |
|---|---|---|
| < 720 px | Logo + Réserver | oui |
| 720 - 1079 px | + La carte · Privatiser · Blog · Contact (`.only-desktop`) | oui |
| ≥ 1080 px | + Réseaux · Passaporto · Dove andiamo ? · FAQ (`.only-large`) | non |

⚠️ Un lien ajouté au menu doit l'être dans les **trois** navigations (barre, burger, pied de page),
porter `class="only-desktop only-large"`, et être testé à 1079 et 730 px (`scrollWidth - innerWidth === 0`).

---

## 3. Identité visuelle

- **Typos** (Google Fonts) : `Instrument Serif` (titres, italiques rouges), `Instrument Sans` (texte), `Caveat` (manuscrit)
- **Palette** (tokens CSS dans `assets/style.css`) :
  | Token | Valeur | Usage |
  |---|---|---|
  | `--crema` | `#FFFDF7` | fond blanc chaud |
  | `--crema-2` | `#FFF3DC` | sections alternées |
  | `--carta` | `#FFFFFF` | cartes / formulaires |
  | `--ink` | `#1A1A16` | texte, traits |
  | `--verde` | `#234B33` | section menu, footer |
  | `--rosso` | `#C92E1F` | accent (italiques, points) |
  | `--limone` | `#E9B93B` | accents secondaires |
- **Direction** : lumière « golden hour » (dégradés ambrés dans le hero et La storia), jamais de beige plat
- **Règle typo** : pas de tirets cadratins (—), uniquement des tirets simples (-)

---

## 4. Fonctionnalités

| Fonction | Où | Détail |
|---|---|---|
| **Loader** | toutes pages | « Tre mor Sì » s'assemble, barre tricolore, sortie en auvent |
| **Insegna del giorno** | accueil | Bandeau dynamique : où est le camion aujourd'hui (lit l'API agenda) |
| **Fiat 500 musicale** | accueil | Tap → traverse l'écran + extrait `assets/musica.m4a` (26 s) |
| **Quiz Carta d'Identità** | accueil | 5 questions → carte d'identité 1080×1350 partageable (format Instagram) |
| **La Cartolina** | accueil | Carte postale personnalisée dessinée en canvas, partage natif |
| **Galerie lightbox** | accueil | Grille 3 colonnes façon Instagram + carrousel plein écran |
| **Calcolatore di festa** | privatisation | Curseur convives → stats live, pré-remplit le devis |
| **Formulaires** | privatisation, contact | Envoi serveur via FormSubmit (voir §6) + repli `mailto:` |
| **Agenda piloté par bot** | contact, accueil | Voir §7 |
| **Torna su / WhatsApp** | toutes pages | Boutons flottants |

---

## 5. Développement & déploiement

```bash
# Serveur local
python3 -m http.server 8765     # http://localhost:8765

# Déploiement : Render redéploie automatiquement à chaque push
git add -A && git commit -m "..." && git push
```

**Chaîne** : GitHub `tremorsi-site` → Render (static site, publish dir `.`) → Cloudflare DNS.

- Render : Custom Domains `tremorsi.com` + `www.tremorsi.com` (www redirige vers l'apex)
- Cloudflare DNS : `CNAME @` et `CNAME www` → `tremorsi.onrender.com`, **DNS only (nuage gris)**
  ⚠️ Passer en proxy orange casse la vérification Render tant que le certificat n'est pas émis
- Node (pour wrangler) : installé en portable → `export PATH="$HOME/tools/node/bin:$PATH"`

### ⚠️ Supprimer une page

La publication statique de Render est **incrémentale** : elle ajoute et écrase, mais ne retire jamais.
Un fichier effacé du dépôt continue d'être servi en 200 après le déploiement.

1. Retirer la page du dépôt, des 3 navigations, du `sitemap.xml` et de `llms.txt`
2. Dashboard Render → service `tremorsi` → **Manual Deploy** → **Clear build cache & deploy**
3. Vérifier : `curl -o /dev/null -w "%{http_code}" https://tremorsi.com/la-page.html` doit rendre **404**

Le `render.yaml` du dépôt **n'est pas lu** (service créé à la main, pas depuis un Blueprint - l'en-tête
`X-Frame-Options` qu'il déclare n'est jamais servi). Toute règle ajoutée dedans reste sans effet.

Les pages sont servies avec `s-maxage=300` : après un déploiement, ajouter `?cb=1` à l'URL pour tester
la vraie version et non le cache.

---

## 6. Email & formulaires

**Réception** - Cloudflare Email Routing (gratuit, zone tremorsi.com → E-mail → Email Routing) :
`contact@tremorsi.com` → `david@bems.be` (destination vérifiée). MX/SPF/DKIM posés et verrouillés par Cloudflare.
👉 *À faire :* ajouter/basculer vers la boîte de Tressy une fois son email de vérification cliqué.

**Envoi des formulaires** - **deux canaux en parallèle** (`Promise.allSettled`) :

1. [FormSubmit](https://formsubmit.co) en AJAX - la trace écrite. L'endpoint utilise le **jeton**
   `858b83dc2426a3819b7508c8cd8a0a98` (→ `contact@tremorsi.com`) plutôt que l'adresse en clair,
   pour ne pas l'exposer dans le code source des pages.
   Le tout premier envoi depuis un domaine déclenche un email d'activation à cliquer (une seule fois).
2. `POST https://agenda.tremorsi.com/contatto` - **notification Telegram immédiate** vers tous les
   identifiants de `ALLOWED_IDS`, avec un bouton *Répondre sur WhatsApp* si un numéro belge est détecté.

Si un seul canal passe, le visiteur voit quand même sa confirmation. Si les deux échouent, repli sur `mailto:`.

**Anti-spam de `/contatto`** : champ piège `societe` (hors écran, pas `display:none`), contrôle d'origine
(filtre à robots, `localhost` admis), 5 envois par IP et par heure + 40 au total (compteurs KV à TTL 1 h),
échappement HTML et longueurs plafonnées.

⚠️ Les `fetch` sont construits **dans** le `try` et `AbortSignal.timeout` est optionnel : sinon un Safari
antérieur à 16 casse le formulaire sans même laisser le repli `mailto:`.

---

## 7. Agenda dynamique + bot Telegram

Permet au client de gérer sa semaine **depuis Telegram**, sans toucher au code.

```
Tressy (Telegram) → bot @TreMorSiBot → Worker Cloudflare → KV
                                                    ↓
                     tremorsi.com lit https://agenda.tremorsi.com/agenda
```

- **Worker** : `worker/src/index.js`, déployé sur `agenda.tremorsi.com` (`npx wrangler deploy` depuis `worker/`)
- **Endpoints** : `GET /agenda` · `GET /instagram` (6 derniers posts) · `GET /votes` · `POST /vote` · `GET /passaporto?id=` · `POST /timbro` · `POST /contatto` · `POST /telegram` (webhook signé)
- **Stockage** : KV namespace `AGENDA` (clés `week`, `votes`, `pass:<id>`, `riscatto:<id>`, `c:<heure>:<ip>`)
- **Secrets** (via `npx wrangler secret put`) : `BOT_TOKEN`, `WEBHOOK_SECRET` (copie locale dans `worker/.webhook-secret`, non versionnée), `ALLOWED_IDS` (identifiants Telegram autorisés, séparés par des virgules)
- **Sécurité** : webhook validé par `secret_token`, seuls les identifiants de `ALLOWED_IDS` peuvent modifier
- **CORS** : le test `request.method === 'OPTIONS'` doit être la **première ligne** de `fetch()`, avant tout
  routage. Placé après, le préflight d'un `POST` JSON tombe dans le handler de route qui répond 405, et le
  navigateur bloque la requête avec une erreur CORS - ce qui avait cassé silencieusement tous les votes de
  `dove-andiamo.html`. Contrôle :
  ```bash
  curl -o /dev/null -w "%{http_code}\n" -X OPTIONS https://agenda.tremorsi.com/timbro \
    -H 'Origin: https://tremorsi.com' -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: content-type'
  ```
- **Repli** : si le Worker ne répond pas, le site affiche l'agenda par défaut codé en dur (aucune page cassée)

**Mur Instagram** : cron hebdomadaire (lundi 4h) ; si Instagram bloque (429), rappel Telegram et mise à jour manuelle par `/instagram <lien>`. Solution définitive : Meta Graph API.

**Usage client** : écrire au bot → boutons *Voir la semaine* / *Modifier un jour* → choisir le jour →
taper le lieu → taper les horaires → en ligne en quelques secondes. Bouton « Repos ce jour-là » pour un riposo.

**Ajouter une personne** : elle écrit au bot, il lui renvoie son identifiant Telegram, puis :
```bash
export PATH="$HOME/tools/node/bin:$PATH"
cd worker && npx wrangler secret put ALLOWED_IDS   # ex. 8451289747,<id de Tressy>
```

Détails complets dans [`worker/README.md`](worker/README.md).

---

## 7 bis. Passaporto : anti-abus

Un tampon ne peut **pas** être posé librement : le passeport serait complétable en trois clics.

```
Client au camion → demande le code du jour → le tape sur passaporto.html
                                                      ↓ POST /timbro
                                            Worker : code juste ? région libre ?
                                            pas déjà tamponné aujourd'hui ?
                                                      ↓ KV pass:<id>
                              5/5 → code de retrait à 6 caractères affiché
                                                      ↓
                       Tressy tape ce code dans le bot → ✅ valide, marqué utilisé
```

- **Code du jour** : 4 chiffres dérivés de `SHA-256(date + WEBHOOK_SECRET)`, donc **jamais stocké**
  et impossible à deviner. La veille reste acceptée (services de fin de soirée).
  Tressy le lit dans le bot : bouton **🔑 Code du jour (passeport)**.
- **Un tampon par jour et par passeport** → le tour d'Italie demande au minimum 5 visites réelles.
- **L'état vit côté serveur** (`pass:<id>` en KV) : vider le `localStorage` ne redonne pas de tampons,
  et le bouton « recommencer » a été remplacé par une explication.
- **Code de retrait** : `SHA-256(id + WEBHOOK_SECRET)` tronqué à 6 caractères. Tressy l'envoie au bot,
  qui répond valide / incomplet / déjà utilisé, puis écrit `riscatto:<id>` → **un seul dolce par passeport**.
- **Vie privée** : l'identifiant du passeport est un UUID anonyme généré par le navigateur.
  Aucun nom, aucun email, aucun cookie.

---

## 8. SEO

- Titre, méta-description, canonical et **un seul `h1`** par page ; tous les `alt` renseignés
- **JSON-LD** `FoodEstablishment` sur l'accueil (nom légal, TVA, adresse, téléphone, réseaux)
- `sitemap.xml` (7 URLs) + `robots.txt`
- **Google Search Console** : propriété `tremorsi.com` vérifiée (TXT DNS), sitemap soumis - « Opération effectuée », 7 pages découvertes
- Mentions légales (société, siège, TVA) en pied de chaque page - obligation légale belge
- **Signature Scribeo** en pied des 11 pages (`Site créé par Scribeo` → https://scribeo.be), plus
  un `creator` dans le JSON-LD de l'accueil. C'est un canal d'acquisition : chaque site livré
  renvoie vers l'offre. Lien suivi volontairement (pas de `nofollow`).

### Auditer

`audit_seo.py` interroge les pages **en ligne** : unicité des titres/descriptions/h1, longueurs,
hiérarchie des titres, images, maillage interne.

- Ajouter toute nouvelle page à la liste `PAGES` en tête du script, sinon elle n'est pas contrôlée
- Ajouter `?cb=1` aux URLs après un déploiement récent (cache CDN)
- Écrire titres et descriptions en **accents UTF-8 directs**, pas en entités `&eacute;` : sinon le
  comptage de caractères est faussé
- **Leçon** : une première version ne mesurait que la *longueur* des descriptions, jamais leur *contenu*.
  Deux pages générées depuis `contact.html` avaient hérité de sa description mot pour mot et l'audit
  annonçait « tout est en ordre ». Vérifier la qualité et l'unicité, pas la simple présence d'une balise.

---

## 9. Ressources annexes

- **QR codes brandés** : dégradé vert→jaune→rouge, modules arrondis, pastille « Sì » au centre,
  correction d'erreur **H** (30 %, ce qui permet la pastille centrale).
  - `outils/qr-avis-google.py` → **avis Google** (`https://g.page/r/CeF2pgK9rkCaEBM/review`).
    Produit `outils/sortie/qr-avis-google.png` (QR seul, fond transparent) et
    `outils/sortie/affiche-avis-google.png` (affichette A6, 300 dpi, prête à imprimer).
    Relancer avec `python3 outils/qr-avis-google.py`.
    Écrit aussi `assets/qr-avis-google.png` (620 px, aplati sur le fond crème et ramené à
    64 couleurs : le dégradé passait sinon de 30 Ko à 145 Ko), utilisé par le bloc `#avis` de la page contact.
  - Dépendances : `qrcode` + `Pillow`. Polices : Didot et Avenir Next (fournies avec macOS).

  ⚠️ **Toujours re-tester un QR après modification.** Aucun décodeur n'est installé en local ;
  la vérification se fait avec l'API `BarcodeDetector` du navigateur (Chrome), en décodant l'image
  à plusieurs tailles pour confirmer qu'elle reste lisible une fois imprimée petit.
- **Assets** : `assets/logo.png` (logo détouré), `assets/icons/` (favicon, apple-touch, PWA 192/512),
  photos du camion et des plats, `musica.m4a`.

---

## 10. À valider avec le client

- [ ] **Identifiant Telegram de Tressy** → l'ajouter à `ALLOWED_IDS`
- [ ] **Vérification email Cloudflare** de Tressy → basculer `contact@tremorsi.com` vers sa boîte
- [x] ~~**Activation FormSubmit**~~ - fait le 01/09/2026, testé depuis la production
- [ ] Prénom de son compagnon (section « Chi siamo » dit encore « son complice »)
- [ ] Leur vraie histoire : région d'Italie, comment l'aventure a commencé (→ enrichir Chi siamo + article de blog)
- [ ] Horaires réels de la semaine (à saisir directement via le bot)
- [ ] Ratios du Calcolatore di festa (actuellement 3 arrosticini / 1 puccia / 1,5 spritz / 1 cannolo par convive)
- [ ] **Valider la récompense du Passaporto** (un cannolo offert ? une boisson ?) - le site annonce « le dolce est offert »
- [ ] Lui montrer le bouton **🔑 Code du jour** du bot : c'est ce code qu'elle donne aux clients pour tamponner
- [ ] Prix de la carte (le site indique « affichés au camion »)
- [ ] **Droits de la musique** de la Fiat 500 (SABAM) - sinon remplacer par un morceau libre
- [ ] Photos en haute résolution supplémentaires
- [ ] Mettre `tremorsi.com` dans les bios Instagram et Facebook
