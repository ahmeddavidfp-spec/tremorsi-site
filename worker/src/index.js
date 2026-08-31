/**
 * Tre Mor Si - agenda dynamique + bot Telegram
 * GET  /agenda    -> JSON de la semaine (lu par tremorsi.com)
 * POST /telegram  -> webhook du bot (Tressy modifie la semaine par messages)
 *
 * Secrets attendus : BOT_TOKEN, WEBHOOK_SECRET, ALLOWED_IDS (ids Telegram séparés par des virgules)
 * KV : AGENDA (clé "week" + états de conversation "state:<chatId>")
 */

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // affichage Lun -> Dim

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
    if (url.pathname === '/telegram' && request.method === 'POST') return handleTelegram(request, env);
    return new Response('Tre Mor Si agenda', { status: 200 });
  },
};

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
    } else {
      await tg(env, 'sendMessage', {
        chat_id: chatId,
        text: `Ciao ${msg.from.first_name || ''} ! 🍢 Je gère l'agenda de tremorsi.com.`,
        reply_markup: MENU_KB,
      });
    }
  }
  return new Response('ok');
}
