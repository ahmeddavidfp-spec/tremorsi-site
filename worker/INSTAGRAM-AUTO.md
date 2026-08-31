# Automatiser le mur Instagram à 100 %

Le cron tourne déjà chaque lundi à 4h. Il reste à lui donner un accès officiel :
Instagram a fermé toutes les voies non authentifiées (profil en rendu JavaScript,
API publiques désactivées, IP de datacenter bloquées).

**Le code est déjà en place** : dès que le secret `IG_TOKEN` existe, le worker
utilise l'API officielle Meta. Sans jeton, il garde le comportement actuel.

## À faire une fois, avec le client (~10 minutes)

### 1. Compte Instagram en mode professionnel (2 min, sur son téléphone)
Instagram → Paramètres → Type de compte → **Basculer vers un compte professionnel**
→ catégorie « Restaurant » ou « Food truck ». Gratuit, réversible, ne change rien
à l'apparence du compte.

### 2. Créer l'app Meta (5 min, sur ordinateur)
1. https://developers.facebook.com → **Mes applications** → Créer une application
2. Type : **Autre** → **Professionnel**
3. Dans l'app : ajouter le produit **Instagram** → *API avec connexion Instagram*
4. Onglet **Configuration de l'API** → section **Générer des jetons d'accès**
5. Connecter le compte @tre.mor.si → autoriser les permissions
   `instagram_business_basic`
6. Copier le **jeton d'accès de longue durée** (valable 60 jours)

### 3. Enregistrer le jeton dans le worker (1 min)
```bash
export PATH="$HOME/tools/node/bin:$PATH"
cd worker && npx wrangler secret put IG_TOKEN     # coller le jeton
```

### 4. Vérifier
Envoyer `/instagram` au bot : il doit répondre
« ✓ Mur Instagram rafraîchi automatiquement (6 publications) ».

## Ensuite

- Le cron du lundi récupère les 6 dernières publications **et prolonge le jeton**
  automatiquement (fonction `refreshIgToken`), donc aucune expiration à surveiller.
- Si le jeton devient invalide un jour, le bot le signale dans son message
  hebdomadaire et l'ajout manuel reste possible (coller un lien Instagram).
