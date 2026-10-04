/* Race to Dutch First: loads data/race.json and draws the page.
 *
 * Everything is built with createElement / textContent: no innerHTML, so text
 * from Raider.IO can never become markup. Charts are inline SVG drawn here at
 * the container's real width and redrawn when it changes. No libraries.
 * Guild colours come from race.json (guilds.toml) and are checked to be #rrggbb
 * before they reach an attribute. UI text comes from i18n.js (Dutch by default,
 * English on request); game names are never translated.
 */
'use strict';

const DATA_URL = 'data/race.json';
const REFRESH_MS = 5 * 60 * 1000;
const STALE_MIN = 150; // the fetcher runs every 30 min on raid evenings, else every 2 h
const LIVE_MIN = 60;   // a pull or kill this close to the fetch = raiding now
const RECENT_H = 12;   // "raided at 21:57" for this long afterwards
const FEED_SIZE = 8;
const SVGNS = 'http://www.w3.org/2000/svg';
const tr = (key, vars) => i18n.t(key, vars);

let race = null;

/* ---- helpers ---------------------------------------------------------- */

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  setAttrs(el, attrs);
  el.append(...kids.flat().filter(k => k !== null && k !== undefined && k !== false));
  return el;
}

function s(tag, attrs, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  setAttrs(el, attrs);
  el.append(...kids.flat().filter(k => k !== null && k !== undefined && k !== false));
  return el;
}

function setAttrs(el, attrs) {
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
}

function svgTitle(text) { return s('title', { text }); }

const HEX = /^#[0-9a-f]{6}$/i;
function colour(c) { return HEX.test(c) ? c : '#818b98'; }
function setGuild(el, g) { el.style.setProperty('--guild', colour(g.colour)); return el; }

function num(n, digits = 0) { return i18n.num(n, digits); }
function pct(n) { return `${num(n, 2)}%`; }
function day(iso) { return new Date(iso).toLocaleDateString(i18n.locale, { day: 'numeric', month: 'short' }); }
function dayTime(iso) {
  return new Date(iso).toLocaleString(i18n.locale, {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });
}
function clock(iso) { return new Date(iso).toLocaleTimeString(i18n.locale, { hour: '2-digit', minute: '2-digit' }); }
function pulls(n) { return i18n.tn('pulls', n); }
function raiderioUrl(u) { return typeof u === 'string' && u.startsWith('https://raider.io/') ? u : null; }
function wclUrl(u) { return typeof u === 'string' && u.startsWith('https://www.warcraftlogs.com/') ? u : null; }

function leaderName(data) { return data.winner ? data.winner.guild : (data.guilds[0] || {}).name; }

/* What the track shows: a guild that killed the CE boss stands on the finish. */
function trackPosition(g, total) { return g.ceKilledAt ? total : Math.min(g.racePosition, total); }

/* Every Mythic kill of a guild, oldest first. */
function killsOf(g) {
  return g.bosses.filter(b => b.defeatedAt)
    .map(b => ({ at: Date.parse(b.defeatedAt), iso: b.defeatedAt, name: b.name, raid: b.raid, slug: b.slug, pullCount: b.pullCount }))
    .sort((a, b) => a.at - b.at);
}

/* Charts redraw at their container's width. */
const charts = new Map();
const resizer = typeof ResizeObserver === 'function'
  ? new ResizeObserver(entries => {
    for (const e of entries) {
      const c = charts.get(e.target);
      const w = Math.floor(e.contentRect.width);
      if (c && w > 0 && w !== c.width) { c.width = w; c.draw(w); }
    }
  })
  : null;

function chart(el, draw) {
  const c = { width: Math.floor(el.clientWidth) || 320, draw };
  charts.set(el, c);
  draw(c.width);
  if (resizer) resizer.observe(el);
}

function resetCharts() {
  if (resizer) resizer.disconnect();
  charts.clear();
}

/* ---- raiding now ------------------------------------------------------ */

/* A guild's latest sign of life: its last pull on the current boss or its
 * latest kill. Only the current boss has pulls in race.json, and a kill
 * ends a boss's pulls, so together they cover the evening. */
function lastActivity(g) {
  const pullsNow = g.current && Array.isArray(g.current.pulls) ? g.current.pulls : [];
  const times = [g.latestKillAt, pullsNow.length ? pullsNow[pullsNow.length - 1].at : null]
    .filter(Boolean).map(Date.parse).filter(Number.isFinite);
  return times.length ? Math.max(...times) : null;
}

