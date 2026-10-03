/* Race to Dutch First: hall of fame.
 *
 * Draws race.json's hallOfFame each time app.js's render() fires 'race:data'
 * (on load, on fresh data and after a language switch). Per defeated boss the
 * team of the first Dutch kill, the other guilds' teams folded under it, and a
 * table of every raider. Strings are the hof.* keys in i18n.js.
 *
 * Uses app.js's globals h(), $(), tr(), day(), dayTime(), pulls(), setGuild() and
 * raiderioUrl(). Same rules as app.js: textContent only, no innerHTML, no style="".
 */
'use strict';

(() => {
  const SHOW = 25; // raiders shown before "show all"
  const ROLES = ['tank', 'healer', 'dps'];
  const tn = (key, n, vars) => i18n.tn(key, n, vars);
  let expanded = false;
  let data = null;

  function nameLink(m) {
    const url = raiderioUrl(m.url);
    return url ? h('a', { href: url, rel: 'noopener', text: m.name }) : h('span', { text: m.name });
  }

  function member(m) {
    return h('li', { class: 'hof-member', title: [m.spec, m.class, m.realm].filter(Boolean).join(' · ') },
      nameLink(m), h('span', { class: 'hof-member__spec', text: m.spec || '' }));
  }

  function roster(team) {
    if (!team.rosterKnown) return h('p', { class: 'muted-note', text: tr('hof.unknown') });
    return h('div', { class: 'hof-roster' }, ROLES.map(role => {
      const ms = team.roster.filter(m => m.role === role);
      if (!ms.length) return null;
      return h('div', { class: `hof-role hof-role--${role}` },
        h('p', { class: 'hof-role__label', text: `${tr(`hof.role.${role}`)} · ${ms.length}` }),
        h('ul', { class: 'hof-members' }, ms.map(member)));
    }));
  }

  function teamHead(team) {
    return setGuild(h('div', { class: 'hof-team__head' },
      h('span', { class: 'dot', 'aria-hidden': 'true' }),
      h('span', { class: 'hof-team__guild', text: team.guild }),
      h('span', { class: 'hof-team__when', text: day(team.defeatedAt), title: dayTime(team.defeatedAt) }),
      team.pullCount ? h('span', { class: 'hof-team__pulls', text: pulls(team.pullCount) }) : null), team);
  }

  function bossCard(boss, ce) {
    const [first, ...rest] = boss.teams;
    const isCe = ce && ce.raid === boss.raid && ce.slug === boss.slug;
    const card = h('article', { class: 'hof-boss' },
      h('div', { class: 'hof-boss__top' },
        h('h3', { class: 'hof-boss__name', text: boss.name }),
        isCe ? h('span', { class: 'ce-tag', text: 'CE' }) : null),
      h('p', { class: 'hof-boss__label', text: tr('hof.first') }),
      teamHead(first),
      roster(first));
    if (rest.length) {
      card.append(h('details', { class: 'hof-others' },
        h('summary', { text: tn('hof.others', rest.length) }),
        rest.map(t => h('div', { class: 'hof-team' }, teamHead(t), roster(t)))));
    }
    return setGuild(card, first);
  }

  /* Shared ranks: raiders with the same firsts and kills get the same number. */
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
      const row = h('tr', { class: r.firsts ? 'hof-row--first' : '' },
        h('td', { class: 'hof-num', text: String(nums[i]) }),
        h('th', { scope: 'row' }, nameLink(r), h('span', { class: 'hof-realm', text: r.realm || '' })),
        setGuild(h('td', {}, h('span', { class: 'dot', 'aria-hidden': 'true' }), ` ${r.guild}`), r),
        h('td', { class: 'hof-num hof-firsts', text: r.firsts ? String(r.firsts) : '–' }),
        h('td', { class: 'hof-num', text: String(r.kills), title: r.bosses.map(b => b.name).join(', ') }));
      row.hidden = !expanded && i >= SHOW;
      return row;
    });
    $('#hofRaiders').replaceChildren(
      h('thead', {}, h('tr', {}, cols.map(c => h('th', { scope: 'col', class: c === 'raider' || c === 'guild' ? '' : 'hof-num', text: tr(`hof.col.${c}`) })))),
      h('tbody', {}, rows));

    const more = $('#hofMore');
    if (raiders.length <= SHOW) { more.replaceChildren(); return; }
    const btn = h('button', {
      type: 'button', class: 'pill pill--action', 'aria-controls': 'hofRaiders',
      'aria-expanded': String(expanded),
      text: expanded ? tr('hof.less') : tr('hof.more', { n: raiders.length }),
    });
    btn.addEventListener('click', () => { expanded = !expanded; raidersTable(raiders); });
    more.replaceChildren(btn);
  }

  function render() {
    const fame = data && data.hallOfFame;
    const section = $('#hallOfFame');
    if (!fame) { section.hidden = true; return; }
    section.hidden = false;
    const ce = data.tier && data.tier.ceBoss;
    $('#hofBosses').replaceChildren(...(fame.bosses.length
      ? fame.bosses.map(b => bossCard(b, ce))
      : [h('p', { class: 'muted-note', text: tr('hof.empty') })]));
    raidersTable(fame.raiders || []);
  }

  document.addEventListener('race:data', e => { data = e.detail; render(); });
  // race.json can arrive before this file has loaded; app.js keeps it in `race`.
  if (typeof race !== 'undefined' && race) { data = race; render(); }
})();
