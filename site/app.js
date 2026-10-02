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
const NIGHT_GAP_H = 6; // pulls further apart than this are a new raid night
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

function ribbon({ acc, accText, value, extra, caps, cls }) {
  const rib = h('div', { class: `rib rib--sm ${cls || ''}` },
    caps && caps.length ? h('div', { class: 'rib__caps' }, caps) : null,
    h('div', { class: 'rib__bar' },
      h('div', { class: 'rib__in' },
        h('span', { class: 'rib__acc mono', text: accText }),
        h('span', { class: 'rib__val', text: value }),
        extra || null)));
  if (acc) rib.style.setProperty('--acc', acc);
  return rib;
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
  const tier = data.tier;
  const raids = tier.raids.map(r => `${r.name} ${r.bosses.length}`).join(' + ');
  $('#tierPills').replaceChildren(
    h('span', { class: 'pill', text: tr('pill.bosses', { n: tier.totalBosses }), title: raids }),
    h('span', { class: 'pill pill--gold', text: tr('pill.ce', { boss: tier.ceBoss.name }) }),
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

/* ---- 1. De race --------------------------------------------------------- */

function trackScale(width, total) {
  const left = 10, right = 16;
  return v => left + (v / total) * (width - left - right);
}

function drawAxis(el, total, ceName) {
  chart(el, w => {
    const x = trackScale(w, total);
    const svg = s('svg', { width: w, height: 22, viewBox: `0 0 ${w} 22`, 'aria-hidden': 'true' });
    for (let i = 0; i <= total; i++) {
      svg.append(s('text', {
        x: x(i), y: 15, 'text-anchor': 'middle',
        class: i === total ? 'svg-finish-label' : 'svg-axis', text: i === total ? 'CE' : String(i),
      }));
    }
    svg.append(svgTitle(tr('axis.finish', { boss: ceName })));
    el.replaceChildren(svg);
  });
}

function drawLane(el, g, total, lead) {
  chart(el, w => {
    const x = trackScale(w, total);
    const pos = trackPosition(g, total);
    const H = 36, y = 14, th = 8;
    const svg = s('svg', { width: w, height: H, viewBox: `0 0 ${w} ${H}`, role: 'img' });
    const cur = g.current;
    const about = cur && cur.bestPercent !== null
      ? tr('lane.progress', { n: g.mythicKills, gone: pct(100 - cur.bestPercent), boss: cur.name })
      : tr('lane.kills', { n: g.mythicKills });
    svg.append(svgTitle(tr('lane.title', { guild: g.name, about, pos: num(g.racePosition, 2), total })));
    svg.append(s('rect', { class: 'svg-track', x: x(0), y, width: x(total) - x(0), height: th }));
    svg.append(s('rect', {
      x: x(0), y, width: Math.max(0, x(pos) - x(0)), height: th,
      fill: colour(g.colour), 'fill-opacity': lead ? '.75' : '.45',
    }));
    for (let i = 1; i < total; i++) {
      svg.append(s('line', { class: 'svg-tick', x1: x(i), x2: x(i), y1: y - 4, y2: y + th + 4 }));
    }
    // Finish line: a two-column chequered strip at the CE boss.
    const fx = x(total);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 2; col++) {
        svg.append(s('rect', {
          x: fx - 4 + col * 4, y: 2 + row * 4, width: 4, height: 4,
          class: (row + col) % 2 ? 'svg-chk-dark' : 'svg-chk-light',
        }));
      }
    }
    svg.append(s('circle', {
      cx: x(pos), cy: y + th / 2, r: lead ? 9 : 7.5,
      fill: colour(g.colour), class: lead ? 'svg-marker svg-marker--lead' : 'svg-marker',
    }));
    el.replaceChildren(svg);
  });
}

