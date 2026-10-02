/** Race to Dutch First — app.js
 *  Loads data/race.json and draws everything with inline SVG.
 *  No frameworks, no CDN scripts.
 */

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function el(tag, attrs = {}, children = []) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const c of children) if (c) e.appendChild(c);
  return e;
}

function svgEl(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const c of children) if (c) e.appendChild(c);
  return e;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' });
}

/* ------------------------------------------------------------------ */
/*  De race — track with guild lanes                                  */
/* ------------------------------------------------------------------ */

function drawRaceTrack(container, guilds, tier) {
  const totalBosses = 9; // Venomous Abyss bosses
  const ceIdx = totalBosses; // finish line at boss index 9

  container.innerHTML = '';

  // Boss marks along the track (0.5 = between bosses for visual clarity)
  const bossMarks = [];
  for (let i = 1; i <= totalBosses; i++) {
    const pct = (i / ceIdx) * 100;
    const isCE = (i === ceIdx);
    bossMarks.push(svgEl('div', {
      class: 'race-boss-mark' + (isCE ? ' race-boss-mark--ce' : ''),
      style: `left:${pct}%`
    }));
  }

  guilds.forEach(g => {
    const lane = svgEl('div', { class: 'race-lane' });

    // Name
    const name = svgEl('div', { class: 'race-lane__name' });
    name.textContent = g.name;
    lane.appendChild(name);

    // Track
    const track = svgEl('div', { class: 'race-lane__track' });

    // Boss marks
    const marksWrap = svgEl('div', { class: 'race-boss-marks' });
    bossMarks.forEach(m => marksWrap.appendChild(m));
    track.appendChild(marksWrap);

    // Marker at guild's position (clamped 0..100%)
    const pos = Math.min(g.race_position / (totalBosses + 1) * 100, 100);
    const marker = svgEl('div', {
      class: 'race-lane__marker' + (g.rank === 1 ? ' race-lane__marker--leader' : ''),
      style: `left:${pos}%;background:${g.colour}`
    });
    track.appendChild(marker);

    // Boss labels under track
    const labels = svgEl('div', { class: 'race-boss-labels' });
    for (let i = 1; i <= totalBosses; i++) {
      const pct = (i / ceIdx) * 100;
      if (i === 1 || i % 3 === 0 || i === totalBosses) {
        const lbl = svgEl('span', {}, [document.createTextNode(i)]);
        labels.appendChild(lbl);
      }
    }

    lane.appendChild(track);
    container.appendChild(lane);
  });
}

/* ------------------------------------------------------------------ */
/*  Klassement — guild cards                                          */
/* ------------------------------------------------------------------ */

