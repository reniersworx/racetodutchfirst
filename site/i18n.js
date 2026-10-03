/* Race to Dutch First: Dutch and English UI text.
 *
 * Dutch is the site's language; English is a translation. The language comes from
 * ?lang=nl|en, else the visitor's earlier choice (localStorage 'lang'), else Dutch.
 * The browser's language is deliberately ignored: the race is a Dutch thing.
 *
 * Contract for other scripts (the hall of fame registers its own strings this way):
 *   i18n.lang                 'nl' | 'en'
 *   i18n.t(key, vars)         text for key, {name} placeholders filled from vars
 *   i18n.tn(key, n, vars)     plural: key_one / key_other, with {n} formatted
 *   i18n.add({ nl: {}, en: {} })  register more strings
 *   i18n.num(n, digits) / i18n.locale   numbers and dates in the active locale
 * Switching language re-runs render() in app.js and dispatches 'race:lang'
 * on document with { detail: { lang } }.
 * Static text in index.html carries data-i18n="key" (textContent) or
 * data-i18n-aria-label="key". Game names (guilds, bosses, raids) are never translated.
 */
'use strict';

const i18n = (() => {
  const LANGS = ['nl', 'en'];
  const LOCALES = { nl: 'nl-NL', en: 'en-GB' };
  const strings = { nl: {}, en: {} };

  function stored() {
    try { return localStorage.getItem('lang'); } catch { return null; }
  }

  function pick() {
    let q = null;
    try { q = new URLSearchParams(location.search).get('lang'); } catch { /* no URL */ }
    if (LANGS.includes(q)) return q;
    const s = stored();
    return LANGS.includes(s) ? s : 'nl';
  }

  const api = {
    lang: pick(),
    get locale() { return LOCALES[api.lang]; },

    add(dict) {
      for (const l of LANGS) Object.assign(strings[l], (dict && dict[l]) || {});
    },

    t(key, vars) {
      const raw = strings[api.lang][key] ?? strings.nl[key] ?? key;
      return raw.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? String(vars[k]) : m));
    },

    tn(key, n, vars) {
      return api.t(`${key}_${n === 1 ? 'one' : 'other'}`, { ...vars, n: api.num(n) });
    },

    num(n, digits = 0) {
      return Number(n).toLocaleString(api.locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    },

    /* Remember the choice, keep ?lang in the address bar in step, redraw static text. */
    set(lang) {
      if (!LANGS.includes(lang) || lang === api.lang) return false;
      api.lang = lang;
      try { localStorage.setItem('lang', lang); } catch { /* private mode: this visit only */ }
      try {
        const url = new URL(location.href);
        if (url.searchParams.has('lang')) {
          url.searchParams.set('lang', lang);
          history.replaceState(null, '', url);
        }
      } catch { /* no history API */ }
      api.applyStatic();
      document.dispatchEvent(new CustomEvent('race:lang', { detail: { lang } }));
      return true;
    },

    applyStatic(root = document) {
      document.documentElement.lang = api.lang;
      for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = api.t(el.dataset.i18n);
      for (const el of root.querySelectorAll('[data-i18n-aria-label]')) {
        el.setAttribute('aria-label', api.t(el.dataset.i18nAriaLabel));
      }
      for (const b of root.querySelectorAll('.lang-switch [data-lang]')) {
        b.setAttribute('aria-pressed', String(b.dataset.lang === api.lang));
      }
    },
  };
  return api;
})();