/* 'live' only while the data is fresh too, so a stale race.json never claims
 * a raid that ended hours ago; then it fades to 'recent' ("raided at 21:57"). */
function liveState(g, data, now = Date.now()) {
  const last = lastActivity(g);
  if (last === null) return null;
  const fetched = Date.parse(data.generatedAt);
  if ((fetched - last) / 60000 <= LIVE_MIN && (now - fetched) / 60000 <= LIVE_MIN) return 'live';
  if ((now - last) / 3600000 <= RECENT_H) return 'recent';
  return null;
}

/* Badges are repainted every 30 s, without new data, so they fade on time. */
const liveBadges = [];

function liveBadge(g, cls) {
  const el = h('span', { class: cls, hidden: true });
  liveBadges.push({ el, g });
  paintLive({ el, g });
  return el;
}

function paintLive({ el, g }) {
  if (!race) return;
  const state = liveState(g, race);
  el.hidden = !state;
  el.classList.toggle('is-live', state === 'live');
  if (!state) { el.replaceChildren(); return; }
  const last = new Date(lastActivity(g)).toISOString();
  el.title = tr('live.title', { when: dayTime(last) });
  if (state === 'live') el.replaceChildren(h('span', { class: 'live-dot', 'aria-hidden': 'true' }), tr('live.now'));
  else el.replaceChildren(tr('live.recent', { time: clock(last) }));
}

/* ---- header + winner -------------------------------------------------- */

function renderHeader(data) {
  if (!$('#tierPills')) return;
  const tier = data.tier;
  const raids = tier.raids.map(r => `${r.name} ${r.bosses.length}`).join(' + ');
  $('#tierPills').replaceChildren(
    h('span', { class: 'pill', text: tr('pill.bosses', { n: tier.totalBosses }), title: raids }),
    h('span', { class: 'pill pill--jade', text: tr('pill.ce', { boss: tier.ceBoss.name }) }),
    h('span', { class: 'pill', text: tr('pill.since', { date: day(tier.start) }) }),
  );
}

function trophy(cls) {
  return s('svg', { class: cls, viewBox: '0 0 24 24', 'aria-hidden': 'true' },
    s('path', {
      d: 'M7 3h10v4a5 5 0 0 1-10 0V3ZM7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4M12 12v4M8 21h8M9 21l1-5h4l1 5',
      fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    }));
}

function renderWinner(data) {
  const box = $('#winnerBanner');
  if (!data.winner) { box.hidden = true; box.replaceChildren(); return; }
  const g = data.guilds.find(x => x.name === data.winner.guild);
  box.replaceChildren(
    trophy('winner__icon'),
    h('div', {},
      h('p', { class: 'winner__label', text: tr('winner.label') }),
      h('p', { class: 'winner__name', text: data.winner.guild }),
      h('p', {
        class: 'winner__text',
        text: tr('winner.text', { boss: data.tier.ceBoss.name, when: dayTime(data.winner.defeatedAt) }),
      })));
  if (g) setGuild(box, g);
  box.hidden = false;
}

/* ---- 1. Broadcast hero ------------------------------------------------------------- */

/* The splash: the leader's current boss as the backdrop (a cut-out of its full-body render,
 * via bossart.js from the overlay), the question as the title, and the board of overlay
 * ribbons. Nothing is drawn on the boss itself. */
function bossArtFor(name) {
  const art = window.BossArt;
  if (!art || !name) return [];
  const enc = art.byName[name.toLowerCase()];
  const list = (enc && art.byEncounter[enc]) || [];
  // Self-hosted cut-outs (scripts/boss-cutouts.py) of Blizzard's renders, keyed by display id.
  // A council fight (The Twin Fangs) has several bodies: show up to two.
  return list.map(x => /creature-display-(\d+)\.jpg$/.exec(x.img || ''))
    .filter(Boolean).slice(0, 2).map(m => `img/boss/creature-display-${m[1]}.png`);
}

// A boss head: a slanted tile with the top of the render (the face reads, a long body doesn't);
// a boss without art gets the same tile with its initial, so every head lines up.
function bossThumb(name, cls = 'boss-thumb') {
  const src = bossArtFor(name)[0];
  return h('span', { class: `boss-thumb ${cls}`, 'aria-hidden': 'true' },
    src ? h('img', { src, alt: '', loading: 'lazy' }) : h('span', { class: 'boss-thumb__mono', text: name.trim()[0] }));
}

