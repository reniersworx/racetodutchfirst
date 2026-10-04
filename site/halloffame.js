/* Race to Dutch First: hall of fame, as a raid journal.
 *
 * Draws race.json's hallOfFame each time app.js's render() fires 'race:data' (on load, on
 * fresh data and after a language switch). A row of boss heads works as tabs; the chosen
 * boss gets a stage: its render, the guild with the race's first kill, that team as a WoW
 * raid frame (a cell per raider, the class colour as its bar) and the guilds that followed.
 * Under it "Altijd paraat" (per guild, who was in every Mythic kill of their guild) and the
 * full raider table behind a button. Strings are the hof.* keys in i18n.js.
 *
 * Uses app.js's globals h(), s(), $(), tr(), day(), dayTime(), pulls(), setGuild(),
 * bossArtFor() and raiderioUrl(). Same rules as app.js: textContent only, no innerHTML,
 * no style="" (colours go in as custom properties with style.setProperty()).
 */
'use strict';

(() => {
  const ROLES = ['tank', 'healer', 'dps'];
  const DAY = 86400000;
  // WoW's class colours: game data like the guild colours, used only as the raid-frame bar.
  // Priest is paper instead of pure white.
  const CLASS = {
    'Death Knight': '#c41e3a', 'Demon Hunter': '#a330c9', Druid: '#ff7c0a', Evoker: '#33937f',
    Hunter: '#aad372', Mage: '#3fc7eb', Monk: '#00ff98', Paladin: '#f48cba', Priest: '#eef1f5',
    Rogue: '#fff468', Shaman: '#0070dd', Warlock: '#8788ee', Warrior: '#c69b6d',
  };
  const tn = (key, n, vars) => i18n.tn(key, n, vars);
  let data = null;
  let chosen = null; // `${raid}/${slug}` of the boss on the stage; kept across redraws
  let showAll = false;

  const key = b => `${b.raid}/${b.slug}`;
  const midnight = iso => { const t = new Date(iso); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
  // Race day of a date: the tier start is day 1 (rounded: DST days are 23 or 25 h).
  function raceDay(iso) {
    const [y, m, d] = data.tier.start.split('-').map(Number);
    return Math.round((midnight(iso) - new Date(y, m - 1, d)) / DAY) + 1;
  }
  function daysAfter(first, t) {
    const n = Math.round((midnight(t.defeatedAt) - midnight(first.defeatedAt)) / DAY);
    return n ? tr('hof.daysAfter', { n }) : tr('hof.sameDay');
  }

  const star = () => s('svg', { class: 'hof-star', viewBox: '0 0 16 16', 'aria-hidden': 'true' },
    s('path', { d: 'M8 1.6l1.9 4.2 4.5.4-3.4 3 1 4.5L8 11.4l-4 2.3 1-4.5-3.4-3 4.5-.4z' }));

  /* Every boss of the race in tier order, then the kills of raids that don't count (app.js's
     splitSideRaids took those out of tier.raids; hallOfFame still lists them). */
  function bosses(fame) {
    const ce = data.tier.ceBoss || {};
    const teamsOf = (raid, slug) => (fame.bosses.find(b => b.raid === raid && b.slug === slug) || {}).teams || [];
    const race = data.tier.raids.flatMap(r => r.bosses.map(b => ({
      name: b.name, raid: r.slug, slug: b.slug, isCe: ce.raid === r.slug && ce.slug === b.slug, teams: teamsOf(r.slug, b.slug),
    })));
    const counted = new Set(race.map(key));
    const side = fame.bosses.filter(b => !counted.has(key(b)))
      .map(b => ({ name: b.name, raid: b.raid, slug: b.slug, side: true, teams: b.teams }));
    return [...race, ...side].map(b => ({ ...b, first: b.teams[0] || null }));
  }

  // The boss to open on: the CE boss once it fell, else the latest first kill of the race.
  function defaultBoss(list) {
    const ce = list.find(b => b.isCe);
    if (ce && ce.first) return ce;
    const won = list.filter(b => b.first && !b.side).sort((a, b) => Date.parse(b.first.defeatedAt) - Date.parse(a.first.defeatedAt));
    return won[0] || ce || list[0];
  }

  function art(b, cls) {
    const srcs = bossArtFor(b.name);
    return h('span', { class: `hof-art ${cls}${srcs.length > 1 ? ' hof-art--duo' : ''}`, 'aria-hidden': 'true' },
      srcs.length ? srcs.map(src => h('img', { src, alt: '', loading: 'lazy' }))
        : h('b', { class: 'hof-art__mono', text: b.name.trim()[0] }));
  }

  function nameLink(m) {
    const url = raiderioUrl(m.url);
    return url ? h('a', { href: url, rel: 'noopener', text: m.name }) : h('span', { text: m.name });
  }

  /* ---- tabs ------------------------------------------------------------------------------- */
  function tab(b, i) {
    const selected = key(b) === chosen;
    const sub = b.first && !b.side ? [star(), tr('hof.day', { n: raceDay(b.first.defeatedAt) })]
      : b.side ? [tr('hof.sideShort')] : [b.isCe ? 'CE' : '–'];
    const el = h('button', {
      type: 'button', role: 'tab', id: `hofTab${i}`, class: `hof-tab${b.first ? '' : ' is-empty'}`,
      'aria-selected': String(selected), 'aria-controls': 'hofStage', tabindex: selected ? '0' : '-1', title: b.name,
      'data-key': key(b),
    }, art(b, 'hof-tab__head'), h('span', { class: 'hof-tab__name', text: b.name }),
      h('span', { class: `hof-tab__sub${b.first && !b.side ? ' mono' : ''}${!b.first && b.isCe ? ' hof-tab__sub--ce' : ''}` }, sub));
    el.addEventListener('click', () => choose(key(b)));
    return el;
  }

  function choose(k, focus) {
    chosen = k;
    render();
    const t = $(`#hofTabs [data-key="${CSS.escape(k)}"]`);
    if (focus && t) t.focus();
  }

  // Arrow keys move along the tabs (a roving tabindex), Home and End jump to the ends.
  function onKey(e) {
    const tabs = [...$('#hofTabs').children];
    const i = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const t = tabs[(next + tabs.length) % tabs.length];
    choose(t.dataset.key, true);
  }

  // Keep the chosen tab in view in the sideways-scrolling row, without moving the page.
  function reveal(row) {
    const t = row.querySelector('[aria-selected="true"]');
    if (!t) return;
    if (t.offsetLeft < row.scrollLeft || t.offsetLeft + t.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = t.offsetLeft - (row.clientWidth - t.offsetWidth) / 2;
    }
  }

  /* ---- stage ------------------------------------------------------------------------------ */
  function raidFrame(team) {
    if (!team.rosterKnown) return h('p', { class: 'muted-note', text: tr('hof.unknown') });
    return h('div', { class: 'hof-frame' }, ROLES.map(role => {
      const ms = team.roster.filter(m => m.role === role);
      if (!ms.length) return null;
      return h('div', { class: 'hof-frame__grp' },
        h('p', { class: 'hof-frame__role', text: `${tr(`hof.role.${role}`)} · ${ms.length}` }),
        h('ul', { class: 'hof-frame__cells' }, ms.map(m => {
          const li = h('li', { class: 'hof-cell', title: [m.name, m.spec, m.class, m.realm].filter(Boolean).join(' · ') },
            nameLink(m), h('span', { class: 'hof-cell__spec', text: m.spec || '' }));
          li.style.setProperty('--cls', CLASS[m.class] || '#818b98');
          return li;
        })));
    }));
  }

  function followers(b) {
    const rest = b.teams.slice(1);
    if (!rest.length) return null;
    return h('div', { class: 'hof-after' },
      h('p', { class: 'hof-after__h', text: tr('hof.after') }),
      h('ol', {}, rest.map((t, i) => setGuild(h('li', {},
        h('span', { class: 'hof-after__n mono', text: String(i + 2) }),
        h('span', { class: 'hof-chip' }, h('i', { 'aria-hidden': 'true' }), h('span', { text: t.guild })),
        h('span', { class: 'hof-after__d mono', text: day(t.defeatedAt), title: dayTime(t.defeatedAt) }),
        h('span', { class: 'hof-after__gap mono', text: daysAfter(b.first, t) }),
        t.pullCount ? h('span', { class: 'hof-after__p', text: pulls(t.pullCount) }) : null), t))));
  }

  function stage(b) {
    const box = $('#hofStage');
    const sel = $(`#hofTabs [data-key="${CSS.escape(key(b))}"]`);
    if (sel) box.setAttribute('aria-labelledby', sel.id);
    if (!b.first) {
      box.replaceChildren(h('div', { class: 'hof-stage is-empty' }, art(b, 'hof-stage__art'),
        h('div', { class: 'hof-stage__info' },
          h('h3', { class: 'hof-stage__boss' }, h('span', { text: b.name }), b.isCe ? h('span', { class: 'ce-tag', text: 'CE' }) : null),
          h('p', { class: 'hof-stage__meta' },
            h('span', { class: 'pill hof-pill hof-pill--quiet', text: tr(b.isCe ? 'hof.lastTrophy' : 'hof.toEarn') }),
            h('span', { text: tr('hof.notYet') })))));
      return;
    }
    const f = b.first;
    box.replaceChildren(h('div', { class: 'hof-stage' }, art(b, 'hof-stage__art'),
      h('div', { class: 'hof-stage__info' },
        setGuild(h('h3', { class: 'hof-stage__guild' }, h('i', { 'aria-hidden': 'true' }), h('span', { text: f.guild })), f),
        h('p', { class: 'hof-stage__meta' },
          // The race's first kill in the world's own marker: a gold slanted pill (grey for a raid that doesn't count).
          b.side ? h('span', { class: 'pill hof-pill hof-pill--quiet', text: tr('hof.side') })
            : h('span', { class: 'pill hof-pill hof-pill--first' }, star(), h('span', { text: tr('hof.firstDay', { n: raceDay(f.defeatedAt) }) })),
          h('span', {}, tr('hof.mythic', { boss: b.name }), b.isCe ? h('span', { class: 'ce-tag', text: 'CE' }) : null),
          h('span', { class: 'mono hof-stage__date', text: day(f.defeatedAt), title: dayTime(f.defeatedAt) }),
          f.pullCount ? h('span', { text: pulls(f.pullCount) }) : null),
        raidFrame(f),
        followers(b))));
  }

  /* ---- Altijd paraat ---------------------------------------------------------------------- */
  function present(fame) {
    const rows = data.guilds.map(g => {
      const k = g.bosses.filter(b => b.defeatedAt).length;
      if (!k) return null;
      const rs = (fame.raiders || []).filter(r => r.guild === g.name && r.kills === k);
      return setGuild(h('div', { class: 'hof-present__row' },
        h('div', { class: 'hof-rib' },
          h('span', { class: 'hof-rib__acc mono', text: String(rs.length) }), h('span', { class: 'hof-rib__name', text: g.name })),
        h('p', { class: 'hof-present__txt' },
          h('span', { class: 'hof-present__cap', text: rs.length ? tn('hof.present.all', k, { n: k }) : tr('hof.present.none', { n: k }) }),
          rs.length ? h('span', { class: 'hof-present__names' }, rs.map(r => h('span', { class: 'hof-present__n', title: r.realm || '' }, nameLink(r)))) : null)), g);
    }).filter(Boolean);
    $('#hofPresent').replaceChildren(...(rows.length ? rows : [h('p', { class: 'muted-note', text: tr('hof.empty') })]));
  }

  /* ---- every raider, behind a button ------------------------------------------------------ */
  // Shared ranks: raiders with the same firsts and kills get the same number.
  function ranks(raiders) {
    let rank = 0;
    return raiders.map((r, i) => {
      const prev = raiders[i - 1];
      if (!prev || prev.firsts !== r.firsts || prev.kills !== r.kills) rank = i + 1;
      return rank;
    });
  }

  function raidersTable(raiders) {
    const nums = ranks(raiders);
    const cols = ['rank', 'raider', 'guild', 'firsts', 'kills'];
    const rows = raiders.map((r, i) => {
      const tie = i > 0 && nums[i] === nums[i - 1];
      // On phones the guild column folds into the raider cell's second line (.hof-meta).
      return h('tr', { class: r.firsts ? 'hof-row--first' : '' },
        h('td', { class: tie ? 'hof-num hof-rank hof-rank--tie' : 'hof-num hof-rank', text: String(nums[i]) }),
        h('th', { scope: 'row' }, nameLink(r),
          h('span', { class: 'hof-meta' },
            setGuild(h('span', { class: 'hof-guild-inline' }, h('span', { class: 'dot', 'aria-hidden': 'true' }), ` ${r.guild}`), r),
            h('span', { class: 'hof-realm', text: r.realm || '' }))),
        setGuild(h('td', { class: 'hof-guild' }, h('span', { class: 'dot', 'aria-hidden': 'true' }), ` ${r.guild}`), r),
        h('td', { class: 'hof-num hof-firsts', text: r.firsts ? String(r.firsts) : '–' }),
        h('td', { class: 'hof-num', text: String(r.kills), title: r.bosses.map(b => b.name).join(', ') }));
    });
    $('#hofRaiders').replaceChildren(
      h('thead', {}, h('tr', {}, cols.map(c => h('th', { scope: 'col', class: c === 'raider' ? '' : c === 'guild' ? 'hof-guild' : 'hof-num', text: tr(`hof.col.${c}`) })))),
      h('tbody', {}, rows));
  }

  function moreButton(raiders) {
    $('#hofAll').hidden = !showAll;
    if (!raiders.length) { $('#hofMore').replaceChildren(); return; }
    const btn = h('button', {
      type: 'button', class: 'pill pill--action', 'aria-controls': 'hofAll', 'aria-expanded': String(showAll),
      text: showAll ? tr('hof.less') : tr('hof.more', { n: raiders.length }),
    });
    btn.addEventListener('click', () => { showAll = !showAll; moreButton(raiders); });
    $('#hofMore').replaceChildren(btn);
  }

  function render() {
    const fame = data && data.hallOfFame;
    const section = $('#hallOfFame');
    if (!fame) { section.hidden = true; return; }
    section.hidden = false;
    const list = bosses(fame);
    if (!list.some(b => key(b) === chosen)) chosen = key(defaultBoss(list));
    const row = $('#hofTabs');
    row.replaceChildren(...list.map(tab));
    row.onkeydown = onKey;
    stage(list.find(b => key(b) === chosen));
    reveal(row);
    present(fame);
    raidersTable(fame.raiders || []);
    moreButton(fame.raiders || []);
  }

  document.addEventListener('race:data', e => {
    // Another season's data: open on that season's own default boss.
    if (data && e.detail && data.tier.start !== e.detail.tier.start) chosen = null;
    data = e.detail;
    render();
  });
  // race.json can arrive before this file has loaded; app.js keeps it in `race`.
  if (typeof race !== 'undefined' && race) { data = race; render(); }
})();
