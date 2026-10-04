/* Hall of fame redesign mockups (not shipped). Variant from <body data-mock="a|b|c">.
   Runs after app.js and halloffame.js on a copy of the real page with the real race.json
   (or ?season=s1), replaces #hallOfFame's contents and draws the variant. NL only.
   Uses app.js globals: h(), s(), setGuild(), bossArtFor(), day(), raiderioUrl(), isArchive(). */
'use strict';

(() => {
  const V = document.body.dataset.mock;
  const DAY = 86400000;
  const CLASS = {
    'Death Knight': '#c41e3a', 'Demon Hunter': '#a330c9', Druid: '#ff7c0a', Evoker: '#33937f',
    Hunter: '#aad372', Mage: '#3fc7eb', Monk: '#00ff98', Paladin: '#f48cba', Priest: '#eef1f5',
    Rogue: '#fff468', Shaman: '#0070dd', Warlock: '#8788ee', Warrior: '#c69b6d',
  };
  const ROLES = [['tank', 'Tanks'], ['healer', 'Healers'], ['dps', 'DPS']];

  const star = cls => s('svg', { class: `hm-star ${cls || ''}`, viewBox: '0 0 16 16', 'aria-hidden': 'true' },
    s('path', { d: 'M8 1.6l1.9 4.2 4.5.4-3.4 3 1 4.5L8 11.4l-4 2.3 1-4.5-3.4-3 4.5-.4z' }));
  const chev = () => h('span', { class: 'hm-chev', 'aria-hidden': 'true' });
  const pullsTxt = n => n ? `${n} ${n === 1 ? 'pull' : 'pulls'}` : null;

  function model(d) {
    const fame = d.hallOfFame || { bosses: [], raiders: [] };
    const start = new Date(`${d.tier.start}T00:00:00`);
    const dayN = iso => Math.round((new Date(new Date(iso).toDateString()) - start) / DAY) + 1;
    const ce = d.tier.ceBoss || {};
    const bosses = d.tier.raids.flatMap(r => r.bosses.map(b => {
      const f = fame.bosses.find(x => x.raid === r.slug && x.slug === b.slug);
      const teams = f ? f.teams : [];
      const first = teams[0];
      return {
        name: b.name, slug: b.slug, raid: r.slug, isCe: ce.raid === r.slug && ce.slug === b.slug,
        teams, first, rest: teams.slice(1),
        t: first ? +new Date(first.defeatedAt) : Infinity,
        day: first ? dayN(first.defeatedAt) : null,
      };
    }));
    const guildKills = Object.fromEntries(d.guilds.map(g => [g.name, g.bosses.filter(b => b.defeatedAt).length]));
    return { bosses, raiders: fame.raiders || [], guilds: d.guilds, guildKills, dayN };
  }

  // Days after the first kill, as "+4 d".
  const after = (b, t) => {
    const n = Math.round((new Date(new Date(t.defeatedAt).toDateString()) - new Date(new Date(b.first.defeatedAt).toDateString())) / DAY);
    return n ? `+${n} d` : 'zelfde dag';
  };

  function art(b, cls) {
    const srcs = bossArtFor(b.name);
    return h('div', { class: `hm-art ${cls || ''}${srcs.length > 1 ? ' hm-art--duo' : ''}`, 'aria-hidden': 'true' },
      srcs.length ? srcs.map(src => h('img', { src, alt: '', loading: 'lazy' }))
        : h('b', { class: 'hm-art__mono', text: b.name.trim()[0] }));
  }

  function chip(t, extra) {
    return setGuild(h('span', { class: 'hm-chip' }, h('i', { 'aria-hidden': 'true' }), h('span', { text: t.guild }),
      extra ? h('em', { text: extra }) : null), t);
  }

  function nameLink(m) {
    const url = raiderioUrl(m.url);
    return url ? h('a', { href: url, rel: 'noopener', text: m.name }) : h('span', { text: m.name });
  }

  // The team as running text per role: names, not a grid of cells.
  function inscription(team) {
    if (!team.rosterKnown) return h('p', { class: 'hm-muted', text: 'Team onbekend: deze kill kennen we alleen uit Warcraft Logs.' });
    return h('div', { class: 'hm-ins' }, ROLES.map(([role, label]) => {
      const ms = team.roster.filter(m => m.role === role);
      if (!ms.length) return null;
      return h('p', { class: 'hm-ins__row' }, h('span', { class: 'hm-ins__role', text: `${label} ${ms.length}` }),
        h('span', { class: 'hm-ins__names' }, ms.map(m => h('span', { class: 'hm-ins__n', title: [m.spec, m.class, m.realm].filter(Boolean).join(' · ') }, nameLink(m)))));
    }));
  }

  // A WoW raid frame: a cell per raider, the class colour as its bar.
  function raidFrame(team) {
    if (!team.rosterKnown) return inscription(team);
    return h('div', { class: 'hm-frame' }, ROLES.map(([role, label]) => {
      const ms = team.roster.filter(m => m.role === role);
      if (!ms.length) return null;
      return h('div', { class: `hm-frame__grp hm-frame__grp--${role}` },
        h('p', { class: 'hm-frame__role', text: `${label} · ${ms.length}` }),
        h('ul', { class: 'hm-frame__cells' }, ms.map(m => {
          const li = h('li', { class: 'hm-cell', title: [m.class, m.realm].filter(Boolean).join(' · ') },
            nameLink(m), h('span', { class: 'hm-cell__spec', text: m.spec || '' }));
          li.style.setProperty('--cls', CLASS[m.class] || '#818b98');
          return li;
        })));
    }));
  }

  function ribbon(t, { big = false } = {}) {
    return setGuild(h('div', { class: `hm-rib${big ? ' hm-rib--big' : ''}` },
      h('span', { class: 'hm-rib__acc' }, star()), h('span', { class: 'hm-rib__name', text: t.guild })), t);
  }

  function head(title, cap) {
    return [h('h2', { id: 'hofHeading', class: 'view__title', text: title }), h('p', { class: 'section-caption', text: cap })];
  }

  /* ---- A · Trofeeënkast ------------------------------------------------------------------ */
  function plaque(b, open) {
    const el = h('article', { class: `hfa-plaque${b.isCe ? ' hfa-plaque--ce' : ''}${b.first ? '' : ' is-empty'}${open ? ' is-open' : ''}` });
    const body = h('div', { class: 'hfa-plaque__body' });
    if (b.first) {
      body.append(...[
        h('p', { class: 'hfa-label' }, star('hm-star--gold'), h('span', { class: 'hfa-label__long', text: 'Eerste kill ·' }), h('span', { text: `dag ${b.day}` })),
        h('h3', { class: 'hfa-boss' }, h('span', { text: b.name }), b.isCe ? h('span', { class: 'ce-tag', text: 'CE' }) : null),
        ribbon(b.first, { big: b.isCe }),
        h('p', { class: 'hfa-meta' }, h('span', { class: 'mono', text: day(b.first.defeatedAt) }), pullsTxt(b.first.pullCount) ? h('span', { text: pullsTxt(b.first.pullCount) }) : null),
        b.rest.length ? h('ol', { class: 'hfa-after', 'aria-label': 'Daarna' }, b.rest.map((t, i) =>
          h('li', {}, h('span', { class: 'hfa-after__n mono', text: String(i + 2) }), chip(t, after(b, t))))) : null].filter(Boolean));
      const btn = h('button', { type: 'button', class: 'hfa-toggle', 'aria-expanded': String(!!open) }, chev(),
        h('span', { text: open ? 'Team verbergen' : `Bekijk het team · ${b.first.roster.length || '?'}` }));
      btn.addEventListener('click', () => {
        const isOpen = el.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(isOpen));
        btn.lastChild.textContent = isOpen ? 'Team verbergen' : `Bekijk het team · ${b.first.roster.length || '?'}`;
      });
      body.append(btn, h('div', { class: 'hfa-team' }, inscription(b.first)));
    } else {
      body.append(
        h('p', { class: 'hfa-label hfa-label--empty', text: b.isCe ? 'De laatste trofee' : 'Nog te verdienen' }),
        h('h3', { class: 'hfa-boss' }, h('span', { text: b.name }), b.isCe ? h('span', { class: 'ce-tag', text: 'CE' }) : null),
        h('p', { class: 'hfa-meta', text: 'Nog door niemand verslagen op Mythic' }));
    }
    el.append(art(b, 'hfa-plaque__art'), body);
    return el;
  }

  function honourRoll(m) {
    const tiers = [...new Set(m.raiders.map(r => r.firsts).filter(Boolean))].sort((a, b) => b - a);
    return h('div', { class: 'hfa-roll' }, tiers.map(n => {
      const rs = m.raiders.filter(r => r.firsts === n);
      return h('div', { class: 'hfa-roll__tier' },
        h('p', { class: 'hfa-roll__n' }, h('b', { class: 'mono', text: String(n) }), h('span', { text: n === 1 ? 'eerste kill' : 'eerste kills' })),
        h('ul', { class: 'hfa-roll__names' }, rs.map(r => setGuild(h('li', { title: `${r.guild} · ${r.realm || ''}` },
          h('i', { 'aria-hidden': 'true' }), nameLink(r)), r))));
    }));
  }

  function variantA(d, m) {
    const ce = m.bosses.find(b => b.isCe);
    const rest = m.bosses.filter(b => !b.isCe).sort((a, b) => a.t - b.t);
    return [
      ...head('Hall of fame', 'Elke boss van de race en de guild die hem als eerste versloeg. Open een trofee voor het team.'),
      h('div', { class: 'hfa-wall' }, plaque(ce, !!ce.first), rest.map(b => plaque(b, false))),
      h('h3', { class: 'hof-subtitle', text: 'Erelijst' }),
      h('p', { class: 'section-caption', text: 'Raiders per aantal eerste kills van de race. Een alt telt apart.' }),
      honourRoll(m),
      h('div', { class: 'hof-more' }, h('button', { type: 'button', class: 'pill pill--action', text: `Toon alle ${m.raiders.length} raiders` })),
    ];
  }

  /* ---- B · Raid journal --------------------------------------------------------------------- */
  function stage(b) {
    if (!b.first) {
      return h('div', { class: 'hfb-stage is-empty' }, art(b, 'hfb-stage__art'),
        h('div', { class: 'hfb-stage__info' },
          h('p', { class: 'hfa-label hfa-label--empty', text: b.isCe ? 'De laatste trofee' : 'Nog te verdienen' }),
          h('h3', { class: 'hfb-boss', text: b.name }),
          h('p', { class: 'hfb-meta', text: 'Nog door niemand verslagen op Mythic.' })));
    }
    return h('div', { class: 'hfb-stage' }, art(b, 'hfb-stage__art'),
      h('div', { class: 'hfb-stage__info' },
        h('p', { class: 'hfa-label' }, star('hm-star--gold'), h('span', { text: `Eerste kill · dag ${b.day}` })),
        setGuild(h('h3', { class: 'hfb-guild' }, h('i', { 'aria-hidden': 'true' }), h('span', { text: b.first.guild })), b.first),
        h('p', { class: 'hfb-meta' }, h('span', { text: `${b.name} Mythic` }), h('span', { class: 'mono', text: day(b.first.defeatedAt) }),
          pullsTxt(b.first.pullCount) ? h('span', { text: pullsTxt(b.first.pullCount) }) : null),
        raidFrame(b.first),
        b.rest.length ? h('div', { class: 'hfb-after' }, h('p', { class: 'hfb-after__h', text: 'Daarna' }),
          h('ol', {}, b.rest.map((t, i) => h('li', {},
            h('span', { class: 'hfa-after__n mono', text: String(i + 2) }), chip(t),
            h('span', { class: 'mono hfb-after__d', text: day(t.defeatedAt) }), h('em', { text: after(b, t) }),
            pullsTxt(t.pullCount) ? h('span', { class: 'hfb-after__p', text: pullsTxt(t.pullCount) }) : null)))) : null));
  }

  function everPresent(m) {
    return h('div', { class: 'hfb-present' }, m.guilds.map(g => {
      const k = m.guildKills[g.name];
      if (!k) return null;
      const rs = m.raiders.filter(r => r.guild === g.name && r.kills === k);
      return setGuild(h('div', { class: 'hfb-present__row' },
        h('div', { class: 'hm-rib' }, h('span', { class: 'hm-rib__acc hm-rib__acc--n mono', text: String(rs.length) }), h('span', { class: 'hm-rib__name', text: g.name })),
        h('p', { class: 'hfb-present__txt' },
          h('span', { class: 'hfb-present__cap', text: rs.length ? `bij alle ${k} kills` : `niemand bij alle ${k} kills` }),
          h('span', { class: 'hfb-present__names' }, rs.map(r => h('span', { class: 'hm-ins__n' }, nameLink(r)))))), g);
    }));
  }

  function variantB(d, m) {
    const list = m.bosses;
    const ce = list.find(b => b.isCe);
    let cur = ce.first ? ce : list.filter(b => b.first).sort((a, b) => b.t - a.t)[0] || list[0];
    const box = h('div', { class: 'hfb-box' });
    const tabs = h('div', { class: 'hfb-tabs', role: 'tablist', 'aria-label': 'Bosses' });
    const draw = () => {
      box.replaceChildren(stage(cur));
      for (const t of tabs.children) t.setAttribute('aria-selected', String(t.dataset.slug === `${cur.raid}/${cur.slug}`));
    };
    for (const b of list) {
      const t = h('button', { type: 'button', role: 'tab', class: `hfb-tab${b.first ? '' : ' is-empty'}`, 'data-slug': `${b.raid}/${b.slug}`, title: b.name },
        art(b, 'hfb-tab__head'), h('span', { class: 'hfb-tab__name', text: b.name }),
        b.first ? h('span', { class: 'hfb-tab__day mono' }, star('hm-star--gold'), `dag ${b.day}`) : h('span', { class: 'hfb-tab__day', text: b.isCe ? 'CE' : '—' }));
      t.addEventListener('click', () => { cur = b; draw(); });
      tabs.append(t);
    }
    draw();
    return [
      ...head('Hall of fame', 'Kies een boss: de eerste kill van de race, het team in zijn raidframe en wie daarna volgde.'),
      tabs, box,
      h('h3', { class: 'hof-subtitle', text: 'Altijd paraat' }),
      h('p', { class: 'section-caption', text: 'Per guild de raiders die bij elke Mythic-kill van hun guild waren.' }),
      everPresent(m),
      h('div', { class: 'hof-more' }, h('button', { type: 'button', class: 'pill pill--action', text: `Toon alle ${m.raiders.length} raiders` })),
    ];
  }

  /* ---- C · Gedenkrol (stays folded) --------------------------------------------------------- */
  function rollRow(b, open) {
    const li = h('li', { class: `hfc-row${b.first ? '' : ' is-empty'}${open ? ' is-open' : ''}` });
    const line = h('div', { class: 'hfc-line' },
      h('span', { class: 'hfc-day mono', text: b.first ? `dag ${b.day}` : '—' }),
      art(b, 'hfc-head'),
      h('p', { class: 'hfc-boss' }, h('span', { text: b.name }), b.isCe ? h('span', { class: 'ce-tag', text: 'CE' }) : null),
      b.first ? h('div', { class: 'hfc-first' }, ribbon(b.first), h('span', { class: 'mono hfc-date', text: day(b.first.defeatedAt) }),
        pullsTxt(b.first.pullCount) ? h('span', { class: 'hfc-pulls', text: pullsTxt(b.first.pullCount) }) : null)
        : h('p', { class: 'hfc-none', text: 'Nog door niemand verslagen' }),
      h('div', { class: 'hfc-after' }, b.rest.map(t => chip(t, after(b, t)))));
    li.append(line);
    if (b.first) {
      const btn = h('button', { type: 'button', class: 'hfc-toggle', 'aria-expanded': String(!!open), 'aria-label': `Team van ${b.first.guild} op ${b.name}` }, chev());
      btn.addEventListener('click', () => btn.setAttribute('aria-expanded', String(li.classList.toggle('is-open'))));
      line.append(btn);
      li.append(h('div', { class: 'hfc-team' }, inscription(b.first)));
    }
    return li;
  }

  function memorial(m) {
    const rs = m.raiders.filter(r => r.firsts).slice().sort((a, b) => b.firsts - a.firsts || a.name.localeCompare(b.name));
    const max = Math.max(...rs.map(r => r.firsts));
    return h('p', { class: 'hfc-wall' }, rs.map(r => {
      const tier = Math.max(1, Math.min(5, Math.ceil((r.firsts / max) * 5)));
      return setGuild(h('span', { class: `hfc-wall__n hfc-wall__n--${tier}`, title: `${r.guild} · ${r.firsts} eerste ${r.firsts === 1 ? 'kill' : 'kills'}` },
        nameLink(r), h('sup', { class: 'mono', text: String(r.firsts) })), r);
    }));
  }

  function variantC(d, m) {
    const killed = m.bosses.filter(b => b.first).sort((a, b) => a.t - b.t);
    const todo = m.bosses.filter(b => !b.first);
    const teaser = h('span', { class: 'hfc-teaser', 'aria-hidden': 'true' }, m.bosses.map(b =>
      h('span', { class: `hfc-teaser__t${b.first ? '' : ' is-empty'}` }, art(b, 'hfc-teaser__head'), b.first ? star('hm-star--gold') : null)));
    const det = h('details', { class: 'fold', open: true },
      h('summary', { class: 'fold__summary disclose' },
        h('h2', { id: 'hofHeading', class: 'fold__title', text: 'Hall of fame' }),
        h('span', { class: 'fold__hint', text: `${killed.length} van ${m.bosses.length} trofeeën · ${m.raiders.filter(r => r.firsts).length} raiders` }),
        teaser),
      h('p', { class: 'section-caption', text: 'De eerste kills van de race, in volgorde. Open een rij voor het team.' }),
      h('ol', { class: 'hfc-roll' }, killed.map((b, i) => rollRow(b, i === killed.length - 1)), todo.map(b => rollRow(b, false))),
      h('h3', { class: 'hof-subtitle', text: 'Gedenkmuur' }),
      h('p', { class: 'section-caption', text: 'Iedereen die bij een eerste kill van de race was. Hoe groter de naam, hoe vaker.' }),
      memorial(m),
      h('div', { class: 'hof-more' }, h('button', { type: 'button', class: 'pill pill--action', text: `Toon alle ${m.raiders.length} raiders` })));
    return [det];
  }

  function render(d) {
    const sec = document.getElementById('hallOfFame');
    if (!sec || !d || !d.hallOfFame) return;
    const m = model(d);
    sec.hidden = false;
    sec.className = `view hm hm--${V}`;
    sec.replaceChildren(...(V === 'a' ? variantA(d, m) : V === 'b' ? variantB(d, m) : variantC(d, m)));
  }

  document.addEventListener('race:data', e => setTimeout(() => render(e.detail), 0));
  if (typeof race !== 'undefined' && race) render(race);
})();