// Race day: the tier start is day 1; once someone has CE the count stops on the winning day.
function renderRaceDay(data) {
  const el = $('#bugDay');
  const [y, m, d] = data.tier.start.split('-').map(Number);
  const end = data.winner ? new Date(data.winner.defeatedAt) : new Date();
  const n = Math.floor((new Date(end.getFullYear(), end.getMonth(), end.getDate()) - new Date(y, m - 1, d)) / 86400000) + 1;
  el.hidden = !(n >= 1);
  if (el.hidden) return;
  el.textContent = tr('hero.day', { n });
  el.title = tr('hero.dayTitle', { n, date: day(data.tier.start) });
}

function renderHero(data) {
  const total = data.tier.totalBosses;
  const lead = leaderName(data);
  const g = data.guilds.find(x => x.name === lead);
  // LIVE only while a guild is really raiding (same rule as the per-guild badges).
  $('#bugLive').hidden = !data.guilds.some(x => liveState(x, data) === 'live');
  renderRaceDay(data);
  const cur = g && g.current;
  const bossName = data.winner ? data.tier.ceBoss.name : cur ? cur.name : null;

  // The hero boss.
  const art = $('#heroArt');
  const srcs = bossArtFor(bossName);
  art.hidden = !srcs.length;
  art.classList.toggle('sp__art--pair', srcs.length > 1);
  art.classList.remove('sp__art--wide');
  // Once a render is in: --nat-h caps it at 2x its own size (some of Blizzard's renders are
  // tiny and turn to mush past that), and a lone wide boss gets the wide box.
  const imgs = srcs.map(src => h('img', { src, alt: '' }));
  for (const img of imgs) {
    img.addEventListener('load', () => {
      img.style.setProperty('--nat-h', `${img.naturalHeight}px`);
      if (imgs.length === 1 && img.naturalWidth > 2 * img.naturalHeight) art.classList.add('sp__art--wide');
    });
  }
  art.replaceChildren(...imgs);

  if (!g) { $('#lowerThirds').replaceChildren(); return; }

  // The board: each guild as an overlay ribbon, its kills, and a bar for how far it has
  // brought the boss it is on (best pull), labelled like a raid frame.
  $('#lowerThirds').replaceChildren(...data.guilds.map(x => {
    const isLead = x.name === lead;
    const c = x.current;
    const won = data.winner && data.winner.guild === x.name;
    const label = won ? tr('tile.ce')
      : !c ? tr('tile.done')
      : c.bestPercent === null ? `${c.name} · ${tr('tile.noPulls')}`
      : `${c.name} · ${tr('tile.best', { pct: pct(c.bestPercent), pulls: pulls(c.pullCount) })}`;
    const fill = h('i', {});
    fill.style.setProperty('--w', `${won ? 100 : c && c.bestPercent !== null ? 100 - c.bestPercent : 0}%`);
    const url = raiderioUrl(x.profileUrl);
    const rib = h('div', { class: 'rib' },
      h('div', { class: 'rib__bar' }, h('div', { class: 'rib__in' },
        h('span', { class: 'rib__acc mono', text: String(x.rank), 'aria-label': tr('tile.place', { n: x.rank }) }),
        url ? h('a', { class: 'rib__val', href: url, rel: 'noopener', text: x.name }) : h('span', { class: 'rib__val', text: x.name }))));
    rib.style.setProperty('--acc', colour(x.colour));
    return setGuild(h('li', { class: `row${isLead ? ' row--lead' : ''}` },
      rib,
      h('span', { class: 'row__kills mono' }, String(x.mythicKills), h('small', { text: `/${total}` })),
      h('div', { class: 'row__fight' },
        // The raiding badge sits on the label line, so it never squeezes the guild name.
        h('div', { class: 'row__top' }, h('span', { class: 'row__label', text: label }), liveBadge(x, 'row__live')),
        h('span', { class: 'row__hp', role: 'img', 'aria-label': label }, fill))), x);
  }));
}

/* ---- 3. Laatste kills ---------------------------------------------------------- */

function isFirstKill(data, k, g) {
  const raid = data.tier.raids.find(r => r.slug === k.raid);
  const boss = raid && raid.bosses.find(b => b.slug === k.slug);
  return !!(boss && boss.firstKill && boss.firstKill.guild === g.name);
}

