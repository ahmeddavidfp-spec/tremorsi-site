/**
 * Tre Mor Si - resolution des index de dossier, sans redirection.
 *
 * Cloudflare est regle sur html_handling = "none" : aucune reecriture d'URL.
 * C'est voulu, parce que le defaut redirige /menu.html vers /menu en 308, ce
 * qui ferait diverger chaque page de son propre canonical et obligerait le
 * service worker a recopier toutes les reponses redirigees.
 *
 * Revers de la medaille : « / » et « /blog/ » ne trouvent plus leur index.html.
 * Ces quelques lignes le font a la main, en servant le fichier directement
 * plutot qu'en renvoyant le navigateur ailleurs.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.endsWith('/')) {
      const cible = new URL(request.url);
      cible.pathname += 'index.html';
      const res = await env.ASSETS.fetch(new Request(cible, request));
      if (res.status !== 404) return res;
    }

    return env.ASSETS.fetch(request);
  },
};