function renderRace(data) {
  const root = $('#raceTrack');
  const total = data.tier.totalBosses;
  const lead = leaderName(data);
  const axisTrack = h('div', { class: 'lane__track' });
  root.replaceChildren(h('div', { class: 'lane lane--axis' }, h('div', { class: 'lane__label' }), axisTrack));
  drawAxis(axisTrack, total, data.tier.ceBoss.name);

  for (const g of data.guilds) {
    const isLead = g.name === lead;
    const won = data.winner && data.winner.guild === g.name;
    const track = h('div', { class: 'lane__track' });
    const caps = [
      won || isLead ? h('span', { class: 'rib__cap rib__cap--gold', text: won ? tr('cap.winner') : tr('cap.lead') }) : null,
      liveBadge(g, 'rib__cap rib__cap--live'),
    ];
    const lane = h('div', { class: `lane${isLead ? ' lane--lead' : ''}` },
      h('div', { class: 'lane__label' }, ribbon({
        acc: colour(g.colour), accText: String(g.rank), value: g.name,
        extra: h('span', { class: 'lane__pos mono', text: num(trackPosition(g, total), 2) }),
        caps, cls: isLead ? 'rib--lead' : '',
      })),
      track);
    root.append(lane);
    drawLane(track, g, total, isLead);
  }
}

/* ---- 2. Klassement --------------------------------------------------------- */

function meter(label, value, total, cls) {
  const fill = h('span', { class: 'meter__fill' });
  fill.style.setProperty('--fill', `${total ? (value / total) * 100 : 0}%`);
  return h('div', { class: `meter ${cls}` },
    h('span', { class: 'tile__label', text: label }),
    h('span', {
      class: 'meter__track', role: 'img', 'aria-label': tr('meter.aria', { label, value, total }),
    }, fill),
    h('span', { class: 'meter__value', text: `${value}/${total}` }));
}

function currentLines(g, data) {
  const cur = g.current;
  if (data.winner && data.winner.guild === g.name) return [h('p', { class: 'tile__boss', text: tr('tile.ce') })];
  if (!cur) return [h('p', { class: 'tile__boss', text: tr('tile.done') })];
  return [
    h('p', { class: 'tile__boss', text: cur.name }),
    h('p', {
      class: 'tile__detail',
      text: cur.bestPercent === null
        ? tr('tile.noPulls')
        : tr('tile.best', { pct: pct(cur.bestPercent), pulls: pulls(cur.pullCount) }),
    }),
  ];
}

function renderStandings(data) {
  const lead = leaderName(data);
  const total = data.tier.totalBosses;
  const items = data.guilds.map(g => {
    const url = raiderioUrl(g.profileUrl);
    const logs = wclUrl(g.wclUrl);
    const rank = g.worldRank ? `#${num(g.worldRank)}` : '–';
    return setGuild(h('li', { class: `tile${g.name === lead ? ' tile--lead' : ''}` },
      h('div', { class: 'tile__head' },
        h('span', { class: 'tile__rank', text: String(g.rank), 'aria-label': tr('tile.place', { n: g.rank }) }),
        h('div', {},
          h('p', { class: 'tile__name', text: g.name }),
          h('p', { class: 'tile__realm', text: `${g.realm} · ${g.region}` }))),
      liveBadge(g, 'live-badge'),
      meter('Mythic', g.mythicKills, total, 'meter--mythic'),
      meter('Heroic', Math.min(g.heroicKills, total), total, 'meter--heroic'),
      h('div', {}, h('p', { class: 'tile__label', text: tr('tile.current') }), ...currentLines(g, data)),
      h('div', { class: 'tile__foot' },
        h('span', {}, `${tr('tile.worldRank')} `, h('strong', { text: rank })),
        h('span', { class: 'tile__links' },
          url ? h('a', { href: url, rel: 'noopener', text: 'Raider.IO' }) : null,
          logs ? h('a', { href: logs, rel: 'noopener', text: 'Logs' }) : null))), g);
  });
  const list = $('#standings');
  // One row on a wide screen: a column per guild, at most 6 (then it wraps).
  list.style.setProperty('--n', String(Math.min(6, Math.max(1, data.guilds.length))));
  list.replaceChildren(...items);
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
    list.replaceChildren(h('li', { class: 'muted-note', text: tr('feed.empty') }));
    return;
  }
  list.replaceChildren(...kills.map(k => {
    const first = isFirstKill(data, k, k.g);
    const isCe = k.raid === data.tier.ceBoss.raid && k.slug === data.tier.ceBoss.slug;
    return setGuild(h('li', { class: `feed__item${first ? ' feed__item--first' : ''}` },
      h('time', { class: 'feed__when', datetime: k.iso, title: dayTime(k.iso) },
        h('span', { class: 'feed__day', text: day(k.iso) }),
        h('span', { class: 'feed__time', text: clock(k.iso) })),
      h('div', { class: 'feed__what' },
        h('p', { class: 'feed__boss' },
          first ? h('span', { class: 'feed__star', title: tr('feed.first'), 'aria-label': tr('feed.first'), text: '★' }) : null,
          k.name,
          isCe ? h('span', { class: 'ce-tag', text: 'CE' }) : null),
        h('p', { class: 'feed__guild' }, h('span', { class: 'dot', 'aria-hidden': 'true' }), k.g.name)),
      h('span', { class: 'feed__pulls', text: k.pullCount ? pulls(k.pullCount) : '' })), k.g);
  }));
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