function drawKlassement(container, guilds) {
  container.innerHTML = '';

  guilds.forEach(g => {
    const va = g.progression['the-venomous-abyss'];
    const tg = g.progression['the-tidebound-grotto'];
    const totalMythic = va.mythic_bosses_killed + tg.mythic_bosses_killed;
    const totalHeroic = va.heroic_bosses_killed + tg.heroic_bosses_killed;
    const vaTotal = Math.max(va.total_bosses, 9);
    const tgTotal = Math.max(tg.total_bosses, 1);

    // Card wrapper
    const cardWrap = document.createElement('div');
    cardWrap.className = 'rcard-wrap';

    const cap = document.createElement('div');
    cap.className = 'rcard__cap';
    cap.textContent = `#${g.rank}`;
    cardWrap.appendChild(cap);

    const card = document.createElement('div');
    card.className = 'rcard';

    const inner = document.createElement('div');
    inner.className = 'rcard__in';

    // Name & realm
    const nameEl = document.createElement('div');
    nameEl.className = 'tile__name';
    nameEl.textContent = g.name;
    nameEl.style.color = g.colour;
    inner.appendChild(nameEl);

    const realmEl = document.createElement('div');
    realmEl.className = 'tile__realm';
    realmEl.textContent = `${g.realm} · EU`;
    inner.appendChild(realmEl);

    // Bars
    const bars = document.createElement('div');
    bars.className = 'tile__bars';

    // Mythic bar
    const mythicRow = document.createElement('div');
    mythicRow.className = 'bar-row';
    const mythicLabel = document.createElement('span');
    mythicLabel.className = 'bar-label';
    mythicLabel.textContent = 'Mythisch';
    const mythicTrack = document.createElement('div');
    mythicTrack.className = 'bar-track';
    const mythicFill = document.createElement('div');
    mythicFill.className = 'bar-fill bar-fill--mythic';
    const mypct = Math.min((totalMythic / (vaTotal + tgTotal)) * 100, 100);
    mythicFill.style.width = `${mypct}%`;
    mythicTrack.appendChild(mythicFill);
    const mythicVal = document.createElement('span');
    mythicVal.className = 'bar-value';
    mythicVal.textContent = `${totalMythic}/${vaTotal + tgTotal}`;
    mythicRow.append(mythicLabel, mythicTrack, mythicVal);
    bars.appendChild(mythicRow);

    // Heroic bar
    const heroicRow = document.createElement('div');
    heroicRow.className = 'bar-row';
    const heroicLabel = document.createElement('span');
    heroicLabel.className = 'bar-label';
    heroicLabel.textContent = 'Heroisch';
    const heroicTrack = document.createElement('div');
    heroicTrack.className = 'bar-track';
    const heroicFill = document.createElement('div');
    heroicFill.className = 'bar-fill bar-fill--heroic';
    const hpct = Math.min((totalHeroic / (vaTotal + tgTotal)) * 100, 100);
    heroicFill.style.width = `${hpct}%`;
    heroicTrack.appendChild(heroicFill);
    const heroicVal = document.createElement('span');
    heroicVal.className = 'bar-value';
    heroicVal.textContent = `${totalHeroic}/${vaTotal + tgTotal}`;
    heroicRow.append(heroicLabel, heroicTrack, heroicVal);
    bars.appendChild(heroicRow);

    inner.appendChild(bars);

    // Current boss info
    const cb = g.current_boss;
    if (cb.boss) {
      const bossInfo = document.createElement('div');
      bossInfo.className = 'tile__boss-info';
      const currentBossName = cb.isDefeated ? `${cb.bossName || cb.boss} ✓` : cb.bossName || cb.boss;
      bossInfo.innerHTML = `<strong>Huidige boss:</strong> ${currentBossName}`;
      if (!cb.isDefeated) {
        bossInfo.innerHTML += ` — <strong>${cb.bestPercent.toFixed(1)}%</strong> over ${cb.pullCount} pull${cb.pullCount !== 1 ? 's' : ''}`;
      }
      inner.appendChild(bossInfo);
    }

    // World rank
    const worldRank = g.rankings['the-venomous-abyss']?.mythic?.world;
    if (worldRank) {
      const rankEl = document.createElement('div');
      rankEl.className = 'tile__world-rank';
      rankEl.textContent = `Wereldrang: #${worldRank}`;
      inner.appendChild(rankEl);
    }

    card.appendChild(inner);
    cardWrap.appendChild(card);
    container.appendChild(cardWrap);
  });
}

/* ------------------------------------------------------------------ */
/*  Voortgang — timeline chart (step line SVG)                        */
/* ------------------------------------------------------------------ */

