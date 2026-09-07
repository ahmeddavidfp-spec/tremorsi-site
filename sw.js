/**
 * Tre Mor Si - service worker.
 *
 * Strategies :
 *   - pages, CSS, JS, manifeste : RESEAU D'ABORD, pour que le site soit toujours a jour.
 *     Le cache ne sert que de filet quand le reseau tombe.
 *   - images : CACHE D'ABORD, elles ne changent pas et c'est ce qui coute le plus cher.
 *   - musique et video : JAMAIS interceptees. Les mettre en cache remplirait le telephone
 *     et casserait les requetes partielles (Range) dont l'audio a besoin.
 *   - polices Google : cache d'abord, elles sont versionnees donc immuables. C'est ce qui
 *     permet a la page hors ligne de garder sa typographie.
 *   - tout le reste en externe (API agenda, formulaires, Instagram, Facebook) : ignore.
 *     Une reponse d'agenda mise en cache afficherait un emplacement perime.
 *
 * A CHAQUE LIVRAISON : incrementer VERSION, sinon les anciens fichiers restent en cache.
 */

const VERSION = 'tremorsi-v1';
const CACHE = VERSION;
const HORS_LIGNE = '/hors-ligne.html';

// Le strict minimum pour qu'une page s'affiche sans reseau.
const PRECHARGE = [
  HORS_LIGNE,
  '/',
  '/assets/style.css',
  '/assets/app.js',
  '/assets/logo.png',
  '/assets/icons/icon-192.png',
  '/manifest.json',
];

const POLICES = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const SANS_CACHE = /\.(m4a|mp3|ogg|wav|mp4|webm|mov)$/i;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Un fichier absent ne doit pas faire echouer toute l'installation.
    await Promise.all(PRECHARGE.map((u) => cache.add(u).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

/**
 * Une reponse portant le drapeau « redirected » ne peut pas etre renvoyee pour une
 * navigation : le navigateur leve une erreur. On la recopie donc a plat.
 * Cas concret : un hebergeur qui reecrit /page.html en /page par une 308.
 */
async function aPlat(res) {
  if (!res || !res.redirected) return res;
  const corps = await res.blob();
  return new Response(corps, { status: res.status, statusText: res.statusText, headers: res.headers });
}

/**
 * Les ecritures en cache passent par e.waitUntil : sans ca le navigateur peut
 * arreter le service worker des la reponse rendue, et la mise en cache est perdue.
 */
async function reseauDabord(req, e) {
  const cache = await caches.open(CACHE);
  try {
    const res = await aPlat(await fetch(req));
    if (res && res.ok) e.waitUntil(cache.put(req, res.clone()));
    return res;
  } catch (err) {
    const garde = await cache.match(req);
    if (garde) return garde;
    if (req.mode === 'navigate') {
      const secours = await cache.match(HORS_LIGNE);
      if (secours) return secours;
    }
    throw err;
  }
}

async function cacheDabord(req, e) {
  const cache = await caches.open(CACHE);
  const garde = await cache.match(req);
  if (garde) return garde;
  const res = await aPlat(await fetch(req));
  if (res && res.ok) e.waitUntil(cache.put(req, res.clone()));
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const memeOrigine = url.origin === self.location.origin;

  if (!memeOrigine) {
    if (POLICES.includes(url.hostname)) e.respondWith(cacheDabord(req, e));
    return; // API agenda, formulaires, murs sociaux : on laisse passer sans toucher
  }

  if (SANS_CACHE.test(url.pathname)) return; // musique et video : jamais

  if (req.mode === 'navigate') { e.respondWith(reseauDabord(req, e)); return; }
  if (req.destination === 'image') { e.respondWith(cacheDabord(req, e)); return; }

  e.respondWith(reseauDabord(req, e));
});

// Permet a la page de forcer l'activation d'une nouvelle version sans attendre.
self.addEventListener('message', (e) => {
  if (e.data === 'passe-la-main') self.skipWaiting();
});