function renderFeed(data) {
  const kills = data.guilds.flatMap(g => killsOf(g).map(k => ({ ...k, g })))
    .sort((a, b) => b.at - a.at)
    .slice(0, FEED_SIZE);
  const list = $('#killFeed');
  if (!kills.length) {
    list.replaceChildren(h('li', { class: 'tk tk--empty', text: tr('feed.empty') }));
    return;
  }
  // Ticker items: "Guild · boss · date", plus "first kill" for the race's first.
  const item = (k, copy) => h('li', { class: 'tk', 'aria-hidden': copy ? 'true' : null },
    h('b', { text: k.g.name }),
    ` · ${k.name} · `,
    h('time', { datetime: k.iso, title: dayTime(k.iso), text: day(k.iso) }),
    isFirstKill(data, k, k.g) ? ` · ${tr('tk.first')}` : '');
  // The band scrolls like a broadcast ticker: the list twice, moving by one list width.
  list.replaceChildren(...kills.map(k => item(k, false)), ...kills.map(k => item(k, true)));
}

/* ---- 4. Voortgang ------------------------------------------------------------ */

/* The chart starts in the week of the first Mythic kill, not at the tier start:
 * Mythic opens later, and those empty weeks squeezed the race into a corner.
 * Weeks run from the tier start, so ticks stay on the weekly reset. */
function timelineStart(data) {
  const tierStart = Date.parse(`${data.tier.start}T00:00:00Z`);
  const firsts = data.guilds.flatMap(g => killsOf(g).map(k => k.at));
  if (!firsts.length) return tierStart;
  const week = 7 * 86400000;
  const lead = Math.min(...firsts) - 2 * 86400000;
  return tierStart + Math.max(0, Math.floor((lead - tierStart) / week)) * week;
}

/* Raid nights: the local days on which any guild pulled or killed, from race.json itself
 * (guilds raid on different evenings), shaded as columns. */
function raidDays(data) {
  const key = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
  const days = new Set(data.guilds.flatMap(g => [
    ...killsOf(g).map(k => k.at),
    ...(g.current && Array.isArray(g.current.pulls) ? g.current.pulls.map(p => Date.parse(p.at)) : []),
  ]).filter(Number.isFinite).map(key));
  return t => days.has(key(t));
}
const STAR = 'M0,-7 L2,-2.2 7,-2 3.2,1.3 4.4,6.5 0,3.6 -4.4,6.5 -3.2,1.3 -7,-2 -2,-2.2Z';

