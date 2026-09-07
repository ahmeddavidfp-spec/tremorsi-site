/**
 * Tre Mor Si - kit app.
 *
 * 1. Enregistre le service worker (voir /sw.js).
 * 2. Ajoute « Installer l'app » dans le menu, uniquement quand c'est possible :
 *    - Android et ordinateur : le navigateur previent par beforeinstallprompt,
 *      on garde l'evenement et on le rejoue au clic.
 *    - iPhone et iPad : Safari ne propose aucune API. On explique le geste
 *      (Partager, puis « Sur l'ecran d'accueil ») dans une fenetre dediee.
 *    - Deja installe : aucun bouton.
 *
 * Le bouton est cree par ce script et non ecrit dans les pages : sans JavaScript,
 * il n'y aurait rien derriere.
 */
(() => {
  'use strict';

  /* ---------- Service worker ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* navigation privee, http, etc. */ });
    });
  }

  /* ---------- Contexte d'installation ---------- */
  const ua = navigator.userAgent || '';
  const estIOS = /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1); // iPadOS se declare en Mac

  function dejaInstalle() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  let invite = null; // l'evenement beforeinstallprompt mis de cote

  /* ---------- Le bouton, glisse dans le menu ---------- */
  const menu = document.getElementById('mobnav');
  if (!menu) return;
  const nav = menu.querySelector('nav') || menu;

  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'mobnav-install';
  bouton.hidden = true;
  bouton.innerHTML = 'Installer l’app <span class="arr">→</span>';
  const cta = nav.querySelector('.mobnav-cta');
  if (cta) cta.insertAdjacentElement('afterend', bouton); else nav.appendChild(bouton);

  function montrer() { if (!dejaInstalle()) bouton.hidden = false; }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();      // on declenche nous-memes, au clic
    invite = e;
    montrer();
  });

  window.addEventListener('appinstalled', () => {
    bouton.hidden = true;
    invite = null;
  });

  if (estIOS) montrer(); // Safari ne previendra jamais : on affiche d'office

  /* ---------- La fenetre d'explication iOS ---------- */
  let fenetre = null;

  function construireFenetre() {
    const f = document.createElement('div');
    f.className = 'install-voile';
    f.hidden = true;
    f.innerHTML =
      '<div class="install-carte" role="dialog" aria-modal="true" aria-labelledby="install-titre">' +
        '<button class="install-fermer" type="button" aria-label="Fermer">×</button>' +
        '<p class="install-sur">Sur iPhone et iPad</p>' +
        '<h2 id="install-titre">Tre Mor Si, <i>sur votre écran d’accueil.</i></h2>' +
        '<p class="install-intro">Safari ne peut pas l’installer tout seul. Deux gestes suffisent&nbsp;:</p>' +
        '<ol class="install-pas">' +
          '<li><span>Appuyez sur <b>Partager</b> en bas de l’écran' +
            '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">' +
            '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
            'd="M12 15V3m0 0L8.5 6.5M12 3l3.5 3.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg></span></li>' +
          '<li><span>Choisissez <b>Sur l’écran d’accueil</b></span></li>' +
        '</ol>' +
        '<p class="install-note">Le site s’ouvrira alors en plein écran, sans barre de navigation, ' +
        'et la carte restera consultable même sans réseau.</p>' +
      '</div>';
    document.body.appendChild(f);

    const fermer = () => {
      f.hidden = true;
      document.body.style.overflow = '';
      bouton.focus();
    };
    f.querySelector('.install-fermer').addEventListener('click', fermer);
    f.addEventListener('click', (e) => { if (e.target === f) fermer(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !f.hidden) fermer(); });
    return f;
  }

  bouton.addEventListener('click', async () => {
    if (invite) {
      invite.prompt();
      const { outcome } = await invite.userChoice;
      invite = null;
      if (outcome === 'accepted') bouton.hidden = true;
      return;
    }
    if (!fenetre) fenetre = construireFenetre();
    fenetre.hidden = false;
    document.body.style.overflow = 'hidden';
    fenetre.querySelector('.install-fermer').focus();
  });
})();
