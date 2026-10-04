/* Race to Dutch First: "Nu live", the listed raiders streaming right now, in the hero.
 *
 * race.json's `streams` comes from DecAPI on every fetch run (twitch.py), so it is
 * as old as the data. Older than STALE_MIN and the block hides: better nothing
 * than "live" for someone who stopped an hour ago. Same rules as app.js:
 * textContent only, no innerHTML; links only to https://www.twitch.tv/<login>.
 *
 * The player is a click-to-load facade: until a visitor presses play, the page asks
 * Twitch for nothing but the preview still (static-cdn.jtvnw.net). Pressing play swaps
 * in Twitch's own embed (player.twitch.tv, `parent` = this host); the CSP allows exactly
 * those two hosts. The loaded player survives data refreshes and NL | EN redraws, so a
 * stream never restarts under the viewer.
 */
'use strict';

(() => {
  const STALE_MIN = 75;
  const TWITCH = /^https:\/\/www\.twitch\.tv\/([a-z0-9_]{3,25})$/;
  const tn = (key, n, vars) => i18n.tn(key, n, vars);
  let data = null;
  let featured = null;   // login shown in the player
  let playing = null;    // login whose embed is loaded, or null for the facade
  let frame = null;      // the persistent player box

  function clock(iso) {
    return new Date(iso).toLocaleTimeString(i18n.locale, { hour: '2-digit', minute: '2-digit' });
  }
  const login = ch => (TWITCH.exec(ch.url) || [])[1];

  function icon(kind) {
    const paths = {
      play: 'M8 5.5v13l10.5-6.5z',
      cast: 'M4 12a8 8 0 0 1 16 0M7.5 12a4.5 4.5 0 0 1 9 0M12 12v8',
      out: 'M14 5h5v5M19 5l-8 8M17 14v5H5V7h5',
    };
    const fill = kind === 'play';
    return s('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
      s('path', { d: paths[kind], fill: fill ? 'currentColor' : 'none', stroke: fill ? 'none' : 'currentColor',
        'stroke-width': 2.2, 'stroke-linecap': 'square', 'stroke-linejoin': 'miter' }));
  }

  /* The leader's guild first, then the most viewers: the stream most visitors came for. */
  function liveChannels() {
    const st = data && data.streams;
    const fresh = st && (Date.now() - Date.parse(st.checkedAt)) / 60000 <= STALE_MIN;
    if (!fresh) return [];
    const rank = name => (data.guilds.find(g => g.name === name) || { rank: 99 }).rank;
    return st.channels.filter(c => c.shown && login(c))
      .sort((a, b) => rank(a.guild) - rank(b.guild) || (b.viewers || 0) - (a.viewers || 0));
  }

  function meta(ch) {
    return [ch.startedAt ? tr('live.since', { time: clock(ch.startedAt) }) : null,
      Number.isInteger(ch.viewers) ? tn('live.viewers', ch.viewers) : null].filter(Boolean).join(' · ');
  }

  function facade(ch) {
    const name = login(ch);
    const still = h('img', { class: 'onair__still', alt: '', loading: 'lazy', decoding: 'async',
      src: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${name}-640x360.jpg?t=${Date.parse(data.streams.checkedAt)}` });
    still.addEventListener('error', () => still.remove());
    const btn = h('button', { type: 'button', class: 'onair__play', 'aria-label': tr('live.play', { name }) },
      still,
      h('span', { class: 'onair__btn' }, icon('play')),
      h('span', { class: 'onair__hint' }, h('b', { text: tr('live.play', { name }) }), h('span', { text: tr('live.play_note') })));
    btn.addEventListener('click', () => { playing = name; drawPlayer(ch, true); });
    return btn;
  }

  function embed(name) {
    const host = location.hostname;
    return h('iframe', {
      class: 'onair__frame', title: tr('live.frame', { name }),
      src: `https://player.twitch.tv/?channel=${name}&parent=${encodeURIComponent(host)}&autoplay=true&muted=false`,
      allow: 'autoplay; fullscreen; picture-in-picture', allowfullscreen: true,
      referrerpolicy: 'strict-origin-when-cross-origin',
    });
  }

  function drawPlayer(ch, focus) {
    const name = login(ch);
    // A file:// page has no host Twitch can check, so it gets the link only.
    if (playing === name && location.hostname) {
      if (!frame.querySelector(`iframe[data-ch="${name}"]`)) {
        const f = embed(name);
        f.dataset.ch = name;
        frame.replaceChildren(f);
        if (focus) f.focus();
      }
    } else {
      playing = null;
      frame.replaceChildren(facade(ch));
    }
  }

  function ribbon(ch) {
    const name = login(ch);
    const g = data.guilds.find(x => x.name === ch.guild);
    const on = name === featured;
    const btn = h('button', { type: 'button', class: 'onair__rib rib', 'aria-pressed': String(on),
      'aria-label': tr('live.pick', { name }) },
      h('span', { class: 'rib__bar' }, h('span', { class: 'rib__in' },
        h('span', { class: 'rib__acc' }, icon('cast')),
        h('span', { class: 'rib__val onair__name', text: name }),
        g ? h('span', { class: 'onair__guild', text: g.name }) : null,
        Number.isInteger(ch.viewers) ? h('span', { class: 'onair__viewers', text: num(ch.viewers) }) : null)));
    if (g) btn.style.setProperty('--acc', colour(g.colour));
    btn.addEventListener('click', () => {
      if (featured === name) return;
      featured = name;
      if (playing) playing = name; // already watching: switch the stream, stay in the player
      render();
    });
    return btn;
  }

  function render() {
    const box = $('#onAir');
    const live = liveChannels();
    if (!live.length) {
      box.hidden = true; box.replaceChildren(); frame = null; featured = playing = null;
      document.body.classList.remove('is-onair');
      return;
    }
    if (!live.some(c => login(c) === featured)) { featured = login(live[0]); playing = null; }
    const ch = live.find(c => login(c) === featured);
    if (!frame) frame = h('div', { class: 'onair__player' });
    drawPlayer(ch, false);

    box.replaceChildren(
      h('div', { class: 'onair__head' },
        h('span', { class: 'onair__tag' }, h('span', { class: 'live-dot', 'aria-hidden': 'true' }), tr('hero.live')),
        h('h2', { id: 'onAirHeading', class: 'onair__h', text: tr('live.h') }),
        h('span', { class: 'onair__count', text: tn('live.count', live.length) })),
      frame,
      h('div', { class: 'onair__meta' },
        ch.title ? h('p', { class: 'onair__title', text: ch.title }) : null,
        h('p', { class: 'onair__sub' },
          h('span', { class: 'onair__since', text: meta(ch) }),
          h('a', { class: 'onair__out', href: ch.url, rel: 'noopener' }, tr('live.open'), icon('out')))),
      live.length > 1 ? h('div', { class: 'onair__list' }, live.map(ribbon)) : null);
    box.hidden = false;
    document.body.classList.add('is-onair');
  }

  document.addEventListener('race:data', e => { data = e.detail; render(); });
  if (typeof race !== 'undefined' && race) { data = race; render(); }
  setInterval(() => { if (data) render(); }, 60 * 1000);
})();
