/* Mockups for the part below the hero (not shipped). Variant from <body data-mock="a|b|c">.
   Runs after app.js on the real page with the real race.json, hides the current sections
   and draws the variant. NL only. Uses app.js globals: bossArtFor(). */
'use strict';

(() => {
  const V = document.body.dataset.mock;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dd = iso => new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  const pct = p => `${p.toFixed(2).replace('.', ',')}%`;
  const DAY = 86400000;

  const STAR = '<svg class="mk-mark mk-mark--star" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6l1.9 4.2 4.5.4-3.4 3 1 4.5L8 11.4l-4 2.3 1-4.5-3.4-3 4.5-.4z"/></svg>';
  const CHECK = '<svg class="mk-mark mk-mark--check" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8"/></svg>';

  function head(name, cls = '') {
    const src = (typeof bossArtFor === 'function' ? bossArtFor(name) : [])[0];
    return `<span class="mk-head ${cls}" aria-hidden="true">${src ? `<img src="${src}" alt="">` : `<b>${esc(name.trim()[0])}</b>`}</span>`;
  }

  function model(d) {
    const bosses = d.tier.raids.flatMap(r => r.bosses.map(b => ({ ...b, raid: r.name, raidSlug: r.slug })));
    const ce = d.tier.ceBoss;
    for (const b of bosses) b.isCe = b.slug === ce.slug && b.raidSlug === ce.raid;
    const of = (g, b) => g.bosses.find(x => x.slug === b.slug && x.raid === b.raidSlug) || { state: 'untouched' };
    const kills = g => g.bosses.filter(x => x.state === 'killed' && x.defeatedAt)
      .map(x => ({ ...x, t: +new Date(x.defeatedAt) })).sort((a, b) => a.t - b.t);
    return { bosses, of, kills };
  }

  /* ---- Voortgang: a step line per guild against the 9-boss scale, raid nights shaded,
     first kills as gold stars, names at the line ends instead of a legend. ---------------- */
  function progressChart(d, m, { w = 1272, h = 440 } = {}) {
    // phones: a narrower frame so the type stays readable; the line ends carry only the count
    const compact = window.innerWidth < 600;
    if (compact) { w = 400; h = 340; }
    const all = d.guilds.flatMap(g => m.kills(g).map(k => k.t));
    const now = +new Date(d.generatedAt);
    const t0 = Math.min(...all) - 2 * DAY, t1 = now + 1 * DAY;
    const pad = compact ? { l: 40, r: 44, t: 14, b: 30 } : { l: 58, r: 196, t: 18, b: 34 };
    const X = t => pad.l + (t - t0) / (t1 - t0) * (w - pad.l - pad.r);
    const Y = k => h - pad.b - k / 9 * (h - pad.t - pad.b);
    let s = `<svg class="mk-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Mythic-kills per guild door de tijd">`;
    // raid nights (wo + zo): the evenings the lines can move
    for (let t = new Date(new Date(t0).toDateString()).getTime(); t < t1; t += DAY) {
      const wd = new Date(t).getDay();
      if (wd === 3 || wd === 0) {
        const a = X(Math.max(t, t0)), b = X(Math.min(t + DAY, t1));
        s += `<rect class="mk-night" x="${a}" y="${pad.t}" width="${Math.max(0, b - a)}" height="${h - pad.t - pad.b}"/>`;
      }
      if (wd === 0) s += `<text class="mk-axis" x="${X(t + DAY / 2)}" y="${h - 10}" text-anchor="middle">${dd(new Date(t).toISOString())}</text>`;
    }
    for (let k = 1; k <= 9; k++) {
      s += `<line class="mk-grid${k === 9 ? ' mk-grid--ce' : ''}" x1="${pad.l}" x2="${w - pad.r + 8}" y1="${Y(k)}" y2="${Y(k)}"/>`;
      s += `<text class="mk-axis" x="${pad.l - 12}" y="${Y(k) + 4}" text-anchor="end">${k === 9 ? 'CE' : `${k}/9`}</text>`;
    }
    const ends = [];
    const order = [...d.guilds].reverse(); // leader drawn last, on top
    for (const g of order) {
      const ks = m.kills(g);
      let path = `M${X(t0)},${Y(0)}`, n = 0;
      for (const k of ks) { path += ` H${X(k.t)} V${Y(++n)}`; }
      path += ` H${X(now)}`;
      s += `<path class="mk-line" style="--g:${g.colour}" d="${path}"/>`;
      n = 0;
      for (const k of ks) {
        n++;
        const b = m.bosses.find(x => x.slug === k.slug && x.raidSlug === k.raid);
        const first = b && b.firstKill && b.firstKill.guild === g.name;
        s += first
          ? `<path class="mk-star" d="M0,-7 L2,-2.2 7,-2 3.2,1.3 4.4,6.5 0,3.6 -4.4,6.5 -3.2,1.3 -7,-2 -2,-2.2Z" transform="translate(${X(k.t)},${Y(n)})"><title>${esc(g.name)} · ${esc(k.name)} · ${dd(k.defeatedAt)} · eerste kill</title></path>`
          : `<circle class="mk-node" style="--g:${g.colour}" cx="${X(k.t)}" cy="${Y(n)}" r="4"><title>${esc(g.name)} · ${esc(k.name)} · ${dd(k.defeatedAt)}</title></circle>`;
      }
      ends.push({ g, y: Y(n), n });
    }
    // end labels, pushed apart where guilds share a count
    ends.sort((a, b) => a.y - b.y);
    const gap = compact ? 15 : 20;
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < gap) ends[i].y = ends[i - 1].y + gap;
    for (const e of ends) {
      s += compact
        ? `<text class="mk-end" x="${X(now) + 8}" y="${e.y + 5}" style="--g:${e.g.colour}">${e.n}/9</text>`
        : `<text class="mk-end" x="${X(now) + 12}" y="${e.y + 5}" style="--g:${e.g.colour}">${esc(e.g.name)} <tspan class="mk-end__n">${e.n}/9</tspan></text>`;
    }
    s += `<line class="mk-now" x1="${X(now)}" x2="${X(now)}" y1="${pad.t}" y2="${h - pad.b}"/>`;
    return s + '</svg>';
  }

  const section = (title, cap, body, cls = '') =>
    `<section class="view mk-view ${cls}"><h2 class="view__title">${title}</h2>${cap ? `<p class="section-caption">${cap}</p>` : ''}${body}</section>`;

  const collapsed = (label, note) =>
    `<details class="mk-more"><summary>${label}</summary><p class="muted-note">${note}</p></details>`;

  function firstKillTile(d, m, b) {
    const fk = b.firstKill;
    const g = fk && d.guilds.find(x => x.name === fk.guild);
    const st = g && m.of(g, b);
    let body;
    if (fk) {
      body = `<p class="mk-fk__who">${STAR}<span class="mk-dot" style="--g:${g ? g.colour : 'var(--gold)'}"></span>${esc(fk.guild)}</p>
        <p class="mk-fk__when">${dd(fk.defeatedAt)}${st && st.pullCount ? ` · ${st.pullCount} pulls` : ''}</p>`;
    } else {
      const best = d.guilds.map(x => ({ x, s: m.of(x, b) })).filter(o => o.s.state === 'progress' && o.s.bestPercent !== null)
        .sort((a, c) => a.s.bestPercent - c.s.bestPercent)[0];
      body = best
        ? `<p class="mk-fk__open">Nog niemand</p><p class="mk-fk__when"><span class="mk-dot" style="--g:${best.x.colour}"></span>${esc(best.x.name)} op ${pct(best.s.bestPercent)}</p>`
        : '<p class="mk-fk__open">Nog niemand</p><p class="mk-fk__when">nog niet geprobeerd</p>';
    }
    return `<article class="mk-fk${fk ? '' : ' is-open'}${b.isCe ? ' is-ce' : ''}">
      ${head(b.name, 'mk-head--tile')}
      <h3 class="mk-fk__name">${esc(b.name)}${b.isCe ? ' <span class="ce-tag">CE</span>' : ''}</h3>${body}</article>`;
  }

  /* ---- A: the chart is the page ---------------------------------------------------------- */
  function variantA(d, m) {
    return section('Voortgang', 'Elke trede is een Mythic-kill. De gekleurde kolommen zijn raidavonden (woensdag en zondag); een gouden ster is de eerste Nederlandse kill van die boss.',
      `<div class="mk-chart-wrap">${progressChart(d, m, { h: 470 })}</div>`, 'mk-a-chart')
      + section('Eerste kills', 'Per boss de eerste Nederlandse guild, of wie er het dichtst bij zit.',
        `<div class="mk-fks">${m.bosses.map(b => firstKillTile(d, m, b)).join('')}</div>`)
      + `<div class="mk-mores">${collapsed('Alle kills per guild en boss', 'De volledige tabel (nu "Per boss") klapt hier open.')}
         ${collapsed('Pulls op de huidige boss', 'De pull-grafieken per guild (nu "Huidige boss") klappen hier open.')}
         ${collapsed('Hall of fame: teams en raiders', 'De rosters van elke eerste kill en de ranglijst van raiders klappen hier open.')}</div>`;
  }

  /* ---- B: one sheet per guild ------------------------------------------------------------ */
  function pip(d, m, g, b) {
    const s = m.of(g, b);
    if (s.state === 'killed') {
      const first = b.firstKill && b.firstKill.guild === g.name;
      return `<span class="mk-pip ${first ? 'is-first' : 'is-kill'}" title="${esc(b.name)}: ${dd(s.defeatedAt)}${s.pullCount ? ` · ${s.pullCount} pulls` : ''}">${first ? STAR : CHECK}<small>${dd(s.defeatedAt)}</small></span>`;
    }
    if (s.state === 'progress') {
      const now = g.current && g.current.slug === b.slug;
      return `<span class="mk-pip is-prog${now ? ' is-now' : ''}" style="--g:${g.colour};--w:${s.bestPercent === null ? 0 : 100 - s.bestPercent}%" title="${esc(b.name)}: beste ${s.bestPercent === null ? '–' : pct(s.bestPercent)}"><i></i><small>${s.bestPercent === null ? '–' : pct(s.bestPercent)}</small></span>`;
    }
    return '<span class="mk-pip is-none"></span>';
  }

  function pullBars(g) {
    const c = g.current;
    if (!c || !c.pulls || !c.pulls.length) return '<p class="mk-pulls__none">Nog geen pulls op de huidige boss</p>';
    const ps = c.pulls.slice(-60);
    const bars = ps.map(p => `<i style="--h:${Math.max(3, 100 - p.percent)}%"></i>`).join('');
    return `<div class="mk-pulls" style="--g:${g.colour}"><div class="mk-pulls__bars">${bars}</div>
      <p class="mk-pulls__cap">${esc(c.name)} · ${c.pullCount} pulls · beste ${pct(c.bestPercent)}</p></div>`;
  }

  function variantB(d, m) {
    const headRow = `<div class="mk-sheet mk-sheet--head"><span></span>${m.bosses.map(b => `<span class="mk-col">${head(b.name, 'mk-head--sm')}<em>${esc(b.name)}</em></span>`).join('')}<span class="mk-col mk-col--pulls">Huidige boss</span></div>`;
    const rows = d.guilds.map(g => `<div class="mk-sheet" style="--g:${g.colour}">
      <div class="mk-sheet__who"><span class="mk-rank">${g.rank}</span><b>${esc(g.name)}</b><span class="mk-sheet__k">${g.mythicKills}<small>/9</small></span></div>
      ${m.bosses.map(b => pip(d, m, g, b)).join('')}
      ${pullBars(g)}</div>`).join('');
    return section('Voortgang', 'Elke trede is een Mythic-kill; gouden ster = eerste Nederlandse kill. Gekleurde kolommen zijn raidavonden.',
      `<div class="mk-chart-wrap">${progressChart(d, m, { h: 340 })}</div>`)
      + section('Per guild', 'Elke rij is een guild: per boss de killdatum, of hoe ver ze staan; rechts de pulls op hun huidige boss.',
        `<div class="mk-sheets">${headRow}${rows}</div>`)
      + `<div class="mk-mores">${collapsed('Hall of fame: teams en raiders', 'De rosters van elke eerste kill en de ranglijst van raiders klappen hier open.')}</div>`;
  }

  /* ---- C: the nine bosses as a rail ------------------------------------------------------ */
  function variantC(d, m) {
    const cols = m.bosses.map(b => {
      const done = d.guilds.map(g => ({ g, s: m.of(g, b) })).filter(o => o.s.state === 'killed')
        .sort((a, c) => new Date(a.s.defeatedAt) - new Date(c.s.defeatedAt));
      const prog = d.guilds.map(g => ({ g, s: m.of(g, b) })).filter(o => o.s.state === 'progress')
        .sort((a, c) => (a.s.bestPercent ?? 100) - (c.s.bestPercent ?? 100));
      const fkTeam = (d.hallOfFame.bosses.find(x => x.slug === b.slug) || {}).teams?.[0];
      const roster = fkTeam && fkTeam.roster ? fkTeam.roster.map(r => esc(r.name)).join(', ') : '';
      const rows = done.map((o, i) => `<li class="mk-rl ${i === 0 ? 'is-first' : ''}" style="--g:${o.g.colour}">
          ${i === 0 ? STAR : '<span class="mk-dot"></span>'}<b>${esc(o.g.name)}</b><span>${dd(o.s.defeatedAt)}</span></li>`).join('')
        + prog.map(o => `<li class="mk-rl is-prog" style="--g:${o.g.colour};--w:${o.s.bestPercent === null ? 0 : 100 - o.s.bestPercent}%">
          <span class="mk-dot"></span><b>${esc(o.g.name)}</b><span>${o.s.bestPercent === null ? 'net bezig' : pct(o.s.bestPercent)}</span><i></i></li>`).join('');
      return `<article class="mk-boss${b.isCe ? ' is-ce' : ''}${done.length ? '' : ' is-open'}">
        ${head(b.name, 'mk-head--big')}
        <div class="mk-boss__txt"><p class="mk-boss__raid">${esc(b.raid)}</p><h3>${esc(b.name)}${b.isCe ? ' <span class="ce-tag">CE</span>' : ''}</h3>
        <p class="mk-boss__n">${done.length ? `${done.length}/${d.guilds.length} guilds` : 'nog niemand'}</p></div>
        <ol class="mk-rls">${rows || '<li class="mk-rl is-none">Nog geen pulls</li>'}</ol>
        ${roster ? `<details class="mk-roster"><summary>Team eerste kill</summary><p>${roster}</p></details>` : ''}
      </article>`;
    }).join('');
    return section('Voortgang', 'Elke trede is een Mythic-kill; gouden ster = eerste Nederlandse kill. Gekleurde kolommen zijn raidavonden.',
      `<div class="mk-chart-wrap">${progressChart(d, m, { h: 380 })}</div>`)
      + section('De bosses', 'Per boss wie hem versloeg en wanneer, en wie er nog op staat. Het team van de eerste kill klap je open.',
        `<div class="mk-rail">${cols}</div>`)
      + `<div class="mk-mores">${collapsed('Raiders: wie was het vaakst bij een eerste kill', 'De ranglijst van raiders klapt hier open.')}</div>`;
  }

  fetch('data/race.json').then(r => r.json()).then(d => {
    const m = model(d);
    const root = document.createElement('div');
    root.className = `mock mock--${V}`;
    root.innerHTML = { a: variantA, b: variantB, c: variantC }[V](d, m);
    document.querySelector('.page').prepend(root);
  });
})();
