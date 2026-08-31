/**
 * Tre Mor Si - agenda dynamique + flux Instagram + bot Telegram
 * GET  /agenda    -> JSON de la semaine (lu par tremorsi.com)
 * GET  /instagram -> JSON des 6 derniers permaliens Instagram
 * POST /telegram  -> webhook du bot (Tressy modifie la semaine par messages)
 * CRON            -> rafraîchit le flux Instagram chaque lundi 4h
 *
 * Secrets attendus : BOT_TOKEN, WEBHOOK_SECRET, ALLOWED_IDS (ids Telegram séparés par des virgules)
 * KV : AGENDA (clés "week", "ig", "ig_checked" + états de conversation "state:<chatId>")
 */

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // affichage Lun -> Dim

const IG_USER = 'tre.mor.si';
// Filet de sécurité : posts connus au moment du déploiement.
const IG_FALLBACK = ['Dcsxtr7IAg4', 'Dcswx2IIEIJ', 'DcswNk2IZDh', 'Dcsv6R0IZ7a', 'Da_i2uSoYl1', 'Da_idALoMEy'];

const DEFAULT_WEEK = {
  0: { riposo: true },
  1: { riposo: true },
  2: { riposo: true },
  3: { lieu: 'Marché de Fleurus', heures: '11h30 - 14h30' },
  4: { lieu: "Zone d'entreprises - Charleroi", heures: '11h30 - 14h00' },
  5: { lieu: 'Place communale', heures: '17h00 - 21h00' },
  6: { lieu: "En événement - l'adresse est sur Instagram", heures: '' },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/agenda') return handleAgenda(env);
    if (url.pathname === '/instagram') return handleInstagram(env);
    if (url.pathname === '/telegram' && request.method === 'POST') return handleTelegram(request, env);
    return new Response('Tre Mor Si agenda', { status: 200 });
  },
  // Cron hebdomadaire : rafraîchit le flux Instagram, et prévient si ça échoue
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      const res = await refreshInstagram(env);
      if (env.IG_TOKEN) await refreshIgToken(env);
      const admin = (env.ALLOWED_IDS || '').split(',')[0].trim();
      if (!admin || !env.BOT_TOKEN) return;
      if (res.ok) {
        await tg(env, 'sendMessage', {
          chat_id: admin,
          text: `🔄 Mur Instagram rafraîchi automatiquement (${res.count} publications).`,
        });
      } else {
        await tg(env, 'sendMessage', {
          chat_id: admin,
          text: '📸 Rendez-vous hebdomadaire du mur Instagram\n\n' +
            'Le rafraîchissement automatique n’a pas abouti (Instagram limite les serveurs).\n' +
            'Les publications actuelles restent affichées - rien n’est cassé.\n\n' +
            'Pour mettre à jour : copiez le lien d’une publication Instagram et envoyez-moi\n' +
            '/instagram <lien>',
        });
      }
    })());
  },
};

/* ---------------- Instagram ---------------- */


function igListe(list) {
  return list.map((c, i) => `${i + 1}. https://www.instagram.com/p/${c}/`).join('\n');
}

async function getIg(env) {
  const raw = await env.AGENDA.get('ig');
  if (!raw) return IG_FALLBACK;
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.length ? list : IG_FALLBACK;
  } catch { return IG_FALLBACK; }
}

