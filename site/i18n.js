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
    'doc.title': 'Race to Dutch First · Nederlandstalige WoW-guilds naar Cutting Edge',
    'doc.titlePast': 'Race to Dutch First · {season}: wie haalde als eerste Cutting Edge?',
    'lang.label': 'Taal',
    'title': 'Wie haalt als eerste Cutting Edge?',
    'lead': 'De race tussen Nederlandstalige guilds naar de laatste Mythic-boss van de huidige raid tier, live gevolgd via Raider.IO en Warcraft Logs.',

    'feed.h': 'Laatste kills',
    'timeline.h': 'Voortgang',
    'timeline.cap': 'Trede = Mythic-kill · ster = eerste kill van de race · lichte kolom = raidavond',
    'timeline.asTable': 'Toon als tabel',
    'guild.h': 'Per guild',
    'guild.cap': 'Per boss de killdatum of de beste pull; rechts elke pull op de huidige boss.',
    'guild.capPast': 'Per boss de killdatum of de beste pull; rechts waar elke guild eindigde.',
    'guild.th': 'Guild',
    'guild.thPulls': 'Huidige boss',
    'guild.thPullsPast': 'Eindstand',
    'guild.best': 'beste {pct}',
    'hof.fold': 'Teams en raiders',

    'footer.loading': 'Data laden…',
    'footer.src1': 'Bronnen:',
    'footer.src2': '(guildprofielen, kills en live tracking)',
    'footer.and': 'en',
    'footer.src3': '(gelogde fights)',
    'footer.src4': 'Een pull die nergens gevolgd of gelogd werd, ontbreekt hier ook.',
    'footer.code': 'Broncode op GitHub',

    'pill.bosses': '{n} bosses',
    'pill.ce': 'Cutting Edge: {boss}',
    'pill.since': 'Sinds {date}',
    'winner.label': 'Winnaar',
    'winner.text': 'De eerste Nederlandstalige guild met Cutting Edge: {boss} Mythic verslagen op {when}.',
    'live.now': 'Nu aan het raiden',
    'live.recent': 'Raidde om {time}',
    'live.title': 'Laatste pull of kill: {when}',

    'tile.place': 'Plaats {n}',
    'tile.ce': 'Cutting Edge behaald',
    'tile.done': 'Alles verslagen',
    'tile.noPulls': 'Nog geen pulls gezien',
    'tile.noPullsKept': 'Geen pulls bewaard',
    'tile.best': 'Beste pull {pct} · {pulls}',

    'feed.empty': 'Nog geen Mythic-kills.',

    'timeline.kills': '{guild}: {n} kills',
    'timeline.point': '{guild}: {boss}, {date} ({n}e kill)',
    'timeline.end': '{guild}: {n} Mythic-kills',
    'timeline.thGuild': 'Guild',
    'timeline.thKills': 'Mythic-kills, op volgorde',
    'timeline.none': 'Nog geen Mythic-kill',
    'boss.unknownPulls': 'pulls onbekend',
    'boss.first': 'eerste kill',
    'boss.bestAria': 'Beste pull {pct} health over',
    'boss.next': 'volgende',
    'boss.stopped': 'gestopt',
    'boss.untried': 'nog niet geprobeerd',

    'curve.title': '{guild} op {boss}: {n} pulls, beste {pct} health over',
    'curve.pullTitle': 'Pull {n}, {date}: {pct} health over',

    'pulls_one': '{n} pull',
    'pulls_other': '{n} pulls',
    'upd.now': 'zojuist',
    'upd.min_one': '{n} minuut geleden',
    'upd.min_other': '{n} minuten geleden',
    'upd.hour_one': '{n} uur geleden',
    'upd.hour_other': '{n} uur geleden',
    'upd.day_one': '{n} dag geleden',
    'upd.day_other': '{n} dagen geleden',
    'upd.pre': 'Bijgewerkt',
    'title.a': 'Wie haalt als eerste',
    'title.b': 'Cutting Edge?',
    'tk.first': 'eerste kill',
    'hero.live': 'Live',
    'hero.standings': 'Klassement',
    'hero.day': 'Dag {n}',
    'hero.dayTitle': 'Dag {n} van de race, gestart op {date}',
    'upd.late': ' · normaal minstens om de 2 uur ververst',
    'upd.none': 'Geen data',
    'upd.archived': 'Afgesloten op {date}',
    'upd.archivedNoDate': 'Afgesloten seizoen',
    'title.aPast': 'Wie haalde als eerste',
    'lead.archived': 'Terugblik op {season}: zo liep de race tussen Nederlandstalige guilds naar Cutting Edge in {raids}.',
    'pill.period': '{from} – {to}',
    'season.label': 'Seizoen',
    'side.h': '{raid} telt niet mee voor de race.',
    'side.kills': 'Mythic {boss}: {list}.',
    'side.none': 'Niemand versloeg {boss} op Mythic.',
    'wcl.on': 'Aangevuld met Warcraft Logs: per boss telt de vroegste kill, het hoogste aantal pulls en de laagste beste %.',
    'wcl.off': 'Warcraft Logs was bij deze verversing niet beschikbaar.',
    'wcl.archive': 'Dit seizoen komt alleen van Raider.IO.',
    'err.load': 'De racedata kon niet geladen worden ({msg}). Probeer het straks opnieuw.',
    'err.content': 'onverwachte inhoud',
    'live.h': 'Nu live',
    'live.since': 'live sinds {time}',
    'live.viewers_one': '{n} kijker',
    'live.viewers_other': '{n} kijkers',
    'live.count_one': '{n} stream',
    'live.count_other': '{n} streams',
    'live.play': 'Kijk {name} hier',
    'live.play_note': 'Laadt de speler van Twitch',
    'live.frame': 'Twitch-stream van {name}',
    'live.pick': 'Toon {name} in de speler',
    'live.open': 'Open op Twitch',

    'hof.role.tank': 'Tanks',
    'hof.role.healer': 'Healers',
    'hof.role.dps': 'DPS',
    'hof.h': 'Hall of fame',
    'hof.cap': 'Per verslagen boss het team van elke guild, in de volgorde van hun kill. Bovenaan staat het team van de eerste kill van de race; de andere guilds klap je open. Een naam linkt naar Raider.IO.',
    'hof.first': 'Eerste kill',
    'hof.side': 'Eerste kill · telt niet mee',
    'hof.others_one': '{n} andere guild',
    'hof.others_other': '{n} andere guilds',
    'hof.unknown': 'Team onbekend: deze kill kennen we alleen uit Warcraft Logs.',
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
    'doc.title': 'Race to Dutch First · Dutch-speaking WoW guilds racing to Cutting Edge',
    'doc.titlePast': 'Race to Dutch First · {season}: who got Cutting Edge first?',
    'lang.label': 'Language',
    'title': 'Who gets Cutting Edge first?',
    'lead': 'The race between Dutch-speaking guilds to the last Mythic boss of the current raid tier, followed live via Raider.IO and Warcraft Logs.',

    'feed.h': 'Latest kills',
    'timeline.h': 'Progress',
    'timeline.cap': 'Step = Mythic kill · star = the race\'s first kill · light column = raid night',
    'timeline.asTable': 'Show as table',
    'guild.h': 'By guild',
    'guild.cap': 'Per boss the kill date or the best pull; on the right every pull on the current boss.',
    'guild.capPast': 'Per boss the kill date or the best pull; on the right where each guild ended.',
    'guild.th': 'Guild',
    'guild.thPulls': 'Current boss',
    'guild.thPullsPast': 'Final standing',
    'guild.best': 'best {pct}',
    'hof.fold': 'Teams and raiders',

    'footer.loading': 'Loading data…',
    'footer.src1': 'Sources:',
    'footer.src2': '(guild profiles, kills and live tracking)',
    'footer.and': 'and',
    'footer.src3': '(logged fights)',
    'footer.src4': 'A pull that nobody tracked or logged is missing here too.',
    'footer.code': 'Source code on GitHub',

    'pill.bosses': '{n} bosses',
    'pill.ce': 'Cutting Edge: {boss}',
    'pill.since': 'Since {date}',
    'winner.label': 'Winner',
    'winner.text': 'The first Dutch-speaking guild with Cutting Edge: {boss} Mythic defeated on {when}.',
    'live.now': 'Raiding now',
    'live.recent': 'Raided at {time}',
    'live.title': 'Latest pull or kill: {when}',

    'tile.place': 'Place {n}',
    'tile.ce': 'Cutting Edge achieved',
    'tile.done': 'Everything defeated',
    'tile.noPulls': 'No pulls seen yet',
    'tile.noPullsKept': 'No pulls kept',
    'tile.best': 'Best pull {pct} · {pulls}',

    'feed.empty': 'No Mythic kills yet.',

    'timeline.kills': '{guild}: {n} kills',
    'timeline.point': '{guild}: {boss}, {date} (kill {n})',
    'timeline.end': '{guild}: {n} Mythic kills',
    'timeline.thGuild': 'Guild',
    'timeline.thKills': 'Mythic kills, in order',
    'timeline.none': 'No Mythic kill yet',
    'boss.unknownPulls': 'pulls unknown',
    'boss.first': 'first kill',
    'boss.bestAria': 'Best pull {pct} health left',
    'boss.next': 'next',
    'boss.stopped': 'stopped',
    'boss.untried': 'not tried yet',

    'curve.title': '{guild} on {boss}: {n} pulls, best {pct} health left',
    'curve.pullTitle': 'Pull {n}, {date}: {pct} health left',

    'pulls_one': '{n} pull',
    'pulls_other': '{n} pulls',
    'upd.now': 'just now',
    'upd.min_one': '{n} minute ago',
    'upd.min_other': '{n} minutes ago',
    'upd.hour_one': '{n} hour ago',
    'upd.hour_other': '{n} hours ago',
    'upd.day_one': '{n} day ago',
    'upd.day_other': '{n} days ago',
    'upd.pre': 'Updated',
    'title.a': 'Who gets',
    'title.b': 'Cutting Edge first?',
    'tk.first': 'first kill',
    'hero.live': 'Live',
    'hero.standings': 'Standings',
    'hero.day': 'Day {n}',
    'hero.dayTitle': 'Day {n} of the race, started on {date}',
    'upd.late': ' · normally refreshed at least every 2 hours',
    'upd.none': 'No data',
    'upd.archived': 'Closed on {date}',
    'upd.archivedNoDate': 'Finished season',
    'title.aPast': 'Who got',
    'lead.archived': 'Looking back at {season}: how the race between Dutch-speaking guilds to Cutting Edge went in {raids}.',
    'pill.period': '{from} – {to}',
    'season.label': 'Season',
    'side.h': "{raid} doesn't count for the race.",
    'side.kills': 'Mythic {boss}: {list}.',
    'side.none': 'Nobody killed {boss} on Mythic.',
    'wcl.on': 'Completed with Warcraft Logs: per boss, the earliest kill, the most pulls and the lowest best % count.',
    'wcl.off': 'Warcraft Logs was not available for this refresh.',
    'wcl.archive': 'This season comes from Raider.IO alone.',
    'err.load': "The race data couldn't be loaded ({msg}). Please try again later.",
    'err.content': 'unexpected content',
    'live.h': 'Live now',
    'live.since': 'live since {time}',
    'live.viewers_one': '{n} viewer',
    'live.viewers_other': '{n} viewers',
    'live.count_one': '{n} stream',
    'live.count_other': '{n} streams',
    'live.play': 'Watch {name} here',
    'live.play_note': 'Loads the Twitch player',
    'live.frame': 'Twitch stream of {name}',
    'live.pick': 'Show {name} in the player',
    'live.open': 'Open on Twitch',
    'hof.role.tank': 'Tanks',
    'hof.role.healer': 'Healers',
    'hof.role.dps': 'DPS',
    'hof.h': 'Hall of fame',
    'hof.cap': 'Every guild\'s team for each defeated boss, in the order of their kill. The team of the race\'s first kill is on top; open the other guilds below it. A name links to Raider.IO.',
    'hof.first': 'First kill',
    'hof.side': "First kill · doesn't count",
    'hof.others_one': '{n} other guild',
    'hof.others_other': '{n} other guilds',
    'hof.unknown': 'Team unknown: this kill is only known from Warcraft Logs.',
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