function drawTimeline(container, guilds, tier) {
  // Collect all kill dates across guilds
  const startDate = new Date('2026-08-19');
  const endDate = new Date();
  const days = Math.max(1, Math.ceil((endDate - startDate) / 86400000));

  // Build data points per guild
  const pointsPerGuild = guilds.map(g => {
    const kills = g.boss_kill_dates.filter(k => k.defeatedAt);
    kills.sort((a, b) => new Date(a.defeatedAt) - new Date(b.defeatedAt));
    return kills;
  });

  // SVG dimensions
  const W = Math.max(600, container.clientWidth || 600);
  const H = 240;
  const pad = { top: 20, right: 20, bottom: 30, left: 40 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;

  // Max kills for Y scale
  let maxKills = 10;
  guilds.forEach(g => {
    const va = g.progression['the-venomous-abyss'];
    const tg = g.progression['the-tidebound-grotto'];
    const total = va.mythic_bosses_killed + tg.mythic_bosses_killed;
    if (total > maxKills) maxKills = total;
  });

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'Voortgang over tijd' });

  // Y axis grid lines and labels
  for (let i = 0; i <= maxKills; i++) {
    const y = pad.top + ch - (i / maxKills) * ch;
    svg.appendChild(el('line', { x1: pad.left, x2: pad.left + cw, y1: y, y2: y, stroke: 'var(--ink-700)', 'stroke-width': 1 }));
    const lbl = el('text', { x: pad.left - 6, y: y + 4, fill: 'var(--ink-400)', 'font-size': '10', 'text-anchor': 'end', 'font-family': 'var(--f-mono)' });
    lbl.textContent = i;
    svg.appendChild(lbl);
  }

  // X axis labels
  const xLabels = ['Aug', 'Sep', 'Okt'];
  xLabels.forEach((label, i) => {
    const x = pad.left + (i / (xLabels.length - 1)) * cw;
    const lbl = el('text', { x, y: H - 6, fill: 'var(--ink-400)', 'font-size': '10', 'text-anchor': 'middle' });
    lbl.textContent = label;
    svg.appendChild(lbl);
  });

  // Draw step lines per guild
  guilds.forEach(g => {
    const kills = g.boss_kill_dates.filter(k => k.defeatedAt);
    if (kills.length === 0) return;

    kills.sort((a, b) => new Date(a.defeatedAt) - new Date(b.defeatedAt));

    let pathD = '';
    let cumKills = 0;
    kills.forEach((k, i) => {
      const d = new Date(k.defeatedAt);
      const x = pad.left + ((d - startDate) / (endDate - startDate)) * cw;
      cumKills++;
      const y = pad.top + ch - (cumKills / maxKills) * ch;
      if (i === 0) {
        pathD += `M${x},${y}`;
      } else {
        // Step line: horizontal then vertical
        const prevY = pad.top + ch - ((cumKills - 1) / maxKills) * ch;
        pathD += `H${x}V${y}`;
      }
    });

    svg.appendChild(el('path', {
      d: pathD,
      fill: 'none',
      stroke: g.colour,
      'stroke-width': 2,
      'stroke-linejoin': 'round'
    }));

    // Last point dot
    const last = kills[kills.length - 1];
    const lx = pad.left + ((new Date(last.defeatedAt) - startDate) / (endDate - startDate)) * cw;
    const ly = pad.top + ch - (cumKills / maxKills) * ch;
    svg.appendChild(el('circle', { cx: lx, cy: ly, r: 3, fill: g.colour }));
  });

  container.appendChild(svg);
}

/* ------------------------------------------------------------------ */
/*  Per boss — grid                                                   */
/* ------------------------------------------------------------------ */