async function handleInstagram(env) {
  const posts = await getIg(env);
  const checked = await env.AGENDA.get('ig_checked');
  return new Response(JSON.stringify({ posts, checked }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

/**
 * Rafraîchit la liste des 6 derniers permaliens.
 *
 * 1. API officielle Meta si le secret IG_TOKEN est présent  -> 100 % automatique
 * 2. Sinon, tentative de lecture du profil public           -> souvent bloquée par Instagram
 * En cas d'échec, on ne touche à rien : les permaliens précédents restent servis.
 */
async function refreshInstagram(env) {
  if (env.IG_TOKEN) {
    const viaApi = await refreshViaGraphApi(env);
    if (viaApi.ok) return viaApi;
    // si l'API échoue (jeton expiré...), on tente quand même le profil public
  }
  return refreshViaScraping(env);
}

async function refreshViaGraphApi(env) {
  try {
    const url = `https://graph.instagram.com/me/media?fields=permalink,timestamp&limit=6&access_token=${env.IG_TOKEN}`;
    const r = await fetch(url);
    const j = await r.json();
    if (!r.ok || !j.data) throw new Error(j?.error?.message || 'réponse inattendue');
    const codes = j.data
      .map((m) => (m.permalink || '').match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/))
      .filter(Boolean)
      .map((m) => m[1]);
    if (!codes.length) throw new Error('aucune publication');
    await env.AGENDA.put('ig', JSON.stringify(codes.slice(0, 6)));
    await env.AGENDA.put('ig_checked', new Date().toISOString());
    await env.AGENDA.delete('ig_error');
    return { ok: true, count: codes.length, source: 'api' };
  } catch (e) {
    await env.AGENDA.put('ig_error', new Date().toISOString() + ' - API: ' + e.message);
    return { ok: false, error: 'API Meta: ' + e.message };
  }
}

async function refreshViaScraping(env) {
  try {
    const r = await fetch(`https://www.instagram.com/${IG_USER}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'fr-BE,fr;q=0.9',
      },
    });
    if (!r.ok) throw new Error('http ' + r.status);
    const html = await r.text();
    const codes = [];
    for (const re of [/"(?:shortcode|code)"\s*:\s*"([A-Za-z0-9_-]{8,20})"/g,
                      /instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]{8,20})\//g]) {
      let m;
      while ((m = re.exec(html)) && codes.length < 30) {
        if (!codes.includes(m[1])) codes.push(m[1]);
      }
      if (codes.length) break;
    }
    const six = codes.slice(0, 6);
    if (six.length < 3) throw new Error('publications non lisibles (rendu JavaScript)');
    await env.AGENDA.put('ig', JSON.stringify(six));
    await env.AGENDA.put('ig_checked', new Date().toISOString());
    return { ok: true, count: six.length, source: 'profil' };
  } catch (e) {
    await env.AGENDA.put('ig_error', new Date().toISOString() + ' - ' + e.message);
    return { ok: false, error: e.message };
  }
}

/** Prolonge le jeton Meta (valable 60 jours, renouvelable après 24 h). */
async function refreshIgToken(env) {
  if (!env.IG_TOKEN) return { ok: false, error: 'aucun jeton' };
  try {
    const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${env.IG_TOKEN}`);
    const j = await r.json();
    if (!r.ok || !j.access_token) throw new Error(j?.error?.message || 'échec');
    await env.AGENDA.put('ig_token_refreshed', new Date().toISOString());
    return { ok: true, expires_in: j.expires_in };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function getWeek(env) {
  const raw = await env.AGENDA.get('week');
  if (!raw) return DEFAULT_WEEK;
  try { return { ...DEFAULT_WEEK, ...JSON.parse(raw) }; } catch { return DEFAULT_WEEK; }
}

async function handleAgenda(env) {
  const week = await getWeek(env);
  return new Response(JSON.stringify({ week }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

/* ---------------- Telegram ---------------- */

async function tg(env, method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return r.json();
}

function weekText(week) {
  const lines = ['📅 La semaine Tre Mor Si :', ''];
  for (const d of DAY_ORDER) {
    const j = week[d] || { riposo: true };
    if (j.riposo) lines.push(`• ${DAYS[d]} : 😴 riposo`);
    else lines.push(`• ${DAYS[d]} : 📍 ${j.lieu}${j.heures ? ' · ' + j.heures : ''}`);
  }
  return lines.join('\n');
}

const MENU_KB = {
  inline_keyboard: [
    [{ text: '📅 Voir la semaine', callback_data: 'week' }],
    [{ text: '✏️ Modifier un jour', callback_data: 'edit' }],
    [{ text: '📸 Mur Instagram', callback_data: 'ig' }],
  ],
};

function daysKb() {
  const rows = [];
  for (let i = 0; i < DAY_ORDER.length; i += 2) {
    rows.push(DAY_ORDER.slice(i, i + 2).map((d) => ({ text: DAYS[d], callback_data: 'd:' + d })));
  }
  rows.push([{ text: '↩︎ Annuler', callback_data: 'menu' }]);
  return { inline_keyboard: rows };
}

async function handleTelegram(request, env) {
  if (request.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 });
  }
  const update = await request.json();
  const msg = update.message;
  const cb = update.callback_query;
  const chatId = msg?.chat?.id ?? cb?.message?.chat?.id;
  const fromId = String(msg?.from?.id ?? cb?.from?.id ?? '');
  if (!chatId) return new Response('ok');

  const allowed = (env.ALLOWED_IDS || '').split(',').map((s) => s.trim());
  if (!allowed.includes(fromId)) {
    await tg(env, 'sendMessage', {
      chat_id: chatId,
      text: `Ciao ! 🍢 Ce bot est réservé à l'équipe Tre Mor Si.\nTon identifiant Telegram : ${fromId}\n(Donne-le à David pour être ajouté.)`,
    });
    return new Response('ok');
  }

  const stateKey = 'state:' + chatId;

  if (cb) {
    await tg(env, 'answerCallbackQuery', { callback_query_id: cb.id });
    const data = cb.data || '';

    if (data === 'menu') {
      await env.AGENDA.delete(stateKey);
      await tg(env, 'sendMessage', { chat_id: chatId, text: 'Que veux-tu faire ?', reply_markup: MENU_KB });
    } else if (data === 'week') {
      await tg(env, 'sendMessage', { chat_id: chatId, text: weekText(await getWeek(env)), reply_markup: MENU_KB });
    } else if (data === 'ig') {
      const list = await getIg(env);
      await tg(env, 'sendMessage', {
        chat_id: chatId,
        text: '📸 Le mur de tremorsi.com/reseaux.html affiche :\n' + igListe(list) +
          '\n\nPour ajouter une publication : dans Instagram, appuyez sur Partager → Copier le lien,' +
          ' puis envoyez-le-moi ici précédé de /instagram',
        reply_markup: MENU_KB,
      });
    } else if (data === 'edit') {
      await tg(env, 'sendMessage', { chat_id: chatId, text: 'Quel jour veux-tu modifier ?', reply_markup: daysKb() });
    } else if (data.startsWith('d:')) {
      const day = data.slice(2);
      await env.AGENDA.put(stateKey, JSON.stringify({ step: 'lieu', day }), { expirationTtl: 600 });
      await tg(env, 'sendMessage', {
        chat_id: chatId,
        text: `📍 ${DAYS[day]} : envoie-moi le lieu (ex. « Marché de Fleurus »)`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '😴 Repos ce jour-là', callback_data: 'riposo:' + day }],
            [{ text: '↩︎ Annuler', callback_data: 'menu' }],
          ],
        },
      });
    } else if (data.startsWith('riposo:')) {
      const day = data.slice(7);
      const week = await getWeek(env);
      week[day] = { riposo: true };
      await env.AGENDA.put('week', JSON.stringify(week));
      await env.AGENDA.delete(stateKey);
      await tg(env, 'sendMessage', {
        chat_id: chatId,
        text: `✓ ${DAYS[day]} passé en riposo. C'est en ligne sur tremorsi.com !\n\n` + weekText(week),
        reply_markup: MENU_KB,
      });
    }
    return new Response('ok');
  }

  if (msg && typeof msg.text === 'string') {
    const text = msg.text.trim();
    const rawState = await env.AGENDA.get(stateKey);
    const state = rawState ? JSON.parse(rawState) : null;

    if (state?.step === 'lieu') {
      await env.AGENDA.put(stateKey, JSON.stringify({ step: 'heures', day: state.day, lieu: text }), { expirationTtl: 600 });
      await tg(env, 'sendMessage', {
        chat_id: chatId,
        text: `🕐 Et les horaires ? (ex. « 11h30 - 14h30 »)`,
        reply_markup: { inline_keyboard: [[{ text: '↩︎ Annuler', callback_data: 'menu' }]] },
      });
    } else if (state?.step === 'heures') {
      const week = await getWeek(env);
      week[state.day] = { lieu: state.lieu, heures: text };
      await env.AGENDA.put('week', JSON.stringify(week));
      await env.AGENDA.delete(stateKey);
      await tg(env, 'sendMessage', {
        chat_id: chatId,
        text: `✓ ${DAYS[state.day]} mis à jour. C'est en ligne sur tremorsi.com !\n\n` + weekText(week),
        reply_markup: MENU_KB,
      });
    } else if (/instagram\.com\/(p|reel)\//i.test(text) && !/^\/instagram/i.test(text)) {
      // Lien Instagram collé directement : on l'ajoute sans commande
      const m = text.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]{8,20})/i);
      if (m) {
        const list = await getIg(env);
        const next = [m[1], ...list.filter((c) => c !== m[1])].slice(0, 6);
        await env.AGENDA.put('ig', JSON.stringify(next));
        await env.AGENDA.put('ig_checked', new Date().toISOString());
        await tg(env, 'sendMessage', {
          chat_id: chatId,
          text: '✓ C\'est en ligne sur tremorsi.com/reseaux.html\n\nLe mur affiche maintenant :\n' + igListe(next),
          reply_markup: MENU_KB,
        });
      }
    } else if (/^\/instagram/i.test(text)) {
      // /instagram              -> force le rafraîchissement
      // /instagram <lien|code>  -> ajoute un post en tête, manuellement
      const arg = text.replace(/^\/instagram\s*/i, '').trim();
      if (arg) {
        const m = arg.match(/([A-Za-z0-9_-]{8,20})\/?$/);
        if (m) {
          const list = await getIg(env);
          const next = [m[1], ...list.filter((c) => c !== m[1])].slice(0, 6);
          await env.AGENDA.put('ig', JSON.stringify(next));
          await env.AGENDA.put('ig_checked', new Date().toISOString());
          await tg(env, 'sendMessage', {
            chat_id: chatId,
            text: '✓ C\'est en ligne sur tremorsi.com/reseaux.html\n\nLe mur affiche maintenant :\n' + igListe(next),
            reply_markup: MENU_KB,
          });
        } else {
          await tg(env, 'sendMessage', { chat_id: chatId, text: 'Lien non reconnu. Envoie l’adresse complète d’une publication Instagram.' });
        }
      } else {
        const res = await refreshInstagram(env);
      if (env.IG_TOKEN) await refreshIgToken(env);
        const list = await getIg(env);
        await tg(env, 'sendMessage', {
          chat_id: chatId,
          text: (res.ok
            ? `✓ Mur Instagram rafraîchi (${res.count} publications).`
            : 'ℹ️ Instagram n\'autorise pas la mise à jour automatique pour le moment.\nLe mur reste affiché tel quel - rien n\'est cassé.\n\nPour ajouter une publication : copiez son lien dans Instagram (Partager → Copier le lien) et envoyez-le-moi précédé de /instagram') +
            '\n\nActuellement en ligne :\n' + igListe(list),
          reply_markup: MENU_KB,
        });
      }
    } else {
      await tg(env, 'sendMessage', {
        chat_id: chatId,
        text: `Ciao ${msg.from.first_name || ''} ! 🍢 Je gère l'agenda et le mur Instagram de tremorsi.com.`,
        reply_markup: MENU_KB,
      });
    }
  }
  return new Response('ok');
}
