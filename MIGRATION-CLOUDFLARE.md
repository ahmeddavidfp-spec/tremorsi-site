# Migration Render vers Cloudflare

## Etat au 2026-09-22

Le site est **deploye et verifie sur Cloudflare**, mais le domaine pointe encore
vers Render. Il reste une seule etape, cote DNS, qui demande un acces au tableau
de bord.

- Preproduction Cloudflare : https://tremorsi-site.mertens-david-1972.workers.dev
- Production actuelle : https://tremorsi.com (toujours servie par Render)

## Ce qui est fait

- `wrangler.toml` : site statique servi directement par Cloudflare, sans Worker
  applicatif. Inutile de reprendre le modele Hono de la Cantina, qui existait
  parce qu'elle avait une base de donnees et des pages generees.
- `.assetsignore` : la documentation, les notes, les outils, le dossier `worker`
  et les fichiers de configuration ne partent pas sur le CDN. Verifie : ils
  repondent 404 en preproduction.
- `src/index.js` : dix lignes qui resolvent les index de dossier.

### Pourquoi ces dix lignes de Worker

`html_handling` est regle sur `none`, donc **aucune reecriture d'URL** :
`/menu.html` reste `/menu.html`. Le reglage par defaut redirige `/menu.html`
vers `/menu` en 308, ce qui ferait diverger chaque page de son propre
`canonical` et obligerait le service worker a recopier toutes les reponses
redirigees avant de les mettre en cache.

Revers : avec `none`, `/` et `/blog/` ne trouvent plus leur `index.html` et
renvoyaient 404. Le Worker sert le fichier directement, sans redirection.

Verifie en preproduction : 14 pages en 200, zero redirection, types MIME
corrects. `manifest.json` est meme servi en `application/json`, alors que
Render le donnait en `binary/octet-stream`.

## L'etape qui reste

`wrangler deploy` echoue sur l'attachement du domaine, avec ce message :

    Hostname 'tremorsi.com' already has externally managed DNS records

C'est normal et sain : Cloudflare refuse d'ecraser des enregistrements
existants. Il faut les retirer d'abord.

**Dans le tableau de bord Cloudflare, zone `tremorsi.com`, onglet DNS :**

1. Supprimer les deux enregistrements **A** de `tremorsi.com`
   (216.24.57.18 et 216.24.57.16, ce sont les adresses de Render)
2. Supprimer le **CNAME** `www` qui pointe vers `tremorsi.onrender.com`
3. **Ne pas toucher** a `agenda`, qui appartient au Worker `tremorsi-agenda`
4. Puis relancer :

        export PATH="$HOME/tools/node/bin:$PATH"
        cd "Tre Mor Si" && npx wrangler deploy

Cloudflare recreera lui-meme les bons enregistrements et emettra le certificat.

**Coupure attendue :** quelques dizaines de secondes entre la suppression et le
redeploiement. A faire en dehors d'un service.

## Apres bascule

- Verifier : `curl -sI https://tremorsi.com | grep -i rndr-id` ne doit plus rien
  renvoyer. La presence de `rndr-id` signifie que Render sert encore.
- Eteindre le service `tremorsi` sur Render.
- Supprimer `render.yaml`, qui n'a plus d'objet.

## Pourquoi ce n'est pas moi qui ai fait le DNS

Le jeton OAuth de wrangler porte `zone:read`, mais ni `zone:write` ni
`dns_records:write`. Aucun jeton d'API Cloudflare n'existe par ailleurs sur
cette machine. La suppression d'enregistrements DNS demande donc une connexion
au tableau de bord.
