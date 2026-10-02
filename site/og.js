/* Draws og.html, the share image, from data/race.json. Dutch only: the
 * image is one file for every visitor. Like app.js: textContent only, no innerHTML,
 * guild colours checked before use. scripts/og-image.sh screenshots it. */
'use strict';

(async () => {
  const HEX = /^#[0-9a-f]{6}$/i;
  const MAX_ROWS = 6;
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const nl = (n, d = 0) => Number(n).toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });

  const data = await (await fetch('data/race.json', { cache: 'no-cache' })).json();
  const total = data.tier.totalBosses;
  const lead = data.winner ? data.winner.guild : (data.guilds[0] || {}).name;

  if (data.winner) {
    const title = document.getElementById('ogTitle');
    title.textContent = `${data.winner.guild} haalt als eerste Cutting Edge!`;
    title.classList.add('og__title--won');
  }

  const rows = data.guilds.slice(0, MAX_ROWS).map(g => {
    const pos = g.ceKilledAt ? total : Math.min(g.racePosition, total);
    const cur = g.current;
    const where = !cur ? 'Alles verslagen'
      : cur.bestPercent === null ? `${cur.name}: nog geen pulls`
        : `${cur.name}: beste pull ${nl(cur.bestPercent, 1)}%`;
    const row = el('li', `og__row${g.name === lead ? ' og__row--lead' : ''}`);
    row.style.setProperty('--guild', HEX.test(g.colour) ? g.colour : '#818b98');
    row.style.setProperty('--pos', `${(pos / total) * 100}%`);
    const name = el('div', 'og__name');
    name.append(el('div', 'og__guild', g.name), el('div', 'og__boss', where));
    const track = el('div', 'og__track');
    track.append(el('span', 'og__fill'), el('span', 'og__finish'), el('span', 'og__dot'));
    const kills = el('div', 'og__kills', `${g.mythicKills}/${total}`);
    kills.append(el('small', '', 'M'));
    row.append(el('div', 'og__rank', String(g.rank)), name, track, kills);
    return row;
  });
  document.getElementById('ogRows').replaceChildren(...rows);
  document.getElementById('ogCe').textContent = `Cutting Edge: ${data.tier.ceBoss.name}`;
  document.getElementById('ogUpdated').textContent = `Bijgewerkt ${new Date(data.generatedAt).toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })}`;
})();