function drawTimeline(el, data) {
  const total = data.tier.totalBosses;
  const start = timelineStart(data);
  const end = Math.max(Date.parse(data.generatedAt), start + 86400000);
  const lead = leaderName(data);
  // Leader drawn last, so it sits on top where lines overlap.
  const order = [...data.guilds].reverse();

  chart(el, w => {
    const narrow = w < 560;
    const H = narrow ? 230 : 300;
    const m = { l: 26, r: narrow ? 14 : 30, t: 12, b: 26 };
    const x = tm => m.l + ((tm - start) / (end - start)) * (w - m.l - m.r);
    const y = k => m.t + (1 - k / total) * (H - m.t - m.b);
    const svg = s('svg', { width: w, height: H, viewBox: `0 0 ${w} ${H}`, role: 'img' });
    svg.append(svgTitle(data.guilds.map(g => tr('timeline.kills', { guild: g.name, n: g.mythicKills })).join(', ')));

    for (let k = 0; k <= total; k++) {
      svg.append(s('line', { class: 'svg-grid', x1: m.l, x2: w - m.r, y1: y(k), y2: y(k) }));
      if (!narrow || k % 3 === 0 || k === total) {
        svg.append(s('text', { class: 'svg-axis', x: m.l - 8, y: y(k) + 4, 'text-anchor': 'end', text: String(k) }));
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

    order.forEach((g, i) => {
      const off = (i - (order.length - 1) / 2) * 2; // keep equal lines apart
      const kills = killsOf(g);
      let d = `M${x(start)},${y(0) + off}`;
      kills.forEach((k, n) => { d += ` H${x(k.at)} V${y(n + 1) + off}`; });
      d += ` H${x(end)}`;
      const isLead = g.name === lead;
      svg.append(s('path', {
        d, fill: 'none', stroke: colour(g.colour), 'stroke-width': isLead ? 3 : 2,
        'stroke-linejoin': 'round', class: 'svg-step',
      }));
      kills.forEach((k, n) => {
        svg.append(s('circle', { cx: x(k.at), cy: y(n + 1) + off, r: 3.5, fill: colour(g.colour) },
          svgTitle(tr('timeline.point', { guild: g.name, boss: k.name, date: day(k.iso), n: n + 1 }))));
      });
      svg.append(s('circle', {
        cx: x(end), cy: y(kills.length) + off, r: 5, fill: colour(g.colour), class: 'svg-marker',
      }, svgTitle(tr('timeline.end', { guild: g.name, n: g.mythicKills }))));
    });
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

/* ---- 5. Per boss ------------------------------------------------------------------ */

/* One guild on one boss. A table cell on wide screens, a row in a boss card on
 * phones (tag 'div'); the classes are the same for both. */
function bossCell(g, boss, first, tag = 'td') {
  const b = g.bosses.find(x => x.raid === boss.raid && x.slug === boss.slug);
  const isCurrent = g.current && g.current.raid === boss.raid && g.current.slug === boss.slug;
  if (b && b.state === 'killed') {
    const isFirst = first && first.guild === g.name;
    return h(tag, { class: `cell-td${isFirst ? ' cell--first' : ''}` },
      h('div', { class: 'cell cell--killed' },
        h('span', { class: 'cell__main', text: day(b.defeatedAt), title: dayTime(b.defeatedAt) }),
        h('span', { class: 'cell__sub', text: b.pullCount ? pulls(b.pullCount) : tr('boss.unknownPulls') }),
        isFirst ? h('span', { class: 'visually-hidden', text: tr('boss.first') }) : null));
  }
  if (b && b.state === 'progress' && b.bestPercent !== null) {
    const fill = h('span', { class: 'meter__fill' });
    fill.style.setProperty('--fill', `${100 - b.bestPercent}%`);
    return setGuild(h(tag, { class: `cell-td${isCurrent ? ' cell--current' : ''}` },
      h('div', { class: 'cell cell--progress' },
        h('span', { class: 'cell__main', text: pct(b.bestPercent) }),
        h('span', { class: 'meter__track', role: 'img', 'aria-label': tr('boss.bestAria', { pct: pct(b.bestPercent) }) }, fill),
        h('span', { class: 'cell__sub', text: `${pulls(b.pullCount)}${isCurrent ? ` · ${tr('boss.busy')}` : ''}` }))), g);
  }
  return setGuild(h(tag, { class: `cell-td cell--untouched${isCurrent ? ' cell--current' : ''}` },
    h('span', { text: isCurrent ? tr('boss.next') : '–', 'aria-label': isCurrent ? tr('boss.nextAria') : tr('boss.untried') })), g);
}

function touched(g, ref) {
  const b = g.bosses.find(x => x.raid === ref.raid && x.slug === ref.slug);
  const isCurrent = g.current && g.current.raid === ref.raid && g.current.slug === ref.slug;
  return isCurrent || (b && (b.state === 'killed' || (b.state === 'progress' && b.bestPercent !== null)));
}

function renderBossTable(data) {
  const head = h('tr', {}, h('th', { scope: 'col', text: tr('boss.th') }),
    ...data.guilds.map(g => setGuild(h('th', { scope: 'col' }, h('span', { class: 'dot', 'aria-hidden': 'true' }), g.name), g)));
  const body = [];
  const cards = [];
  for (const raid of data.tier.raids) {
    body.push(h('tr', { class: 'raid-row' }, h('th', { scope: 'colgroup', colspan: data.guilds.length + 1, text: raid.name })));
    cards.push(h('h3', { class: 'bcards__raid', text: raid.name }));
    for (const boss of raid.bosses) {
      const isCe = raid.slug === data.tier.ceBoss.raid && boss.slug === data.tier.ceBoss.slug;
      const ref = { raid: raid.slug, slug: boss.slug };
      body.push(h('tr', {},
        h('th', { scope: 'row' }, boss.name, isCe ? h('span', { class: 'ce-tag', text: 'CE' }) : null),
        ...data.guilds.map(g => bossCell(g, ref, boss.firstKill))));

      // Phone layout: one card per boss, a row per guild that has touched it.
      const rows = data.guilds.filter(g => touched(g, ref)).map(g => setGuild(h('div', { class: 'bcard__row' },
        h('span', { class: 'bcard__guild' }, h('span', { class: 'dot', 'aria-hidden': 'true' }), g.name),
        bossCell(g, ref, boss.firstKill, 'div')), g));
      cards.push(h('article', { class: 'bcard' },
        h('h4', { class: 'bcard__name' }, boss.name, isCe ? h('span', { class: 'ce-tag', text: 'CE' }) : null),
        rows.length ? rows : h('p', { class: 'muted-note', text: tr('boss.nobody') })));
    }
  }
  $('#bossTable').replaceChildren(h('thead', {}, head), h('tbody', {}, body));
  $('#bossCards').replaceChildren(...cards);
}

/* ---- 6. Huidige boss ------------------------------------------------------------------ */

/* Raid nights: indexes where a pull starts a new evening (gap > NIGHT_GAP_H). */
function nightStarts(list) {
  const starts = [0];
  for (let i = 1; i < list.length; i++) {
    if (Date.parse(list[i].at) - Date.parse(list[i - 1].at) > NIGHT_GAP_H * 3600000) starts.push(i);
  }
  return starts;
}

/* Like the overlay's pull history: one bar per pull, higher = more boss HP gone.
 * The line is the best pull so far; the dashed top line is the kill. A thin
 * divider and the date mark each new raid night. */
function drawCurve(el, g) {
  const list = g.current.pulls.filter(p => p.percent !== null);
  const nights = nightStarts(list);
  chart(el, w => {
    const H = 150, m = { l: 34, r: 8, t: 10, b: 20 };
    const n = list.length;
    const step = (w - m.l - m.r) / Math.max(n, 1);
    const x = i => m.l + step * (i + 0.5);
    const y = gone => m.t + (1 - gone / 100) * (H - m.t - m.b);
    const svg = s('svg', { width: w, height: H, viewBox: `0 0 ${w} ${H}`, role: 'img' });
    svg.append(svgTitle(tr('curve.title', { guild: g.name, boss: g.current.name, n, pct: pct(g.current.bestPercent) })));
    for (const gone of [0, 50, 100]) {
      svg.append(s('line', { class: gone === 100 ? 'svg-kill' : 'svg-grid', x1: m.l, x2: w - m.r, y1: y(gone), y2: y(gone) }));
      svg.append(s('text', { class: 'svg-axis', x: m.l - 6, y: y(gone) + 4, 'text-anchor': 'end', text: gone === 100 ? tr('curve.kill') : `${gone}%` }));
    }
    for (const i of nights.slice(1)) {
      const nx = x(i) - step / 2;
      svg.append(s('line', { class: 'svg-night', x1: nx, x2: nx, y1: y(100) + 4, y2: y(0) }));
    }
    let best = Infinity;
    let bestIdx = -1;
    list.forEach((p, i) => { if (p.percent < best) { best = p.percent; bestIdx = i; } });
    const bw = Math.max(1, Math.min(8, step - 1.5));
    list.forEach((p, i) => {
      const gone = 100 - p.percent;
      svg.append(s('rect', {
        x: x(i) - bw / 2, y: y(gone), width: bw, height: Math.max(1, y(0) - y(gone)),
        class: p.success ? 'svg-bar svg-bar--kill' : (i === bestIdx ? 'svg-bar svg-bar--best' : 'svg-bar'),
      }, svgTitle(tr('curve.pullTitle', { n: i + 1, date: day(p.at), pct: pct(p.percent) }))));
    });
    let run = Infinity;
    const pts = list.map((p, i) => { run = Math.min(run, p.percent); return `${x(i)},${y(100 - run)}`; });
    if (pts.length) {
      svg.append(s('polyline', {
        points: pts.join(' '), fill: 'none', stroke: colour(g.colour), 'stroke-width': 2.5, 'stroke-linejoin': 'round',
      }));
    }
    if (nights.length > 1) {
      // Bottom axis: the date of each raid night, where its stretch has room.
      nights.forEach((i, k) => {
        const from = x(i) - step / 2;
        const to = k + 1 < nights.length ? x(nights[k + 1]) - step / 2 : w - m.r;
        if (to - from >= 40) svg.append(s('text', { class: 'svg-axis', x: from + 3, y: H - 4, text: day(list[i].at) }));
      });
    } else {
      svg.append(s('text', { class: 'svg-axis', x: m.l, y: H - 4, text: tr('curve.pull', { n: 1 }) }));
      if (n > 1) svg.append(s('text', { class: 'svg-axis', x: w - m.r, y: H - 4, 'text-anchor': 'end', text: tr('curve.pull', { n }) }));
    }
    el.replaceChildren(svg);
  });
}

function stat(value, label, cls) {
  return h('div', {}, h('div', { class: `boss__v ${cls || ''}`, text: value }), h('div', { class: 'boss__l', text: label }));
}

function renderCurrent(data) {
  const raidName = slug => (data.tier.raids.find(r => r.slug === slug) || {}).name || slug;
  const cards = data.guilds.map(g => {
    const cur = g.current;
    // The source tag names where this card's pulls come from, and links there.
    const fromLogs = cur && cur.pullSource === 'warcraftlogs';
    const url = fromLogs ? wclUrl(g.wclUrl) : raiderioUrl(g.profileUrl);
    const label = fromLogs ? 'warcraftlogs' : 'raider.io';
    const inner = h('div', { class: 'rcard__in curve' });
    const wrap = setGuild(h('article', { class: 'rcard-wrap' },
      h('span', { class: 'rcard__cap', text: g.name }),
      url ? h('a', { class: 'rcard__src', href: url, rel: 'noopener', text: label }) : h('span', { class: 'rcard__src', text: label }),
      h('div', { class: 'rcard' }, inner)), g);
    wrap.style.setProperty('--acc', colour(g.colour));

    if (!cur) {
      wrap.classList.add('rcard-wrap--compact');
      inner.append(h('p', { class: 'boss__nm', text: data.winner && data.winner.guild === g.name ? tr('tile.ce') : tr('tile.done') }));
      return wrap;
    }
    const tried = cur.bestPercent !== null;
    inner.append(
      h('p', { class: 'boss__over', text: tr('cur.over', { raid: raidName(cur.raid) }) }),
      h('div', { class: 'boss__top' },
        h('p', { class: 'boss__nm', text: cur.name }),
        h('span', { class: `boss__tag ${tried ? 'prog' : ''}`, text: tried ? tr('cur.prog') : tr('cur.notYet') })));
    if (!tried) {
      // No pulls here yet: a short card with the last kill, not a big empty box.
      wrap.classList.add('rcard-wrap--compact');
      const kills = killsOf(g);
      const last = kills[kills.length - 1];
      inner.append(h('p', { class: 'muted-note', text: tr('cur.noPull') }));
      if (last) {
        inner.append(h('div', { class: 'curve__last' },
          h('span', { class: 'boss__l', text: tr('cur.lastKill') }),
          h('p', { class: 'curve__lastline' },
            h('strong', { text: last.name }),
            ` · ${day(last.iso)}${last.pullCount ? ` · ${pulls(last.pullCount)}` : ''}`)));
      }
      return wrap;
    }
    inner.append(h('div', { class: 'boss__stat' },
      stat(pct(cur.bestPercent), tr('cur.best'), 'gold'),
      stat(pct(100 - cur.bestPercent), tr('cur.gone')),
      stat(num(cur.pullCount), tr('cur.pulls'))));
    const plot = h('div', { class: 'chart curve__plot' });
    inner.append(plot);
    if (cur.pulls.some(p => p.percent !== null)) drawCurve(plot, g);
    else plot.append(h('p', { class: 'muted-note', text: tr('cur.noDetail') }));
    return wrap;
  });
  $('#currentBoss').replaceChildren(...cards);
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
  el.textContent = tr('upd.line', { when });
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
  renderRace(data);
  renderStandings(data);
  renderFeed(data);
  renderTimeline(data);
  renderBossTable(data);
  renderCurrent(data);
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