function drawTimeline(el, data) {
  const total = data.tier.totalBosses;
  const start = timelineStart(data);
  const end = Math.max(Date.parse(data.generatedAt), start + 86400000);
  const lead = leaderName(data);
  // Leader drawn last, so it sits on top where lines overlap.
  const order = [...data.guilds].reverse();
  const isRaidDay = raidDays(data);

  chart(el, w => {
    // Wide: guild names at the line ends instead of a legend; narrow: only the count there
    // and the legend below (#timelineLegend shows on phones only).
    const narrow = w < 560;
    const H = narrow ? 280 : 380;
    const m = { l: narrow ? 36 : 46, r: narrow ? 42 : 210, t: 12, b: 26 };
    const x = tm => m.l + ((tm - start) / (end - start)) * (w - m.l - m.r);
    const y = k => m.t + (1 - k / total) * (H - m.t - m.b);
    const svg = s('svg', { width: w, height: H, viewBox: `0 0 ${w} ${H}`, role: 'img' });
    svg.append(svgTitle(data.guilds.map(g => tr('timeline.kills', { guild: g.name, n: g.mythicKills })).join(', ')));

    const night = new Date(start);
    night.setHours(0, 0, 0, 0);
    for (; night.getTime() < end; night.setDate(night.getDate() + 1)) {
      if (!isRaidDay(night.getTime() + 12 * 3600000)) continue;
      const a = x(Math.max(night.getTime(), start));
      const next = new Date(night);
      next.setDate(next.getDate() + 1);
      const b = x(Math.min(next.getTime(), end));
      if (b > a) svg.append(s('rect', { class: 'svg-night', x: a, y: m.t, width: b - a, height: H - m.t - m.b }));
    }
    for (let k = 0; k <= total; k++) {
      svg.append(s('line', { class: `svg-grid${k === total ? ' svg-grid--ce' : ''}`, x1: m.l, x2: x(end), y1: y(k), y2: y(k) }));
      if (k && (!narrow || k % 3 === 0 || k === total)) {
        svg.append(s('text', { class: 'svg-axis', x: m.l - 8, y: y(k) + 4, 'text-anchor': 'end', text: k === total ? 'CE' : `${k}/${total}` }));
      }
    }
    // A tick per weekly reset, labelled where there's room.
    const week = 7 * 86400000;
    const every = Math.max(1, Math.ceil(54 / (x(start + week) - x(start))));
    for (let tm = start, i = 0; tm <= end; tm += week, i++) {
      svg.append(s('line', { class: 'svg-grid', x1: x(tm), x2: x(tm), y1: H - m.b, y2: H - m.b + 4 }));
      if (i % every === 0) {
        svg.append(s('text', { class: 'svg-axis', x: x(tm), y: H - 8, 'text-anchor': 'middle', text: day(new Date(tm).toISOString()) }));
      }
    }

    const ends = [];
    order.forEach((g, i) => {
      const off = (i - (order.length - 1) / 2) * 2; // keep equal lines apart
      const kills = killsOf(g);
      let d = `M${x(start)},${y(0) + off}`;
      kills.forEach((k, n) => { d += ` H${x(k.at)} V${y(n + 1) + off}`; });
      d += ` H${x(end)}`;
      const line = s('path', { d, class: 'svg-step', 'stroke-width': g.name === lead ? 3 : 2.25 });
      line.style.setProperty('--guild', colour(g.colour));
      svg.append(line);
      kills.forEach((k, n) => {
        const title = svgTitle(tr('timeline.point', { guild: g.name, boss: k.name, date: day(k.iso), n: n + 1 }));
        if (isFirstKill(data, k, g)) {
          svg.append(s('path', { class: 'svg-star', d: STAR, transform: `translate(${x(k.at)},${y(n + 1) + off})` }, title));
        } else {
          const dot = s('circle', { class: 'svg-node', cx: x(k.at), cy: y(n + 1) + off, r: 4 }, title);
          dot.style.setProperty('--guild', colour(g.colour));
          svg.append(dot);
        }
      });
      ends.push({ g, y: y(kills.length) + off });
    });
    // Line-end labels, pushed apart where guilds share a count.
    const gap = narrow ? 15 : 19;
    ends.sort((a, b) => a.y - b.y);
    ends.forEach((e, i) => { if (i && e.y - ends[i - 1].y < gap) e.y = ends[i - 1].y + gap; });
    for (const e of ends) {
      const label = s('text', { class: 'svg-end', x: x(end) + 10, y: e.y + 5 },
        narrow ? '' : `${e.g.name} `,
        s('tspan', { class: 'svg-end__n', text: `${e.g.mythicKills}/${total}` }),
        svgTitle(tr('timeline.end', { guild: e.g.name, n: e.g.mythicKills })));
      label.style.setProperty('--guild', colour(e.g.colour));
      svg.append(label);
    }
    el.replaceChildren(svg);
  });
}

function renderTimeline(data) {
  drawTimeline($('#timeline'), data);
  $('#timelineLegend').replaceChildren(...data.guilds.map(g => setGuild(h('li', {},
    h('span', { class: 'swatch', 'aria-hidden': 'true' }),
    `${g.name}: ${g.mythicKills}/${data.tier.totalBosses}`), g)));

  const rows = data.guilds.map(g => h('tr', {},
    h('th', { scope: 'row', text: g.name }),
    h('td', { text: killsOf(g).map(k => `${k.name} (${day(k.iso)})`).join(', ') || tr('timeline.none') })));
  $('#timelineTable').replaceChildren(
    h('thead', {}, h('tr', {}, h('th', { scope: 'col', text: tr('timeline.thGuild') }), h('th', { scope: 'col', text: tr('timeline.thKills') }))),
    h('tbody', {}, rows));
}

/* ---- 5. Per guild ----------------------------------------------------------------- */

/* One row per guild: per boss its kill date (a gold star for the race's first kill) or
 * its best pull, then the pulls on its current boss. It replaces the per-boss table and
 * the current-boss cards; on phones the table scrolls with the guild column pinned. */
const PULL_BARS = 60;

