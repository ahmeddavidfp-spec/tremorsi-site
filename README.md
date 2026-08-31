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
| `contact.html` | Coordonnées, **agenda de la semaine** (`#semaine`), formulaire de contact |
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

---

## 6. Email & formulaires

**Réception** - Cloudflare Email Routing (gratuit, zone tremorsi.com → E-mail → Email Routing) :
`contact@tremorsi.com` → `david@bems.be` (destination vérifiée). MX/SPF/DKIM posés et verrouillés par Cloudflare.
👉 *À faire :* ajouter/basculer vers la boîte de Tressy une fois son email de vérification cliqué.

**Envoi des formulaires** - [FormSubmit](https://formsubmit.co) en AJAX vers `contact@tremorsi.com`,
sans compte ni backend. Le tout premier envoi déclenche un email d'activation à cliquer (une seule fois).
Si l'envoi échoue, repli automatique sur `mailto:`.

---

## 7. Agenda dynamique + bot Telegram

Permet au client de gérer sa semaine **depuis Telegram**, sans toucher au code.

```
Tressy (Telegram) → bot @TreMorSiBot → Worker Cloudflare → KV
                                                    ↓
                     tremorsi.com lit https://agenda.tremorsi.com/agenda
```

- **Worker** : `worker/src/index.js`, déployé sur `agenda.tremorsi.com` (`npx wrangler deploy` depuis `worker/`)
- **Endpoints** : `GET /agenda` · `GET /instagram` (6 derniers posts) · `GET /votes` · `POST /vote` · `GET /passaporto?id=` · `POST /timbro` · `POST /telegram` (webhook signé)
- **Stockage** : KV namespace `AGENDA` (clés `week`, `votes`, `pass:<id>`, `riscatto:<id>`)
- **Secrets** (via `npx wrangler secret put`) : `BOT_TOKEN`, `WEBHOOK_SECRET` (copie locale dans `worker/.webhook-secret`, non versionnée), `ALLOWED_IDS` (identifiants Telegram autorisés, séparés par des virgules)
- **Sécurité** : webhook validé par `secret_token`, seuls les identifiants de `ALLOWED_IDS` peuvent modifier
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

---

## 9. Ressources annexes

- **QR code brandé** : dégradé vert→rouge, modules arrondis, logo « Sì » au centre, correction d'erreur maximale.
  Généré par script Python (`qrcode` + `Pillow`) - version simple + affichette prête à imprimer.
- **Assets** : `assets/logo.png` (logo détouré), `assets/icons/` (favicon, apple-touch, PWA 192/512),
  photos du camion et des plats, `musica.m4a`.

---

## 10. À valider avec le client

- [ ] **Identifiant Telegram de Tressy** → l'ajouter à `ALLOWED_IDS`
- [ ] **Vérification email Cloudflare** de Tressy → basculer `contact@tremorsi.com` vers sa boîte
- [ ] **Activation FormSubmit** (clic sur l'email reçu au premier envoi)
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
