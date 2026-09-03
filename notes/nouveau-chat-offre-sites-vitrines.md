Session dédiée à la stratégie : industrialiser une offre de sites vitrines à bas coût.

# Qui

David Mertens, développeur web indépendant près de Charleroi (Belgique). Il veut monter une offre
récurrente de sites vitrines « à moindre coût » pour indépendants, et en faire une activité, pas
des coups ponctuels.

# Le prototype existant

`/Users/mertensdavid/Documents/Web & API/Tre Mor Si` → https://tremorsi.com

Site construit gratuitement en un week-end pour **Tre Mor Si**, food truck italien à Fleurus
(société COLOMBO TRESSY, TVA BE 1026.396.788), afin de gagner ce premier client et s'en servir de
vitrine. Un rendez-vous de présentation avec les gérants est imminent.

Ce qui tourne aujourd'hui, en production :

- **11 pages statiques** (HTML/CSS/JS, aucune étape de build), feuille de style partagée
- **Cloudflare Worker** `tremorsi-agenda` sur `agenda.tremorsi.com` + Workers KV + cron hebdomadaire
- **Bot Telegram** : la gérante gère son agenda de la semaine par messages et boutons, sans toucher
  au code. Aussi : code du jour du programme de fidélité, votes des communes, mur Instagram
- **Notification Telegram immédiate** à chaque formulaire envoyé (double canal avec l'email,
  anti-spam par champ piège + quotas)
- **Programme de fidélité anti-fraude** (« Passaporto ») : tampons validés côté serveur par un code
  du jour, un seul par jour, code de retrait vérifié par la gérante dans le bot
- **Calculateur de convives** pour les demandes de privatisation
- **Vote des communes** : les visiteurs réclament le camion chez eux
- **Boîte mail pro** via Cloudflare Email Routing, formulaires via FormSubmit
- **SEO complet** : 11/11 titres, descriptions et h1 uniques, JSON-LD, sitemap, Search Console
- **QR codes brandés** générés par script Python (site + avis Google + affichette A6 imprimable)

Chaîne technique : GitHub → Render (statique, publish dir `.`) → Cloudflare (DNS en « DNS only »,
Workers, KV, Email Routing). Documentation complète dans `README.md` et
`Documentation-Tre-Mor-Si.html`.

# Coût réel par client

Domaine ~10 €/an. Hébergement, Worker, KV, routage email, formulaires et bot : **0 €** dans les
paliers gratuits. Soit environ **1 €/mois de coût marginal**.

# Orientation déjà arrêtée dans la discussion précédente

À reprendre comme acquis, sans la re-dériver :

1. **Le tarif de moins de 10 €/mois consenti à Tre Mor Si est un ouvre-porte, pas un modèle.**
   40 clients à ce prix ne font que 400 €/mois pour le même travail. Piste évoquée : ~149 € de mise
   en ligne + 25 €/mois sans engagement, ce qui reste dix fois moins cher qu'une agence.
2. **Verticaliser sur les food trucks et la restauration itinérante en Hainaut**, pas une offre
   générique. Leur problème (changer d'emplacement chaque jour) est unique, le panier des
   privatisations est élevé, ils sont rassemblés par dizaines dans les festivals, et ils se
   recommandent entre eux.
3. **Le produit différenciant n'est pas le site, c'est le pilotage par Telegram.** Le client met son
   site à jour par message, sans tableau de bord ni logiciel à apprendre. Personne ne propose ça
   dans cette gamme de prix.
4. **Méthode d'acquisition : construire avant de démarcher.** Montrer au prospect son propre site
   déjà en ligne. Ça ne tient que si une maquette coûte 3 heures, pas un week-end.
5. **Écarté : la plateforme en libre-service.** Comptes, facturation, multi-locataire, support et
   500 clients nécessaires : mauvais format pour un indépendant qui démarre.

# Ce qui reste à faire

**Volet stratégique** — un plan de lancement chiffré sur six mois : offre et tarifs définitifs,
séquence technique, objectifs de prospection, hypothèses d'attrition et charge de support.

**Volet technique** — les trois chantiers qui font passer de un week-end à trois heures par client :

1. Extraire un **gabarit piloté par un `config.json`** (nom, couleurs, coordonnées, TVA, réseaux)
   + contenu éditorial en Markdown, avec un script qui génère les pages
2. Rendre le **Worker multi-clients** : il est mono-client aujourd'hui. Préfixer les clés KV par
   client (`tremorsi:week`, `client2:week`) et router selon l'identifiant Telegram de l'expéditeur,
   pour n'avoir qu'un seul bot et un seul Worker
3. Écrire le **mode opératoire de mise en route** : domaine, DNS, Render, routage email, bot,
   contenu, contrôle SEO

Commence par me demander par lequel des deux volets je veux attaquer, puis avance sur celui-là.