function guildCell(g, raid, boss) {
  const b = g.bosses.find(x => x.raid === raid.slug && x.slug === boss.slug);
  const isCurrent = g.current && g.current.raid === raid.slug && g.current.slug === boss.slug;
  if (b && b.state === 'killed') {
    const isFirst = boss.firstKill && boss.firstKill.guild === g.name;
    return h('td', { class: `gs-cell gs-cell--kill${isFirst ? ' gs-cell--first' : ''}`, title: `${boss.name}: ${dayTime(b.defeatedAt)}` },
      h('span', { class: 'gs-cell__main', text: day(b.defeatedAt) }),
      h('span', { class: 'gs-cell__sub', text: b.pullCount ? pulls(b.pullCount) : tr('boss.unknownPulls') }),
      isFirst ? h('span', { class: 'visually-hidden', text: tr('boss.first') }) : null);
  }
  if (b && b.state === 'progress' && b.bestPercent !== null) {
    const fill = h('i', {});
    fill.style.setProperty('--w', `${100 - b.bestPercent}%`);
    return setGuild(h('td', { class: `gs-cell gs-cell--prog${isCurrent ? ' gs-cell--current' : ''}`, title: boss.name },
      h('span', { class: 'gs-cell__main', text: pct(b.bestPercent) }),
      h('span', { class: 'gs-meter', role: 'img', 'aria-label': tr('boss.bestAria', { pct: pct(b.bestPercent) }) }, fill),
      h('span', { class: 'gs-cell__sub', text: pulls(b.pullCount) })), g);
  }
  return setGuild(h('td', { class: `gs-cell gs-cell--none${isCurrent ? ' gs-cell--current' : ''}`, title: boss.name },
    isCurrent ? h('span', { class: 'gs-cell__sub', text: tr('boss.next') }) : h('span', { class: 'visually-hidden', text: tr('boss.untried') })), g);
}

/* The pulls on a guild's current boss as bars (higher = more of the boss down), the
 * best one in the guild colour, with a link to where the pulls come from. */
function pullStrip(data, g) {
  const cur = g.current;
  if (!cur) {
    return h('td', { class: 'gs-pulls' }, h('span', { class: 'gs-pulls__cap', text: data.winner && data.winner.guild === g.name ? tr('tile.ce') : tr('tile.done') }));
  }
  const fromLogs = cur.pullSource === 'warcraftlogs';
  const url = fromLogs ? wclUrl(g.wclUrl) : raiderioUrl(g.profileUrl);
  const src = url ? h('a', { class: 'gs-pulls__src', href: url, rel: 'noopener', text: fromLogs ? 'warcraftlogs' : 'raider.io' }) : null;
  const all = (cur.pulls || []).filter(p => p.percent !== null);
  if (cur.bestPercent === null || !all.length) {
    return h('td', { class: 'gs-pulls' }, h('span', { class: 'gs-pulls__cap' }, `${cur.name} · ${tr('tile.noPulls')}`, srcTag(src)));
  }
  const skip = Math.max(0, all.length - PULL_BARS);
  const best = Math.min(...all.map(p => p.percent));
  const bars = all.slice(skip).map((p, i) => {
    const bar = h('i', { class: p.percent === best ? 'is-best' : null, title: tr('curve.pullTitle', { n: skip + i + 1, date: day(p.at), pct: pct(p.percent) }) });
    bar.style.setProperty('--h', `${Math.max(4, 100 - p.percent)}%`);
    return bar;
  });
  return setGuild(h('td', { class: 'gs-pulls' },
    h('span', { class: 'gs-bars', role: 'img', 'aria-label': tr('curve.title', { guild: g.name, boss: cur.name, n: cur.pullCount, pct: pct(cur.bestPercent) }) }, ...bars),
    h('span', { class: 'gs-pulls__cap' }, `${cur.name} · ${pulls(cur.pullCount)} · `,
      h('span', { class: 'gs-pulls__best', text: tr('guild.best', { pct: pct(cur.bestPercent) }) }), srcTag(src))), g);
}

/* " · raider.io" kept in one piece, so the link never wraps onto a line of its own. */
function srcTag(src) { return src ? h('span', { class: 'gs-pulls__src-wrap' }, ' · ', src) : null; }

