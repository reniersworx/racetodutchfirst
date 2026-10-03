/* Race to Dutch First: "Nu live", the listed raiders streaming WoW right now.
 *
 * race.json's `streams` comes from DecAPI on every fetch run (twitch.py), so it is
 * as old as the data. Older than STALE_MIN and the strip hides: better nothing
 * than "live" for someone who stopped an hour ago. Same rules as app.js:
 * textContent only, no innerHTML; links only to https://www.twitch.tv/<login>.
 */
'use strict';

(() => {
  const STALE_MIN = 75;
  const TWITCH = /^https:\/\/www\.twitch\.tv\/[a-z0-9_]{3,25}$/;
  const tn = (key, n, vars) => i18n.tn(key, n, vars);
  let data = null;

  function clock(iso) {
    return new Date(iso).toLocaleTimeString(i18n.locale, { hour: '2-digit', minute: '2-digit' });
  }

  function card(ch) {
    const g = data.guilds.find(x => x.name === ch.guild);
    const meta = [ch.startedAt ? tr('live.since', { time: clock(ch.startedAt) }) : null,
      Number.isInteger(ch.viewers) ? tn('live.viewers', ch.viewers) : null].filter(Boolean).join(' · ');
    const a = h('a', { class: 'live-card', href: ch.url, rel: 'noopener' },
      h('span', { class: 'live-card__top' },
        h('span', { class: 'live-dot', 'aria-hidden': 'true' }),
        h('span', { class: 'live-card__name', text: ch.twitch }),
        g ? h('span', { class: 'live-card__guild', text: g.name }) : null),
      ch.title ? h('span', { class: 'live-card__title', text: ch.title }) : null,
      meta ? h('span', { class: 'live-card__meta', text: meta }) : null);
    return g ? setGuild(a, g) : a;
  }

  function render() {
    const box = $('#liveStrip');
    const s = data && data.streams;
    const fresh = s && (Date.now() - Date.parse(s.checkedAt)) / 60000 <= STALE_MIN;
    const live = fresh ? s.channels.filter(c => c.shown && TWITCH.test(c.url)) : [];
    if (!live.length) { box.hidden = true; box.replaceChildren(); return; }
    box.replaceChildren(
      h('p', { class: 'live-strip__label' }, h('span', { class: 'live-dot', 'aria-hidden': 'true' }), tr('live.h')),
      h('div', { class: 'live-strip__list' }, live.map(card)));
    box.hidden = false;
  }

  document.addEventListener('race:data', e => { data = e.detail; render(); });
  if (typeof race !== 'undefined' && race) { data = race; render(); }
  setInterval(() => { if (data) render(); }, 60 * 1000);
})();
