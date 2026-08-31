# Worker agenda + bot Telegram - Tre Mor Si

Gère la semaine type de tremorsi.com. Tressy modifie l'agenda par messages Telegram,
le site l'affiche en direct (bandeau du jour + page contact).

- API publique : `https://agenda.tremorsi.com/agenda` (JSON, lu par le site)
- Webhook bot : `https://agenda.tremorsi.com/telegram`
- Stockage : Cloudflare KV (namespace AGENDA)

## Mise en service du bot (une seule fois)

1. Dans Telegram, écrire à **@BotFather** -> `/newbot` -> nom `Tre Mor Si` -> pseudo `TreMorSiBot`
   (ou autre disponible). BotFather renvoie un **token**.
2. Enregistrer le token :
   ```bash
   export PATH="$HOME/tools/node/bin:$PATH"
   cd "worker" && npx wrangler secret put BOT_TOKEN     # coller le token
   ```
3. Brancher le webhook (le secret est dans `.webhook-secret`) :
   ```bash
   TOKEN="<token BotFather>"
   SECRET=$(cat .webhook-secret)
   curl -s "https://api.telegram.org/bot$TOKEN/setWebhook" \
     -d "url=https://agenda.tremorsi.com/telegram" \
     -d "secret_token=$SECRET"
   ```
4. Écrire n'importe quoi au bot : il répond avec l'identifiant Telegram.
   Ajouter les identifiants autorisés (David, Tressy) :
   ```bash
   npx wrangler secret put ALLOWED_IDS       # ex. 123456789,987654321
   ```

## Utilisation (côté Tressy)

Elle écrit au bot -> boutons : **Voir la semaine** / **Modifier un jour**
-> choisit le jour -> tape le lieu -> tape les horaires -> c'est en ligne.
Bouton « Repos ce jour-là » pour un riposo.

## Déployer une modification du worker

```bash
export PATH="$HOME/tools/node/bin:$PATH"
cd worker && npx wrangler deploy
```

## Mur Instagram

- API : `GET https://agenda.tremorsi.com/instagram` -> `{ posts: [...6 codes], checked }`
- Cron : chaque lundi 4h UTC, le worker tente de relire le profil public.
  Instagram renvoie souvent **429** aux IP de datacenter : dans ce cas rien ne change
  (les publications précédentes restent affichées) et le bot envoie un rappel Telegram.
- Mise à jour manuelle (5 secondes, fiable) : envoyer au bot
  `/instagram https://www.instagram.com/p/XXXXXXXX/`
  La publication passe en tête, la 6e la plus ancienne sort.
- `/instagram` seul force une tentative de rafraîchissement automatique.

**Solution définitive** (à faire avec le client) : Meta Graph API - nécessite le compte
Instagram en mode Business/Creator lié à la Page Facebook, puis une app Meta.
Gratuit, officiel, 100 % automatique.