i18n.add({
  nl: {
    'lang.label': 'Taal',
    'title': 'Wie haalt als eerste Cutting Edge?',
    'lead': 'De race tussen Nederlandse guilds naar de laatste Mythic-boss van de huidige raid tier, live gevolgd via Raider.IO en Warcraft Logs.',

    'race.h': 'De race',
    'race.cap': 'Elke guild rijdt op zijn eigen baan: één stap per Mythic-kill, plus het deel van de huidige boss dat al weg is. Een beste pull op 27% telt als 0,73. De finish ligt bij de Cutting Edge-boss.',
    'standings.h': 'Klassement',
    'standings.cap': 'Eerst het meeste Mythic-kills, dan de laagste beste % op de huidige boss, dan wie zijn laatste kill het eerst had, dan het meeste Heroic-kills.',
    'feed.h': 'Laatste kills',
    'feed.cap': 'De nieuwste Mythic-kills van alle guilds. Een bolletjesvlak is de eerste kill van die boss in de race.',
    'timeline.h': 'Voortgang',
    'timeline.cap': 'Mythic-kills door de tijd, vanaf de week van de eerste Mythic-kill. Elke trede is een kill.',
    'timeline.asTable': 'Toon als tabel',
    'boss.h': 'Per boss',
    'boss.cap': 'Een verslagen boss toont de datum en het aantal pulls; een bolletjesvlak is de eerste kill van de race. Een balk is de beste pull: hoeveel van de boss er al af was. Grijs is nog niet geprobeerd.',
    'current.h': 'Huidige boss',
    'current.cap': 'Hoe dicht zitten ze erbij? Elke staaf is een pull: hoe hoger, hoe meer van de boss eraf. De lijn is de beste pull tot dan toe, de stippellijn bovenaan de kill. Een streep scheidt de raidavonden.',

    'footer.loading': 'Data laden…',
    'footer.src1': 'Bronnen:',
    'footer.src2': '(guildprofielen, kills en live tracking) en',
    'footer.src3': '(gelogde fights).',
    'footer.src4': 'Een pull die nergens gevolgd of gelogd werd, ontbreekt hier ook.',
    'footer.code': 'Broncode op GitHub',

    'pill.bosses': '{n} bosses',
    'pill.ce': 'Cutting Edge: {boss}',
    'pill.since': 'Sinds {date}',
    'winner.label': 'Winnaar',
    'winner.text': 'De eerste Nederlandse guild met Cutting Edge: {boss} Mythic verslagen op {when}.',
    'axis.finish': 'Finish: {boss}',
    'lane.kills': '{n} kills',
    'lane.progress': '{n} kills en {gone} van {boss} eraf',
    'lane.title': '{guild}: {about}, positie {pos} van {total}',
    'cap.winner': 'Winnaar',
    'cap.lead': 'Koploper',
    'live.now': 'Nu aan het raiden',
    'live.recent': 'Raidde om {time}',
    'live.title': 'Laatste pull of kill: {when}',

    'meter.aria': '{label}: {value} van {total}',
    'tile.place': 'Plaats {n}',
    'tile.current': 'Huidige boss',
    'tile.ce': 'Cutting Edge behaald',
    'tile.done': 'Alles verslagen',
    'tile.noPulls': 'Nog geen pulls gezien',
    'tile.best': 'Beste pull {pct} · {pulls}',
    'tile.worldRank': 'Wereldrang',
    'st.col.rank': '#',
    'st.col.guild': 'Guild',
    'st.col.progress': 'Voortgang',
    'st.col.current': 'Huidige boss',
    'st.col.world': 'Wereldrang',
    'st.col.status': 'Status',
    'st.col.links': 'Links',
    'st.sort': 'Sorteer op {col}',
    'st.seg.killed': '{boss}: verslagen op {date}',
    'st.seg.current': '{boss}: beste pull {pct}',
    'st.seg.open': '{boss}: nog niet verslagen',
    'st.progressAria': '{n} van {total} bosses verslagen',
    'st.col.gap': 'Achterstand',
    'st.gap.lead': 'leider',
    'jersey.yellow': 'Gele trui: leider van het klassement',
    'jersey.winner': 'Gele trui: winnaar van de race',
    'jersey.polka': 'Bolletjestrui: de meeste eerste kills van de race ({n})',
    'parcours.h': 'Het parcours',
    'parcours.cap': 'De race als één bergrit: elke guild rijdt op dezelfde weg, één kilometerpaal per Mythic-kill, met de Cutting Edge-boss als finish op de top. Hoe steiler de klim, hoe meer pulls die kill de guilds kostte.',
    'parcours.aria': 'Het parcours: {n} kills naar de finish, met elke guild op zijn plek in de race',
    'parcours.climb': 'Kill {n}: mediaan {pulls} pulls',
    'parcours.climbUnknown': 'Kill {n}: nog door niemand gehaald',
    'parcours.finish': 'Finish · {boss}',
    'parcours.rider': '{guild}: {pos}',

    'feed.empty': 'Nog geen Mythic-kills.',
    'feed.first': 'Eerste kill van deze boss hier',

    'timeline.kills': '{guild}: {n} kills',
    'timeline.point': '{guild}: {boss}, {date} ({n}e kill)',
    'timeline.end': '{guild}: {n} Mythic-kills',
    'timeline.thGuild': 'Guild',
    'timeline.thKills': 'Mythic-kills, op volgorde',
    'timeline.none': 'Nog geen Mythic-kill',

    'boss.th': 'Boss',
    'boss.unknownPulls': 'pulls onbekend',
    'boss.first': 'eerste kill',
    'boss.bestAria': 'Beste pull {pct} health over',
    'boss.busy': 'nu bezig',
    'boss.next': 'volgende',
    'boss.nextAria': 'volgende boss',
    'boss.untried': 'nog niet geprobeerd',
    'boss.nobody': 'Nog door geen enkele guild geprobeerd.',

    'curve.title': '{guild} op {boss}: {n} pulls, beste {pct} health over',
    'curve.kill': 'kill',
    'curve.pull': 'pull {n}',
    'curve.pullTitle': 'Pull {n}, {date}: {pct} health over',
    'cur.over': '{raid} · Mythic',
    'cur.prog': 'Progressie',
    'cur.notYet': 'Nog niet',
    'cur.noPull': 'Nog geen pull op deze boss gezien.',
    'cur.best': 'Beste pull',
    'cur.gone': 'Eraf',
    'cur.pulls': 'Pulls',
    'cur.noDetail': 'Geen pull-details beschikbaar.',
    'cur.lastKill': 'Laatste kill',

    'pulls_one': '{n} pull',
    'pulls_other': '{n} pulls',
    'upd.now': 'zojuist',
    'upd.min_one': '{n} minuut geleden',
    'upd.min_other': '{n} minuten geleden',
    'upd.hour_one': '{n} uur geleden',
    'upd.hour_other': '{n} uur geleden',
    'upd.day_one': '{n} dag geleden',
    'upd.day_other': '{n} dagen geleden',
    'upd.line': 'Bijgewerkt {when}',
    'upd.pre': 'Bijgewerkt',
    'parcours.cat': '{c}e cat.',
    'hero.day': 'Dag {n}',
    'hero.live': 'Live',
    'hero.best': 'beste {pct}',
    'hero.standings': 'Klassement',
    'upd.late': ' · normaal minstens om de 2 uur ververst',
    'upd.none': 'Geen data',
    'wcl.on': 'Aangevuld met Warcraft Logs: per boss telt de vroegste kill, het hoogste aantal pulls en de laagste beste %.',
    'wcl.off': 'Warcraft Logs was bij deze verversing niet beschikbaar.',
    'err.load': 'De racedata kon niet geladen worden ({msg}). Probeer het straks opnieuw.',
    'err.content': 'onverwachte inhoud',
    'live.h': 'Nu live',
    'live.since': 'live sinds {time}',
    'live.viewers_one': '{n} kijker',
    'live.viewers_other': '{n} kijkers',
    'hof.h': 'Hall of fame',
    'hof.cap': 'Per verslagen boss het team van elke guild, in de volgorde van hun kill. Bovenaan staat het team van de eerste Nederlandse kill; de andere guilds klap je open. Een naam linkt naar Raider.IO.',
    'hof.first': 'Eerste kill',
    'hof.others_one': '{n} andere guild',
    'hof.others_other': '{n} andere guilds',
    'hof.unknown': 'Team onbekend: deze kill kennen we alleen uit Warcraft Logs.',
    'hof.role.tank': 'Tanks',
    'hof.role.healer': 'Healers',
    'hof.role.dps': 'DPS',
    'hof.raiders.h': 'Raiders',
    'hof.raiders.cap': 'Eerst wie het vaakst bij de eerste kill van de race was, dan wie de meeste bosses mee versloeg met zijn guild. Het zijn characters, geen spelers: een alt telt apart.',
    'hof.col.rank': '#',
    'hof.col.raider': 'Raider',
    'hof.col.guild': 'Guild',
    'hof.col.firsts': 'Eerste kills',
    'hof.col.kills': 'Kills',
    'hof.more': 'Toon alle {n} raiders',
    'hof.less': 'Toon minder',
    'hof.empty': 'Nog geen Mythic-kills.',
  },

  en: {
    'lang.label': 'Language',
    'title': 'Who gets Cutting Edge first?',
    'lead': 'The race between Dutch guilds to the last Mythic boss of the current raid tier, followed live via Raider.IO and Warcraft Logs.',

    'race.h': 'The race',
    'race.cap': 'Every guild runs its own lane: one step per Mythic kill, plus the part of its current boss that is already down. A best pull at 27% counts as 0.73. The finish is the Cutting Edge boss.',
    'standings.h': 'Standings',
    'standings.cap': 'Most Mythic kills first, then the lowest best % on the current boss, then whoever got their latest kill first, then the most Heroic kills.',
    'feed.h': 'Latest kills',
    'feed.cap': 'The newest Mythic kills across all guilds. A polka-dot square marks the first kill of that boss in the race.',
    'timeline.h': 'Progress',
    'timeline.cap': 'Mythic kills over time, from the week of the first Mythic kill. Every step is a kill.',
    'timeline.asTable': 'Show as table',
    'boss.h': 'By boss',
    'boss.cap': 'A defeated boss shows the date and the number of pulls; a polka-dot square marks the first kill of the race. A bar is the best pull: how much of the boss was already down. Grey is not tried yet.',
    'current.h': 'Current boss',
    'current.cap': 'How close are they? Every bar is a pull: the higher, the more of the boss is down. The line is the best pull so far, the dashed line at the top the kill. A divider separates raid nights.',

    'footer.loading': 'Loading data…',
    'footer.src1': 'Sources:',
    'footer.src2': '(guild profiles, kills and live tracking) and',
    'footer.src3': '(logged fights).',
    'footer.src4': 'A pull that nobody tracked or logged is missing here too.',
    'footer.code': 'Source code on GitHub',

    'pill.bosses': '{n} bosses',
    'pill.ce': 'Cutting Edge: {boss}',
    'pill.since': 'Since {date}',
    'winner.label': 'Winner',
    'winner.text': 'The first Dutch guild with Cutting Edge: {boss} Mythic defeated on {when}.',
    'axis.finish': 'Finish: {boss}',
    'lane.kills': '{n} kills',
    'lane.progress': '{n} kills and {gone} of {boss} down',
    'lane.title': '{guild}: {about}, position {pos} of {total}',
    'cap.winner': 'Winner',
    'cap.lead': 'Leader',
    'live.now': 'Raiding now',
    'live.recent': 'Raided at {time}',
    'live.title': 'Latest pull or kill: {when}',

    'meter.aria': '{label}: {value} of {total}',
    'tile.place': 'Place {n}',
    'tile.current': 'Current boss',
    'tile.ce': 'Cutting Edge achieved',
    'tile.done': 'Everything defeated',
    'tile.noPulls': 'No pulls seen yet',
    'tile.best': 'Best pull {pct} · {pulls}',
    'tile.worldRank': 'World rank',
    'st.col.rank': '#',
    'st.col.guild': 'Guild',
    'st.col.progress': 'Progress',
    'st.col.current': 'Current boss',
    'st.col.world': 'World rank',
    'st.col.status': 'Status',
    'st.col.links': 'Links',
    'st.sort': 'Sort by {col}',
    'st.seg.killed': '{boss}: killed on {date}',
    'st.seg.current': '{boss}: best pull {pct}',
    'st.seg.open': '{boss}: not killed yet',
    'st.progressAria': '{n} of {total} bosses killed',
    'st.col.gap': 'Gap',
    'st.gap.lead': 'leader',
    'jersey.yellow': 'Yellow jersey: leads the classification',
    'jersey.winner': 'Yellow jersey: won the race',
    'jersey.polka': 'Polka-dot jersey: most first kills of the race ({n})',
    'parcours.h': 'The course',
    'parcours.cap': 'The race as one mountain stage: every guild rides the same road, one marker per Mythic kill, with the Cutting Edge boss as the summit finish. The steeper the climb, the more pulls that kill cost the guilds.',
    'parcours.aria': 'The course: {n} kills to the finish, with every guild at its place in the race',
    'parcours.climb': 'Kill {n}: median {pulls} pulls',
    'parcours.climbUnknown': 'Kill {n}: nobody has made it yet',
    'parcours.finish': 'Finish · {boss}',
    'parcours.rider': '{guild}: {pos}',

    'feed.empty': 'No Mythic kills yet.',
    'feed.first': 'First kill of this boss here',

    'timeline.kills': '{guild}: {n} kills',
    'timeline.point': '{guild}: {boss}, {date} (kill {n})',
    'timeline.end': '{guild}: {n} Mythic kills',
    'timeline.thGuild': 'Guild',
    'timeline.thKills': 'Mythic kills, in order',
    'timeline.none': 'No Mythic kill yet',

    'boss.th': 'Boss',
    'boss.unknownPulls': 'pulls unknown',
    'boss.first': 'first kill',
    'boss.bestAria': 'Best pull {pct} health left',
    'boss.busy': 'in progress',
    'boss.next': 'next',
    'boss.nextAria': 'next boss',
    'boss.untried': 'not tried yet',
    'boss.nobody': 'No guild has tried this boss yet.',

    'curve.title': '{guild} on {boss}: {n} pulls, best {pct} health left',
    'curve.kill': 'kill',
    'curve.pull': 'pull {n}',
    'curve.pullTitle': 'Pull {n}, {date}: {pct} health left',
    'cur.over': '{raid} · Mythic',
    'cur.prog': 'Progress',
    'cur.notYet': 'Not yet',
    'cur.noPull': 'No pull on this boss seen yet.',
    'cur.best': 'Best pull',
    'cur.gone': 'Down',
    'cur.pulls': 'Pulls',
    'cur.noDetail': 'No pull details available.',
    'cur.lastKill': 'Latest kill',

    'pulls_one': '{n} pull',
    'pulls_other': '{n} pulls',
    'upd.now': 'just now',
    'upd.min_one': '{n} minute ago',
    'upd.min_other': '{n} minutes ago',
    'upd.hour_one': '{n} hour ago',
    'upd.hour_other': '{n} hours ago',
    'upd.day_one': '{n} day ago',
    'upd.day_other': '{n} days ago',
    'upd.line': 'Updated {when}',
    'upd.pre': 'Updated',
    'parcours.cat': 'Cat. {c}',
    'hero.day': 'Day {n}',
    'hero.live': 'Live',
    'hero.best': 'best {pct}',
    'hero.standings': 'Standings',
    'upd.late': ' · normally refreshed at least every 2 hours',
    'upd.none': 'No data',
    'wcl.on': 'Completed with Warcraft Logs: per boss, the earliest kill, the most pulls and the lowest best % count.',
    'wcl.off': 'Warcraft Logs was not available for this refresh.',
    'err.load': "The race data couldn't be loaded ({msg}). Please try again later.",
    'err.content': 'unexpected content',
    'live.h': 'Live now',
    'live.since': 'live since {time}',
    'live.viewers_one': '{n} viewer',
    'live.viewers_other': '{n} viewers',
    'hof.h': 'Hall of fame',
    'hof.cap': 'Every guild\'s team for each defeated boss, in the order of their kill. The team of the first Dutch kill is on top; open the other guilds below it. A name links to Raider.IO.',
    'hof.first': 'First kill',
    'hof.others_one': '{n} other guild',
    'hof.others_other': '{n} other guilds',
    'hof.unknown': 'Team unknown: this kill is only known from Warcraft Logs.',
    'hof.role.tank': 'Tanks',
    'hof.role.healer': 'Healers',
    'hof.role.dps': 'DPS',
    'hof.raiders.h': 'Raiders',
    'hof.raiders.cap': 'First who was in the race\'s first kill most often, then who defeated the most bosses with their guild. These are characters, not players: an alt counts separately.',
    'hof.col.rank': '#',
    'hof.col.raider': 'Raider',
    'hof.col.guild': 'Guild',
    'hof.col.firsts': 'First kills',
    'hof.col.kills': 'Kills',
    'hof.more': 'Show all {n} raiders',
    'hof.less': 'Show fewer',
    'hof.empty': 'No Mythic kills yet.',
  },
});