function renderGuildSheets(data) {
  const lead = leaderName(data);
  const cols = data.tier.raids.flatMap((raid, ri) => raid.bosses.map((boss, bi) => ({ raid, boss, sep: ri > 0 && bi === 0 })));
  const head = h('tr', {},
    h('th', { scope: 'col', class: 'gs-corner' }, h('span', { class: 'visually-hidden', text: tr('guild.th') })),
    ...cols.map(({ raid, boss, sep }) => {
      const isCe = raid.slug === data.tier.ceBoss.raid && boss.slug === data.tier.ceBoss.slug;
      return h('th', { scope: 'col', class: `gs-boss${sep ? ' gs-sep' : ''}`, title: `${boss.name} · ${raid.name}` },
        bossThumb(boss.name), h('span', { class: 'gs-boss__label' }, h('span', { class: 'gs-boss__name', text: boss.name }), isCe ? h('span', { class: 'ce-tag', text: 'CE' }) : null));
    }),
    h('th', { scope: 'col', class: 'gs-pulls-h', text: tr('guild.thPulls') }));
  const rows = data.guilds.map(g => {
    const url = raiderioUrl(g.profileUrl);
    const row = h('tr', { class: g.name === lead ? 'gs-row gs-row--lead' : 'gs-row' },
      h('th', { scope: 'row', class: 'gs-who' }, h('div', { class: 'gs-who__in' },
        h('span', { class: 'gs-who__rank', text: String(g.rank), 'aria-label': tr('tile.place', { n: g.rank }) }),
        h('span', { class: 'gs-who__name' }, url ? h('a', { href: url, rel: 'noopener', text: g.name }) : g.name, liveBadge(g, 'row__live')),
        h('span', { class: 'gs-who__k' }, String(g.mythicKills), h('small', { text: `/${data.tier.totalBosses}` })))),
      ...cols.map(({ raid, boss, sep }) => {
        const td = guildCell(g, raid, boss);
        if (sep) td.classList.add('gs-sep');
        return td;
      }),
      pullStrip(data, g));
    return setGuild(row, g);
  });
  $('#guildSheets').replaceChildren(h('thead', {}, head), h('tbody', {}, rows));
}

/* ---- footer ------------------------------------------------------------------------------ */

function renderUpdated() {
  if (!race) return;
  const el = $('#updated');
  const min = Math.max(0, Math.round((Date.now() - Date.parse(race.generatedAt)) / 60000));
  let when;
  if (min < 1) when = tr('upd.now');
  else if (min < 60) when = i18n.tn('upd.min', min);
  else if (min < 48 * 60) when = i18n.tn('upd.hour', Math.round(min / 60));
  else when = i18n.tn('upd.day', Math.round(min / 1440));
  el.replaceChildren(h('span', { class: 'upd__pre', text: tr('upd.pre') }), ' ', when);
  el.title = dayTime(race.generatedAt);
  const late = min > STALE_MIN;
  el.classList.toggle('updated--late', late);
  if (late) el.append(tr('upd.late'));
  liveBadges.forEach(paintLive);
}

/* ---- load ------------------------------------------------------------------------------------- */

function $(sel) { return document.querySelector(sel); }

function showError(msg) {
  const box = $('#globalError');
  box.textContent = msg;
  box.hidden = !msg;
}

function render(data) {
  resetCharts();
  liveBadges.length = 0;
  renderHeader(data);
  renderWinner(data);
  renderHero(data);
  renderFeed(data);
  renderTimeline(data);
  renderGuildSheets(data);
  $('#wclNote').textContent = data.sources && data.sources.warcraftlogs ? tr('wcl.on') : tr('wcl.off');
  renderUpdated();
  // Other scripts draw their own sections from the same data (halloffame.js).
  document.dispatchEvent(new CustomEvent('race:data', { detail: data }));
}

let loadError = null;

async function load() {
  try {
    const resp = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data || !Array.isArray(data.guilds) || !data.tier) throw new Error(tr('err.content'));
    const fresh = !race || race.generatedAt !== data.generatedAt;
    race = data;
    loadError = null;
    showError('');
    if (fresh) render(data);
  } catch (err) {
    if (!race) {
      loadError = err.message;
      showLoadError();
    }
  }
}

function showLoadError() {
  showError(tr('err.load', { msg: loadError }));
  $('#updated').textContent = tr('upd.none');
}

/* NL | EN: redraw everything in the other language, no reload. */
function setupLangSwitch() {
  for (const b of document.querySelectorAll('.lang-switch [data-lang]')) {
    b.addEventListener('click', () => {
      if (!i18n.set(b.dataset.lang)) return;
      if (race) render(race);
      else if (loadError) showLoadError();
    });
  }
}

i18n.applyStatic();
setupLangSwitch();
load();
setInterval(load, REFRESH_MS);
setInterval(renderUpdated, 30 * 1000);