function drawBossGrid(container, guilds, tier) {
  // Build rows: bosses in order from raids
  const rows = [];
  let rowIdx = 0;
  for (const raid of tier.raids) {
    if (raid.slug === 'the-venomous-abyss') {
      // Show first boss, then current boss bar, then remaining
      const allBosses = raid.bosses;
      rows.push({ raid: raid.name, bosses: [allBosses[0]] }); // nekzali (first kill)
      rowIdx++;
    } else if (raid.slug === 'the-tidebound-grotto') {
      rows.push({ raid: raid.name, bosses: raid.bosses });
      rowIdx++;
    }
  }

  // Actually let's simplify: show all VA bosses as rows + TG boss
  container.innerHTML = '';
  const guildNames = guilds.map(g => g.name);

  // Create header row
  const headerCell = document.createElement('div');
  headerCell.className = 'boss-cell boss-cell--header';
  headerCell.textContent = 'Boss';
  container.appendChild(headerCell);

  guildNames.forEach(n => {
    const h = document.createElement('div');
    h.className = 'boss-cell boss-cell--header';
    h.textContent = n;
    container.appendChild(h);
  });

  // VA bosses rows (simplified: show first kill and current boss)
  const vaBosses = tier.raids[0].bosses;
  vaBosses.forEach((boss, bi) => {
    const label = document.createElement('div');
    label.className = 'boss-cell boss-cell--header';
    label.textContent = boss;
    container.appendChild(label);

    guilds.forEach(g => {
      const cell = document.createElement('div');
      cell.className = 'boss-cell';

      // Check if this guild killed this boss
      const kills = g.boss_kill_dates.filter(k => k.boss === `the-venomous-abyss:${boss}` && k.defeatedAt);
      if (kills.length > 0) {
        cell.classList.add('boss-cell--killed');
        if (bi === 0) cell.classList.add('boss-cell--first-kill'); // first boss = gold for everyone who killed it
        const dateEl = document.createElement('span');
        dateEl.className = 'boss-cell__date';
        dateEl.textContent = fmtDate(kills[0].defeatedAt);
        cell.appendChild(dateEl);
        const pullsEl = document.createElement('span');
        pullsEl.className = 'boss-cell__pulls';
        pullsEl.textContent = `${kills.length} pull`;
        cell.appendChild(pullsEl);
      } else if (g.current_boss.boss === boss && !g.current_boss.isDefeated) {
        // Current boss with progress bar
        cell.classList.add('boss-cell--current');
        const bar = document.createElement('div');
        bar.className = 'boss-cell__bar';
        const fill = document.createElement('div');
        fill.className = 'boss-cell__fill';
        fill.style.width = `${100 - g.current_boss.bestPercent}%`;
        bar.appendChild(fill);
        cell.appendChild(bar);
        const pctEl = document.createElement('span');
        pctEl.className = 'boss-cell__date';
        pctEl.textContent = `${g.current_boss.bestPercent.toFixed(1)}%`;
        cell.appendChild(pctEl);
      } else {
        cell.classList.add('boss-cell--dim');
      }

      container.appendChild(cell);
    });
  });

  // TG boss row
  const tgBoss = tier.raids[1].bosses[0];
  const tgLabel = document.createElement('div');
  tgLabel.className = 'boss-cell boss-cell--header';
  tgLabel.textContent = tgBoss;
  container.appendChild(tgLabel);

  guilds.forEach(g => {
    const cell = document.createElement('div');
    cell.className = 'boss-cell';
    const kills = g.boss_kill_dates.filter(k => k.boss === `the-tidebound-grotto:${tgBoss}` && k.defeatedAt);
    if (kills.length > 0) {
      cell.classList.add('boss-cell--killed');
      const dateEl = document.createElement('span');
      dateEl.className = 'boss-cell__date';
      dateEl.textContent = fmtDate(kills[0].defeatedAt);
      cell.appendChild(dateEl);
    } else {
      cell.classList.add('boss-cell--dim');
    }
    container.appendChild(cell);
  });
}

/* ------------------------------------------------------------------ */
/*  Huidige boss — best-% curves                                      */
/* ------------------------------------------------------------------ */

function drawCurves(container, guilds) {
  guilds.forEach(g => {
    const pulls = g.boss_pulls || [];
    if (pulls.length === 0) return;

    const cardWrap = document.createElement('div');
    cardWrap.className = 'rcard-wrap curve-card';

    const cap = document.createElement('div');
    cap.className = 'rcard__cap';
    cap.textContent = g.name;
    cardWrap.appendChild(cap);

    const card = document.createElement('div');
    card.className = 'rcard';

    const inner = document.createElement('div');
    inner.className = 'rcard__in';

    const title = document.createElement('div');
    title.className = 'curve-card__title';
    const bossName = g.current_boss.bossName || g.current_boss.boss;
    title.textContent = `${bossName} — hoe dichtbij?`;
    inner.appendChild(title);

    // SVG curve: pulls on x-axis, health% (100 - encounter_health.overall_percent * 100) on y-axis
    const W = 260;
    const H = 140;
    const pad = { top: 10, right: 10, bottom: 20, left: 35 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, role: 'img', 'aria-label': `Beste %-curve voor ${g.name}` });

    // Sort pulls by time
    const sorted = [...pulls].sort((a, b) => new Date(a.details.pull_started_at || a.details.started_at) - new Date(b.details.pull_started_at || b.details.started_at));

    // Y axis: 100% health (left) to 0% health (right) — but we show progress left-to-right
    // Actually, let's show "how close" on y-axis: higher = closer to kill (lower health remaining)
    // x-axis = pull number, y-axis = boss health at end of pull (overall_percent * 100)
    const maxHealth = 100;

    // Y axis labels
    [0, 25, 50, 75, 100].forEach(v => {
      const y = pad.top + ch - (v / maxHealth) * ch;
      const lbl = el('text', { x: pad.left - 4, y: y + 3, fill: 'var(--ink-400)', 'font-size': '9', 'text-anchor': 'end', 'font-family': 'var(--f-mono)' });
      lbl.textContent = `${v}%`;
      svg.appendChild(lbl);
    });

    // Draw line
    let pathD = '';
    sorted.forEach((p, i) => {
      const healthPct = (p.details.encounter_health?.overall_percent ?? 0) * 100;
      const x = pad.left + (i / Math.max(sorted.length - 1, 1)) * cw;
      const y = pad.top + ch - (healthPct / maxHealth) * ch;
      if (i === 0) pathD += `M${x},${y}`;
      else pathD += `L${x},${y}`;
    });

    svg.appendChild(el('path', {
      d: pathD,
      fill: 'none',
      stroke: g.colour,
      'stroke-width': 2,
      'stroke-linejoin': 'round'
    }));

    // Dots
    sorted.forEach((p, i) => {
      const healthPct = (p.details.encounter_health?.overall_percent ?? 0) * 100;
      const x = pad.left + (i / Math.max(sorted.length - 1, 1)) * cw;
      const y = pad.top + ch - (healthPct / maxHealth) * ch;
      svg.appendChild(el('circle', { cx: x, cy: y, r: 3, fill: g.colour }));
    });

    inner.appendChild(svg);
    card.appendChild(inner);
    cardWrap.appendChild(card);
    container.appendChild(cardWrap);
  });
}

/* ------------------------------------------------------------------ */
/*  Footer                                                            */
/* ------------------------------------------------------------------ */

function drawFooter(container, generatedAt) {
  const updated = new Date(generatedAt);
  const diffMin = Math.round((Date.now() - updated.getTime()) / 60000);
  container.textContent = `Bijgewerkt ${diffMin} minuten geleden`;
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

async function init() {
  try {
    const resp = await fetch('data/race.json');
    const data = await resp.json();

    const { guilds, tier } = data;

    // Section 1: De race
    drawRaceTrack(document.getElementById('raceTrack'), guilds, tier);

    // Section 2: Klassement
    drawKlassement(document.getElementById('klassementGrid'), guilds);

    // Section 3: Voortgang
    drawTimeline(document.getElementById('timelineChart'), guilds, tier);

    // Section 4: Per boss
    drawBossGrid(document.getElementById('bossGrid'), guilds, tier);

    // Section 5: Huidige boss
    drawCurves(document.getElementById('curvesGrid'), guilds);

    // Footer
    drawFooter(document.getElementById('updatedText'), data.generatedAt);

  } catch (err) {
    console.error('Fout bij laden van race.json:', err);
    document.body.innerHTML = '<p style="padding:40px;color:var(--rose)">Kon race.json niet laden. Probeer later opnieuw.</p>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
