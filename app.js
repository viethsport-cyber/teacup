'use strict';
/* Teacup – Englisch-Vokabeln (Stufe 1: Grundgerüst und Karteikarten)
   Alle Daten liegen nur auf diesem Gerät (localStorage). Kein Server, keine Anmeldung. */
(() => {
  const APP_VERSION = '2.0.3';
  const STORE_KEY = 'teacup-data';
  const LIVE_KEY = 'teacup-data';
  const BETA = false;
  const SAFETY_KEY = 'teacup-data-tagessicherung';
  const SCHEMA = 1;
  const ROUND_MAX = 15;
  const roundMax = () => Number(D.settings.roundSize) || ROUND_MAX;
  const NEW_PER_DAY = 10;
  // Tage bis zur nächsten Abfrage je Fach (6 = „Sitzt“, Kontrolle nach 30 Tagen)
  const INTERVAL = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14, 6: 30 };
  const BOX_NAME = { 1: 'Fach 1', 2: 'Fach 2', 3: 'Fach 3', 4: 'Fach 4', 5: 'Fach 5', 6: 'Sitzt' };
  const NO_UNIT = 'Sonstige Wörter';  // Sammel-Unit für Wörter ohne Buch-Zuordnung
  const STATUS = { kommt: 'Kommt noch', aktuell: 'Aktuell', gelernt: 'Gelernt' };
  const POS = ['', 'Nomen', 'Verb', 'Adjektiv', 'Adverb', 'Präposition', 'Pronomen', 'Konjunktion', 'Zahlwort', 'Interjektion', 'Ausdruck', 'Redewendung', 'Satz'];

  // Feste Schwerpunkt-Bibliothek: typische Stolpersteine für deutschsprachige Kinder.
  // say = auch beim Aussprechen relevant
  const CATS = [
    { id: 'th', label: '„th“', re: /th/gi, say: true, tip: '„th“: Zungenspitze leicht zwischen die Zähne. Geschrieben immer t + h.' },
    { id: 'w', label: '„w“', re: /\bw(?!r|ho)/gi, say: true, tip: '„w“: Lippen rund wie beim Pusten, nicht wie das deutsche „w“.' },
    { id: 'v', label: '„v“', re: /v/gi, say: true, tip: '„v“: Oberzähne auf die Unterlippe, wie das deutsche „w“.' },
    { id: 'silent', label: 'stumme Buchstaben', re: /\bkn|\bwr|mb\b|igh|ight|alk|\bhour|\bhonest/gi, say: true, tip: 'Manche Buchstaben schreibt man, spricht sie aber nicht: knife, write, night.' },
    { id: 'final', label: 'weiches Wortende (b, d, g)', re: /[bdg]\b/gi, say: true, tip: 'Wortende weich sprechen: „dog“, nicht „dok“. Geschrieben mit b, d oder g.' },
    { id: 'ie', label: '„ie“ und „ei“', re: /ie|ei/gi, tip: 'Genau hinschauen: friend mit „ie“, their mit „ei“. Am besten buchstabieren.' },
    { id: 'our', label: 'britisch „our“', re: /our/gi, tip: 'Britisches Englisch: colour, favourite, neighbour – mit „ou“.' },
    { id: 'vowels', label: 'Selbstlaut-Paare (ea, ee, oo, ai …)', re: /ea|ee|oo|ai|ay|oa|ou|ow/gi, tip: 'Zwei Selbstlaute hintereinander: ansehen, anhören, buchstabieren (t-e-a-ch-e-r).' },
    { id: 'double', label: 'doppelte Buchstaben', re: /([a-z])\1/gi, tip: 'Achte auf doppelte Buchstaben: dinner, sorry, apple.' },
    { id: 'case', label: 'Großschreibung', re: /\b[A-Z]/g, tip: 'Groß schreibt man: Namen, Wochentage, Monate, Länder und „I“.' },
    { id: 'apos', label: 'Apostroph und Kurzformen', re: /'/g, tip: 'Der Apostroph ersetzt Buchstaben: I\'m = I am, don\'t = do not.' },
    { id: 'be', label: '„I am“, „you are“, „he is“', re: /\b(am|are|is|i'm|you're|he's|she's|it's|we're|they're)\b/gi, tip: 'I am · you are · he/she/it is · we are · they are' }
  ];

  // Aussprachetipp automatisch aus der festen Tipp-Bibliothek (ohne Internet, ohne KI)
  function autoTip(en) {
    const tips = [];
    for (const id of ['th', 'w', 'v', 'silent', 'final']) {
      const c = CATS.find((x) => x.id === id); c.re.lastIndex = 0;
      if (c.re.test(String(en))) tips.push(c.tip);
    }
    return tips.slice(0, 2).join(' ');
  }
  const ENRICH_HEAD = 'Ergänze für die folgenden englischen Vokabeln (Green Line 1, Klasse 5, britisches Englisch):\n' +
    '- beispiel_en: einen kurzen, einfachen Beispielsatz (höchstens 8 Wörter, nur Wortschatz der 5. Klasse, britische Schreibweise), in dem die Vokabel genau so vorkommt\n' +
    '- beispiel_de: die deutsche Übersetzung des Satzes\n' +
    '- aussprache: einen kurzen Aussprachetipp für deutschsprachige Kinder, nur wenn es eine echte Stolperfalle gibt, sonst leer\n' +
    '- wortart: falls leer, ergänzen (Nomen, Verb, Adjektiv, Adverb, Ausdruck, Satz …)\n' +
    'Die Spalten unit, seite, englisch, deutsch und hinweis NICHT verändern. Keine Semikolons innerhalb der Felder.\n' +
    'Gib alle Zeilen in einem Codeblock aus, mit genau dieser Kopfzeile:\n' +
    'unit;seite;englisch;deutsch;wortart;hinweis;beispiel_en;beispiel_de;aussprache\n\nVokabeln:\n';

  const SAMPLE_CSV = [
    'unit;seite;englisch;deutsch;wortart;hinweis;beispiel_en;beispiel_de;aussprache',
    'Test-Unit (löschen);10;hello;hallo;Interjektion;;;;',
    'Test-Unit (löschen);10;goodbye;auf Wiedersehen / tschüs;Interjektion;;;;',
    'Test-Unit (löschen);10;friend;Freund / Freundin;Nomen;Schreibweise mit „ie“;My friend is nice.;Mein Freund ist nett.;„ie“ wird wie ein kurzes „e“ gesprochen',
    'Test-Unit (löschen);10;school;Schule;Nomen;;I go to school.;Ich gehe zur Schule.;„sch“ wird wie „sk“ gesprochen',
    'Test-Unit (löschen);10;teacher;Lehrer / Lehrerin;Nomen;;;;',
    'Test-Unit (löschen);11;colour;Farbe;Nomen;britische Schreibweise mit „ou“;;;',
    'Test-Unit (löschen);11;favourite;Lieblings-;Adjektiv;britische Schreibweise mit „ou“;My favourite colour is blue.;Meine Lieblingsfarbe ist Blau.;',
    'Test-Unit (löschen);11;to have breakfast;frühstücken;Verb;;I have breakfast at 7 o\'clock.;Ich frühstücke um 7 Uhr.;',
    'Test-Unit (löschen);11;breakfast;Frühstück;Nomen;;;;',
    'Test-Unit (löschen);11;child;Kind;Nomen;Plural: children;;;',
    'Test-Unit (löschen);12;Monday;Montag;Nomen;Wochentage schreibt man im Englischen groß;;;',
    'Test-Unit (löschen);12;mum;Mama / Mutti;Nomen;;;;',
    'Test-Unit (löschen);12;dad;Papa / Vati;Nomen;;;;',
    'Test-Unit (löschen);12;brother;Bruder;Nomen;;;;„th“: Zungenspitze leicht zwischen die Zähne',
    'Test-Unit (löschen);12;sister;Schwester;Nomen;;;;',
    'Test-Unit (löschen);13;dog;Hund;Nomen;;;;Ende weich sprechen, nicht „dok“',
    'Test-Unit (löschen);13;cat;Katze;Nomen;;;;',
    'Test-Unit (löschen);13;to write;schreiben;Verb;das „w“ am Anfang ist stumm;;;Das „w“ wird geschrieben, aber nicht gesprochen',
    'Test-Unit (löschen);13;water;Wasser;Nomen;;;;„w“: Lippen rund wie beim Pusten, nicht wie deutsches „w“',
    'Test-Unit (löschen);13;thank you;danke;Ausdruck;;Thank you for the present.;Danke für das Geschenk.;„th“: Zungenspitze leicht zwischen die Zähne'
  ].join('\n');

  const CARD_PROMPT = 'Auf den Fotos sind handgeschriebene Vokabel-Karteikarten meiner Tochter (Englisch, Klasse 5). Vorderseite Englisch, Rückseite Deutsch.\n' +
    '- Ordne jede Vorderseite der passenden Rückseite zu. Wenn die Karten beim Umdrehen gespiegelt liegen, berücksichtige das. Wenn die Zuordnung unsicher ist, schreib es dazu.\n' +
    '- Gib eine Zeile pro Karte aus, im Format: englisch = deutsch\n' +
    '- Mehrere deutsche Bedeutungen mit Schrägstrich trennen. Sätze mit Satzzeichen wie auf der Karte.\n' +
    '- Übernimm die Wörter so, wie sie gemeint sind, aber korrigiere keine Rechtschreibung stillschweigend: Wenn auf einer Karte vermutlich ein Schreibfehler steht (z. B. „freind“), gib die richtige britische Schreibweise aus und liste den Fehler danach separat auf.\n' +
    '- Nichts erfinden. Unleserliche Karten nicht raten, sondern danach auflisten.\n' +
    '- Gib die Zeilen in einem Codeblock aus.';
  const PHOTO_PROMPT = 'Wandle die Vokabeln auf diesem Foto (Green Line 1, Klett) in folgendes Format um.\n' +
    '- Eine Zeile pro Vokabel, Satz oder Redewendung, Trennzeichen Semikolon. Satzzeichen (? ! .) wie im Buch übernehmen.\n' +
    '- Erste Zeile ist genau diese Kopfzeile: unit;seite;englisch;deutsch;wortart;hinweis;beispiel_en;beispiel_de;aussprache\n' +
    '- Unit: UNIT HIER EINTRAGEN (z. B. Unit 1). Seite wie im Buch.\n' +
    '- Englisch und Deutsch exakt wie im Buch übernehmen (britische Schreibweise, Groß-/Kleinschreibung wie im Buch).\n' +
    '- Mehrere deutsche Bedeutungen mit Schrägstrich trennen.\n' +
    '- Verben mit „to“ wie im Buch.\n' +
    '- Nichts erfinden. Unklare Felder leer lassen und mir unklare Wörter danach auflisten.\n' +
    '- Gib nur den fertigen Text in einem Codeblock aus.';

  // ---------- Datum ----------
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => dateStr(new Date());
  function addDays(s, n) { const [y, m, d] = s.split('-').map(Number); return dateStr(new Date(y, m - 1, d + n)); }
  function daysBetween(a, b) { const [y1, m1, d1] = a.split('-').map(Number); const [y2, m2, d2] = b.split('-').map(Number); return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 864e5); }
  const fmtDate = (s) => { if (!s) return '–'; const [y, m, d] = s.slice(0, 10).split('-'); return d + '.' + m + '.' + y; };

  // ---------- Speicher ----------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function defaultData() {
    return {
      app: 'teacup', schema: SCHEMA, createdAt: new Date().toISOString(),
      books: [{ id: 'gl1', name: 'Green Line 1' }],
      units: [], vocab: [], progress: {}, reports: [],
      settings: { nickname: '', dailyMinutes: 15, toOptional: true, speech: false, paperAllowed: true, paperChosen: false, autoApprove: true, roundSize: 15, sayMode: 'haeufig', voiceName: '', slowSpeed: 'sehr langsam', normalRate: 0.85, sound: true, theme: 'auto' },
      pin: null, stats: { days: {} }, newByDay: {}, lastBackupAt: null,
      skills: {}, focusMode: {}, customCats: []
    };
  }
  // Ergänzt fehlende Felder, löscht aber nie vorhandene Daten (wichtig für Updates).
  function migrate(d) {
    const def = defaultData();
    if (!d || typeof d !== 'object') return def;
    for (const k of Object.keys(def)) if (d[k] === undefined) d[k] = def[k];
    d.settings = Object.assign({}, def.settings, d.settings || {});
    d.stats = Object.assign({ days: {} }, d.stats || {});
    if (!d.books.length) d.books = def.books;
    d.schema = SCHEMA;
    return d;
  }
  function load() {
    try {
      let raw = localStorage.getItem(STORE_KEY);
      // Testversion: beim ersten Start eine Kopie der Daten aus der normalen App übernehmen
      if (!raw && BETA) { raw = localStorage.getItem(LIVE_KEY); if (raw) localStorage.setItem(STORE_KEY, raw); }
      return migrate(raw ? JSON.parse(raw) : null);
    }
    catch (e) { console.error(e); return defaultData(); }
  }
  let D = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(D)); }
    catch (e) { toast('Speichern hat nicht geklappt. Ist der Speicher voll?'); }
  }
  // Einmal am Tag eine zusätzliche Kopie im Gerät als Rückfallebene.
  try {
    const s = JSON.parse(localStorage.getItem(SAFETY_KEY) || 'null');
    if (D.vocab.length && (!s || s.day !== today())) localStorage.setItem(SAFETY_KEY, JSON.stringify({ day: today(), data: D }));
  } catch (e) { /* egal */ }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- Hilfen ----------
  const app = document.getElementById('app');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => app.querySelector(s);
  let toastTimer;
  function toast(msg, actionLabel, action) {
    const t = document.getElementById('toast');
    t.innerHTML = esc(msg) + (actionLabel ? ' <button class="btn small" id="toastAct">' + esc(actionLabel) + '</button><button class="toastx" id="toastX" aria-label="Schließen">✕</button>' : '');
    t.hidden = false;
    if (actionLabel) { document.getElementById('toastAct').onclick = () => { t.hidden = true; action(); }; document.getElementById('toastX').onclick = () => { t.hidden = true; }; }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, actionLabel ? 15000 : 3500);
  }
  const unitById = (id) => D.units.find((u) => u.id === id);
  const vocabById = (id) => D.vocab.find((v) => v.id === id);
  const bookById = (id) => D.books.find((b) => b.id === id);
  const prog = (vid) => D.progress[vid] || (D.progress[vid] = { box: 1, due: today(), seen: false, right: 0, wrong: 0 });
  const hasExtra = (v) => !!(v.exEn || v.exDe || v.tip);
  const needsReview = (v) => hasExtra(v) && !v.checked;
  const deText = (v) => v.de.join(' / ');
  function applyTheme() {
    const t = D.settings.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }
  applyTheme();

  // ---------- Eigene Symbole (statt Emojis) ----------
  const ICONS = {
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.9 1.9M17.5 17.5l1.9 1.9M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.9-1.9M17.5 6.5l1.9-1.9"/><circle cx="12" cy="12" r="6.6"/>',
    cup: '<path d="M4 9h13v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3c-1 1.5 1 2.5 0 4M12 3c-1 1.5 1 2.5 0 4M3 21.5h16"/>',
    party: '<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4zM19 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8zM5 15.5l.6 1.4 1.4.6-1.4.6L5 19.5l-.6-1.4L3 17.5l1.4-.6z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12M7 8l5-5 5 5"/>',
    pencil: '<path d="M15 4l5 5L9 20H4v-5zM13 6l5 5"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    speaker: '<path d="M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    snail: '<path d="M3 19h12.5M15.5 19a5.5 5.5 0 1 0-5.5-5.5 3 3 0 0 0 3 3 1.5 1.5 0 0 0 0-3M15.5 19c2.5 0 4.5-2 4.5-4.5V8M20 8l-1.5-3M20 8l2-2.5"/>',
    mic: '<path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3"/>',
    speech: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h12M16 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H5M8 21l-3-3 3-3"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
    book: '<path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6zM9 3v18M12 8h3M12 12h3"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    file: '<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6"/>',
    clip: '<path d="M9 4h6v3H9zM9 5.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-3M8.5 12h7M8.5 16h5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
  };
  // Londoner Skyline: Big Ben, Tower Bridge, London Eye, Doppeldeckerbus (Farben über CSS, auch im Dunkelmodus)
  const SKYLINE = '<svg class="skyline" viewBox="0 0 360 130" aria-hidden="true" preserveAspectRatio="xMidYMax meet">' +
    '<circle class="sk-sun" cx="318" cy="26" r="13"/>' +
    '<g class="sk-cloud"><ellipse cx="100" cy="24" rx="20" ry="7"/><ellipse cx="114" cy="19" rx="12" ry="8"/><ellipse cx="200" cy="34" rx="16" ry="5.5"/><ellipse cx="210" cy="30" rx="9" ry="6"/></g>' +
    '<g class="sk-far"><rect x="0" y="92" width="26" height="38"/><rect x="74" y="86" width="20" height="44"/><rect x="96" y="96" width="18" height="34"/><rect x="226" y="90" width="16" height="40"/><rect x="330" y="88" width="30" height="42"/><path d="M178 130V78l9-24 9 24v52z"/></g>' +
    '<g class="sk-eye"><circle cx="276" cy="72" r="38" fill="none" stroke-width="3"/><circle cx="276" cy="72" r="4"/>' +
      [0, 30, 60, 90, 120, 150].map((a) => { const r = a * Math.PI / 180, x = Math.cos(r) * 38, y = Math.sin(r) * 38; return '<path d="M' + (276 - x).toFixed(1) + ' ' + (72 - y).toFixed(1) + 'L' + (276 + x).toFixed(1) + ' ' + (72 + y).toFixed(1) + '" stroke-width="1.2"/>'; }).join('') +
      [0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = a * Math.PI / 180; return '<circle cx="' + (276 + Math.cos(r) * 38).toFixed(1) + '" cy="' + (72 + Math.sin(r) * 38).toFixed(1) + '" r="3.4"/>'; }).join('') +
      '<path d="M276 72l-16 58M276 72l16 58" stroke-width="3"/></g>' +
    '<g class="sk-bridge"><rect x="120" y="70" width="14" height="60"/><rect x="152" y="70" width="14" height="60"/><path d="M118 70l9-12 9 12zM150 70l9-12 9 12z"/><rect x="120" y="78" width="46" height="4"/><path d="M100 112h86v5h-86z"/></g>' +
    '<g class="sk-ben"><rect x="38" y="44" width="22" height="86"/><path d="M36 44h26l-13-30z"/><rect x="47" y="6" width="4" height="10"/></g>' +
    '<circle class="sk-clock" cx="49" cy="56" r="7"/><path class="sk-hand" d="M49 56v-4.5M49 56h3.5"/>' +
    '<g class="sk-bus"><rect x="196" y="98" width="62" height="26" rx="5"/><path d="M196 110h62" class="sk-stripe"/>' +
      '<g class="sk-win"><rect x="201" y="101" width="9" height="6" rx="1.5"/><rect x="213" y="101" width="9" height="6" rx="1.5"/><rect x="225" y="101" width="9" height="6" rx="1.5"/><rect x="237" y="101" width="9" height="6" rx="1.5"/><rect x="249" y="101" width="6" height="6" rx="1.5"/><rect x="201" y="113" width="9" height="6" rx="1.5"/><rect x="213" y="113" width="9" height="6" rx="1.5"/><rect x="225" y="113" width="9" height="6" rx="1.5"/></g>' +
      '<circle class="sk-wheel" cx="210" cy="125" r="5"/><circle class="sk-wheel" cx="245" cy="125" r="5"/></g>' +
    '<rect class="sk-ground" x="0" y="126" width="360" height="4"/></svg>';
  const BUS = '<svg viewBox="0 0 40 26" aria-hidden="true"><rect x="1" y="1" width="38" height="20" rx="4" class="b-body"/><rect x="5" y="4" width="6" height="5" rx="1" class="b-win"/><rect x="13" y="4" width="6" height="5" rx="1" class="b-win"/><rect x="21" y="4" width="6" height="5" rx="1" class="b-win"/><rect x="29" y="4" width="7" height="5" rx="1" class="b-win"/><rect x="5" y="12" width="6" height="5" rx="1" class="b-win"/><rect x="13" y="12" width="6" height="5" rx="1" class="b-win"/><circle cx="9" cy="22" r="3.3" class="b-wheel"/><circle cx="31" cy="22" r="3.3" class="b-wheel"/></svg>';
  // Kurzes, dezentes Konfetti (entfällt bei „Bewegung reduzieren“)
  function confetti(n) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#7fd8d1', '#f7a8c8', '#ffd98a', '#b9a7f2', '#9be3b4'];
    const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.style.left = (10 + Math.random() * 80) + '%'; p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px'); p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      p.style.animationDelay = (Math.random() * 0.15) + 's';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 1300);
  }
  const ic = (n, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[n] + '</svg>';

  // ---------- Töne ----------
  let audioCtx;
  function beep(good) {
    if (!D.settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = good ? [660, 880] : [300, 240];
      notes.forEach((f, i) => {
        const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
        o.frequency.value = f; o.type = 'sine';
        const t0 = audioCtx.currentTime + i * 0.12;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        o.connect(g).connect(audioCtx.destination); o.start(t0); o.stop(t0 + 0.2);
      });
    } catch (e) { /* kein Ton möglich */ }
  }

  // ---------- Vorsprechen (Sprachausgabe von Chrome, britisch) ----------
  let voices = [];
  function loadVoices() { if ('speechSynthesis' in window) voices = speechSynthesis.getVoices(); }
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = () => { loadVoices(); if (S && S.view === 'parent' && S.tab === 'settings' && S.unlocked) rerender(); }; }
  const gbVoices = () => voices.filter((v) => v.lang && v.lang.replace('_', '-').toLowerCase() === 'en-gb');
  // Weibliche Stimmen an typischen Namen erkennen (Chrome, Android, Windows, Apple)
  const FEMALE = /female|frau|woman|serena|kate|martha|libby|sonia|hazel|susan|stephanie|fiona|moira|tessa|amy|emma|olivia|mia|bella|maisie|abbi|hollie|gba|gbc|gbg|fis\b/i;
  const MALE = /\bmale\b|daniel|arthur|george|ryan|thomas|oliver|alfie|elliot|noah|gbb|gbd|rjs/i;
  const isFemale = (v) => FEMALE.test(v.name) && !/\bmale\b/i.test(v.name.replace(/female/i, ''));
  function gbVoice() {
    const gb = gbVoices();
    if (D.settings.voiceName) { const chosen = gb.find((v) => v.name === D.settings.voiceName); if (chosen) return chosen; }
    const score = (v) => (isFemale(v) ? 4 : 0) - (MALE.test(v.name) ? 3 : 0) + (/google|natural|enhanced|premium|neural/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
    return gb.slice().sort((a, b) => score(b) - score(a))[0] || null;
  }
  const SLOW_RATES = { langsam: 0.6, 'sehr langsam': 0.45, 'extra langsam': 0.32 };
  let speakToken = 0;
  // Vorsprechen. Langsam: deutlich langsamer und bei Sätzen Wort für Wort mit Pausen.
  function speak(text, slow) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) { toast('Dieses Gerät kann nicht vorsprechen.'); return resolve(); }
      const token = ++speakToken;
      speechSynthesis.cancel();
      const v = gbVoice();
      const rate = slow ? (SLOW_RATES[D.settings.slowSpeed] || 0.45) : (D.settings.normalRate || 0.85);
      const parts = slow && String(text).trim().split(/\s+/).length > 1 ? String(text).trim().split(/\s+/) : [String(text)];
      const say = (i) => {
        if (token !== speakToken) return resolve();
        if (i >= parts.length) return resolve();
        const u = new SpeechSynthesisUtterance(parts[i]);
        u.lang = 'en-GB'; if (v) u.voice = v; u.rate = rate; u.pitch = 1; u.volume = 1;
        u.onend = () => setTimeout(() => say(i + 1), slow ? 350 : 0);
        u.onerror = () => resolve();
        speechSynthesis.speak(u);
      };
      // kurze Pause nach cancel(): sonst verschluckt Chrome manchmal den Anfang
      setTimeout(() => say(0), 120);
      setTimeout(resolve, 4000 + parts.length * 2500);
    });
  }

  // ---------- Spracherkennung (Chrome, braucht Internet) ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speechOn = () => !!(D.settings.speech && SR && navigator.onLine);
  function listen(lang) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (r) => { if (!done) { done = true; resolve(r); } };
      let rec;
      try { rec = new SR(); } catch (e) { return finish({ error: 'unsupported', list: [] }); }
      rec.lang = lang; rec.interimResults = false; rec.maxAlternatives = 5; rec.continuous = false;
      rec.onresult = (e) => {
        const list = [];
        for (let i = 0; i < e.results.length; i++) for (let j = 0; j < e.results[i].length; j++) list.push(e.results[i][j].transcript);
        finish({ list });
      };
      rec.onerror = (e) => finish({ error: e.error, list: [] });
      rec.onnomatch = () => finish({ error: 'no-match', list: [] });
      rec.onend = () => finish({ error: 'no-speech', list: [] });
      try { rec.start(); } catch (e) { finish({ error: 'start', list: [] }); }
      setTimeout(() => { try { rec.stop(); } catch (e) { /* */ } }, 9000);
    });
  }
  const speechErrorText = (err) => ({
    'not-allowed': 'Das Mikrofon ist nicht erlaubt. Bitte in Chrome freigeben.',
    'service-not-allowed': 'Das Mikrofon ist nicht erlaubt. Bitte in Chrome freigeben.',
    'network': 'Keine Internetverbindung für die Spracherkennung.',
    'no-speech': 'Ich habe nichts gehört. Tippe aufs Mikrofon und sprich deutlich.',
    'audio-capture': 'Kein Mikrofon gefunden.'
  }[err] || 'Das hat nicht geklappt. Versuch es noch einmal.');

  // ---------- Vergleich und Bewertung ----------
  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    const d = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[m][n];
  }
  // tidyEn: zum Speichern (Satzzeichen bleiben erhalten). normEn/cmpEn: zum Vergleichen.
  const tidyEn = (s) => String(s).replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim();
  const normEn = (s) => tidyEn(s).replace(/[.!?]+$/, '');
  // Bei Sätzen und Redewendungen zählen nur die Wörter, nicht Komma, Punkt, Frage- oder Ausrufezeichen
  const cmpEn = (s) => tidyEn(s).replace(/[,.!?;:"“”„«»…]/g, ' ').replace(/\s+-\s+/g, ' ').replace(/\s+/g, ' ').trim();
  const isVerb = (v) => /verb/i.test(v.pos || '') || (!v.pos && /^to /i.test(v.en));
  function enCandidates(v) {
    const list = [v.en, ...(v.altEn || [])].map(cmpEn);
    if (D.settings.toOptional && isVerb(v)) list.slice().forEach((c) => { if (/^to /i.test(c)) list.push(c.slice(3)); });
    return list;
  }
  // Groß-/Kleinschreibung zählt nur dort, wo die Lösung Großbuchstaben hat (Namen, Wochentage, Monate, „I“).
  // Ausnahme: Der Satzanfang darf klein geschrieben werden (außer „I“), weil bei Sätzen nur die Wörter zählen.
  function caseOk(a, c) {
    const ta = a.split(' '), tc = c.split(' ');
    if (ta.length !== tc.length) return false;
    return tc.every((t, i) => {
      if (i === 0 && tc.length > 1 && !/^I($|')/.test(t)) return ta[i].toLowerCase() === t.toLowerCase();
      return /[A-ZÄÖÜ]/.test(t) ? ta[i] === t : ta[i].toLowerCase() === t.toLowerCase();
    });
  }
  function gradeEn(answer, v) {
    const a = cmpEn(answer);
    const cands = enCandidates(v);
    if (!a) return { ok: false, kind: 'empty', target: cands[0] };
    for (const c of cands) if (caseOk(a, c)) return { ok: true, kind: 'ok', target: c };
    // Kurz- statt Langform (oder umgekehrt) zählt als richtig, mit Hinweis auf die Form im Buch
    const ax = expandEn(a);
    for (const c of cands) if (ax !== a || expandEn(c) !== c) {
      if (caseOk(ax, expandEn(c))) return { ok: true, kind: expandEn(c) !== c ? 'longform' : 'shortform', target: c };
      if (ax.toLowerCase() === expandEn(c).toLowerCase()) return { ok: false, kind: 'case', target: c };
    }
    const hasTo = /^to /i.test(a);
    const pref = cands.filter((c) => /^to /i.test(c) === hasTo);
    for (const c of cands) if (a.toLowerCase() === c.toLowerCase()) return { ok: false, kind: 'case', target: c };
    let best = (pref.length ? pref : cands)[0], bestD = Infinity;
    for (const c of cands) { const dd = lev(a.toLowerCase(), c.toLowerCase()); if (dd < bestD) { bestD = dd; best = c; } }
    if (bestD === 1) {
      const swapped = a.length === best.length && [...a.toLowerCase()].filter((ch, i) => ch !== best[i].toLowerCase()).length === 2;
      return { ok: false, kind: swapped ? 'swap' : 'near', target: best };
    }
    return { ok: false, kind: 'wrong', target: best };
  }
  // Buchstabengenaue Gegenüberstellung von Antwort und Lösung
  function diffOps(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0).map((_, j) => (i === 0 ? j : j === 0 ? i : 0)));
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    const ops = []; let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) { ops.unshift({ t: a[i - 1] === b[j - 1] ? 'm' : 's', a: a[i - 1], b: b[j - 1] }); i--; j--; }
      else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { ops.unshift({ t: 'i', a: a[i - 1] }); i--; }
      else { ops.unshift({ t: 'd', b: b[j - 1] }); j--; }
    }
    return ops;
  }
  const ch = (c) => (c === ' ' ? '&nbsp;' : esc(c));
  function renderDiff(answer, target) {
    const ops = diffOps(cmpEn(answer), target);
    const mine = ops.map((o) => (o.t === 'm' ? '<span class="ok">' + ch(o.a) + '</span>' : o.t === 'd' ? '<span class="miss">&nbsp;</span>' : '<span class="err">' + ch(o.a) + '</span>')).join('');
    const sol = ops.filter((o) => o.t !== 'i').map((o) => (o.t === 'm' ? ch(o.b) : '<span class="miss">' + ch(o.b) + '</span>')).join('');
    return { mine, sol };
  }
  function normDe(s) {
    return String(s).toLowerCase().replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
      .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
      .replace(/^(der|die|das|den|dem|ein|eine|einen|sich|zu|etwas|jemanden|jemandem) /, '');
  }
  function deVariants(v) {
    const out = new Set();
    v.de.forEach((m) => { out.add(normDe(m.replace(/\(.*?\)/g, ''))); out.add(normDe(m.replace(/[()]/g, ''))); });
    out.delete('');
    return [...out];
  }
  const tolerance = (len) => (len <= 3 ? 0 : len <= 7 ? 1 : len <= 15 ? 2 : Math.round(len * 0.15));
  function matchDe(heard, v) {
    const vars = deVariants(v);
    for (const h of heard) {
      const hn = normDe(h);
      for (const m of vars) {
        if (hn === m || (' ' + hn + ' ').includes(' ' + m + ' ')) return true;
        if (lev(hn, m) <= tolerance(m.length)) return true;
        if (hn.split(' ').some((w) => w.length > 3 && lev(w, m) <= tolerance(m.length))) return true;
      }
    }
    return false;
  }
  // Beim Sprechen sind Kurz- und Langform gleich gut („what's“ = „what is“)
  const SHORT = [["i'm", 'i am'], ["you're", 'you are'], ["we're", 'we are'], ["they're", 'they are'], ["he's", 'he is'], ["she's", 'she is'], ["it's", 'it is'], ["what's", 'what is'], ["where's", 'where is'], ["that's", 'that is'], ["there's", 'there is'], ["don't", 'do not'], ["doesn't", 'does not'], ["isn't", 'is not'], ["aren't", 'are not'], ["can't", 'cannot'], ["i've", 'i have'], ["let's", 'let us']];
  function expandEn(s) {
    return s.split(' ').map((t) => {
      const hit = SHORT.find(([k]) => k === t.toLowerCase());
      if (!hit) return t;
      // Groß-/Kleinschreibung des ersten Buchstabens bleibt wie getippt (wichtig für „I“)
      return /^[A-Z]/.test(t) ? hit[1][0].toUpperCase() + hit[1].slice(1) : hit[1];
    }).join(' ');
  }
  const speechNorm = (s) => { let t = ' ' + cmpEn(s).toLowerCase().replace(/[^a-z' ]/g, '').replace(/\s+/g, ' ').trim() + ' '; SHORT.forEach(([k, l]) => { t = t.split(' ' + k + ' ').join(' ' + l + ' '); }); return t.replace(/^ to /, ' ').trim(); };
  function matchEnSpeech(heard, v) {
    const target = speechNorm(v.en);
    let best = 'nochmal';
    for (const h of heard) {
      const hn = speechNorm(h);
      if (hn === target || (' ' + hn + ' ').includes(' ' + target + ' ')) return 'super';
      if (lev(hn, target) <= Math.max(1, Math.round(target.length * 0.34))) best = 'fast';
    }
    return best;
  }

  // ---------- Lernkartei ----------
  function introducedToday() { return D.newByDay[today()] || 0; }
  function sortVocab(list) {
    const uOrder = (v) => { const u = unitById(v.unitId); return u ? u.order : 0; };
    return list.sort((a, b) => uOrder(a) - uOrder(b) || (parseInt(a.page, 10) || 0) - (parseInt(b.page, 10) || 0) || (a.createdAt || 0) - (b.createdAt || 0));
  }
  function plan() {
    const t = today();
    const hw = [], due = [], fresh = [];
    for (const v of D.vocab) {
      const u = unitById(v.unitId); if (!u) continue;
      const p = prog(v.id);
      if (v.homework && p.seen && p.due <= t) hw.push(v);
      else if (v.homework && !p.seen) fresh.push(v);
      else if (u.status === 'kommt') continue;
      else if (p.seen && p.due <= t) due.push(v);
      else if (!p.seen && u.status === 'aktuell') fresh.push(v);
    }
    due.sort((a, b) => prog(a.id).box - prog(b.id).box || (prog(a.id).due < prog(b.id).due ? -1 : 1));
    sortVocab(fresh); sortVocab(hw);
    fresh.sort((a, b) => (b.homework ? 1 : 0) - (a.homework ? 1 : 0));
    let newLeft = Math.max(0, NEW_PER_DAY - introducedToday());
    const freshPick = fresh.slice(0, newLeft);
    const list = [...hw, ...due, ...freshPick].slice(0, roundMax());
    // Schwerpunkt-Wörter zusätzlich (ändern die Lernkartei nicht), nur wenn ohnehin gelernt wird
    const focusIds = new Set();
    const weak = weakCats();
    if (list.length && weak.length && list.length < roundMax()) {
      const inList = new Set(list.map((v) => v.id));
      const cand = [];
      weak.forEach((w) => catWords(w.cat.id).forEach((v) => { if (!inList.has(v.id) && !cand.includes(v)) cand.push(v); }));
      cand.sort((a, b) => prog(b.id).wrong - prog(a.id).wrong || prog(a.id).box - prog(b.id).box);
      cand.slice(0, Math.min(5, roundMax() - list.length)).forEach((v) => { list.push(v); focusIds.add(v.id); });
    }
    return { list, focusIds, hw: hw.length, due: due.length, fresh: freshPick.length, freshWaiting: fresh.length };
  }
  // ---------- Test-Turbo ----------
  // Ab 3 Tagen vor einem eingetragenen Test täglich alle Testwörter, am Vortag ein Probetest.
  const tests = () => (D.tests || []);
  function testWords(tst) {
    if (!tst) return [];
    if (tst.scope === 'all') return allPool();
    if (tst.scope === 'fresh') return freshTagged();
    return D.vocab.filter((v) => (tst.unitIds || []).includes(v.unitId));
  }
  function nextTest() {
    const t = today();
    return tests().filter((x) => x.date >= t).sort((a, b) => (a.date < b.date ? -1 : 1))[0] || null;
  }
  const daysTo = (tst) => daysBetween(today(), tst.date);
  const turboActive = (tst) => !!tst && daysTo(tst) <= 3 && daysTo(tst) >= 0;
  function turboOpen(tst) {
    const t = today();
    if (tst.cycleDay !== t) { tst.cycleDay = t; tst.cycle = []; }
    const done = new Set(tst.cycle);
    return testWords(tst).filter((v) => !done.has(v.id));
  }
  function testScopeText(tst) {
    if (tst.scope === 'all') return 'alle Vokabeln';
    if (tst.scope === 'fresh') return 'neue Vokabeln';
    return (tst.unitIds || []).map((id) => (unitById(id) || {}).name).filter(Boolean).join(', ') || '–';
  }
  const fmtShort = (ds) => { const [y, m, d] = ds.split('-').map(Number); return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(y, m - 1, d).getDay()] + ', ' + pad(d) + '.' + pad(m) + '.'; };

  // „Neu“-markierte Vokabeln (früher „Hausaufgabe“)
  const freshTagged = () => D.vocab.filter((v) => v.homework && unitById(v.unitId));
  // Alle Vokabeln für Testvorbereitung: der Reihe nach, bis jedes Wort einmal dran war
  const allPool = () => D.vocab.filter((v) => { const u = unitById(v.unitId); return u && u.status !== 'kommt'; });
  // Jede Übung zählt für die Lernkartei, aber höchstens einmal pro Wort und Tag (kein „Sitzt“ an einem Abend)
  const canMove = (vid) => { const p = prog(vid); return !p.seen || p.last !== today(); };
  function recordWrite(vid, ok) {
    const p = prog(vid), t = today();
    const before = p.box, wasSeen = p.seen;
    if (!p.seen) { p.seen = true; p.firstSeen = t; D.newByDay[t] = (D.newByDay[t] || 0) + 1; }
    p.prev = { box: p.box, due: p.due, day: t };
    if (ok) { p.box = Math.min(p.box + 1, 6); p.right++; }
    else { p.box = 1; p.wrong++; }
    p.due = addDays(t, INTERVAL[p.box]);
    p.last = t; p.lastOk = ok;
    const v = vocabById(vid); if (ok && v && v.homework && p.box >= 3) v.homework = false;
    rewardWrite(wasSeen, before, ok);
    save();
    return { before, after: p.box };
  }
  function addLearnTime(ms) {
    const t = today();
    const day = D.stats.days[t] || (D.stats.days[t] = { ms: 0, rounds: 0 });
    day.ms += Math.min(ms, 90000);
  }
  const minutesToday = () => Math.round(((D.stats.days[today()] || {}).ms || 0) / 60000);
  const backupDue = () => D.vocab.length > 0 && (!D.lastBackupAt || daysBetween(D.lastBackupAt.slice(0, 10), today()) >= 30);
  const openReports = () => D.reports.filter((r) => r.status === 'offen');

  // ---------- Schwerpunkte: erkennen, was noch nicht sitzt ----------
  const escRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const allCats = () => CATS.concat((D.customCats || []).map((c) => ({ id: c.id, label: '„' + c.text + '“', re: new RegExp(escRe(c.text), 'gi'), say: true, tip: c.tip || 'Dein eigener Schwerpunkt: „' + c.text + '“. Genau hinschauen und laut sprechen.', custom: true })));
  const catById = (id) => allCats().find((c) => c.id === id);
  // Welche Kategorien stecken in einem Wort, und an welchen Stellen?
  function catsIn(str) {
    const out = [];
    for (const c of allCats()) {
      const spans = []; c.re.lastIndex = 0; let m;
      while ((m = c.re.exec(str))) { spans.push([m.index, m.index + m[0].length]); if (!m[0].length) c.re.lastIndex++; }
      if (spans.length) out.push({ cat: c, spans });
    }
    return out;
  }
  function bump(key, err, ex) {
    const sk = D.skills[key] || (D.skills[key] = { t: 0, e: 0, n: 0, ex: [] });
    // ältere Ergebnisse zählen weniger, Fortschritte werden so sichtbar
    sk.t = sk.t * 0.92 + 1; sk.e = sk.e * 0.92 + (err ? 1 : 0); sk.n++; sk.last = today();
    if (err && ex) { sk.ex.unshift(Object.assign({ day: today() }, ex)); sk.ex = sk.ex.slice(0, 5); }
  }
  // Schriftliche Antwort auswerten. Gibt die Kategorien zurück, in denen der Fehler lag.
  function trackWrite(v, answer, grade) {
    if (!answer || !grade || grade.kind === 'empty') return [];
    const target = grade.target, a = cmpEn(answer);
    // Völlig andere Antwort = Wort nicht gewusst, kein Rechtschreibmuster
    if (!grade.ok && grade.kind === 'wrong' && lev(a.toLowerCase(), target.toLowerCase()) > Math.ceil(target.length / 2)) return [];
    const errIdx = new Set();
    if (!grade.ok && grade.kind !== 'case') {
      let j = 0;
      for (const o of diffOps(a, target)) {
        if (o.t === 'm') j++;
        else if (o.t === 's' || o.t === 'd') { errIdx.add(j); j++; }
        else { errIdx.add(j); errIdx.add(j - 1); }
      }
    }
    const hit = [];
    for (const { cat, spans } of catsIn(target)) {
      const err = !grade.ok && (cat.id === 'case' ? grade.kind === 'case' : grade.kind !== 'case' && spans.some(([x, y]) => [...errIdx].some((i) => i >= x && i < y)));
      bump(cat.id + ':write', err, { en: v.en, answer: a });
      if (err) hit.push(cat);
    }
    return hit;
  }
  function trackSay(v, ok, heard) {
    for (const { cat } of catsIn(normEn(v.en))) if (cat.say) bump(cat.id + ':say', !ok, { en: v.en, answer: heard || '' });
  }
  const skillRate = (key) => { const sk = D.skills[key]; return sk && sk.n >= 3 ? sk.e / sk.t : null; };
  const WEAK = 0.34;
  // Aktuelle Schwerpunkte: automatisch erkannt oder von den Eltern festgelegt
  function weakCats() {
    const out = [];
    for (const c of allCats()) {
      const mode = (D.focusMode || {})[c.id] || 'auto';
      if (mode === 'off') continue;
      const w = skillRate(c.id + ':write'), sy = skillRate(c.id + ':say');
      const autoWeak = (w !== null && w >= WEAK) || (sy !== null && sy >= WEAK);
      if (mode === 'on' || autoWeak) out.push({ cat: c, write: w, say: sy, sayWeak: mode === 'on' ? !!c.say : sy !== null && sy >= WEAK, manual: mode === 'on', score: Math.max(w || 0, sy || 0) + (mode === 'on' ? 1 : 0) });
    }
    return out.sort((a, b) => b.score - a.score);
  }
  function catWords(catId) {
    const c = catById(catId); if (!c) return [];
    return D.vocab.filter((v) => { const u = unitById(v.unitId); c.re.lastIndex = 0; return u && u.status !== 'kommt' && prog(v.id).seen && c.re.test(v.en); });
  }
  const wordWeakCats = (v, weak) => { const ids = new Set(catsIn(normEn(v.en)).map((x) => x.cat.id)); return weak.filter((w) => ids.has(w.cat.id)); };

  // ---------- Zustand der Oberfläche ----------
  const S = { view: 'home', R: null, tab: 'vocab', bookId: 'gl1', unitId: null, editId: null, importText: '', preview: null, unlocked: false, pinStep: null, pinFirst: '', backupFile: null, speechConsent: false };
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (S.view === 'home') render(); });

  function render() {
    window.scrollTo(0, 0);
    if (S.view === 'home') return renderHome();
    if (S.view === 'round') return renderRound();
    if (S.view === 'summary') return renderSummary();
    if (S.view === 'parent') return S.unlocked ? renderParent() : renderLock();
    if (S.view === 'path') return renderPath();
    if (S.view === 'lesson') return renderLesson();
    if (S.view === 'lessonend') return renderLessonEnd();
    if (S.view === 'chest') return renderChest();
    if (S.view === 'album') return renderAlbum();
    if (S.view === 'badges') return renderBadges();
    if (S.view === 'shop') return renderShop();
    if (S.view === 'games') return renderGames();
    if (S.view === 'game') return renderGame();
  }
  function rerender() { const y = window.scrollY; render(); window.scrollTo(0, y); }

  // ---------- Startseite (Emma) ----------
  function boxCounts(onlyVisible) {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    D.vocab.forEach((v) => { const u = unitById(v.unitId); if (!u || (onlyVisible && u.status === 'kommt')) return; const p = prog(v.id); if (p.seen) c[p.box]++; });
    return c;
  }
  function boxesHtml(c) {
    return '<div class="boxes">' + [1, 2, 3, 4, 5, 6].map((b) => '<div class="f' + b + '"><b>' + c[b] + '</b><span>' + (b === 6 ? 'Sitzt' : 'Fach ' + b) + '</span></div>').join('') + '</div>';
  }
  function renderHome() {
    const P = plan();
    const name = D.settings.nickname ? ', ' + esc(D.settings.nickname) : '';
    const mins = minutesToday(), goal = D.settings.dailyMinutes;
    const dot = backupDue() || openReports().length || D.vocab.some(needsReview);
    let main;
    if (!D.vocab.length) {
      main = '<div class="card soft center"><p><b>Noch keine Vokabeln da.</b></p><p>Die Wörter werden im Elternbereich (Zahnrad oben rechts) eingetragen.</p></div>';
    } else {
      // Emma wählt: Tagesplan (Mix), nur neue Vokabeln oder alle Vokabeln (Testvorbereitung)
      const nFresh = freshTagged().length, nAll = allPool().length;
      const cycleLeft = allPool().filter((v) => !(D.allCycle || []).includes(v.id)).length;
      let h = '';
      if (P.list.length) {
        const parts = [];
        if (P.hw) parts.push(P.hw + ' Wiederholung neue Vokabeln');
        if (P.due) parts.push(Math.min(P.due, roundMax()) + ' Wiederholung');
        if (P.fresh) parts.push(P.fresh + ' neu');
        if (P.focusIds.size) parts.push(P.focusIds.size + ' Schwerpunkt');
        h += '<h2 style="margin-top:0">Heute dran: ' + P.list.length + ' Wörter</h2><p class="muted">' + esc(parts.join(' · ')) + '</p>' +
          '<button class="btn big" data-act="start">' + ic('book') + 'Mein Tagesplan</button>';
      } else h += '<p class="feedback">Tagesplan erledigt! ' + ic('party') + '</p><p class="center">Du kannst trotzdem weiterüben:</p>';
      if (nFresh) h += '<button class="btn big ' + (P.list.length ? 'secondary' : '') + '" data-act="startfresh" style="margin-top:10px">' + ic('star') + 'Nur neue Vokabeln · ' + nFresh + '</button>';
      if (nAll) h += '<button class="btn big secondary" data-act="startall" style="margin-top:10px">' + ic('repeat') + 'Alle Vokabeln üben</button><p class="small center" style="margin-bottom:0">Für Tests: geht alle ' + nAll + ' Wörter durch (' + (cycleLeft ? 'noch ' + cycleLeft + ' offen' : 'alle geschafft, nächste Runde beginnt von vorn') + '). Zählt auch für die Lernkartei.</p>';
      main = '<div class="card' + (P.list.length ? '' : ' good') + '">' + h +
        (D.settings.paperAllowed ? '<label class="check" style="margin-top:8px"><input type="checkbox" data-change="paper" ' + (D.settings.paperChosen ? 'checked' : '') + '> Ich schreibe auf Papier</label>' : '') + '</div>';
    }
    app.innerHTML =
      (BETA ? '<div class="betabar">Testversion – eigener Speicher, die normale App bleibt unverändert.</div>' : '') +
      '<div class="topbar"><h1>' + ic('cup') + 'Teacup</h1><button class="iconbtn" data-act="parent" aria-label="Elternbereich">' + ic('gear') + (dot ? '<span class="badge-dot"></span>' : '') + '</button></div>' +
      '<div class="hero-city">' + SKYLINE + '<div class="hello"><b>Hello' + name + '!</b><span>Schön, dass du da bist.</span></div></div>' + turboCardHtml() + main + petCardHtml() + pathCardHtml() +
focusCardHtml() +
      '<div class="card"><h3 style="margin-top:0">Deine Lernkartei<span class="spacer"></span><button class="helpbtn" data-act="karteihelp" aria-label="Was bedeutet das?" aria-expanded="' + !!S.karteiHelp + '">?</button></h3>' + boxesHtml(boxCounts(true)) +
        unitProgressHtml() + (S.karteiHelp ? '<div class="tip" style="margin-bottom:0">' + ic('bulb') + '<span>Jedes Wort wohnt in einem <b>Fach</b>. Schreibst du es richtig, rückt es ein Fach weiter und kommt erst später wieder dran: Fach 1 morgen, Fach 2 nach 2 Tagen, Fach 3 nach 4, Fach 4 nach 7, Fach 5 nach 14 Tagen. Danach <b>sitzt</b> es! Ist es falsch, startet es wieder in Fach 1 – so übst du schwierige Wörter öfter. Übst du mehr als den Tagesplan, zählt das auch: Jedes Wort kann pro Tag ein Fach weiterrücken.</span></div>' : '') + '</div>' +
      (installEvt ? '<button class="btn secondary big" data-act="install">' + ic('download') + 'App auf dem Startbildschirm installieren</button>' : '');
  }

  function unitProgressHtml() {
    const us = D.units.filter((u) => u.status !== 'kommt').sort((a, b) => a.order - b.order);
    const rows = us.map((u) => { const ws = D.vocab.filter((v) => v.unitId === u.id); if (!ws.length) return ''; const ok = ws.filter((v) => { const p = D.progress[v.id]; return p && p.seen && p.box >= 3; }).length; return '<div class="uprog"><span>' + esc(u.name) + '</span><div class="progress"><div style="width:' + Math.round((ok / ws.length) * 100) + '%"></div></div><span class="small">' + ok + '/' + ws.length + '</span></div>'; }).join('');
    return rows ? '<p class="small" style="margin:12px 0 4px"><b>Wörter, die sitzen</b> (ab Fach 3)</p>' + rows : '';
  }
  function pathCardHtml() {
    const units = pathUnits(); if (!units.length) return '';
    const u = units.find((x) => x.id === S.pathUnit) || units.find((x) => x.status === 'aktuell') || units[0];
    const st = stations(u.id), ps = pathState(u.id), done = st.filter((_, i) => ps.done[i]).length;
    return '<div class="card"><h3 style="margin-top:0">' + ic('star') + 'Lernpfad</h3><p class="small" style="margin-top:0">' + esc(u.name) + ': ' + done + ' von ' + st.length + ' Stationen geschafft. Kurze Lektionen mit Hören, Sprechen, Bauen und Schreiben.</p>' +
      '<button class="btn big secondary" data-act="openpath">' + ic('repeat') + 'Zum Lernpfad</button></div>';
  }
  function turboCardHtml() {
    const tst = nextTest(); if (!tst) return '';
    const dl = daysTo(tst), name = esc(tst.name || 'Vokabeltest');
    const when = dl === 0 ? 'heute' : dl === 1 ? 'morgen' : 'am ' + fmtShort(tst.date) + ' (in ' + dl + ' Tagen)';
    if (!turboActive(tst)) return '<div class="card soft"><p style="margin:0">' + ic('flag') + ' <b>' + name + '</b> ' + when + ' · ' + esc(testScopeText(tst)) + '<br><span class="small">Der Test-Turbo startet am ' + fmtShort(addDays(tst.date, -3)) + '.</span></p></div>';
    const total = testWords(tst).length, open = turboOpen(tst).length;
    let h = '<div class="card turbo"><h2 style="margin-top:0">' + ic('flag') + 'Test-Turbo</h2><p style="margin-top:0"><b>' + name + '</b> ' + when + ' · ' + esc(testScopeText(tst)) + '</p>';
    if (dl === 0) h += '<p class="feedback">Viel Erfolg heute! ' + ic('star') + '</p>';
    h += '<button class="btn big" data-act="startturbo">' + ic('repeat') + (open ? 'Testwörter üben · noch ' + open + ' von ' + total + ' heute' : 'Alle ' + total + ' Testwörter für heute geschafft – noch einmal?') + '</button>';
    if (dl >= 1) h += '<button class="btn big ' + (dl === 1 ? '' : 'secondary') + '" data-act="startprobe" style="margin-top:10px">' + ic('flag') + 'Probetest (' + Math.min(20, Math.max(total, 10)) + ' Aufgaben)</button>' + (tst.probe ? '<p class="small center" style="margin-bottom:0">Letzter Probetest: ' + tst.probe.score + ' %</p>' : (dl === 1 ? '<p class="small center" style="margin-bottom:0">Heute ist der beste Tag für den Probetest.</p>' : ''));
    return h + '</div>';
  }
  function focusCardHtml() {
    const weak = weakCats().filter((w) => catWords(w.cat.id).length).slice(0, 3);
    if (!weak.length) return '';
    return '<div class="card"><h3 style="margin-top:0">' + ic('target') + 'Deine Schwerpunkte</h3><p class="small">Das übst du gerade besonders. Jede Übung dauert 2–3 Minuten.</p>' +
      weak.map((w) => '<button class="btn secondary" style="width:100%;margin-top:8px" data-act="focus" data-id="' + esc(w.cat.id) + '">' + esc(w.cat.label) + ' üben</button>').join('') + '</div>';
  }

  // ---------- Lernrunde ----------
  function startRound(extra, focusCat, mode) {
    let list, focusIds = new Set(), noBox = new Set();
    const t = today();
    let exam = null;
    if (mode === 'turbo') {
      const tst = nextTest(); if (!tst) return;
      let open = turboOpen(tst);
      if (!open.length) { tst.cycle = []; open = testWords(tst); }
      list = open.sort((a, b) => prog(b.id).wrong - prog(a.id).wrong || prog(a.id).box - prog(b.id).box).slice(0, roundMax());
      if (!list.length) return toast('Für diesen Test sind noch keine Wörter eingetragen.');
    } else if (mode === 'probe' || mode === 'boss') {
      // Probetest / Boss-Kampf: 20 gemischte Aufgaben wie ein Vokabeltest, ohne Hilfen, Auswertung am Ende
      const pool = mode === 'probe' ? testWords(nextTest()) : D.vocab.filter((v) => v.unitId === S.bossUnit && prog(v.id).seen);
      if (pool.length < 4) return toast('Dafür gibt es noch zu wenige gelernte Wörter.');
      const pick = pool.slice().sort(() => Math.random() - 0.5);
      list = Array.from({ length: mode === 'boss' ? 20 : Math.min(20, Math.max(pool.length, 10)) }, (_, i) => pick[i % pick.length]);
      list.forEach((v) => noBox.add(v.id));
      exam = { kind: mode, unitId: mode === 'boss' ? S.bossUnit : null };
    } else if (mode === 'fresh') {
      // Nur neue Vokabeln: ungelernte zuerst, dann heute noch nicht geübte, dann schwächere Fächer
      list = freshTagged().sort((a, b) => (prog(a.id).seen ? 1 : 0) - (prog(b.id).seen ? 1 : 0) || (prog(a.id).last === t ? 1 : 0) - (prog(b.id).last === t ? 1 : 0) || prog(a.id).box - prog(b.id).box).slice(0, roundMax());
    } else if (mode === 'all') {
      const pool = allPool(); const done = new Set(D.allCycle || []);
      let open = pool.filter((v) => !done.has(v.id));
      if (!open.length) { D.allCycle = []; open = pool; }
      list = open.sort(() => Math.random() - 0.5).slice(0, roundMax());
    } else if (focusCat) {
      list = catWords(focusCat).sort(() => Math.random() - 0.5).sort((a, b) => prog(b.id).wrong - prog(a.id).wrong).slice(0, 10);
      list.forEach((v) => focusIds.add(v.id));
      if (!list.length) return toast('Dazu gibt es noch keine gelernten Wörter.');
    } else if (extra) {
      list = D.vocab.filter((v) => { const u = unitById(v.unitId); return u && u.status !== 'kommt' && prog(v.id).seen; });
      list = list.sort(() => Math.random() - 0.5).slice(0, 10);
    } else { const P = plan(); list = P.list; focusIds = P.focusIds; }
    if (!list.length) return;
    if (!exam) list.forEach((v) => { if (!canMove(v.id)) noBox.add(v.id); });
    const weak = weakCats();
    S.R = {
      extra, mode: mode || (focusCat ? 'focus' : extra ? 'extra' : 'plan'), focusCat: focusCat || null, paper: D.settings.paperAllowed && D.settings.paperChosen,
      tasks: list.map((v) => {
        const wc = wordWeakCats(v, weak);
        const fc = focusCat ? catById(focusCat) : null;
        return { vid: v.id, pass: 1, isNew: !prog(v.id).seen, noBox: noBox.has(v.id), focus: focusIds.has(v.id), sayFocus: focusIds.has(v.id) && ((fc && fc.say && speechOn()) || wc.some((w) => w.sayWeak)) };
      }),
      i: 0, part: 1, words: list.map((v) => v.id), total: list.length, doneWords: new Set(), done2: new Set(), firstOk2: 0, moves: {}, firstOk: 0, reported: new Set(), last: Date.now()
    };
    S.R.tasks.forEach((t) => (t.phase = 'write'));
    if (exam) {
      // etwa jede dritte Aufgabe Englisch → Deutsch, Rest Deutsch → Englisch (schriftlich)
      S.R.exam = exam; S.R.paper = false;
      S.R.tasks.forEach((t, i) => { t.dir = i % 3 === 2 ? 'en' : 'de'; t.phase = t.dir === 'en' ? 'dewrite' : 'write'; t.isNew = false; t.sayFocus = false; });
    }
    S.R.session = newSession(S.R.mode); save();
    S.view = 'round'; render();
  }
  function tick() {
    if (!S.R) return;
    const n = Date.now(), d = Math.min(n - S.R.last, 90000);
    addLearnTime(d); S.R.last = n;
    if (S.R.session) { S.R.session.ms += d; S.R.session.end = new Date(n).toISOString(); }
    checkGoal();
  }
  // Lernzeiten-Protokoll: wann, wie lange, was geübt, was richtig/falsch (für die Statistik)
  const MODE_NAME = { plan: 'Tagesplan', fresh: 'Neue Vokabeln', all: 'Alle Vokabeln', focus: 'Schwerpunkt', extra: 'Extra-Übung', turbo: 'Test-Turbo', probe: 'Probetest', boss: 'Boss-Kampf', path: 'Lernpfad', game: 'Minispiel' };
  function newSession(mode) {
    D.sessions = D.sessions || [];
    const now = new Date().toISOString();
    const sess = { id: uid(), start: now, end: now, ms: 0, mode, ev: [] };
    D.sessions.push(sess);
    return sess;
  }
  function logEvent(dir, T, ok, answer, up) {
    const v = vocabById(T.vid); if (!S.R || !S.R.session || !v) return;
    S.R.session.ev.push({ v: T.vid, en: v.en, de: deText(v), d: dir, ok: !!ok, a: answer || '', p: T.pass, up: up ? 1 : 0, t: Date.now() });
  }
  function closeSession() {
    if (!S.R || !S.R.session) return;
    if (!S.R.session.ev.length) D.sessions = D.sessions.filter((x) => x !== S.R.session);
  }
  const curTask = () => S.R.tasks[S.R.i];
  function nextPhase() {
    tick();
    const T = curTask();
    if (S.R.exam) return finishTask();
    // Teil 1: Deutsch → Englisch schreiben, kontrollieren, (neue Wörter) nachsprechen. Teil 2: Englisch → Deutsch.
    const order = S.R.part === 2 ? ['dewrite', 'decheck'] : ['write', 'check', 'repeat'];
    let idx = order.indexOf(T.phase) + 1;
    while (idx < order.length) {
      const ph = order[idx];
      if (ph !== 'repeat' || (T.pass === 1 && (T.isNew || T.sayFocus || sayAgain(T)))) break;
      idx++;
    }
    if (idx < order.length) { T.phase = order[idx]; T.ui = {}; save(); return render(); }
    finishTask();
  }
  // Nachsprechen auch bei bekannten Wörtern: immer, häufig (falsche + jedes zweite) oder nur neue
  function sayAgain(T) {
    const mode = D.settings.sayMode || 'haeufig';
    if (mode === 'immer') return true;
    if (mode === 'neu') return false;
    if (!T.writeOk) return true;
    S.R.sayCount = (S.R.sayCount || 0) + 1;
    return S.R.sayCount % 2 === 1;
  }
  function finishTask() {
    const R = S.R, T = curTask();
    if (R.exam) { R.i++; save(); if (R.i >= R.tasks.length) return endRound(); return render(); }
    if (R.part === 2) {
      if (T.deOk) R.done2.add(T.vid);
      else R.tasks.push({ vid: T.vid, pass: T.pass + 1, phase: 'dewrite' });
    } else if (T.writeOk) R.doneWords.add(T.vid);
    else R.tasks.push({ vid: T.vid, pass: T.pass + 1, isNew: false, focus: T.focus, phase: 'write' });
    R.i++;
    save();
    if (R.i >= R.tasks.length) {
      // Nach Teil 1: Zwischenseite „andersrum?“ (nicht bei Schwerpunkt-Übungen)
      if (R.part === 1 && !R.focusCat) { R.part = 'switch'; return render(); }
      endRound();
      return;
    }
    render();
  }
  function endRound() { tick(); closeSession(); addLearnTime(0); D.stats.days[today()].rounds++; save(); S.view = 'summary'; render(); }
  function startPart2() {
    const R = S.R;
    R.part = 2; R.i = 0; R.total = R.words.length;
    R.tasks = R.words.filter((id) => vocabById(id)).map((vid) => ({ vid, pass: 1, phase: 'dewrite' }));
    render();
  }
  function switchHtml() {
    const R = S.R;
    return '<div class="hero-city small-city">' + SKYLINE + '<div class="hello"><b>Teil 1 geschafft!</b><span>Deutsch → Englisch</span></div></div>' +
      '<div class="card center"><p class="feedback">' + ic('repeat') + 'Jetzt andersrum?</p><p>Du siehst die ' + R.words.length + ' englischen Wörter und schreibst, was sie auf Deutsch heißen.</p>' +
      '<button class="btn big" data-act="part2">Los geht\'s: Englisch → Deutsch</button><button class="btn ghost" data-act="part2skip" style="width:100%;margin-top:8px">Für diese Runde reicht\'s</button></div>';
  }
  function setWrite(ok, answer, grade) {
    const R = S.R, T = curTask();
    T.writeOk = ok; T.answer = answer; T.grade = grade;
    if (T.pass === 1) {
      if (ok) R.firstOk++;
      if (!T.noBox) R.moves[T.vid] = recordWrite(T.vid, ok);
      else R.kept = (R.kept || 0) + 1;
      if (R.mode === 'all') { D.allCycle = [...new Set([...(D.allCycle || []), T.vid])]; }
      if (R.mode === 'turbo') { const tst = nextTest(); if (tst) { turboOpen(tst); if (!tst.cycle.includes(T.vid)) tst.cycle.push(T.vid); } }
      logEvent('de', T, ok, answer, !T.noBox && R.moves[T.vid] && R.moves[T.vid].after > R.moves[T.vid].before);
      if (!R.paper) { T.errCats = trackWrite(vocabById(T.vid), answer, grade); save(); }
    } else { logEvent('de', T, ok, answer, false); save(); }
    if (R.exam) return;
    beep(ok);
    if (ok) setTimeout(() => confetti(14), 60);
  }
  function roundHeader() {
    const R = S.R, T = curTask();
    const done = R.part === 2 ? R.done2 : R.doneWords;
    const pct = Math.round((done.size / R.total) * 100);
    if (R.exam) {
      const pctE = Math.round((R.i / R.tasks.length) * 100);
      return '<div class="topbar"><button class="iconbtn" data-act="quit" aria-label="Beenden">' + ic('x') + '</button><h1 style="font-size:1.05rem">' + (R.exam.kind === 'boss' ? 'Boss-Kampf' : 'Probetest') + ' · Aufgabe ' + (R.i + 1) + ' von ' + R.tasks.length + '</h1><span class="pill">' + ic('flag') + 'Test</span></div>' +
        '<div class="track"><div class="fill" style="width:' + pctE + '%"></div><span class="bus" style="left:' + pctE + '%">' + BUS + '</span></div><div class="steps"><span>Ohne Hilfen – wie im echten Test</span><span>' + R.tasks.length + ' Aufgaben</span></div>';
    }
    const label = (R.part === 2 ? 'Teil 2 · ' : R.mode === 'fresh' ? 'Neu · ' : R.mode === 'all' ? 'Alle · ' : R.mode === 'turbo' ? 'Test-Turbo · ' : '') + (T.pass > 1 ? 'Noch einmal üben' : 'Wort ' + Math.min(R.total, R.i + 1) + ' von ' + R.total);
    const mark = (T.focus && !R.focusCat) || R.focusCat ? ' ' + ic('target') : '';
    const steps = { write: ic('pencil') + 'Englisch schreiben', check: ic('check') + 'Kontrollieren', repeat: ic('repeat') + 'Nachsprechen', dewrite: ic('pencil') + 'Deutsch schreiben', decheck: ic('check') + 'Kontrollieren' };
    return '<div class="topbar"><button class="iconbtn" data-act="quit" aria-label="Runde beenden">' + ic('x') + '</button><h1 style="font-size:1.05rem">' + esc(label) + (R.extra ? ' · Extra' : '') + mark + '</h1><span class="pill">' + steps[T.phase] + '</span></div>' +
      '<div class="track"><div class="fill" style="width:' + pct + '%"></div><span class="bus" style="left:' + pct + '%">' + BUS + '</span></div><div class="steps"><span>' + done.size + ' geschafft</span><span>' + R.total + ' Wörter</span></div>';
  }
  const speakBtns = (text) => '<div class="speak-row"><button class="btn secondary" data-act="say" data-text="' + esc(text) + '">' + ic('speaker') + 'Anhören</button><button class="btn secondary" data-act="sayslow" data-text="' + esc(text) + '">' + ic('snail') + 'Langsam</button></div>';
  function renderRound() {
    if (S.R.part === 'switch') { app.innerHTML = switchHtml(); return; }
    const T = curTask(), v = vocabById(T.vid);
    if (!v) { (S.R.part === 2 ? S.R.done2 : S.R.doneWords).add(T.vid); T.writeOk = T.deOk = true; return finishTask(); }
    T.ui = T.ui || {};
    let body = '';
    const meta = [v.pos, unitById(v.unitId) ? unitById(v.unitId).name + (v.page ? ', S. ' + v.page : '') : ''].filter(Boolean).join(' · ');
    if (T.phase === 'write') {
      const fc = S.R.focusCat && catById(S.R.focusCat);
      if (fc && T.pass === 1 && S.R.i === 0) body += '<div class="tip">' + ic('target') + '<b>Dein Schwerpunkt:</b> ' + esc(fc.tip) + '</div>';
      body += '<div class="card"><div class="prompt"><div class="label">Wie heißt das auf Englisch?</div><div class="word' + (deText(v).length > 24 ? ' long' : '') + '">' + esc(deText(v)) + '</div><div class="meta">' + esc(meta) + '</div></div>';
      if (S.R.paper) body += '<p class="center">Schreib das englische Wort auf dein Papier.</p><button class="btn big" data-act="reveal">Aufdecken</button></div>';
      else body += '<input type="text" id="ans" class="answer-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="en" placeholder="englisches Wort" data-enter="check">' +
        '<div class="row" style="margin-top:12px"><button class="btn secondary" data-act="dontknow">Weiß ich nicht</button><button class="btn" data-act="check">Prüfen</button></div></div>';
    } else if (T.phase === 'check') body = checkHtml(T, v);
    else if (T.phase === 'repeat') body = repeatHtml(T, v);
    else if (T.phase === 'dewrite') body = deWriteHtml(T, v);
    else if (T.phase === 'decheck') body = deCheckHtml(T, v);
    app.innerHTML = roundHeader() + body;
    const inp = $('#ans'); if (inp) inp.focus();
    if (T.phase === 'check' && !T.ui.spoken) { T.ui.spoken = true; speak(v.en); }
    if (T.phase === 'repeat' && !T.ui.spoken) { T.ui.spoken = true; speak(v.en); }
  }
  function extrasHtml(v) {
    let h = '';
    if (v.note) h += '<div class="tip">' + ic('bulb') + esc(v.note) + '</div>';
    if (v.checked && (v.exEn || v.exDe)) h += '<p class="center"><i>' + esc(v.exEn) + '</i>' + (v.exDe ? '<br><span class="muted">' + esc(v.exDe) + '</span>' : '') + '</p>';
    return h;
  }
  function checkHtml(T, v) {
    if (S.R.paper && T.writeOk === undefined) {
      return '<div class="card"><div class="prompt"><div class="label">' + esc(deText(v)) + '</div><div class="solution' + (v.en.length > 24 ? ' long' : '') + '">' + esc(v.en) + '</div></div>' + speakBtns(v.en) + extrasHtml(v) +
        '<p class="center"><b>Hast du es richtig geschrieben?</b> Vergleiche jeden Buchstaben.</p>' +
        '<div class="row"><button class="btn bad" data-act="paper-no">✗ Nicht gewusst</button><button class="btn good" data-act="paper-yes">✓ Gewusst</button></div></div>';
    }
    const g = T.grade || { kind: T.writeOk ? 'ok' : 'wrong', target: v.en };
    let h;
    if (T.writeOk) {
      const formHint = g.kind === 'longform' ? 'Richtig! Im Buch steht die Kurzform – die solltest du dir merken:' : g.kind === 'shortform' ? 'Richtig! Im Buch steht die Langform:' : '';
      if (formHint) h = '<div class="card good pop"><p class="feedback">✓ Richtig!</p><div class="tip">' + ic('bulb') + esc(formHint.replace('Richtig! ', '')) + '</div><div class="solution' + (v.en.length > 24 ? ' long' : '') + '">' + esc(v.en) + '</div>';
      else h = '<div class="card good pop"><p class="feedback">✓ ' + esc(pick(['Richtig!', 'Super!', 'Klasse!', 'Genau!'])) + '</p><div class="solution' + (v.en.length > 24 ? ' long' : '') + '">' + esc(v.en) + '</div>';
    } else {
      const msg = {
        near: 'Fast! Nur ein Buchstabe ist anders. Schau dir die rote Stelle an.',
        swap: 'Fast! Zwei Buchstaben sind vertauscht.',
        case: 'Fast! Achte auf die Großschreibung.',
        empty: 'Kein Problem, so lernst du es jetzt.',
        wrong: 'Noch nicht ganz. Schau dir die Lösung genau an.'
      }[g.kind] || '';
      h = '<div class="card bad shake"><p class="feedback">' + esc(msg) + '</p>';
      if (T.answer && !S.R.paper && lev(cmpEn(T.answer).toLowerCase(), g.target.toLowerCase()) <= Math.ceil(g.target.length / 2)) {
        const d = renderDiff(T.answer, g.target);
        h += '<p class="center small" style="margin-bottom:0">Deine Antwort</p><div class="diff">' + d.mine + '</div><p class="center small" style="margin-bottom:0">Richtig ist</p><div class="diff">' + d.sol + '</div>';
      } else h += (T.answer ? '<p class="center small" style="margin-bottom:0">Deine Antwort</p><div class="diff"><s>' + esc(T.answer) + '</s></div>' : '') + '<p class="center small" style="margin-bottom:0">Richtig ist</p><div class="solution' + (v.en.length > 24 ? ' long' : '') + '">' + esc(v.en) + '</div>';
      if (g.kind === 'case') h += '<p class="center small">Namen, Wochentage, Monate und „I“ schreibt man im Englischen groß.</p>';
    }
    h += speakBtns(v.en) + extrasHtml(v) + focusTipsHtml(T, v) + '</div>';
    if (!T.writeOk && T.answer && !S.R.paper) h += '<button class="btn ghost" data-act="iwasright">' + ic('flag') + 'Ich war richtig</button>';
    if (T.ui.reported) h += '<p class="small center">Gemeldet. Papa oder Mama schauen es sich an.</p>';
    h += '<button class="btn big" data-act="next">Weiter</button>';
    return h;
  }
  // Tipps zu Fehlerstelle und aktuellen Schwerpunkten (höchstens zwei)
  function focusTipsHtml(T, v) {
    const cats = [];
    (T.errCats || []).forEach((c) => { if (!cats.includes(c)) cats.push(c); });
    wordWeakCats(v, weakCats()).forEach((w) => { if (!cats.find((c) => c.id === w.cat.id)) cats.push(w.cat); });
    return cats.slice(0, 2).map((c) => '<div class="tip">' + ic('target') + esc(c.tip) + '</div>').join('');
  }
  // Teil 2: englisches Wort sehen, deutsche Bedeutung schreiben (oder einsprechen)
  function deWriteHtml(T, v) {
    const u = T.ui;
    let h = '<div class="card"><div class="prompt"><div class="label">Was heißt das auf Deutsch?</div><div class="word' + (v.en.length > 24 ? ' long' : '') + '">' + esc(v.en) + '</div></div>' + speakBtns(v.en);
    if (S.R.paper) return h + '<p class="center">Schreib die deutsche Bedeutung auf dein Papier.</p><button class="btn big" data-act="dereveal">Aufdecken</button></div>';
    h += '<input type="text" id="ans" class="answer-input" autocomplete="off" autocorrect="off" spellcheck="false" lang="de" placeholder="deutsches Wort" data-enter="decheck" value="' + esc(u.heard || '') + '">';
    if (speechOn()) h += '<div class="center" style="margin-top:12px"><button class="mic' + (u.listening ? ' listening' : '') + '" data-act="listen-de" aria-label="Einsprechen" style="width:72px;height:72px">' + ic('mic') + '</button><p class="small">' + (u.listening ? 'Ich höre zu …' : esc(u.msg || 'Oder aufs Mikrofon tippen und sagen.')) + '</p></div>';
    return h + '<div class="row" style="margin-top:12px"><button class="btn secondary" data-act="dedontknow">Weiß ich nicht</button><button class="btn" data-act="decheck">Prüfen</button></div></div>';
  }
  function deCheckHtml(T, v) {
    const sol = '<div class="solution' + (deText(v).length > 24 ? ' long' : '') + '">' + esc(deText(v)) + '</div>';
    if (S.R.paper && T.deOk === undefined) {
      return '<div class="card"><div class="prompt"><div class="label">' + esc(v.en) + '</div>' + sol + '</div>' + extrasHtml(v) +
        '<p class="center"><b>Hast du es gewusst?</b></p><div class="row"><button class="btn bad" data-act="depaper-no">✗ Nicht gewusst</button><button class="btn good" data-act="depaper-yes">✓ Gewusst</button></div></div>';
    }
    let h = T.deOk ? '<div class="card good pop"><p class="feedback">✓ ' + esc(pick(['Richtig!', 'Super!', 'Klasse!', 'Genau!'])) + '</p><p class="center small" style="margin:0">' + esc(v.en) + ' =</p>' + sol
      : '<div class="card bad shake"><p class="feedback">' + (T.deAnswer ? 'Noch nicht ganz.' : 'Kein Problem, so lernst du es jetzt.') + '</p>' + (T.deAnswer ? '<p class="center small" style="margin-bottom:0">Deine Antwort</p><div class="diff"><s>' + esc(T.deAnswer) + '</s></div>' : '') + '<p class="center small" style="margin-bottom:0">' + esc(v.en) + ' heißt</p>' + sol;
    h += extrasHtml(v) + '</div>';
    if (!T.deOk && T.deAnswer) h += '<button class="btn ghost" data-act="de-right">' + ic('flag') + 'Ich war richtig</button>';
    return h + '<button class="btn big" data-act="next">Weiter</button>';
  }
  function setDe(ok, answer) { const T = curTask(); T.deOk = ok; T.deAnswer = answer; logEvent('en', T, ok, answer, false); save(); if (S.R.exam) return; if (T.pass === 1 && ok) S.R.firstOk2++; beep(ok); if (ok) setTimeout(() => confetti(14), 60); }
  // Hinweis, warum die Aussprache gerade nicht automatisch geprüft wird
  function sayCheckOffHtml() {
    const why = !SR ? 'Dieser Browser kann keine Sprache erkennen (bitte Chrome nutzen).' : !D.settings.speech ? 'Die Aussprache-Prüfung ist ausgeschaltet. Eltern können sie unter Einstellungen → Spracherkennung einschalten.' : !navigator.onLine ? 'Ohne Internet kann die Aussprache nicht geprüft werden.' : '';
    return why ? '<p class="small center">' + ic('bulb') + ' ' + esc(why) + ' Bis dahin: anhören, aufnehmen, vergleichen.</p>' : '';
  }
  function repeatHtml(T, v) {
    const u = T.ui; u.tries = u.tries || 0;
    let h = '<div class="card"><div class="prompt"><div class="label">' + (T.isNew ? 'Neues Wort: ' : T.sayFocus ? ic('target') + 'Aussprache üben: ' : 'Sprich es laut: ') + 'Hör zu und sprich nach.</div><div class="word' + (v.en.length > 24 ? ' long' : '') + '">' + esc(v.en) + '</div><div class="meta">' + esc(deText(v)) + '</div></div>' + speakBtns(v.en) + syllableHtml(v.en) + recordHtml(v.en);
    if (speechOn() && !u.selfMode) {
      const fin = u.level === 'super' || u.tries >= 3;
      if (!fin) h += '<div class="center"><button class="mic' + (u.listening ? ' listening' : '') + '" data-act="listen-en" aria-label="Nachsprechen">' + ic('mic') + '</button><p>' + (u.listening ? 'Ich höre zu …' : 'Tippe aufs Mikrofon und sprich nach.') + '</p></div>';
      if (u.level) {
        const fb = { super: ['good', ic('star') + 'Super verstanden!'], fast: ['warn', 'Fast, hör noch mal hin.'], nochmal: ['bad', u.heard ? 'Das war noch nicht richtig. Versuch es noch einmal.' : 'Das habe ich nicht richtig verstanden – das war noch nicht ganz richtig. Hör genau hin und versuch es noch einmal.'] }[u.level];
        h += '<div class="card ' + fb[0] + ' center"><p class="feedback">' + fb[1] + '</p>' + (u.heard ? '<p class="small">Ich habe verstanden: „' + esc(u.heard) + '“</p>' : '') + '</div>';
      } else if (u.msg) h += '<p class="center">' + esc(u.msg) + '</p>';
      if (u.tries >= 2 && u.level !== 'super') h += '<div class="tip">' + ic('bulb') + esc(v.checked && v.tip ? v.tip : ((catsIn(normEn(v.en)).find((x) => x.cat.say && x.cat.id !== 'final') || {}).cat || { tip: 'Hör genau hin: Ich spreche es dir langsam vor. Achte auf jeden Laut.' }).tip) + '</div>';
      if (fin) h += '<p class="center small">' + (u.level === 'super' ? '' : 'Gut geübt! Wir machen weiter.') + '</p>';
      h += '</div>' + (fin ? '<button class="btn big" data-act="next">Weiter</button>' : '<button class="btn ghost" data-act="self-en">Ohne Mikrofon weiter</button>');
      return h;
    }
    return h + '<p class="center">Sprich das Wort laut nach. Hör dir den Vergleich so oft an, wie du willst.</p>' + (u.selfMode ? '' : sayCheckOffHtml()) + '</div><button class="btn big" data-act="next">✓ Nachgesprochen, weiter</button>';
  }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function onBossWon(unitId) {
    D.bossWon = D.bossWon || {}; D.bossWon[unitId] = today();
    const g = G(); if (!g.bossPaid[unitId]) { g.bossPaid[unitId] = today(); award(50, 'boss'); }
    save(); checkBadges();
  }
  function examSummaryHtml(R) {
    const n = R.tasks.length, ok = R.tasks.filter((t) => (t.dir === 'en' ? t.deOk : t.writeOk)).length, pc = Math.round((ok / n) * 100);
    const passed = pc >= 80;
    if (R.exam.kind === 'boss' && passed) onBossWon(R.exam.unitId);
    if (R.exam.kind === 'probe') { const tst = nextTest(); if (tst) { tst.probe = { day: today(), score: pc }; } if (pc === 100) G().probe100 = true; save(); checkBadges(); }
    const wrong = R.tasks.filter((t) => !(t.dir === 'en' ? t.deOk : t.writeOk));
    setTimeout(() => confetti(passed ? 60 : 20), 100);
    let h = '<div class="hero-city small-city">' + SKYLINE + '<div class="hello"><b>' + (R.exam.kind === 'boss' ? (passed ? 'Boss besiegt!' : 'Fast geschafft!') : 'Probetest fertig!') + '</b><span>' + ok + ' von ' + n + ' richtig · ' + pc + ' %</span></div></div>';
    h += '<div class="card ' + (passed ? 'good' : 'warn') + ' center"><p class="feedback">' + (passed ? ic('star') + (R.exam.kind === 'boss' ? 'Bestanden!' + (G().bossPaid[R.exam.unitId] === today() ? ' +50 Sterne' : '') : 'Super, du bist gut vorbereitet!') : 'Noch ' + Math.max(0, Math.ceil(n * 0.8) - ok) + ' richtige Antworten bis 80 %. Übe die Wörter unten noch einmal.') + '</p></div>';
    if (wrong.length) h += '<div class="card"><h3 style="margin-top:0">Das übst du noch</h3><ul class="list">' + wrong.map((t) => { const v = vocabById(t.vid); if (!v) return ''; const ans = t.dir === 'en' ? t.deAnswer : t.answer; return '<li><span class="grow">' + (t.dir === 'en' ? '<span class="en">' + esc(v.en) + '</span> → <b>' + esc(deText(v)) + '</b>' : '<span class="de">' + esc(deText(v)) + '</span> → <b>' + esc(v.en) + '</b>') + (ans ? '<br><span class="small">Du: „' + esc(ans) + '“</span>' : '') + '</span></li>'; }).join('') + '</ul></div>';
    h += '<button class="btn big" data-act="home">Zur Startseite</button>';
    return h;
  }
  function renderSummary() {
    const R = S.R;
    if (R.exam) { app.innerHTML = examSummaryHtml(R); S.R = null; return; }
    const ups = Object.entries(R.moves).filter(([, m]) => m.after > m.before);
    const mins = minutesToday();
    setTimeout(() => confetti(40), 100);
    let h = '<div class="hero-city small-city">' + SKYLINE + '<div class="hello"><b>Runde geschafft!</b><span>Well done!</span></div></div><div class="card"><p><b>' + R.firstOk + ' von ' + R.total + '</b> Wörter beim ersten Mal richtig geschrieben.</p>';
    if (R.done2.size) h += '<p><b>' + R.firstOk2 + ' von ' + R.words.length + '</b> beim ersten Mal richtig ins Deutsche übersetzt.</p>';
    if (R.focusCat) h += '<p class="small">' + ic('target') + 'Schwerpunkt ' + esc((catById(R.focusCat) || {}).label || '') + ' geübt.</p>';
    else if (R.mode === 'all') h += '<p class="small">Alle Vokabeln üben: noch ' + allPool().filter((v) => !(D.allCycle || []).includes(v.id)).length + ' Wörter offen.</p>';
    else if (R.mode === 'fresh') h += '<p class="small">Nur neue Vokabeln geübt.</p>';
    if (ups.length) h += '<p>' + ic('star') + '<b>' + ups.length + '</b> ' + (ups.length === 1 ? 'Wort ist' : 'Wörter sind') + ' ein Fach weiter gekommen.</p>';
    if (R.kept) h += '<p class="small">' + R.kept + (R.kept === 1 ? ' Wort hattest' : ' Wörter hattest') + ' du heute schon geübt. Jedes Wort rückt höchstens ein Fach pro Tag weiter, damit es sich gut einprägt. Morgen geht es weiter.</p>';
    h += '</div>';
    const rows = Object.entries(R.moves).map(([vid, m]) => { const v = vocabById(vid); return v ? '<li><span class="grow"><span class="en">' + esc(v.en) + '</span></span><span class="pill ' + (m.after > m.before ? 'good' : 'warn') + '">' + BOX_NAME[m.after] + '</span></li>' : ''; }).join('');
    if (rows) h += '<div class="card"><h3 style="margin-top:0">Deine Wörter</h3><ul class="list">' + rows + '</ul></div>';
    if (mins >= D.settings.dailyMinutes) h += '<div class="card good center"><p class="feedback">Für heute geschafft! ' + ic('star') + '</p><p>Du kannst freiwillig weiterlernen.</p></div>';
    h += '<button class="btn big" data-act="home">Zur Startseite</button>';
    app.innerHTML = h;
    S.R = null;
  }

  // ---------- Silbenhilfe ----------
  // Einfache Silbentrennung für längere englische Wörter (Merkhilfe, keine Wörterbuch-Genauigkeit)
  const ONSETS = ['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'sc', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'tr', 'tw', 'wr', 'kn', 'qu', 'th', 'ch', 'sh', 'ph', 'wh'];
  const DIGRAPHS = ['th', 'ch', 'sh', 'ph', 'wh', 'ck', 'ng', 'qu'];
  function syllables(word) {
    const w = String(word);
    if (!/^[A-Za-z]{6,}$/.test(w)) return [w];
    const lw = w.toLowerCase();
    const isV = (i) => { const c = lw[i]; if ('aeiou'.includes(c)) return true; return c === 'y' && i > 0; };
    // stummes End-e (nicht bei -le) zählt nicht als eigene Silbe
    const silentE = lw.endsWith('e') && !lw.endsWith('le') && !isV(lw.length - 2);
    const groups = []; let i = 0;
    while (i < lw.length) {
      if (isV(i) && !(silentE && i === lw.length - 1)) { const st = i; while (i < lw.length && isV(i) && !(silentE && i === lw.length - 1)) i++; groups.push([st, i]); } else i++;
    }
    if (groups.length < 2) return [w];
    const cuts = [];
    for (let g = 0; g < groups.length - 1; g++) {
      const a = groups[g][1], b = groups[g + 1][0], cl = lw.slice(a, b);
      if (g === groups.length - 2 && lw.endsWith('le') && b === lw.length - 1) { cuts.push(Math.max(a, b - 2)); continue; }
      if (cl.length <= 1) cuts.push(a);
      else if (cl.length === 2) cuts.push(DIGRAPHS.includes(cl) ? a : a + 1);
      else { const last2 = cl.slice(-2); cuts.push(ONSETS.includes(last2) ? b - 2 : a + 2); }
    }
    const parts = []; let prev = 0;
    cuts.filter((c, k) => c > prev && (k === 0 || c > cuts[k - 1])).forEach((c) => { parts.push(w.slice(prev, c)); prev = c; });
    parts.push(w.slice(prev));
    return parts.filter(Boolean);
  }
  function syllableHtml(en) {
    const words = String(en).split(' ');
    if (words.length > 1) return '';
    const parts = syllables(en);
    if (parts.length < 2) return '';
    return '<div class="syl"><span class="small">Silbenhilfe:</span> ' + parts.map((p) => '<button class="sylbtn" data-act="saysyl" data-text="' + esc(p) + '">' + esc(p) + '</button>').join('<span class="syldot">·</span>') + '</div>';
  }

  // ---------- Aufnahme und Vergleich (wird nicht gespeichert) ----------
  let recState = null;
  function recordHtml(text) {
    if (!(navigator.mediaDevices && window.MediaRecorder)) return '';
    const r = recState && recState.text === text ? recState : null;
    return '<div class="recrow">' +
      (r && r.recording ? '<button class="btn bad small" data-act="recstop">' + ic('mic') + 'Stopp</button><span class="small">Ich nehme auf …</span>'
        : '<button class="btn secondary small" data-act="recstart" data-text="' + esc(text) + '">' + ic('mic') + (r && r.url ? 'Neu aufnehmen' : 'Mich aufnehmen') + '</button>') +
      (r && r.url ? '<button class="btn small" data-act="reccompare">' + ic('speaker') + 'Vergleichen: Original, dann ich</button>' : '') + '</div>';
  }
  async function recStart(text) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (recState && recState.url) URL.revokeObjectURL(recState.url);
      const chunks = []; const mr = new MediaRecorder(stream);
      recState = { text, recording: true, mr, stream, url: null };
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); recState.url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || 'audio/webm' })); recState.recording = false; rerender(); };
      mr.start(); rerender();
      setTimeout(() => { if (recState && recState.mr === mr && mr.state === 'recording') mr.stop(); }, 4000);
    } catch (e) { toast('Das Mikrofon ist nicht erlaubt. Bitte in Chrome freigeben.'); }
  }
  async function recCompare() {
    if (!recState || !recState.url) return;
    await speak(recState.text);
    await new Promise((r) => setTimeout(r, 300));
    const a = new Audio(recState.url); a.play().catch(() => {});
  }
  function recReset() { if (recState) { try { if (recState.mr && recState.mr.state === 'recording') recState.mr.stop(); } catch (e) { /* */ } if (recState.url) URL.revokeObjectURL(recState.url); } recState = null; }

  // ---------- Lernpfad (Duolingo-Prinzip) ----------
  const STATION_SIZE = 6;
  const pathUnits = () => D.units.filter((u) => u.status !== 'kommt' && D.vocab.some((v) => v.unitId === u.id)).sort((a, b) => a.order - b.order);
  function stations(unitId) {
    const words = sortVocab(D.vocab.filter((v) => v.unitId === unitId));
    const out = [];
    for (let i = 0; i < words.length; i += STATION_SIZE) out.push(words.slice(i, i + STATION_SIZE));
    // letzte Mini-Station mit 1–2 Wörtern an die vorige anhängen
    if (out.length > 1 && out[out.length - 1].length < 3) { const last = out.pop(); out[out.length - 1].push(...last); }
    return out;
  }
  const pathState = (unitId) => { D.path = D.path || {}; return (D.path[unitId] = D.path[unitId] || { done: {} }); };
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  // Lückensatz: Satz mit Lücke, falls ein geprüfter Beispielsatz das Wort enthält
  function gapFor(v) {
    if (!v.checked || !v.exEn) return null;
    const forms = [v.en, ...(v.altEn || [])].map(normEn).flatMap((f) => (/^to /i.test(f) ? [f, f.slice(3)] : [f]));
    for (const f of forms) {
      const re = new RegExp('\\b' + escRe(f) + '\\b', 'i'); const m = v.exEn.match(re);
      if (m) return { before: v.exEn.slice(0, m.index), after: v.exEn.slice(m.index + m[0].length), answer: m[0], de: v.exDe };
    }
    return null;
  }
  function builderFor(v) {
    if (v.checked && v.exEn && v.exDe && v.exEn.split(' ').length >= 3 && v.exEn.split(' ').length <= 9) return { en: v.exEn, de: v.exDe };
    if (v.en.split(' ').length >= 3) return { en: v.en, de: deText(v) };
    return null;
  }
  function distractors(v, n, key) {
    const same = D.vocab.filter((x) => x.id !== v.id && x.unitId === v.unitId);
    const other = D.vocab.filter((x) => x.id !== v.id && x.unitId !== v.unitId);
    // gleiche Art bevorzugen: Wort zu Wort, Satz zu Satz
    const phr = (x) => x.en.trim().includes(' ');
    const pool = shuffle(same).concat(shuffle(other)).sort((a, b) => (phr(a) === phr(v) ? 0 : 1) - (phr(b) === phr(v) ? 0 : 1));
    const seen = new Set([key(v)]); const out = [];
    for (const x of pool) { const k = key(x); if (!seen.has(k)) { seen.add(k); out.push(x); } if (out.length >= n) break; }
    return out;
  }
  const RANK = { pairs: 1, choice: 1, hearchoose: 1, letters: 2, speak: 3, builder: 4, gap: 4, hearwrite: 5, freewrite: 5 };
  // Lektion zusammenstellen: 10–12 Aufgaben, leicht → schwer, mind. 2 Sprech- und 2 Schreibaufgaben
  function buildLesson(words) {
    const isNewW = (v) => { const p = prog(v.id); return !p.seen || p.box <= 1; };
    const tasks = [];
    if (words.length >= 3) tasks.push({ type: 'pairs', vids: shuffle(words).slice(0, 5).map((v) => v.id) });
    words.forEach((v, i) => {
      if (isNewW(v)) tasks.push({ type: i % 2 ? 'hearchoose' : 'choice', vid: v.id });
      else tasks.push({ type: i % 2 ? 'letters' : 'hearchoose', vid: v.id });
    });
    words.filter(isNewW).slice(0, 2).forEach((v) => tasks.push({ type: 'letters', vid: v.id }));
    const speakers = shuffle(words).slice(0, Math.min(2, words.length));
    speakers.forEach((v) => tasks.push({ type: 'speak', vid: v.id }));
    if (speakers.length < 2) tasks.push({ type: 'speak', vid: speakers[0].id });
    const ordered = words.slice().sort((a, b) => (isNewW(a) ? 1 : 0) - (isNewW(b) ? 1 : 0));
    const writes = [];
    ordered.forEach((v) => { const g = gapFor(v); if (g && writes.length < 1) writes.push({ type: 'gap', vid: v.id }); });
    ordered.forEach((v, i) => { if (writes.length < 3 && !writes.some((w) => w.vid === v.id)) writes.push({ type: i % 2 ? 'hearwrite' : 'freewrite', vid: v.id }); });
    while (writes.length < 2) writes.push({ type: 'freewrite', vid: words[writes.length % words.length].id });
    tasks.push(...writes);
    const b = words.map(builderFor).findIndex(Boolean);
    if (b >= 0) tasks.push({ type: 'builder', vid: words[b].id });
    // auf 10–12 Aufgaben auffüllen bzw. kürzen (Sprech- und Schreibaufgaben bleiben erhalten)
    let k = 0;
    while (tasks.length < 10) { const v = words[k++ % words.length]; tasks.push({ type: isNewW(v) ? 'choice' : 'freewrite', vid: v.id }); }
    while (tasks.length > 12) { const idx = tasks.findIndex((t) => t.type === 'choice' || t.type === 'hearchoose' || t.type === 'letters'); if (idx < 0) break; tasks.splice(idx, 1); }
    return tasks.map((t, i) => Object.assign(t, { id: i, try: 1 })).sort((a, b) => RANK[a.type] - RANK[b.type]);
  }
  const lessonStats = (tasks) => ({ speak: tasks.filter((t) => t.type === 'speak').length, write: tasks.filter((t) => ['freewrite', 'hearwrite', 'gap'].includes(t.type)).length });
  function startLesson(unitId, idx) {
    const st = stations(unitId)[idx]; if (!st) return;
    recReset();
    S.L = { unitId, idx, tasks: buildLesson(st), i: 0, mistakes: 0, written: new Set(), last: Date.now(), session: newSession('path'), ui: {} };
    S.view = 'lesson'; save(); render();
  }
  function lessonTick() { if (!S.L) return; const n = Date.now(), d = Math.min(n - S.L.last, 90000); addLearnTime(d); S.L.last = n; S.L.session.ms += d; S.L.session.end = new Date(n).toISOString(); checkGoal(); }
  const curL = () => S.L.tasks[S.L.i];
  // Ergebnis einer Aufgabe festhalten; Schreibaufgaben zählen wie in der Kartei
  function lessonAnswer(ok, answer, extra) {
    const L = S.L, t = curL(); lessonTick();
    t.done = true; t.ok = ok; t.answer = answer; Object.assign(t, extra || {});
    const v = vocabById(t.vid);
    if (['freewrite', 'hearwrite', 'gap'].includes(t.type) && v) {
      if (t.try === 1 && !L.written.has(v.id)) {
        L.written.add(v.id);
        if (canMove(v.id)) recordWrite(v.id, ok);
        if (t.type !== 'gap') trackWrite(v, answer, t.grade);
      }
      L.session.ev.push({ v: v.id, en: v.en, de: deText(v), d: 'de', ok: !!ok, a: answer || '', p: t.try, t: Date.now() });
    }
    if (!ok) { L.mistakes++; if (t.try < 2) L.tasks.push({ type: t.type, vid: t.vid, vids: t.vids, id: t.id, try: t.try + 1 }); }
    if (!S.L.silent) { beep(ok); if (ok) setTimeout(() => confetti(10), 60); }
    save(); rerender();
  }
  function lessonNext() {
    recReset();
    const L = S.L; L.i++; L.ui = {};
    if (L.i >= L.tasks.length) return finishLesson();
    render();
  }
  function finishLesson() {
    const L = S.L; lessonTick();
    const stars = L.mistakes <= 1 ? 3 : L.mistakes <= 3 ? 2 : 1;
    const ps = pathState(L.unitId); const prev = ps.done[L.idx];
    ps.done[L.idx] = { stars: Math.max(stars, prev ? prev.stars : 0), day: today() };
    D.stats.days[today()] = D.stats.days[today()] || { ms: 0, rounds: 0 }; D.stats.days[today()].rounds++;
    if (!L.session.ev.length) L.session.ev.push({ v: '', en: '', de: '', d: 'path', ok: true, a: '', p: 1, t: Date.now() });
    L.result = { stars, mistakes: L.mistakes, reward: onLessonDone() };
    save(); S.view = 'lessonend'; render();
  }

  function renderPath() {
    const units = pathUnits();
    if (!units.length) { app.innerHTML = '<div class="topbar"><button class="iconbtn" data-act="home" aria-label="Zurück">' + ic('back') + '</button><h1>Lernpfad</h1></div><div class="card soft">Noch keine Units mit Vokabeln. Die Eltern stellen eine Unit auf „Aktuell“.</div>'; return; }
    if (!S.pathUnit || !units.some((u) => u.id === S.pathUnit)) S.pathUnit = (units.find((u) => u.status === 'aktuell') || units[0]).id;
    const st = stations(S.pathUnit), ps = pathState(S.pathUnit);
    const next = st.findIndex((_, i) => !ps.done[i]);
    let h = '<div class="topbar"><button class="iconbtn" data-act="home" aria-label="Zurück">' + ic('back') + '</button><h1>Lernpfad</h1></div>';
    h += '<div class="tabs">' + units.map((u) => '<button aria-selected="' + (u.id === S.pathUnit) + '" data-act="pathunit" data-id="' + u.id + '">' + esc(u.name) + '</button>').join('') + '</div>';
    h += '<div class="path">';
    st.forEach((ws, i) => {
      const d = ps.done[i], locked = !d && i > (next < 0 ? st.length : next), cur = i === next;
      h += '<div class="pnode-wrap" style="--x:' + [0, 1, 2, 1][i % 4] + '"><button class="pnode' + (d ? ' done' : '') + (cur ? ' cur' : '') + (locked ? ' locked' : '') + '"' + (locked ? ' disabled' : ' data-act="startlesson" data-idx="' + i + '"') + ' aria-label="Station ' + (i + 1) + '">' +
        (d ? ic('star') : locked ? '<span class="lock">' + (i + 1) + '</span>' : ic('pencil')) + '</button>' +
        '<div class="plabel"><b>Station ' + (i + 1) + '</b>' + (d ? ' <span class="pstars">' + '★'.repeat(d.stars) + '☆'.repeat(3 - d.stars) + '</span>' : cur ? ' <span class="pill">Los geht\'s!</span>' : '') + '<br><span class="small">' + esc(ws.slice(0, 3).map((v) => v.en).join(', ') + (ws.length > 3 ? ' …' : '')) + '</span></div></div>';
    });
    const allDone = next < 0;
    h += '<div class="pnode-wrap" style="--x:1"><button class="pnode boss' + (allDone ? '' : ' locked') + '"' + (allDone ? ' data-act="startboss" data-id="' + S.pathUnit + '"' : ' disabled') + ' aria-label="Boss-Kampf">' + ic('flag') + '</button><div class="plabel"><b>Boss-Kampf</b>' + ((D.bossWon || {})[S.pathUnit] ? ' <span class="pill good">besiegt</span>' : '') + '<br><span class="small">' + (allDone ? '20 Aufgaben wie im Vokabeltest, ab 80 % geschafft' : 'Erst alle Stationen schaffen') + '</span></div></div>';
    h += '</div><p class="small center">Jede Station: 10–12 kurze Aufgaben, etwa 3–5 Minuten. Fehler sind nicht schlimm – sie kommen am Ende einfach noch einmal.</p>';
    app.innerHTML = h;
  }

  function lessonHeader() {
    const L = S.L, pct = Math.round((L.tasks.filter((t) => t.done && t.ok).length + L.tasks.filter((t) => t.done && !t.ok && t.try >= 2).length) / Math.max(1, L.tasks.filter((t) => t.try === 1).length) * 100);
    return '<div class="topbar"><button class="iconbtn" data-act="quitlesson" aria-label="Lektion beenden">' + ic('x') + '</button><h1 style="font-size:1.05rem">Station ' + (L.idx + 1) + ' · Aufgabe ' + (L.i + 1) + ' von ' + L.tasks.length + '</h1></div>' +
      '<div class="track"><div class="fill" style="width:' + Math.min(100, pct) + '%"></div><span class="bus" style="left:' + Math.min(100, pct) + '%">' + BUS + '</span></div><div style="height:12px"></div>';
  }
  const optBtn = (val, label, t) => {
    const chosen = t.done && t.answer === val, right = t.done && t.correct === val;
    return '<button class="opt' + (right ? ' right' : chosen ? ' wrong' : '') + '" data-act="lpick" data-val="' + esc(val) + '"' + (t.done ? ' disabled' : '') + '>' + esc(label) + '</button>';
  };
  function feedbackHtml(t, v, extraHtml) {
    if (!t.done) return '';
    const good = t.ok;
    return '<div class="card ' + (good ? 'good pop' : 'bad shake') + '"><p class="feedback">' + (good ? (t.msg || '✓ ' + pick(['Richtig!', 'Super!', 'Klasse!', 'Genau!'])) : (t.msg || 'Noch nicht ganz.')) + '</p>' + (extraHtml || '') +
      (v ? '<p class="center" style="margin:0"><b>' + esc(v.en) + '</b> = ' + esc(deText(v)) + '</p>' + speakBtns(v.en) : '') + (!good && v ? extrasHtml(v) : '') + (!good && t.try < 2 ? '<p class="small center">Diese Aufgabe kommt am Ende noch einmal.</p>' : '') + '</div>' +
      '<button class="btn big" data-act="lnext">Weiter</button>';
  }
  function renderLesson() {
    const L = S.L, t = curL(), v = t.vid !== undefined ? vocabById(t.vid) : null;
    if (t.type !== 'pairs' && !v) { t.done = true; t.ok = true; return lessonNext(); }
    L.ui = L.ui || {};
    let h = lessonHeader();
    const prompt = (label, word, small) => '<div class="prompt"><div class="label">' + label + '</div><div class="word' + (String(word).length > 24 ? ' long' : '') + '">' + esc(word) + '</div>' + (small ? '<div class="meta">' + esc(small) + '</div>' : '') + '</div>';
    if (t.type === 'choice') {
      if (!t.opts) { t.correct = v.en; t.opts = shuffle([v, ...distractors(v, 3, (x) => cmpEn(x.en).toLowerCase())]).map((x) => x.en); }
      h += '<div class="card">' + prompt('Welches englische Wort passt?', deText(v)) + '<div class="opts">' + t.opts.map((o) => optBtn(o, o, t)).join('') + '</div></div>' + feedbackHtml(t, v);
    } else if (t.type === 'hearchoose') {
      if (!t.opts) { t.correct = deText(v); t.opts = shuffle([v, ...distractors(v, 3, (x) => deText(x))]).map((x) => deText(x)); }
      h += '<div class="card"><div class="prompt"><div class="label">Hör zu: Was bedeutet das?</div><div class="speak-row"><button class="btn big" data-act="say" data-text="' + esc(v.en) + '" style="width:auto">' + ic('speaker') + 'Anhören</button><button class="btn secondary" data-act="sayslow" data-text="' + esc(v.en) + '">' + ic('snail') + 'Langsam</button></div></div><div class="opts">' + t.opts.map((o) => optBtn(o, o, t)).join('') + '</div></div>' + feedbackHtml(t, v);
      if (!L.ui.spoken) { L.ui.spoken = true; speak(v.en); }
    } else if (t.type === 'pairs') {
      const ws = t.vids.map(vocabById).filter(Boolean);
      if (!t.left) { t.left = shuffle(ws.map((x) => x.id)); t.right = shuffle(ws.map((x) => x.id)); t.matched = []; t.sel = null; t.errs = 0; }
      const cell = (id, side) => { const x = vocabById(id), m = t.matched.includes(id), sel = t.sel && t.sel.side === side && t.sel.id === id, bad = t.flash && t.flash.side === side && t.flash.id === id; return '<button class="opt pair' + (m ? ' right' : sel ? ' sel' : bad ? ' wrong' : '') + '" data-act="lpair" data-side="' + side + '" data-id="' + id + '"' + (m || t.done ? ' disabled' : '') + '>' + esc(side === 'en' ? x.en : deText(x)) + '</button>'; };
      h += '<div class="card"><div class="prompt"><div class="label">Finde die Paare</div></div><div class="pairs"><div>' + t.left.map((id) => cell(id, 'en')).join('') + '</div><div>' + t.right.map((id) => cell(id, 'de')).join('') + '</div></div></div>';
      if (t.done) h += '<div class="card good pop"><p class="feedback">✓ Alle Paare gefunden!</p></div><button class="btn big" data-act="lnext">Weiter</button>';
    } else if (t.type === 'letters') {
      const multi = v.en.includes(' ');
      if (!t.tiles) { const units = multi ? v.en.split(' ') : v.en.split(''); t.tiles = shuffle(units.map((x, i) => ({ i, x }))); t.used = []; t.correct = v.en; }
      const built = t.used.map((i) => t.tiles.find((x) => x.i === i).x).join(multi ? ' ' : '');
      h += '<div class="card">' + prompt('Bau das englische Wort', deText(v)) + '<div class="built">' + (esc(built) || '<span class="muted">tippe die Kacheln an</span>') + '</div>' +
        '<div class="tiles">' + t.tiles.map((tl) => '<button class="tile" data-act="ltile" data-i="' + tl.i + '"' + (t.used.includes(tl.i) || t.done ? ' disabled' : '') + '>' + esc(tl.x) + '</button>').join('') + '</div>' +
        (t.done ? '' : '<div class="row" style="margin-top:12px"><button class="btn secondary" data-act="lundo">⌫ Zurück</button><button class="btn" data-act="lcheckletters"' + (t.used.length ? '' : ' disabled') + '>Prüfen</button></div>') + '</div>' + feedbackHtml(t, v);
    } else if (t.type === 'speak') {
      h += '<div class="card">' + prompt('Lies laut vor', v.en, deText(v)) + speakBtns(v.en) + syllableHtml(v.en);
      if (t.done) h += '</div>' + feedbackHtml(t, null, '<p class="center small">' + esc(t.heard ? 'Ich habe verstanden: „' + t.heard + '“' : '') + '</p>');
      else if (speechOn() && !L.ui.selfMode) {
        h += '<div class="center"><button class="mic' + (L.ui.listening ? ' listening' : '') + '" data-act="lmic" aria-label="Sprechen">' + ic('mic') + '</button><p>' + (L.ui.listening ? 'Ich höre zu …' : L.ui.level === 'nochmal' ? 'Das war noch nicht richtig. Hör genau hin und versuch es noch einmal.' : L.ui.level === 'fast' ? 'Fast! Noch einmal?' : 'Tippe aufs Mikrofon und lies vor.') + '</p></div>' +
          (L.ui.tries >= 2 ? '<div class="tip">' + ic('bulb') + esc(v.checked && v.tip ? v.tip : 'Hör genau hin: langsam vorsprechen lassen und Silbe für Silbe nachsprechen.') + '</div>' : '') + recordHtml(v.en) +
          '<button class="btn ghost" data-act="lselfspeak">Ohne Mikrofon weiter</button></div>';
      } else h += recordHtml(v.en) + '<p class="center">Sprich das Wort laut. Vergleiche mit dem Original.</p>' + (L.ui.selfMode ? '' : sayCheckOffHtml()) + '<button class="btn big" data-act="lspoke">✓ Laut gesprochen</button></div>';
    } else if (t.type === 'gap') {
      const g = gapFor(v);
      if (!g) { t.type = 'freewrite'; return renderLesson(); }
      h += '<div class="card"><div class="prompt"><div class="label">Ergänze die Lücke</div><div class="gap">' + esc(g.before) + '<span class="blank">' + (t.done ? esc(g.answer) : '_____') + '</span>' + esc(g.after) + '</div>' + (g.de ? '<div class="meta">' + esc(g.de) + '</div>' : '') + '</div>' +
        (t.done ? '' : '<input type="text" id="lans" class="answer-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="en" data-enter="lcheckwrite"><div class="row" style="margin-top:12px"><button class="btn" data-act="lcheckwrite">Prüfen</button></div>') + '</div>' + feedbackHtml(t, v, t.diff || '');
    } else if (t.type === 'builder') {
      const bsrc = builderFor(v);
      if (!bsrc) { t.type = 'freewrite'; return renderLesson(); }
      if (!t.tiles) { t.tiles = shuffle(bsrc.en.replace(/[.!?,]/g, '').split(' ').filter(Boolean).map((x, i) => ({ i, x }))); t.used = []; t.correct = bsrc.en; }
      const built = t.used.map((i) => t.tiles.find((x) => x.i === i).x).join(' ');
      h += '<div class="card">' + prompt('Bau den Satz auf Englisch', bsrc.de) + '<div class="built">' + (esc(built) || '<span class="muted">tippe die Wörter an</span>') + '</div>' +
        '<div class="tiles">' + t.tiles.map((tl) => '<button class="tile word" data-act="ltile" data-i="' + tl.i + '"' + (t.used.includes(tl.i) || t.done ? ' disabled' : '') + '>' + esc(tl.x) + '</button>').join('') + '</div>' +
        (t.done ? '' : '<div class="row" style="margin-top:12px"><button class="btn secondary" data-act="lundo">⌫ Zurück</button><button class="btn" data-act="lcheckbuilder"' + (t.used.length ? '' : ' disabled') + '>Prüfen</button></div>') + '</div>' + feedbackHtml(t, null, t.done ? '<p class="center"><b>' + esc(bsrc.en) + '</b></p>' + speakBtns(bsrc.en) : '');
    } else if (t.type === 'hearwrite' || t.type === 'freewrite') {
      const hear = t.type === 'hearwrite';
      h += '<div class="card">' + (hear ? '<div class="prompt"><div class="label">Hör zu und schreib das englische Wort</div><div class="speak-row"><button class="btn big" data-act="say" data-text="' + esc(v.en) + '" style="width:auto">' + ic('speaker') + 'Anhören</button><button class="btn secondary" data-act="sayslow" data-text="' + esc(v.en) + '">' + ic('snail') + 'Langsam</button></div></div>' : prompt('Wie heißt das auf Englisch?', deText(v))) +
        (t.done ? '' : '<input type="text" id="lans" class="answer-input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="en" placeholder="englisch" data-enter="lcheckwrite"><div class="row" style="margin-top:12px"><button class="btn secondary" data-act="ldontknow">Weiß ich nicht</button><button class="btn" data-act="lcheckwrite">Prüfen</button></div>') + '</div>' + feedbackHtml(t, v, t.diff || '');
      if (hear && !L.ui.spoken) { L.ui.spoken = true; speak(v.en); }
    }
    app.innerHTML = h;
    const inp = $('#lans'); if (inp) inp.focus();
  }
  function renderLessonEnd() {
    const L = S.L, r = L.result;
    setTimeout(() => confetti(40), 100);
    app.innerHTML = '<div class="hero-city small-city">' + SKYLINE + '<div class="hello"><b>Station ' + (L.idx + 1) + ' geschafft!</b><span class="bigstars">' + '★'.repeat(r.stars) + '<span class="off">' + '★'.repeat(3 - r.stars) + '</span></span></div></div>' +
      '<div class="card center"><p class="feedback">' + (r.mistakes ? r.mistakes + (r.mistakes === 1 ? ' Fehler' : ' Fehler') + ' – und alle wieder gutgemacht!' : 'Ohne einen einzigen Fehler!') + '</p>' + (r.reward ? '<p>' + ic('star') + ' +' + r.reward + ' Sterne</p>' : '') + '</div>' +
      '<button class="btn big" data-act="openpath">Zurück zum Lernpfad</button><button class="btn big secondary" data-act="home" style="margin-top:10px">Zur Startseite</button>';
    S.L = null;
  }
  function lessonMic() {
    const L = S.L, t = curL(), v = vocabById(t.vid);
    L.ui.listening = true; rerender();
    listen('en-GB').then((r) => {
      L.ui.listening = false;
      const hard = ['not-allowed', 'service-not-allowed', 'network', 'audio-capture'];
      if (r.error && !r.list.length && hard.includes(r.error)) { L.ui.selfMode = true; toast(speechErrorText(r.error)); return rerender(); }
      L.ui.tries = (L.ui.tries || 0) + 1;
      const level = r.list.length ? matchEnSpeech(r.list, v) : 'nochmal';
      L.ui.level = level;
      if (L.ui.tries === 1) { trackSay(v, level === 'super', r.list[0]); }
      if (level === 'super') { if (L.ui.tries === 1) onSpokenRight(v.id); return lessonAnswer(true, r.list[0], { heard: r.list[0] }); }
      if (L.ui.tries >= 3) return lessonAnswer(true, r.list[0] || '', { heard: r.list[0] || '', msg: 'Gut geübt!' });
      beep(false);
      if (L.ui.tries === 2) setTimeout(() => speak(v.en, true), 400);
      rerender();
    });
  }

  // ---------- Inhalte Stufe 3 (vorab erstellt, im Elternbereich unter „Prüfen“ einsehbar) ----------
  // Albumkarten „Discover Britain“: Kategorie, Seltenheit, englischer Fun Fact mit deutscher Hilfe
  const CARDS = [
    { id: 'bigben', cat: 'Sehenswürdigkeiten', r: 'normal', icon: '🕰️', name: 'Big Ben', en: 'Big Ben is the name of the great bell, not the tower. The tower is called the Elizabeth Tower.', de: 'Big Ben ist der Name der großen Glocke, nicht des Turms. Der Turm heißt Elizabeth Tower.' },
    { id: 'eye', cat: 'Sehenswürdigkeiten', r: 'normal', icon: '🎡', name: 'London Eye', en: 'The London Eye is 135 metres tall. One ride takes about 30 minutes.', de: 'Das London Eye ist 135 Meter hoch. Eine Fahrt dauert etwa 30 Minuten.' },
    { id: 'towerbridge', cat: 'Sehenswürdigkeiten', r: 'normal', icon: '🌉', name: 'Tower Bridge', en: 'Tower Bridge opened in 1894. The road can open up to let tall ships through.', de: 'Die Tower Bridge wurde 1894 eröffnet. Die Straße kann sich öffnen, damit hohe Schiffe durchfahren können.' },
    { id: 'palace', cat: 'Sehenswürdigkeiten', r: 'selten', icon: '🏰', name: 'Buckingham Palace', en: 'Buckingham Palace in London has 775 rooms.', de: 'Der Buckingham-Palast in London hat 775 Zimmer.' },
    { id: 'stonehenge', cat: 'Sehenswürdigkeiten', r: 'golden', icon: '🪨', name: 'Stonehenge', en: 'Stonehenge is a circle of huge stones. People started building it about 5,000 years ago.', de: 'Stonehenge ist ein Kreis aus riesigen Steinen. Man begann vor etwa 5.000 Jahren, ihn zu bauen.' },
    { id: 'edinburgh', cat: 'Sehenswürdigkeiten', r: 'selten', icon: '🏯', name: 'Edinburgh Castle', en: 'Edinburgh Castle in Scotland stands on an old volcano called Castle Rock.', de: 'Die Burg von Edinburgh in Schottland steht auf einem alten Vulkan namens Castle Rock.' },
    { id: 'hadrian', cat: 'Sehenswürdigkeiten', r: 'golden', icon: '🧱', name: "Hadrian's Wall", en: "The Romans started building Hadrian's Wall in the year 122. It is almost 1,900 years old.", de: 'Die Römer begannen im Jahr 122 mit dem Bau des Hadrianswalls. Er ist fast 1.900 Jahre alt.' },
    { id: 'thames', cat: 'Sehenswürdigkeiten', r: 'selten', icon: '🏞️', name: 'River Thames', en: 'The River Thames flows through London. It is about 346 kilometres long.', de: 'Die Themse fließt durch London. Sie ist etwa 346 Kilometer lang.' },
    { id: 'lochness', cat: 'Sehenswürdigkeiten', r: 'selten', icon: '🌊', name: 'Loch Ness', en: 'Loch Ness is a very deep lake in Scotland. Some people say a monster called Nessie lives in it.', de: 'Loch Ness ist ein sehr tiefer See in Schottland. Manche sagen, dort lebt ein Monster namens Nessie.' },
    { id: 'bennevis', cat: 'Sehenswürdigkeiten', r: 'selten', icon: '⛰️', name: 'Ben Nevis', en: 'Ben Nevis in Scotland is the highest mountain in the UK. It is 1,345 metres high.', de: 'Der Ben Nevis in Schottland ist der höchste Berg Großbritanniens. Er ist 1.345 Meter hoch.' },
    { id: 'wyddfa', cat: 'Sehenswürdigkeiten', r: 'selten', icon: '🏔️', name: 'Yr Wyddfa', en: 'Yr Wyddfa, also called Snowdon, is the highest mountain in Wales.', de: 'Yr Wyddfa, auch Snowdon genannt, ist der höchste Berg in Wales.' },
    { id: 'bus', cat: 'Alltag', r: 'normal', icon: '🚌', name: 'Double-decker bus', en: "London's red buses have two floors. That's why they are called double-deckers.", de: 'Londons rote Busse haben zwei Stockwerke. Deshalb heißen sie Doppeldecker.' },
    { id: 'cab', cat: 'Alltag', r: 'normal', icon: '🚕', name: 'Black cab', en: "London taxi drivers must learn thousands of streets by heart. The test is called 'The Knowledge'.", de: 'Londoner Taxifahrer müssen Tausende Straßen auswendig lernen. Die Prüfung heißt „The Knowledge“.' },
    { id: 'tube', cat: 'Alltag', r: 'selten', icon: '🚇', name: 'The Tube', en: 'The London Underground opened in 1863. It is the oldest underground railway in the world.', de: 'Die Londoner U-Bahn wurde 1863 eröffnet. Sie ist die älteste U-Bahn der Welt.' },
    { id: 'phonebox', cat: 'Alltag', r: 'normal', icon: '☎️', name: 'Red phone box', en: 'Many old red phone boxes are now tiny libraries or have a defibrillator inside.', de: 'Viele alte rote Telefonzellen sind heute kleine Bibliotheken oder haben einen Defibrillator.' },
    { id: 'unionjack', cat: 'Alltag', r: 'golden', icon: '🇬🇧', name: 'Union Jack', en: 'The Union Jack mixes the crosses of England, Scotland and Ireland.', de: 'Der Union Jack verbindet die Kreuze von England, Schottland und Irland.' },
    { id: 'pound', cat: 'Alltag', r: 'normal', icon: '💷', name: 'Pounds and pence', en: 'In the UK, people pay with pounds and pence. 100 pence make one pound.', de: 'In Großbritannien bezahlt man mit Pfund und Pence. 100 Pence sind ein Pfund.' },
    { id: 'left', cat: 'Alltag', r: 'normal', icon: '🚗', name: 'Driving on the left', en: 'In the UK, cars drive on the left side of the road.', de: 'In Großbritannien fahren Autos auf der linken Straßenseite.' },
    { id: 'queue', cat: 'Alltag', r: 'normal', icon: '🧍', name: 'Queuing', en: 'British people are famous for queuing – waiting politely in a line.', de: 'Briten sind berühmt fürs Schlangestehen – höflich in einer Reihe warten.' },
    { id: 'uniform', cat: 'Alltag', r: 'normal', icon: '👔', name: 'School uniform', en: 'Most pupils in the UK wear a school uniform, often with a tie.', de: 'Die meisten Schüler in Großbritannien tragen eine Schuluniform, oft mit Krawatte.' },
    { id: 'umbrella', cat: 'Alltag', r: 'normal', icon: '☂️', name: 'Umbrella', en: 'It often rains in Britain, so many people always carry an umbrella.', de: 'In Großbritannien regnet es oft, deshalb haben viele immer einen Schirm dabei.' },
    { id: 'bonfire', cat: 'Alltag', r: 'selten', icon: '🎆', name: 'Bonfire Night', en: 'On 5 November, people in Britain watch fireworks on Bonfire Night.', de: 'Am 5. November schauen die Menschen in Großbritannien Feuerwerk an – die Bonfire Night.' },
    { id: 'wimbledon', cat: 'Alltag', r: 'golden', icon: '🎾', name: 'Wimbledon', en: 'Wimbledon is the oldest tennis tournament in the world. It started in 1877.', de: 'Wimbledon ist das älteste Tennisturnier der Welt. Es begann 1877.' },
    { id: 'football', cat: 'Alltag', r: 'normal', icon: '⚽', name: 'Football', en: 'The rules of modern football were written in England in 1863.', de: 'Die Regeln des modernen Fußballs wurden 1863 in England aufgeschrieben.' },
    { id: 'shakespeare', cat: 'Alltag', r: 'selten', icon: '🎭', name: 'Shakespeare', en: "William Shakespeare wrote famous plays like 'Romeo and Juliet'.", de: 'William Shakespeare schrieb berühmte Theaterstücke wie „Romeo und Julia“.' },
    { id: 'fishchips', cat: 'Essen', r: 'normal', icon: '🐟', name: 'Fish and chips', en: 'Fish and chips is a classic British meal. Many people eat it with salt and vinegar.', de: 'Fish and Chips ist ein typisch britisches Essen. Viele essen es mit Salz und Essig.' },
    { id: 'tea', cat: 'Essen', r: 'normal', icon: '🫖', name: 'Afternoon tea', en: 'Afternoon tea is a small meal with tea, sandwiches, scones and cake.', de: 'Afternoon Tea ist eine kleine Mahlzeit mit Tee, Sandwiches, Scones und Kuchen.' },
    { id: 'scones', cat: 'Essen', r: 'normal', icon: '🧁', name: 'Scones', en: 'Scones are eaten with jam and cream. People argue about what goes on first!', de: 'Scones isst man mit Marmelade und Sahne. Man streitet sich, was zuerst draufkommt!' },
    { id: 'breakfast', cat: 'Essen', r: 'selten', icon: '🍳', name: 'Full English', en: 'A full English breakfast can have eggs, bacon, sausages, beans, tomatoes and toast.', de: 'Ein englisches Frühstück kann Eier, Speck, Würstchen, Bohnen, Tomaten und Toast haben.' },
    { id: 'pancake', cat: 'Essen', r: 'normal', icon: '🥞', name: 'Pancake Day', en: 'On Pancake Day, some towns have races where people run and flip pancakes in a pan.', de: 'Am Pancake Day gibt es in manchen Orten Rennen, bei denen man Pfannkuchen in der Pfanne wendet.' },
    { id: 'robin', cat: 'Tiere', r: 'normal', icon: '🐦', name: 'Robin', en: "The robin was voted Britain's favourite bird.", de: 'Das Rotkehlchen wurde zum Lieblingsvogel Großbritanniens gewählt.' },
    { id: 'hedgehog', cat: 'Tiere', r: 'normal', icon: '🦔', name: 'Hedgehog', en: 'Hedgehogs sleep through the winter and wake up in spring.', de: 'Igel schlafen den ganzen Winter und wachen im Frühling auf.' },
    { id: 'squirrel', cat: 'Tiere', r: 'selten', icon: '🐿️', name: 'Red squirrel', en: 'Red squirrels are rare in Britain. Most squirrels you see are grey.', de: 'Rote Eichhörnchen sind in Großbritannien selten. Die meisten sind grau.' },
    { id: 'fox', cat: 'Tiere', r: 'normal', icon: '🦊', name: 'Urban fox', en: 'Many foxes live in British cities, even in London.', de: 'Viele Füchse leben in britischen Städten, sogar in London.' },
    { id: 'corgi', cat: 'Tiere', r: 'selten', icon: '🐕', name: 'Corgi', en: 'Corgis are small dogs from Wales. Queen Elizabeth II had more than 30 of them.', de: 'Corgis sind kleine Hunde aus Wales. Königin Elizabeth II. hatte über 30 davon.' },
    { id: 'highland', cat: 'Tiere', r: 'golden', icon: '🐄', name: 'Highland cow', en: 'Highland cows from Scotland have long hair to keep them warm.', de: 'Hochlandrinder aus Schottland haben langes Fell, das sie warm hält.' }
  ];
  const RARITY = { normal: 'normal', selten: 'selten', golden: 'golden' };
  const TWISTERS = [
    { en: 'Red lorry, yellow lorry.', de: 'Roter Lastwagen, gelber Lastwagen.' },
    { en: 'She sells seashells by the seashore.', de: 'Sie verkauft Muscheln am Meeresufer.' },
    { en: 'Three free throws.', de: 'Drei freie Würfe.' },
    { en: 'Fresh fried fish.', de: 'Frisch gebratener Fisch.' },
    { en: 'A proper copper coffee pot.', de: 'Eine richtige Kaffeekanne aus Kupfer.' },
    { en: 'Six sticky skeletons.', de: 'Sechs klebrige Skelette.' },
    { en: 'Which witch is which?', de: 'Welche Hexe ist welche?' },
    { en: 'Thin sticks, thick bricks.', de: 'Dünne Stöcke, dicke Ziegel.' }
  ];
  // Shop: nur Sterne, nie echtes Geld
  const SHOP = [
    { id: 'cap', slot: 'hat', name: 'Baseballkappe', price: 25 },
    { id: 'party', slot: 'hat', name: 'Partyhut', price: 20 },
    { id: 'bowler', slot: 'hat', name: 'Melone (Bowler)', price: 40 },
    { id: 'crown', slot: 'hat', name: 'Krone', price: 120 },
    { id: 'scarf', slot: 'neck', name: 'Schal', price: 25 },
    { id: 'bowtie', slot: 'neck', name: 'Fliege', price: 20 },
    { id: 'glasses', slot: 'eyes', name: 'Brille', price: 35 },
    { id: 'garden', slot: 'bg', name: 'Hintergrund Garten', price: 50 },
    { id: 'beach', slot: 'bg', name: 'Hintergrund Strand', price: 60 },
    { id: 'night', slot: 'bg', name: 'Hintergrund Sternennacht', price: 70 },
    { id: 'cushion', slot: 'deco', name: 'Kuschelkissen', price: 15 },
    { id: 'plant', slot: 'deco', name: 'Pflanze', price: 30 },
    { id: 'lamp', slot: 'deco', name: 'Lampe', price: 40 }
  ];
  const GROW = [1, 3, 7, 14, 30]; // Lerntage bis zur nächsten Stufe (Ei → 5 Stufen)
  const STAGE_NAME = ['Ei', 'Schlüpfling', 'Welpe', 'Junior', 'Groß', 'Profi'];
  // ---------- Stufe 3: Sterne, Begleiter, Truhe, Album, Abzeichen, Shop, Serie ----------
  function G() {
    D.game = D.game || {};
    const g = D.game;
    g.stars = g.stars || 0; g.starsTotal = g.starsTotal || 0; g.dayStars = g.dayStars || {};
    // Beim ersten Start: bisherige Tage mit erreichtem Tagesziel nachtragen (Begleiter wächst durch Lerntage)
    if (!g.goalDays) g.goalDays = Object.keys(D.stats.days || {}).filter((d) => d < today() && (D.stats.days[d].ms || 0) >= D.settings.dailyMinutes * 60000).sort();
    g.owned = g.owned || []; g.equipped = g.equipped || {}; g.album = g.album || {};
    g.chests = g.chests || { opened: 0, sinceNew: 0 }; g.badges = g.badges || {}; g.said = g.said || {}; g.games = g.games || {};
    g.records = g.records || {}; g.bossPaid = g.bossPaid || {};
    return g;
  }
  const goalReachedToday = () => G().goalDays.includes(today());
  // Sterne vergeben – über 30 Minuten Lernzeit am Tag gibt es keine Zusatzbelohnung (Leitplanke 2)
  function award(n, why) {
    const g = G(); if (!n) return 0;
    if (why !== 'goal' && minutesToday() > 30) return 0;
    g.stars += n; g.starsTotal += n; g.dayStars[today()] = (g.dayStars[today()] || 0) + n;
    S.starFlash = (S.starFlash || 0) + n;
    return n;
  }
  function rewardWrite(wasSeen, before, ok) {
    if (!ok) return;
    award(before >= 3 && before <= 5 ? 2 : 1, 'write');
    checkBadges();
  }
  function onSpokenRight(vid) {
    const g = G(), key = today() + ':' + (vid || (S.L && curL().vid) || '');
    if (g.said[key]) return; g.said[key] = 1;
    award(1, 'say');
    const v = vocabById(vid || (S.L && curL().vid)); if (v && /th/i.test(v.en)) g.thSaid = (g.thSaid || 0) + 1;
    checkBadges();
  }
  function onLessonDone() { const g = G(); g.lessons = (g.lessons || 0) + 1; const n = award(10, 'lesson'); checkBadges(); return n; }
  // Tagesziel erreicht: Sterne, Schatztruhe, Serie, Begleiter wächst
  function checkGoal() {
    const g = G();
    if (goalReachedToday() || minutesToday() < D.settings.dailyMinutes) return;
    const stageBefore = petStage();
    g.goalDays.push(today()); g.chestReady = today();
    award(15, 'goal');
    const up = petStage() > stageBefore;
    save(); checkBadges();
    setTimeout(() => { confetti(up ? 80 : 40); toast(up ? 'Dein Begleiter ist gewachsen! Tagesziel geschafft: +15 Sterne und eine Schatztruhe.' : 'Tagesziel geschafft! +15 Sterne und eine Schatztruhe wartet.'); }, 300);
  }
  const petStage = () => { const n = G().goalDays.length; let st = 0; GROW.forEach((t) => { if (n >= t) st++; }); return st; };
  const nextGrow = () => { const n = G().goalDays.length; const t = GROW.find((x) => x > n); return t ? t - n : 0; };
  // Lernserie: Tage mit erreichtem Tagesziel; pro Kalenderwoche gleicht ein Joker einen verpassten Tag aus
  const weekKey = (ds) => { const [y, m, d] = ds.split('-').map(Number); const dt = new Date(y, m - 1, d); const day = (dt.getDay() + 6) % 7; dt.setDate(dt.getDate() - day); return dateStr(dt); };
  function streakInfo() {
    const days = new Set(G().goalDays); let n = 0, cur = days.has(today()) ? today() : addDays(today(), -1);
    const jokerUsed = new Set(); let usedThisWeek = false;
    for (let k = 0; k < 400; k++) {
      if (days.has(cur)) { n++; cur = addDays(cur, -1); continue; }
      const wk = weekKey(cur);
      if (!jokerUsed.has(wk) && days.has(addDays(cur, -1))) { jokerUsed.add(wk); if (wk === weekKey(today())) usedThisWeek = true; cur = addDays(cur, -1); continue; }
      break;
    }
    return { n, jokerFree: !usedThisWeek, lost: n === 0 && G().goalDays.length > 0 };
  }
  // ---------- Begleiter (eigenes Design: kleiner Corgi) ----------
  function petSvg(stage, eq, bg) {
    eq = eq || {}; const sc = [0.6, 0.72, 0.8, 0.87, 0.94, 1][stage] || 1;
    const bgs = {
      london: '<rect width="200" height="160" fill="var(--sky1)"/><path d="M0 130h200v30H0z" fill="var(--sk-ground)"/><rect x="14" y="70" width="14" height="60" fill="var(--sk-ben)"/><path d="M12 70h18l-9-18z" fill="var(--sk-ben)"/><circle cx="170" cy="92" r="26" fill="none" stroke="var(--sk-eye)" stroke-width="3"/>',
      garden: '<rect width="200" height="160" fill="#dff3d4"/><path d="M0 125h200v35H0z" fill="#8fce7a"/><circle cx="25" cy="122" r="6" fill="#f7a8c8"/><circle cx="40" cy="128" r="5" fill="#ffd98a"/><circle cx="175" cy="124" r="6" fill="#b9a7f2"/><circle cx="160" cy="30" r="12" fill="#ffe3a3"/>',
      beach: '<rect width="200" height="160" fill="#cdeefd"/><path d="M0 105h200v20H0z" fill="#7fc8e8"/><path d="M0 125h200v35H0z" fill="#f6e2b3"/><circle cx="165" cy="30" r="14" fill="#ffd26a"/>',
      night: '<rect width="200" height="160" fill="#1f2a4a"/><path d="M0 130h200v30H0z" fill="#2c3b5c"/><circle cx="160" cy="30" r="12" fill="#f4f1d0"/><circle cx="30" cy="25" r="2" fill="#fff"/><circle cx="70" cy="45" r="1.5" fill="#fff"/><circle cx="110" cy="20" r="2" fill="#fff"/><circle cx="185" cy="70" r="1.5" fill="#fff"/>'
    };
    let s = '<svg viewBox="0 0 200 160" class="petsvg" aria-hidden="true">' + (bgs[bg] || bgs.london);
    if (eq.deco === 'cushion') s += '<ellipse cx="100" cy="138" rx="58" ry="10" fill="#f7a8c8"/>';
    if (eq.deco === 'plant') s += '<rect x="168" y="112" width="16" height="18" rx="3" fill="#c98a5b"/><path d="M176 112c-10-14-4-26 0-30 4 4 10 16 0 30zM176 110c-14-6-16-16-14-20 6 0 14 6 14 20zM176 110c14-6 16-16 14-20-6 0-14 6-14 20z" fill="#5fae6b"/>';
    if (eq.deco === 'lamp') s += '<rect x="22" y="80" width="4" height="50" fill="#8a7a6a"/><path d="M10 80h28l-6-18H16z" fill="#ffd98a"/>';
    if (stage === 0) {
      s += '<g transform="translate(100 98)"><ellipse rx="30" ry="38" fill="#fff6e6" stroke="#e8c79a" stroke-width="3"/><circle cx="-10" cy="-12" r="5" fill="#f2b37a"/><circle cx="12" cy="4" r="6" fill="#f2b37a"/><circle cx="-6" cy="18" r="4" fill="#f2b37a"/></g>';
      return s + '</svg>';
    }
    s += '<g transform="translate(100 132) scale(' + sc + ') translate(-100 -132)">';
    // Körper, Beine, Kopf, Ohren, Gesicht
    s += '<ellipse cx="100" cy="112" rx="40" ry="26" fill="#f0a35c"/><ellipse cx="100" cy="118" rx="24" ry="18" fill="#fff3e3"/>' +
      '<rect x="72" y="124" width="14" height="12" rx="6" fill="#f0a35c"/><rect x="114" y="124" width="14" height="12" rx="6" fill="#f0a35c"/>' +
      '<path d="M62 52 L70 18 L90 44 Z" fill="#f0a35c"/><path d="M138 52 L130 18 L110 44 Z" fill="#f0a35c"/><path d="M68 46 L72 28 L84 44 Z" fill="#ffd0d8"/><path d="M132 46 L128 28 L116 44 Z" fill="#ffd0d8"/>' +
      '<ellipse cx="100" cy="66" rx="40" ry="34" fill="#f0a35c"/><path d="M100 46c-10 6-14 18-14 30 0 10 6 16 14 16s14-6 14-16c0-12-4-24-14-30z" fill="#fff3e3"/>' +
      '<circle cx="85" cy="62" r="5" fill="#1d2a35"/><circle cx="115" cy="62" r="5" fill="#1d2a35"/><circle cx="86.5" cy="60.5" r="1.6" fill="#fff"/><circle cx="116.5" cy="60.5" r="1.6" fill="#fff"/>' +
      '<ellipse cx="100" cy="78" rx="6" ry="4.5" fill="#1d2a35"/><path d="M94 86q6 5 12 0" stroke="#1d2a35" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      '<circle cx="76" cy="76" r="5" fill="#ffb3c4" opacity=".7"/><circle cx="124" cy="76" r="5" fill="#ffb3c4" opacity=".7"/>';
    if (stage === 1) s += '<path d="M56 110 l10 -10 10 10 10 -10 10 10 10 -10 10 10 10 -10 10 10 10 -10 8 8 V140 H56z" fill="#fff6e6" stroke="#e8c79a" stroke-width="3"/>';
    if (eq.neck === 'scarf') s += '<path d="M70 92q30 14 60 0v10q-30 14-60 0z" fill="#e0548b"/><rect x="118" y="98" width="10" height="22" rx="3" fill="#e0548b"/><path d="M76 96v10M88 99v10M100 100v10M112 99v10" stroke="#fff" stroke-width="3"/>';
    if (eq.neck === 'bowtie') s += '<path d="M100 96l-16-9v18zM100 96l16-9v18z" fill="#2f5bd3"/><circle cx="100" cy="96" r="4" fill="#1d3a8a"/>';
    if (eq.eyes === 'glasses') s += '<circle cx="85" cy="62" r="10" fill="none" stroke="#1d2a35" stroke-width="3"/><circle cx="115" cy="62" r="10" fill="none" stroke="#1d2a35" stroke-width="3"/><path d="M95 62h10" stroke="#1d2a35" stroke-width="3"/>';
    if (eq.hat === 'cap') s += '<path d="M72 40q28-26 56 0z" fill="#0e7c78"/><path d="M118 38q22 0 26 6h-30z" fill="#0b5f5c"/>';
    if (eq.hat === 'party') s += '<path d="M86 38 L100 2 L114 38 Z" fill="#ffd98a"/><circle cx="100" cy="2" r="5" fill="#e0548b"/><path d="M92 26l14-4M89 34l20-6" stroke="#e0548b" stroke-width="3"/>';
    if (eq.hat === 'bowler') s += '<ellipse cx="100" cy="36" rx="30" ry="6" fill="#1d2a35"/><path d="M80 36q0-24 20-24t20 24z" fill="#1d2a35"/>';
    if (eq.hat === 'crown') s += '<path d="M76 38 L80 14 L92 28 L100 8 L108 28 L120 14 L124 38 Z" fill="#ffc83d" stroke="#d99b00" stroke-width="2"/><circle cx="100" cy="24" r="3" fill="#e0548b"/>';
    s += '</g>';
    return s + '</svg>';
  }
  const unlocked = () => goalReachedToday();
  function petCardHtml() {
    const g = G(), st = petStage(), sk = streakInfo(), mins = minutesToday(), goal = D.settings.dailyMinutes;
    const named = g.petName;
    let h = '<div class="card petcard"><div class="petrow"><div class="petbox">' + petSvg(st, g.equipped, g.equipped.bg) + '</div><div class="petinfo">' +
      (named ? '<b class="petname">' + esc(g.petName) + '</b>' : '<b class="petname">Dein Begleiter</b>') +
      '<span class="small">' + STAGE_NAME[st] + (nextGrow() ? ' · wächst in ' + nextGrow() + (nextGrow() === 1 ? ' Lerntag' : ' Lerntagen') : ' · voll ausgewachsen') + '</span>' +
      '<div class="petstats"><span class="pill star">' + ic('star') + g.stars + '</span><span class="pill">' + ic('party') + 'Serie ' + sk.n + '</span></div>' +
      '<span class="small">' + (sk.n ? 'Joker diese Woche: ' + (sk.jokerFree ? 'frei' : 'benutzt') : sk.lost ? 'Neue Serie – heute geht\'s los!' : 'Schaff dein Tagesziel und starte eine Serie.') + '</span></div></div>';
    if (!named && st >= 1) h += '<div class="row" style="margin-top:8px"><input type="text" id="petname" maxlength="16" placeholder="Wie soll dein Begleiter heißen?" style="flex:2 1 160px"><button class="btn small" data-act="namepet">Taufen</button></div>';
    if (!named && st === 0) h += '<p class="small" style="margin:6px 0 0">Schaff dein Tagesziel – dann schlüpft dein Begleiter aus dem Ei!</p>';
    h += '<div class="row" style="margin-top:10px"><b>Tagesziel</b><span class="spacer"></span><span>' + mins + ' von ' + goal + ' Min.</span></div><div class="progress" style="margin-top:6px"><div style="width:' + Math.min(100, Math.round((mins / goal) * 100)) + '%"></div></div>' +
      (mins >= goal ? '<p class="center small" style="margin-bottom:0"><b>Für heute geschafft!</b>' + (mins >= 30 ? ' Weiterlernen ist freiwillig – ab 30 Minuten gibt es keine Extra-Sterne mehr.' : ' Weiterlernen ist freiwillig.') + '</p>' : '');
    if (g.chestReady === today()) h += '<button class="btn big chestbtn" data-act="openchest" style="margin-top:10px">' + ic('party') + 'Schatztruhe öffnen!</button>';
    const lock = unlocked() ? '' : ic('lock', 'lockic');
    h += '<div class="gamegrid"><button class="btn secondary" data-act="opengames">' + ic('star') + 'Minispiele' + lock + '</button><button class="btn secondary" data-act="openshop">' + ic('cup') + 'Shop' + lock + '</button>' +
      '<button class="btn secondary" data-act="openalbum">' + ic('book') + 'Album ' + Object.keys(g.album).length + '/' + CARDS.length + '</button><button class="btn secondary" data-act="openbadges">' + ic('flag') + 'Abzeichen ' + Object.keys(g.badges).length + '/' + BADGES.length + '</button></div>';
    if (!unlocked()) h += '<p class="small center" style="margin-bottom:0">Minispiele und Shop öffnen sich, wenn du dein Tagesziel geschafft hast.</p>';
    return h + '</div>';
  }
  // ---------- Schatztruhe: Sterne oder neue Albumkarte; spätestens jede 5. Truhe eine neue Karte ----------
  function drawCard() {
    const g = G(), missing = CARDS.filter((c) => !g.album[c.id]);
    if (!missing.length) return null;
    const w = { normal: 70, selten: 25, golden: 5 }; const tot = missing.reduce((a, c) => a + w[c.r], 0);
    let r = Math.random() * tot; for (const c of missing) { r -= w[c.r]; if (r <= 0) return c; }
    return missing[0];
  }
  function openChest() {
    const g = G(); if (g.chestReady !== today()) return;
    g.chestReady = null; g.chests.opened++;
    const forceCard = g.chests.sinceNew >= 4;
    let res;
    const card = (forceCard || Math.random() < 0.5) ? drawCard() : null;
    if (card) { g.album[card.id] = today(); g.chests.sinceNew = 0; res = { card }; }
    else { const n = 10 + Math.floor(Math.random() * 3) * 5; award(n, 'goal'); g.chests.sinceNew++; res = { stars: n }; }
    save(); checkBadges();
    S.chestResult = res; S.view = 'chest'; render();
  }
  function renderChest() {
    const r = S.chestResult || {};
    setTimeout(() => confetti(r.card && r.card.r === 'golden' ? 90 : 50), 100);
    app.innerHTML = '<div class="topbar"><button class="iconbtn" data-act="home" aria-label="Zurück">' + ic('back') + '</button><h1>Schatztruhe</h1></div>' +
      (r.card ? '<div class="card center"><p class="feedback">Neue Albumkarte!</p>' + cardHtml(r.card, true) + '</div>' : '<div class="card center"><p class="feedback">' + ic('star') + ' +' + r.stars + ' Sterne!</p><p>Super gemacht. Morgen wartet die nächste Truhe.</p></div>') +
      '<button class="btn big" data-act="home">Weiter</button>';
  }
  function cardHtml(c, big) {
    return '<div class="acard ' + c.r + (big ? ' big' : '') + '"><div class="aicon">' + c.icon + '</div><div class="aname">' + esc(c.name) + '</div><div class="arar">' + (c.r === 'golden' ? '★ golden' : c.r === 'selten' ? 'selten' : 'normal') + '</div>' +
      (big ? '<p class="aen">' + esc(c.en) + '</p><p class="ade">' + esc(c.de) + '</p><button class="btn small secondary" data-act="say" data-text="' + esc(c.en) + '">' + ic('speaker') + 'Vorlesen</button>' : '') + '</div>';
  }
  function renderAlbum() {
    const g = G(); const cats = ['Sehenswürdigkeiten', 'Alltag', 'Essen', 'Tiere'];
    let h = '<div class="topbar"><button class="iconbtn" data-act="home" aria-label="Zurück">' + ic('back') + '</button><h1>Discover Britain</h1></div><p class="small">' + Object.keys(g.album).length + ' von ' + CARDS.length + ' Karten gesammelt. Neue Karten gibt es in der Schatztruhe.</p>';
    if (S.cardOpen) { const c = CARDS.find((x) => x.id === S.cardOpen); if (c && g.album[c.id]) h += '<div class="card center">' + cardHtml(c, true) + '<button class="btn ghost" data-act="closecard">Schließen</button></div>'; }
    cats.forEach((cat) => {
      h += '<h3>' + esc(cat) + '</h3><div class="agrid">' + CARDS.filter((c) => c.cat === cat).map((c) => g.album[c.id] ? '<button class="acard-btn" data-act="opencard" data-id="' + c.id + '">' + cardHtml(c) + '</button>' : '<div class="acard locked"><div class="aicon">?</div><div class="aname">???</div><div class="arar">' + (c.r === 'golden' ? '★ golden' : c.r) + '</div></div>').join('') + '</div>';
    });
    app.innerHTML = h;
  }
  // ---------- Abzeichen ----------
  const sitztCount = () => D.vocab.filter((v) => { const p = D.progress[v.id]; return p && p.seen && p.box === 6; }).length;
  const BADGES = [
    { id: 'first', name: 'Erste Runde', desc: 'Die erste Lernrunde geschafft', test: () => (D.sessions || []).length >= 1 },
    { id: 'goal1', name: 'Tagesziel', desc: 'Zum ersten Mal das Tagesziel erreicht', test: () => G().goalDays.length >= 1 },
    { id: 'streak7', name: '7 Tage in Folge', desc: 'Eine Serie von 7 Tagen', test: () => streakInfo().n >= 7 },
    { id: 'days30', name: '30 Lerntage', desc: '30 Tage mit erreichtem Tagesziel', test: () => G().goalDays.length >= 30 },
    { id: 'path1', name: 'Pfadfinderin', desc: 'Die erste Station im Lernpfad geschafft', test: () => (G().lessons || 0) >= 1 },
    { id: 'unit1', name: 'Erste Unit geschafft', desc: 'Einen Boss-Kampf gewonnen', test: () => Object.keys(D.bossWon || {}).length >= 1 },
    { id: 'words50', name: '50 Wörter sitzen', desc: '50 Wörter im Fach „Sitzt“', test: () => sitztCount() >= 50 },
    { id: 'th', name: 'Aussprache-Profi th', desc: '10 Wörter mit „th“ richtig ausgesprochen', test: () => (G().thSaid || 0) >= 10 },
    { id: 'album10', name: 'Sammlerin', desc: '10 Albumkarten gesammelt', test: () => Object.keys(G().album).length >= 10 },
    { id: 'golden', name: 'Goldkind', desc: 'Eine goldene Albumkarte gefunden', test: () => CARDS.some((c) => c.r === 'golden' && G().album[c.id]) },
    { id: 'probe100', name: 'Testprofi', desc: 'Einen Probetest mit 100 % geschafft', test: () => !!G().probe100 },
    { id: 'stars500', name: 'Sternensammlerin', desc: '500 Sterne verdient', test: () => G().starsTotal >= 500 }
  ];
  function checkBadges() {
    const g = G(); let fresh = null;
    BADGES.forEach((b) => { if (!g.badges[b.id] && b.test()) { g.badges[b.id] = today(); fresh = b; } });
    if (fresh) setTimeout(() => toast('Neues Abzeichen: ' + fresh.name + '!'), 900);
  }
  function renderBadges() {
    const g = G();
    app.innerHTML = '<div class="topbar"><button class="iconbtn" data-act="home" aria-label="Zurück">' + ic('back') + '</button><h1>Abzeichen</h1></div><div class="bgrid">' +
      BADGES.map((b) => '<div class="badge' + (g.badges[b.id] ? ' got' : '') + '"><div class="bmedal">' + (g.badges[b.id] ? ic('star') : ic('flag')) + '</div><b>' + esc(b.name) + '</b><span class="small">' + esc(b.desc) + '</span>' + (g.badges[b.id] ? '<span class="small">am ' + fmtDate(g.badges[b.id]) + '</span>' : '') + '</div>').join('') + '</div>';
  }
  // ---------- Shop ----------
  function renderShop() {
    const g = G();
    let h = '<div class="topbar"><button class="iconbtn" data-act="home" aria-label="Zurück">' + ic('back') + '</button><h1>Shop</h1><span class="pill star">' + ic('star') + g.stars + '</span></div>';
    if (!unlocked()) { app.innerHTML = h + '<div class="card soft center"><p>Der Shop öffnet sich, wenn du dein Tagesziel geschafft hast. ' + ic('star') + '</p></div>'; return; }
    h += '<div class="card center"><div class="petbox big">' + petSvg(Math.max(1, petStage()), g.equipped, g.equipped.bg) + '</div><p class="small">Gekaufte Sachen gehören dir für immer.</p></div>';
    const slots = { hat: 'Hüte', neck: 'Hals', eyes: 'Brillen', bg: 'Hintergründe', deco: 'Zimmer' };
    Object.entries(slots).forEach(([slot, label]) => {
      h += '<h3>' + label + '</h3><div class="shopgrid">' + SHOP.filter((it) => it.slot === slot).map((it) => {
        const own = g.owned.includes(it.id), on = g.equipped[slot] === it.id;
        return '<div class="shopitem' + (on ? ' on' : '') + '"><b>' + esc(it.name) + '</b>' + (own ? '<button class="btn small ' + (on ? 'good' : 'secondary') + '" data-act="equip" data-id="' + it.id + '">' + (on ? '✓ An' : 'Anziehen') + '</button>' : '<button class="btn small" data-act="buy" data-id="' + it.id + '"' + (g.stars < it.price ? ' disabled' : '') + '>' + ic('star') + it.price + '</button>') + '</div>';
      }).join('') + '</div>';
    });
    app.innerHTML = h;
  }
  // ---------- Minispiele (erst nach dem Tagesziel, nur mit gelernten Wörtern) ----------
  const GAMES = [
    { id: 'memory', name: 'Memory', desc: 'Englisch und Deutsch als Paare aufdecken', icon: 'book' },
    { id: 'scramble', name: 'Buchstabensalat', desc: 'Gemischte Buchstaben richtig ordnen', icon: 'pencil' },
    { id: 'snake', name: 'Wortschlange', desc: 'Letzter Buchstabe = erster Buchstabe des nächsten Wortes', icon: 'repeat' },
    { id: 'speed', name: 'Speed-Runde', desc: '60 Sekunden: so viele Wörter wie möglich', icon: 'flag' },
    { id: 'balloon', name: 'Ballon-Raten', desc: 'Wort Buchstabe für Buchstabe raten', icon: 'party' },
    { id: 'twister', name: 'Zungenbrecher', desc: 'Nachsprechen, aufnehmen, vergleichen', icon: 'mic' }
  ];
  const GAME_REWARDS_PER_DAY = 3; // höchstens 3 belohnte Spiele pro Tag (je max. 5 Sterne)
  const gameWords = () => D.vocab.filter((v) => { const u = unitById(v.unitId); return u && (u.status === 'aktuell' || u.status === 'gelernt') && prog(v.id).seen; });
  const singleWords = () => gameWords().filter((v) => /^[A-Za-z]+$/.test(v.en) && v.en.length >= 3 && v.en.length <= 12);
  function gameReward(n) {
    const g = G(), d = today(); g.games[d] = g.games[d] || 0;
    if (g.games[d] >= GAME_REWARDS_PER_DAY) return 0;
    g.games[d]++;
    return award(Math.max(0, Math.min(5, n)), 'game');
  }
  function renderGames() {
    let h = '<div class="topbar"><button class="iconbtn" data-act="home" aria-label="Zurück">' + ic('back') + '</button><h1>Minispiele</h1></div>';
    if (!unlocked()) { app.innerHTML = h + '<div class="card soft center"><p>Erst lernen, dann spielen: Die Minispiele öffnen sich, wenn du dein Tagesziel geschafft hast.</p></div>'; return; }
    const n = gameWords().length, left = Math.max(0, GAME_REWARDS_PER_DAY - (G().games[today()] || 0));
    if (n < 4) { app.innerHTML = h + '<div class="card soft center"><p>Lerne zuerst ein paar Wörter – dann kannst du mit ihnen spielen.</p></div>'; return; }
    h += '<p class="small">Gespielt wird mit deinen gelernten Wörtern. ' + (left ? 'Heute gibt es noch für ' + left + (left === 1 ? ' Spiel' : ' Spiele') + ' Sterne (bis zu 5).' : 'Für heute gibt es keine Spiel-Sterne mehr – Spaß macht es trotzdem!') + '</p><div class="gamelist">' +
      GAMES.map((gm) => '<button class="gamebtn" data-act="startgame" data-id="' + gm.id + '">' + ic(gm.icon) + '<b>' + esc(gm.name) + '</b><span class="small">' + esc(gm.desc) + '</span>' + (G().records[gm.id] ? '<span class="pill">Rekord ' + G().records[gm.id] + '</span>' : '') + '</button>').join('') + '</div>';
    app.innerHTML = h;
  }
  function startGame(id) {
    const ws = shuffle(gameWords()), sw = shuffle(singleWords());
    const gm = { id, start: Date.now(), done: false, score: 0 };
    if (id === 'memory') { const pick = ws.slice(0, 6); gm.cards = shuffle(pick.flatMap((v) => [{ k: v.id + 'e', vid: v.id, t: v.en }, { k: v.id + 'd', vid: v.id, t: deText(v) }])); gm.open = []; gm.found = []; gm.flips = 0; }
    if (id === 'scramble') { gm.words = (sw.length >= 3 ? sw : ws).slice(0, 5).map((v) => v.id); gm.i = 0; gm.used = []; gm.tiles = null; }
    if (id === 'snake') { const fits = (v) => sw.some((o) => o.id !== v.id && o.en[0].toLowerCase() === v.en.slice(-1).toLowerCase()); const first = sw.find(fits) || sw[0] || ws[0]; gm.chain = [first.id]; gm.score = 0; gm.msg = ''; }
    if (id === 'speed') { gm.pool = ws.map((v) => v.id); gm.i = 0; gm.end = Date.now() + 60000; gm.ok = 0; gm.timer = setInterval(() => { if (S.view !== 'game' || !S.G || S.G !== gm) return clearInterval(gm.timer); const el = document.getElementById('timer'); const left = Math.max(0, Math.ceil((gm.end - Date.now()) / 1000)); if (el) el.textContent = left + ' s'; if (left <= 0) { clearInterval(gm.timer); finishGame(gm.ok); } }, 250); }
    if (id === 'balloon') { gm.words = (sw.length ? sw : ws).slice(0, 3).map((v) => v.id); gm.i = 0; gm.guess = []; gm.miss = 0; gm.solved = 0; }
    if (id === 'twister') { gm.list = shuffle(TWISTERS).slice(0, 3); gm.i = 0; gm.said = 0; }
    S.G = gm; S.view = 'game'; render();
  }
  function finishGame(score) {
    const gm = S.G; if (!gm || gm.done) return;
    gm.done = true; gm.score = score;
    const g = G(); if (gm.id === 'speed') { g.records.speed = Math.max(g.records.speed || 0, score); }
    gm.reward = gameReward(gm.id === 'speed' ? Math.floor(score / 3) : score);
    save(); checkBadges(); render();
  }
  function renderGame() {
    const gm = S.G, title = (GAMES.find((x) => x.id === gm.id) || {}).name;
    let h = '<div class="topbar"><button class="iconbtn" data-act="opengames" aria-label="Zurück">' + ic('back') + '</button><h1>' + esc(title) + '</h1>' + (gm.id === 'speed' && !gm.done ? '<span class="pill" id="timer">60 s</span>' : '') + '</div>';
    if (gm.done) {
      setTimeout(() => confetti(30), 80);
      app.innerHTML = h + '<div class="card good center"><p class="feedback">' + ic('star') + 'Geschafft!</p><p>' + (gm.id === 'speed' ? gm.score + ' Wörter in 60 Sekunden' + (G().records.speed === gm.score ? ' – neuer Rekord!' : '') : 'Punkte: ' + gm.score) + '</p>' + (gm.reward ? '<p><b>+' + gm.reward + ' Sterne</b></p>' : '') + '</div><div class="row"><button class="btn secondary" data-act="startgame" data-id="' + gm.id + '">Noch einmal</button><button class="btn" data-act="opengames">Andere Spiele</button></div>';
      return;
    }
    if (gm.id === 'memory') {
      h += '<p class="small center">Finde die Paare: englisches Wort und deutsche Bedeutung.</p><div class="memgrid">' + gm.cards.map((c, i) => { const shown = gm.open.includes(i) || gm.found.includes(c.vid); return '<button class="memcard' + (shown ? ' open' : '') + (gm.found.includes(c.vid) ? ' found' : '') + '" data-act="memflip" data-i="' + i + '"' + (shown ? ' disabled' : '') + '>' + (shown ? esc(c.t) : '?') + '</button>'; }).join('') + '</div>';
    } else if (gm.id === 'scramble') {
      const v = vocabById(gm.words[gm.i]);
      if (!gm.tiles) { let t = shuffle(v.en.split('').map((x, i) => ({ i, x }))); if (t.map((x) => x.x).join('') === v.en && v.en.length > 1) t = t.reverse(); gm.tiles = t; gm.used = []; }
      const built = gm.used.map((i) => gm.tiles.find((x) => x.i === i).x).join('');
      h += '<div class="card"><div class="prompt"><div class="label">Wort ' + (gm.i + 1) + ' von ' + gm.words.length + ' · ' + esc(deText(v)) + '</div></div><div class="built">' + (esc(built) || '<span class="muted">ordne die Buchstaben</span>') + '</div><div class="tiles">' +
        gm.tiles.map((tl) => '<button class="tile" data-act="gtile" data-i="' + tl.i + '"' + (gm.used.includes(tl.i) ? ' disabled' : '') + '>' + esc(tl.x) + '</button>').join('') + '</div>' + (gm.msg ? '<p class="center">' + esc(gm.msg) + '</p>' : '') +
        '<div class="row" style="margin-top:12px"><button class="btn secondary" data-act="gundo">⌫</button><button class="btn" data-act="gscramble"' + (gm.used.length === gm.tiles.length ? '' : ' disabled') + '>Prüfen</button></div></div>';
    } else if (gm.id === 'snake') {
      const chain = gm.chain.map(vocabById).filter(Boolean), last = chain[chain.length - 1], letter = last.en.slice(-1).toLowerCase();
      const options = singleWords().filter((v) => v.en[0].toLowerCase() === letter && !gm.chain.includes(v.id));
      h += '<div class="card"><div class="snake">' + chain.map((v) => '<span class="snakew">' + esc(v.en) + '</span>').join('<span class="syldot">→</span>') + '</div>' +
        '<p class="center">Welches deiner Wörter beginnt mit <b class="bigletter">' + esc(letter.toUpperCase()) + '</b>?</p>' +
        (options.length ? '<input type="text" id="gans" class="answer-input" autocomplete="off" autocapitalize="off" spellcheck="false" lang="en" data-enter="gsnake"><div class="row" style="margin-top:10px"><button class="btn secondary" data-act="gsnakehint">Tipp</button><button class="btn" data-act="gsnake">Weiter</button></div>' + (gm.hint ? '<p class="center small">Tipp: Es heißt auf Deutsch „' + esc(gm.hint) + '“.</p>' : '')
          : '<p class="center">Dazu kennst du noch kein Wort – die Schlange ist fertig!</p><button class="btn big" data-act="gsnakeend">Fertig</button>') + (gm.msg ? '<p class="center">' + esc(gm.msg) + '</p>' : '') + '</div>';
    } else if (gm.id === 'speed') {
      const v = vocabById(gm.pool[gm.i % gm.pool.length]);
      h += '<div class="card"><div class="prompt"><div class="label">Schnell! Wie heißt das auf Englisch?</div><div class="word">' + esc(deText(v)) + '</div></div><input type="text" id="gans" class="answer-input" autocomplete="off" autocapitalize="off" spellcheck="false" lang="en" data-enter="gspeed"><div class="row" style="margin-top:10px"><button class="btn secondary" data-act="gspeedskip">Weiter</button><button class="btn" data-act="gspeed">OK</button></div><p class="center"><b>' + gm.ok + '</b> richtig' + (gm.msg ? ' · ' + esc(gm.msg) : '') + '</p></div>';
    } else if (gm.id === 'balloon') {
      const v = vocabById(gm.words[gm.i]), w = v.en.toLowerCase(), shown = w.split('').map((c) => (gm.guess.includes(c) ? c : '_')).join(' ');
      const size = Math.max(40, 120 - gm.miss * 14);
      h += '<div class="card center"><p class="small">Wort ' + (gm.i + 1) + ' von ' + gm.words.length + ' · Deutsch: <b>' + esc(deText(v)) + '</b></p><svg viewBox="0 0 160 170" class="balloon"><ellipse cx="80" cy="' + (75 - (120 - size) / 4) + '" rx="' + (size / 2) + '" ry="' + (size / 1.7) + '" fill="var(--accent)"/><path d="M80 ' + (75 - (120 - size) / 4 + size / 1.7) + ' q-6 30 0 60" stroke="var(--muted)" fill="none" stroke-width="2"/></svg>' +
        '<div class="hang">' + esc(shown) + '</div>' + (gm.msg ? '<p>' + esc(gm.msg) + '</p>' : '') + '<div class="keys">' + 'abcdefghijklmnopqrstuvwxyz'.split('').map((c) => '<button class="key" data-act="gkey" data-c="' + c + '"' + (gm.guess.includes(c) ? ' disabled' : '') + '>' + c + '</button>').join('') + '</div><p class="small">Fehlversuche: ' + gm.miss + ' von 6</p></div>';
    } else if (gm.id === 'twister') {
      const tw = gm.list[gm.i];
      h += '<div class="card"><div class="prompt"><div class="label">Zungenbrecher ' + (gm.i + 1) + ' von ' + gm.list.length + '</div><div class="word long">' + esc(tw.en) + '</div><div class="meta">' + esc(tw.de) + '</div></div>' + speakBtns(tw.en) + recordHtml(tw.en) +
        '<p class="center small">Hör zu, nimm dich auf und vergleiche. Schaffst du es dreimal schnell hintereinander?</p><button class="btn big" data-act="gtwister">✓ Geschafft, weiter</button></div>';
    }
    app.innerHTML = h;
    const inp = $('#gans'); if (inp) inp.focus();
  }

  // ---------- Elternbereich: PIN ----------
  async function hashPin(pin) {
    const txt = 'teacup:' + pin;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; for (const c of txt) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return 'x' + h;
  }
  // ---------- PIN vergessen: Notfall-Code, der per E-Mail an die Eltern geht ----------
  const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  function newRecoveryCode() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const rnd = new Uint32Array(12); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(rnd) : rnd.forEach((_, i) => { rnd[i] = Math.floor(Math.random() * 1e9); });
    const raw = [...rnd].map((n) => abc[n % abc.length]).join('');
    return raw.slice(0, 4) + '-' + raw.slice(4, 8) + '-' + raw.slice(8, 12);
  }
  async function makeRecovery() { const code = newRecoveryCode(); D.recovery = await hashPin('notfall:' + normCode(code)); D.recoveryAt = new Date().toISOString(); save(); S.recoveryCode = code; return code; }
  const recoveryMailBody = (code) => 'Teacup – Notfall-Code für die Eltern-PIN\n\nNotfall-Code: ' + code + '\n\nSo geht es, wenn die PIN vergessen ist:\n1. In Teacup auf das Zahnrad tippen.\n2. „PIN vergessen?“ antippen.\n3. Diesen Code eingeben und eine neue PIN festlegen.\n\nBitte diese E-Mail aufbewahren und den Code nicht an Emma weitergeben.';
  function recoveryPanelHtml() {
    const code = S.recoveryCode, mail = D.settings.parentEmail || '';
    return '<div class="card"><h3 style="margin-top:0">' + ic('flag') + 'Ihr Notfall-Code für die PIN</h3>' +
      '<p style="margin-top:0">Falls die PIN vergessen wird, legen Sie mit diesem Code eine neue fest. Schicken Sie ihn sich jetzt per E-Mail und bewahren Sie die Mail auf.</p>' +
      '<div class="solution" style="letter-spacing:.08em">' + esc(code) + '</div>' +
      '<label for="r-mail">Ihre E-Mail-Adresse</label><input type="text" id="r-mail" inputmode="email" autocomplete="email" value="' + esc(mail) + '" placeholder="name@beispiel.de" data-change="parentemail">' +
      '<p class="small">Die Adresse wird nur auf diesem Gerät gespeichert. Die App selbst verschickt nichts: Es öffnet sich Ihr E-Mail-Programm mit fertigem Text.</p>' +
      '<div class="row"><button class="btn" data-act="mailcode">' + ic('share') + 'Per E-Mail an mich senden</button><button class="btn secondary" data-act="copycode">' + ic('clip') + 'Kopieren</button></div>' +
      '<button class="btn big secondary" data-act="recoverydone" style="margin-top:12px">Erledigt, weiter</button></div>';
  }
  function renderLock() {
    if (S.pinStep === 'recover') {
      app.innerHTML = '<div class="topbar"><button class="iconbtn" data-act="cancelrecover" aria-label="Zurück">' + ic('back') + '</button><h1>PIN vergessen</h1></div>' +
        '<div class="card"><p>Bitte den <b>Notfall-Code</b> aus Ihrer E-Mail „Teacup – Notfall-Code“ eingeben.</p><input type="text" id="rcode" class="answer-input" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX" data-enter="checkrecover">' +
        '<p id="pinmsg" class="small" style="color:var(--bad)"></p><button class="btn big" data-act="checkrecover">Prüfen</button></div>';
      $('#rcode').focus(); return;
    }
    const setting = !D.pin || S.pinStep === 'change';
    const title = setting ? (S.pinFirst ? 'PIN wiederholen' : (S.pinStep === 'change' ? 'Neue PIN festlegen' : 'Elternbereich einrichten')) : 'Elternbereich';
    const hint = setting ? (S.pinFirst ? 'Bitte dieselbe PIN noch einmal eingeben.' : 'Legen Sie eine 4-stellige PIN fest. Emma sollte sie nicht kennen.') : 'Bitte die 4-stellige PIN eingeben.';
    app.innerHTML = '<div class="topbar"><button class="iconbtn" data-act="home" aria-label="Zurück">' + ic('back') + '</button><h1>' + esc(title) + '</h1></div>' +
      '<div class="card"><p>' + esc(hint) + '</p><input type="password" id="pin" class="pin-input" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" data-enter="pin">' +
      '<p id="pinmsg" class="small" style="color:var(--bad)"></p><button class="btn big" data-act="pin">' + (setting ? 'Weiter' : 'Öffnen') + '</button>' +
      (!setting ? (D.recovery ? '<button class="btn ghost" data-act="forgotpin" style="width:100%;margin-top:8px">PIN vergessen?</button>' : '<p class="small center">PIN vergessen? Ohne Notfall-Code hilft nur eine Sicherungsdatei von einem anderen Gerät.</p>') : '') + '</div>';
    $('#pin').focus();
  }
  async function submitPin() {
    const val = ($('#pin').value || '').trim();
    const msg = $('#pinmsg');
    if (!/^\d{4}$/.test(val)) { msg.textContent = 'Bitte genau 4 Ziffern eingeben.'; return; }
    if (!D.pin || S.pinStep === 'change') {
      if (!S.pinFirst) { S.pinFirst = val; return renderLock(); }
      if (S.pinFirst !== val) { S.pinFirst = ''; renderLock(); $('#pinmsg').textContent = 'Die PINs waren unterschiedlich. Bitte neu festlegen.'; return; }
      D.pin = await hashPin(val); S.pinFirst = ''; save();
      const changed = S.pinStep === 'change'; S.pinStep = null; S.unlocked = true;
      if (changed) { S.tab = 'settings'; toast('Neue PIN gespeichert.'); }
      // Beim ersten Festlegen gleich den Notfall-Code einrichten
      if (!D.recovery && !localStorage.getItem('teacup-skip-recovery-screen')) { await makeRecovery(); S.pinStep = 'showcode'; }
      return render();
    }
    if ((await hashPin(val)) === D.pin) { S.unlocked = true; render(); }
    else { $('#pin').value = ''; msg.textContent = 'Falsche PIN.'; }
  }

  // ---------- Elternbereich ----------
  function renderParent() {
    if (S.pinStep === 'showcode' && S.recoveryCode) { app.innerHTML = '<div class="topbar"><h1>Notfall-Code</h1></div>' + recoveryPanelHtml(); return; }
    const nRev = openReports().length + D.vocab.filter((v) => needsReview(v) || v.reviewNew).length;
    const tabs = [['vocab', 'Vokabeln'], ['import', 'Importieren'], ['review', 'Prüfen' + (nRev ? ' (' + nRev + ')' : '')], ['analysis', 'Auswertung'], ['stats', 'Statistik'], ['settings', 'Einstellungen'], ['backup', 'Übertragen & Sicherung']];
    let h = '<div class="topbar"><button class="iconbtn" data-act="leave" aria-label="Elternbereich verlassen">' + ic('back') + '</button><h1>Elternbereich</h1></div>' +
      '<div class="tabs" role="tablist">' + tabs.map(([k, l]) => '<button role="tab" aria-selected="' + (S.tab === k) + '" data-act="tab" data-tab="' + k + '">' + esc(l) + '</button>').join('') + '</div>';
    if (!D.recovery) h += '<div class="card warn"><b>PIN vergessen?</b> Richten Sie einen Notfall-Code ein, der per E-Mail an Sie geht. <button class="btn small" data-act="setuprecovery">Jetzt einrichten</button></div>';
    if (backupDue() && S.tab !== 'backup') h += '<div class="card warn"><b>Erinnerung:</b> ' + (D.lastBackupAt ? 'Die letzte Sicherung ist über einen Monat her.' : 'Es gibt noch keine Sicherung.') + ' <button class="btn small" data-act="tab" data-tab="backup">Jetzt sichern</button></div>';
    if (S.tab === 'vocab') h += S.editId ? editHtml() : S.unitId ? unitHtml() : unitsHtml();
    if (S.tab === 'import') h += importHtml();
    if (S.tab === 'review') h += reviewHtml();
    if (S.tab === 'analysis') h += reportFromHtml() + analysisHtml();
    if (S.tab === 'stats') h += reportFromHtml() + statsHtml();
    if (S.tab === 'settings') h += settingsHtml();
    if (S.tab === 'backup') h += backupHtml();
    app.innerHTML = h;
  }
  function unitsHtml() {
    const book = bookById(S.bookId) || D.books[0];
    const units = D.units.filter((u) => u.bookId === book.id).sort((a, b) => a.order - b.order);
    let h = '';
    if (!D.vocab.length) h += '<div class="card soft"><h3 style="margin-top:0">Erste Schritte</h3><ol><li>Unter <b>Importieren</b> Vokabeln einfügen (zum Testen gibt es 20 Beispielwörter).</li><li>Den Status der Unit auf <b>Aktuell</b> setzen.</li><li>Unter <b>Einstellungen</b> Spitzname und Spracherkennung festlegen.</li><li>Unter <b>Sicherung</b> regelmäßig eine Sicherung speichern.</li></ol></div>';
    h += testsAdminHtml();
    h += '<div class="card"><label for="book">Buch</label><div class="row"><select id="book" data-change="book" style="flex:1">' + D.books.map((b) => '<option value="' + b.id + '"' + (b.id === book.id ? ' selected' : '') + '>' + esc(b.name) + '</option>').join('') + '</select><button class="btn secondary small" data-act="addbook">+ Buch</button></div>';
    h += '<h3>Units</h3>';
    if (!units.length) h += '<p class="muted">Noch keine Units. Sie entstehen beim Import automatisch oder hier per Hand.</p>';
    h += '<ul class="list">' + units.map((u) => {
      const words = D.vocab.filter((v) => v.unitId === u.id);
      const sitzt = words.filter((v) => prog(v.id).seen && prog(v.id).box >= 3).length;
      return '<li><span class="grow"><span class="en">' + esc(u.name) + '</span><br><span class="de">' + words.length + ' Wörter · ' + sitzt + ' ab Fach 3</span></span>' +
        '<select data-change="ustatus" data-id="' + u.id + '" style="width:auto;min-height:44px">' + Object.entries(STATUS).map(([k, l]) => '<option value="' + k + '"' + (u.status === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' +
        '<button class="btn secondary small" data-act="openunit" data-id="' + u.id + '">Öffnen</button></li>';
    }).join('') + '</ul>';
    h += '<div class="row" style="margin-top:12px"><input type="text" id="newunit" placeholder="Name der neuen Unit, z. B. Unit 2" style="flex:2 1 200px"><button class="btn secondary" data-act="addunit">+ Unit</button></div></div>';
    h += '<div class="card"><h3 style="margin-top:0">Lernkartei gesamt</h3>' + boxesHtml(boxCounts(false)) + '<p class="small">Nur Wörter, die Emma schon einmal gelernt hat.</p></div>';
    return h;
  }
  function testsAdminHtml() {
    const list = tests().filter((x) => x.date >= today()).sort((a, b) => (a.date < b.date ? -1 : 1));
    let h = '<div class="card"><h3 style="margin-top:0">' + ic('flag') + 'Test-Turbo: Testtermine</h3><p class="small" style="margin-top:0">Ab 3 Tagen vor dem Test übt Emma täglich alle Testwörter, am Vortag gibt es einen Probetest.</p>';
    h += list.length ? '<ul class="list">' + list.map((x) => '<li><span class="grow"><span class="en">' + esc(x.name || 'Vokabeltest') + '</span> · ' + fmtShort(x.date) + '<br><span class="de">' + esc(testScopeText(x)) + ' · ' + testWords(x).length + ' Wörter' + (x.probe ? ' · Probetest ' + x.probe.score + ' %' : '') + '</span></span><button class="iconbtn" data-act="deltest" data-id="' + x.id + '" aria-label="Test löschen">' + ic('trash') + '</button></li>').join('') + '</ul>' : '';
    if (!S.testForm) return h + '<button class="btn secondary" data-act="newtest">+ Testtermin eintragen</button></div>';
    const units = D.units.slice().sort((a, b) => a.order - b.order);
    const f = S.testForm;
    h += '<label for="t-name">Bezeichnung</label><input type="text" id="t-name" value="' + esc(f.name || 'Vokabeltest') + '">' +
      '<label for="t-date">Datum des Tests</label><input type="date" id="t-date" value="' + esc(f.date || addDays(today(), 7)) + '">' +
      '<label>Welche Vokabeln?</label>' +
      [['units', 'Bestimmte Units'], ['all', 'Alle Vokabeln'], ['fresh', 'Alle als „neu“ markierten']].map(([k, l]) => '<label class="check"><input type="radio" name="t-scope" value="' + k + '"' + ((f.scope || 'units') === k ? ' checked' : '') + ' data-change="tscope"> ' + l + '</label>').join('') +
      ((f.scope || 'units') === 'units' ? '<div style="padding-left:12px">' + units.map((u) => '<label class="check"><input type="checkbox" class="t-unit" value="' + u.id + '"' + ((f.unitIds || []).includes(u.id) ? ' checked' : '') + '> ' + esc(u.name) + '</label>').join('') + '</div>' : '') +
      '<div class="row" style="margin-top:10px"><button class="btn secondary" data-act="canceltest">Abbrechen</button><button class="btn" data-act="savetest">Speichern</button></div>';
    return h + '</div>';
  }
  function readTestForm() {
    const f = S.testForm || {};
    f.name = ($('#t-name') || {}).value || f.name; f.date = ($('#t-date') || {}).value || f.date;
    const r = app.querySelector('input[name=t-scope]:checked'); if (r) f.scope = r.value;
    if (app.querySelector('.t-unit')) f.unitIds = [...app.querySelectorAll('.t-unit:checked')].map((x) => x.value);
    return f;
  }
  function unitHtml() {
    const u = unitById(S.unitId); if (!u) { S.unitId = null; return unitsHtml(); }
    const words = sortVocab(D.vocab.filter((v) => v.unitId === u.id));
    let h = '<div class="card"><button class="btn ghost" data-act="backunits">← Alle Units</button>' +
      '<label for="uname">Name der Unit</label><div class="row"><input type="text" id="uname" value="' + esc(u.name) + '" style="flex:2 1 200px"><button class="btn secondary small" data-act="renameunit">Umbenennen</button></div>' +
      '<label for="ust">Status</label><select id="ust" data-change="ustatus" data-id="' + u.id + '">' + Object.entries(STATUS).map(([k, l]) => '<option value="' + k + '"' + (u.status === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' +
      '<p class="small">Kommt noch = für Emma unsichtbar · Aktuell = neue Wörter werden eingeführt · Gelernt = nur Wiederholung nach Plan</p></div>';
    h += '<div class="card"><div class="row"><h3 style="margin:0;flex:1">' + words.length + ' Wörter</h3><button class="btn small" data-act="newword">+ Wort</button></div>' +
      '<p class="small">' + ic('star') + ' = als <b>neue Vokabel</b> markieren. Emma kann sie mit „Nur neue Vokabeln“ gezielt lernen. Die Markierung verschwindet von selbst, sobald das Wort sitzt (ab Fach 3).</p>' +
      (words.some((v) => v.homework) ? '<button class="btn small secondary" data-act="clearfresh" data-id="' + u.id + '">Markierung „neu“ bei allen Wörtern dieser Unit entfernen</button>' : '') + '<ul class="list">' +
      words.map((v) => {
        const p = prog(v.id);
        return '<li><span class="grow"><span class="en">' + esc(v.en) + '</span><br><span class="de">' + esc(deText(v)) + (v.page ? ' · S. ' + esc(v.page) : '') + '</span><br>' +
          '<span class="pill">' + (p.seen ? BOX_NAME[p.box] : 'noch nicht gelernt') + '</span> ' + (v.homework ? '<span class="pill warn">neu</span> ' : '') + (needsReview(v) ? '<span class="pill bad">ungeprüft</span>' : '') + '</span>' +
          '<button class="iconbtn" data-act="hw" data-id="' + v.id + '" aria-label="Als neue Vokabel markieren" aria-pressed="' + !!v.homework + '" style="' + (v.homework ? 'background:var(--warn-soft);border-color:var(--warn)' : '') + '">' + ic('star') + '</button>' +
          '<button class="iconbtn" data-act="edit" data-id="' + v.id + '" aria-label="Bearbeiten">' + ic('pencil') + '</button></li>';
      }).join('') + '</ul></div>';
    h += '<div class="card"><button class="btn bad" data-act="delunit">Unit mit allen Wörtern löschen</button></div>';
    return h;
  }
  function editHtml() {
    const isNew = S.editId === 'new';
    const v = isNew ? { unitId: S.unitId, page: '', en: '', de: [], pos: '', note: '', exEn: '', exDe: '', tip: '', checked: true } : vocabById(S.editId);
    if (!v) { S.editId = null; return unitHtml(); }
    const f = (id, label, val, ph) => '<label for="' + id + '">' + label + '</label><input type="text" id="' + id + '" value="' + esc(val) + '" placeholder="' + esc(ph || '') + '">';
    return '<div class="card"><button class="btn ghost" data-act="canceledit">← Zurück</button><h2 style="margin-top:4px">' + (isNew ? 'Neues Wort' : 'Wort bearbeiten') + '</h2>' +
      '<label for="f-unit">Unit *</label><select id="f-unit">' + D.units.sort((a, b) => a.order - b.order).map((u) => '<option value="' + u.id + '"' + (u.id === v.unitId ? ' selected' : '') + '>' + esc((bookById(u.bookId) || {}).name + ' – ' + u.name) + '</option>').join('') + '</select>' +
      f('f-page', 'Seite (optional)', v.page, 'z. B. 12') + f('f-en', 'Englisch *', v.en, 'z. B. to have breakfast') + f('f-de', 'Deutsch * (mehrere Bedeutungen mit / trennen)', deText(v), 'z. B. frühstücken') +
      '<label for="f-pos">Wortart</label><select id="f-pos">' + POS.map((p) => '<option' + (p === (v.pos || '') ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + (v.pos && !POS.includes(v.pos) ? '<option selected>' + esc(v.pos) + '</option>' : '') + '</select>' +
      f('f-note', 'Hinweis aus dem Buch', v.note, 'z. B. Plural: children') + '<h3>Zusatzinhalte</h3>' + f('f-exen', 'Beispielsatz Englisch', v.exEn) + f('f-exde', 'Beispielsatz Deutsch', v.exDe) + f('f-tip', 'Aussprachetipp', v.tip) +
      (v.altEn && v.altEn.length ? '<p class="small">Zusätzlich akzeptiert: ' + esc(v.altEn.join(', ')) + '</p>' : '') +
      '<label class="check"><input type="checkbox" id="f-checked" ' + (v.checked ? 'checked' : '') + '> Zusatzinhalte geprüft und freigegeben</label>' +
      '<p id="fmsg" class="small" style="color:var(--bad)"></p><div class="row"><button class="btn" data-act="saveword">Speichern</button>' + (isNew ? '' : '<button class="btn bad" data-act="delword">Löschen</button>') + '</div>' +
      (isNew ? '' : '<p class="small">Der Lernstand des Wortes bleibt beim Bearbeiten erhalten.</p>') + '</div>';
  }
  function saveWord() {
    const g = (id) => ($('#' + id).value || '').trim();
    const en = tidyEn(g('f-en')), de = g('f-de').split('/').map((s) => s.trim()).filter(Boolean);
    if (!g('f-unit') || !en || !de.length) { $('#fmsg').textContent = 'Bitte Englisch und Deutsch ausfüllen.'; return; }
    const isNew = S.editId === 'new';
    const v = isNew ? { id: uid(), createdAt: Date.now(), homework: false, altEn: [] } : vocabById(S.editId);
    Object.assign(v, { unitId: g('f-unit'), page: g('f-page'), en, de, pos: g('f-pos'), note: g('f-note'), exEn: g('f-exen'), exDe: g('f-exde'), tip: g('f-tip'), checked: $('#f-checked').checked });
    if (isNew && !v.tip) { v.tip = autoTip(en); v.tipAuto = !!v.tip; }
    v.reviewNew = false;
    if (isNew) D.vocab.push(v);
    save(); S.unitId = v.unitId; S.editId = null; toast('Gespeichert.'); render();
  }

  // ---------- Import ----------
  function splitLine(line, delim) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"' && cur.trim() === '') q = true;
      else if (c === delim) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }
  const COLS = ['unit', 'seite', 'englisch', 'deutsch', 'wortart', 'hinweis', 'beispiel_en', 'beispiel_de', 'aussprache'];
  const ALIAS = { aussprachetipp: 'aussprache', page: 'seite', english: 'englisch', german: 'deutsch', buch: 'buch' };
  // Unit und Seite für Zeilen ohne eigene Angabe (Eintippen, Textdatei, Foto)
  function importDefaults() {
    const sel = S.impUnit || '';
    const unit = sel === '__new' ? (S.impNewUnit || '').trim() : (unitById(sel) || {}).name || '';
    return { unit, page: (S.impPage || '').trim() };
  }
  function parseImport(text) {
    const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() && !/^\s*#/.test(l));
    if (!lines.length) return [];
    const delim = lines[0].includes('\t') ? '\t' : lines.some((l) => l.includes(';')) ? ';' : null;
    let map = null;
    const first = delim ? splitLine(lines[0], delim).map((s) => s.toLowerCase().replace(/\s+/g, '_')) : [];
    if (first.includes('englisch') || first.includes('english')) { map = first.map((c) => ALIAS[c] || c); lines.shift(); }
    // Karteikarten-Modus: Zeilen ohne Trenner abwechselnd Englisch / Deutsch (z. B. aus Google Lens)
    if (S.impPairs && !delim && !map) {
      const merged = [];
      for (let i = 0; i < lines.length; i++) {
        if (/\s(?:=|[-–—:])\s|=/.test(lines[i]) || i + 1 >= lines.length) merged.push(lines[i]);
        else { merged.push(lines[i].trim() + ' = ' + lines[i + 1].trim()); i++; }
      }
      lines.splice(0, lines.length, ...merged);
    }
    const def = importDefaults();
    const book = bookById(S.bookId) || D.books[0];
    const seen = new Set();
    return lines.map((line, n) => {
      let cells = delim ? splitLine(line, delim) : [line.trim()];
      let r = {};
      if (map) map.forEach((k, i) => { r[k] = cells[i] || ''; });
      else if (cells.length >= 4) COLS.forEach((k, i) => { r[k] = cells[i] || ''; });
      else {
        // Kurzform: „englisch = deutsch“, „englisch - deutsch“, „englisch ; deutsch ; hinweis“
        if (cells.length === 1) { const m = cells[0].match(/^(.+?)\s*(?:=|\s[-–—:]\s)\s*(.+)$/); if (m) cells = [m[1].trim(), m[2].trim()]; }
        r = { unit: def.unit, seite: def.page, englisch: cells[0] || '', deutsch: cells[1] || '', hinweis: cells[2] || '' };
      }
      const rec = { line: n + 1, bookName: r.buch || book.name, unit: r.unit || def.unit, page: r.seite || def.page, en: tidyEn(r.englisch || ''), de: (r.deutsch || '').split('/').map((s) => s.trim()).filter(Boolean), pos: r.wortart, note: r.hinweis, exEn: r.beispiel_en, exDe: r.beispiel_de, tip: r.aussprache, errors: [] };
      // Unit und Seite sind freiwillig: ohne Unit landet das Wort in „Sonstige Wörter“
      if (!rec.unit) rec.unit = NO_UNIT;
      if (!rec.en) rec.errors.push('Englisch fehlt'); if (!rec.de.length) rec.errors.push('Deutsch fehlt');
      const key = (rec.bookName + '|' + rec.unit + '|' + cmpEn(rec.en)).toLowerCase();
      rec.dup = !!rec.en && seen.has(key); seen.add(key);
      const b = D.books.find((x) => x.name.toLowerCase() === rec.bookName.toLowerCase());
      const u = b && D.units.find((x) => x.bookId === b.id && x.name.toLowerCase() === (rec.unit || '').toLowerCase());
      rec.existing = u ? D.vocab.find((v) => v.unitId === u.id && cmpEn(v.en).toLowerCase() === cmpEn(rec.en).toLowerCase()) : null;
      rec.newUnit = !u;
      // Schon in einer anderen Unit vorhanden (z. B. von Karteikarten in „Sonstige Wörter“)?
      if (!rec.existing && rec.en) { const o = findElsewhere(rec.en, u ? u.id : null); if (o) { const ou = D.units.find((x) => x.id === o.unitId); rec.elsewhere = o; rec.elsewhereUnit = ou ? ou.name : '?'; } }
      return rec;
    });
  }
  // Gleiches Wort, auch bei kleinen Unterschieden wie „to like“ / „like“ oder „Mum“ / „mum“
  const wordKey = (s) => cmpEn(s).toLowerCase().replace(/^(to|a|an|the)\s+(?=\S)/, '').trim();
  function findElsewhere(en, unitId) {
    const k = wordKey(en), hits = D.vocab.filter((v) => v.unitId !== unitId && wordKey(v.en) === k);
    if (!hits.length) return null;
    const noU = D.units.filter((x) => x.name === NO_UNIT).map((x) => x.id);
    return hits.find((v) => noU.includes(v.unitId)) || hits[0];
  }
  // Fehler zusammenfassen, mit konkretem Lösungshinweis
  function errorSummaryHtml(P) {
    const count = {};
    P.forEach((r) => r.errors.forEach((e) => { count[e] = (count[e] || 0) + 1; }));
    const fix = {
      'Seite fehlt': 'Bitte oben bei „Seite“ die Seitenzahl eintragen (z. B. 14).',
      'Unit fehlt': 'Bitte oben eine Unit wählen bzw. den Namen der neuen Unit eintragen.',
      'Deutsch fehlt': 'Englisch und Deutsch trennen, z. B. „friend = Freund“ (ein Wort mit Leerzeichen dazwischen reicht nicht).',
      'Englisch fehlt': 'Die Zeile beginnt mit dem Trennzeichen. Bitte „englisch = deutsch“ schreiben.'
    };
    const keys = Object.keys(count);
    if (!keys.length) return '';
    return '<div class="card bad" style="box-shadow:none"><b>So lassen sich die Fehler beheben:</b><ul style="margin:6px 0 0;padding-left:20px">' +
      keys.map((k) => '<li><b>' + count[k] + '× ' + esc(k) + ':</b> ' + esc(fix[k] || '') + '</li>').join('') + '</ul><p class="small" style="margin-bottom:0">Danach erneut auf „Vorschau“ tippen.</p></div>';
  }
  function importHtml() {
    const units = D.units.filter((u) => u.bookId === S.bookId).sort((a, b) => a.order - b.order);
    if (S.impUnit === undefined) S.impUnit = units.length ? units[units.length - 1].id : '';
    let h = '<div class="card"><h3 style="margin-top:0">1. Wohin gehören die Wörter?</h3>' +
      '<p class="small" style="margin-top:0">Beides ist freiwillig. Ohne Unit kommen die Wörter in „' + NO_UNIT + '“.</p><label for="imp-unit">Unit (optional)</label><select id="imp-unit" data-change="impunit"><option value=""' + (S.impUnit === '' ? ' selected' : '') + '>– ohne Unit –</option>' + units.filter((u) => u.name !== NO_UNIT).map((u) => '<option value="' + u.id + '"' + (S.impUnit === u.id ? ' selected' : '') + '>' + esc(u.name) + '</option>').join('') + '<option value="__new"' + (S.impUnit === '__new' ? ' selected' : '') + '>+ Neue Unit …</option></select>' +
      (S.impUnit === '__new' ? '<label for="imp-newunit">Name der neuen Unit</label><input type="text" id="imp-newunit" data-change="impnewunit" value="' + esc(S.impNewUnit || '') + '" placeholder="z. B. Unit 2">' : '') +
      '<label for="imp-page">Seite (optional)</label><input type="text" id="imp-page" data-change="imppage" inputmode="numeric" value="' + esc(S.impPage || '') + '" placeholder="z. B. 14"></div>' +
      '<div class="card"><h3 style="margin-top:0">2. Wörter und Sätze hinzufügen</h3><p>Drei Wege, alle landen unten im Textfeld zum Prüfen:</p>' +
      '<div class="row"><label class="btn" style="margin:0">' + ic('camera') + 'Foto der Vokabelseite<input type="file" accept="image/*" data-change="photo" hidden></label>' +
      '<label class="btn secondary" style="margin:0">' + ic('file') + 'Textdatei wählen<input type="file" accept=".txt,.csv,.tsv,text/plain,text/csv" data-change="textfile" hidden></label>' +
      '<button class="btn secondary" data-act="pasteclip">' + ic('clip') + 'Aus Zwischenablage</button></div>' +
      '<p class="small">Das Foto erkennt gedruckten Text (Buchseite). Für Handschrift siehe unten „Karteikarten und Handschrift“.</p>' +
      '<p id="ocrmsg" class="small">' + esc(S.ocrMsg || '') + '</p>' +
      '<label for="imp">Oder eintippen bzw. einfügen – ein Wort pro Zeile:</label><textarea id="imp" placeholder="friend = Freund / Freundin\nto have breakfast = frühstücken\nWhat\'s your name? = Wie heißt du?">' + esc(S.importText) + '</textarea>' +
      '<label class="check"><input type="checkbox" data-change="imppairs" ' + (S.impPairs ? 'checked' : '') + '> Karteikarten: Zeilen abwechselnd Englisch, Deutsch (z. B. aus Google Lens)</label>' +
      '<details><summary><b>Welche Schreibweisen gehen?</b></summary><ul class="small"><li><b>englisch = deutsch</b> (auch mit „ - “ oder „ : “ dazwischen)</li><li>Sätze und Redewendungen genauso: <i>How are you? = Wie geht es dir?</i> (bei Sätzen am besten „=“ verwenden)</li><li>Mehrere Bedeutungen mit Schrägstrich: <i>Freund / Freundin</i></li><li>Mit Hinweis: <i>child ; Kind ; Plural: children</i></li><li>Aus Excel kopiert (Spalten Englisch, Deutsch) oder im vollen Importformat mit Kopfzeile:<br><code>unit;seite;englisch;deutsch;wortart;hinweis;beispiel_en;beispiel_de;aussprache</code></li><li>Textdatei: dieselben Schreibweisen, gespeichert als .txt oder .csv (in Excel: „Speichern unter → CSV“)</li></ul></details>' +
      '<div class="row" style="margin-top:10px"><button class="btn secondary" data-act="sample">20 Testwörter</button><button class="btn" data-act="preview">3. Vorschau</button></div></div>';
    if (S.preview) {
      const P = S.preview, ok = P.filter((r) => !r.errors.length && !r.dup), bad = P.filter((r) => r.errors.length).length, dup = P.filter((r) => r.dup && !r.errors.length).length;
      if (S.impMove === undefined) S.impMove = true;
      const nEls = ok.filter((r) => !r.existing && r.elsewhere).length;
      const nNew = ok.filter((r) => !r.existing && !(r.elsewhere && S.impMove)).length, nUpd = ok.length - nNew;
      const newUnits = [...new Set(ok.filter((r) => r.newUnit).map((r) => r.unit))];
      h += '<div class="card"><h3 style="margin-top:0">Vorschau</h3><p><b>' + nNew + '</b> neu · <b>' + nUpd + '</b> werden aktualisiert (Lernstand bleibt) · <b' + (bad ? ' style="color:var(--bad)"' : '') + '>' + bad + '</b> mit Fehler (werden übersprungen)' + (dup ? ' · <b>' + dup + '</b> doppelt' : '') + '</p>' +
        errorSummaryHtml(P) +
        (nEls ? '<div class="card" style="box-shadow:none"><p style="margin-top:0"><b>' + nEls + '</b> Wörter gibt es schon in einer anderen Unit (z. B. von den Karteikarten).</p><label class="check" style="margin-bottom:0"><input type="checkbox" data-change="impmove"' + (S.impMove ? ' checked' : '') + '> In diese Unit verschieben und mit den neuen Angaben ergänzen, statt doppelt anzulegen. Emmas Lernstand bleibt.</label></div>' : '') +
        (newUnits.length ? '<p>Neue Units: ' + esc(newUnits.join(', ')) + '</p><label for="imp-status">Status der neuen Units</label><select id="imp-status">' + Object.entries(STATUS).map(([k, l]) => '<option value="' + k + '"' + (k === 'aktuell' ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' : '') +
        '<label class="check"><input type="checkbox" id="imp-tagnew" checked> Als <b>neue Vokabeln</b> markieren (Emma kann sie mit „Nur neue Vokabeln“ gezielt lernen)</label>' +
        (D.settings.autoApprove ? '<p class="small">Beispielsätze und Aussprachetipps sind sofort aktiv. Durchsehen und ändern: Reiter „Prüfen“.</p>' : '<label class="check"><input type="checkbox" id="imp-checked"> Beispielsätze und Aussprachetipps sind geprüft (sonst später unter „Prüfen“ freigeben)</label>') +
        '<div class="tablewrap"><table><thead><tr><th>#</th><th>Unit</th><th>S.</th><th>Englisch</th><th>Deutsch</th><th>Status</th></tr></thead><tbody>' +
        P.map((r) => '<tr' + (r.errors.length ? ' class="err"' : '') + '><td>' + r.line + '</td><td>' + esc(r.unit) + '</td><td>' + esc(r.page) + '</td><td>' + esc(r.en) + '</td><td>' + esc(r.de.join(' / ')) + '</td><td>' + (r.errors.length ? esc(r.errors.join(', ')) : r.dup ? 'doppelt, wird übersprungen' : r.existing ? 'aktualisieren' : r.elsewhere ? (S.impMove ? 'schon in „' + esc(r.elsewhereUnit) + '“: wird verschoben' : 'auch in „' + esc(r.elsewhereUnit) + '“: neu angelegt') : 'neu') + '</td></tr>').join('') +
        '</tbody></table></div><div class="row" style="margin-top:12px"><button class="btn secondary" data-act="cancelimport">Verwerfen</button><button class="btn good" data-act="doimport"' + (ok.length ? '' : ' disabled') + '>' + ok.length + ' Wörter übernehmen</button></div></div>';
    }
    h += '<div class="card"><h3 style="margin-top:0">' + ic('pencil') + 'Karteikarten und Handschrift</h3>' +
      '<p class="small">Handschrift erkennt die App selbst nicht zuverlässig. Diese zwei kostenlosen Wege funktionieren gut:</p>' +
      '<details open><summary><b>A. Claude-Chat (empfohlen, am genauesten)</b></summary><ol><li>Karten nebeneinander legen und die Vorderseiten fotografieren. Dann jede Karte <b>an ihrem Platz</b> umdrehen und die Rückseiten fotografieren.</li><li>Beide Fotos in einem Claude-Chat hochladen, zusammen mit dem Text unten.</li><li>Ergebnis kopieren, hier auf „Aus Zwischenablage“ tippen, prüfen, „Vorschau“.</li></ol>' +
      '<textarea readonly id="cardprompt" style="min-height:200px">' + esc(CARD_PROMPT) + '</textarea><button class="btn secondary" data-act="copycard" style="margin-top:10px">Text kopieren</button></details>' +
      '<details><summary><b>B. Google Lens (direkt auf dem Handy)</b></summary><ol><li>Kamera-App oder Google-App öffnen → Lens-Symbol → Karte fotografieren → „Text“ → „Alles auswählen“ → „Kopieren“.</li><li>Erst Vorderseite, dann Rückseite derselben Karte, jeweils hier mit „Aus Zwischenablage“ einfügen.</li><li>Haken bei „Karteikarten: Zeilen abwechselnd Englisch, Deutsch“ setzen, dann „Vorschau“.</li></ol><p class="small">Bitte jede Zeile prüfen: Handschrift wird nie fehlerfrei erkannt.</p></details></div>';
    h += '<div class="card"><details><summary><b>Genauer: Foto über einen Claude-Chat umwandeln</b></summary><p class="small">Die Fotoerkennung in der App arbeitet ohne Internet auf dem Gerät und braucht oft kleine Korrekturen. Bei schwierigen Seiten ist ein Claude-Chat genauer:</p><ol><li>Vokabelseite fotografieren.</li><li>Foto in einem Claude-Chat hochladen, zusammen mit dem Text unten.</li><li>Ergebnis prüfen, kopieren und oben einfügen.</li></ol>' +
      '<textarea readonly id="photoprompt" style="min-height:220px">' + esc(PHOTO_PROMPT) + '</textarea><button class="btn secondary" data-act="copyprompt" style="margin-top:10px">Text kopieren</button></details></div>';
    return h;
  }
  function addImportText(txt) {
    const cur = ($('#imp') ? $('#imp').value : S.importText).trim();
    S.importText = (cur ? cur + '\n' : '') + txt.trim();
    S.preview = parseImport(S.importText);
  }
  function readTextFile(file) {
    if ($('#imp')) syncImportFields();
    const read = (enc) => new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsText(file, enc); });
    read('utf-8').then((t) => (t.includes('�') ? read('windows-1252') : t)).then((t) => {
      addImportText(t); S.ocrMsg = 'Datei „' + file.name + '“ eingelesen. Bitte die Vorschau prüfen.'; rerender();
    });
  }
  // Fotoerkennung mit Tesseract (läuft auf dem Gerät, kein Upload, keine Kosten)
  let tessLoad;
  function loadTesseract() {
    tessLoad = tessLoad || new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'vendor/tesseract/tesseract.min.js'; sc.onload = res; sc.onerror = () => { tessLoad = null; rej(new Error('load')); }; document.head.appendChild(sc); });
    return tessLoad;
  }
  async function prepareImage(file) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    const ctx = c.getContext('2d'); ctx.filter = 'grayscale(1) contrast(1.3)'; ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return c;
  }
  const isPhonetic = (t) => /[[\]ˈˌəɪʊæθðŋʃʒɜɔʌː]/.test(t);
  // Zeilen in Spalten zerlegen: Englisch | Lautschrift | Deutsch | Hinweis.
  // 1. Pro Zeile große Lücken finden, 2. Spaltenanfänge über alle Zeilen sammeln, 3. jedes Wort seiner Spalte zuordnen.
  function ocrLinesToText(lines) {
    const out = []; let page = '';
    const rows = [];
    for (const l of lines) {
      const words = (l.words || []).filter((w) => w.text.trim()).map((w) => ({ text: w.text.replace(/^\|$/, 'I'), x0: w.bbox.x0, x1: w.bbox.x1, h: w.bbox.y1 - w.bbox.y0 }));
      if (!words.length) continue;
      // Kopfzeile mit Seitenzahl: Seite merken, Zeile nicht als Vokabel übernehmen
      const pm = (l.text || '').match(/\b(?:page|seite|s\.)\s*(\d{1,3})\b/i);
      if (pm) { if (!page) page = pm[1]; continue; }
      rows.push(words);
    }
    const hs = rows.flat().map((w) => w.h).sort((a, b) => a - b);
    const h = hs.length ? hs[Math.floor(hs.length / 2)] : 20;
    const starts = [];
    rows.forEach((ws) => { for (let i = 1; i < ws.length; i++) if (ws[i].x0 - ws[i - 1].x1 > Math.max(12, h * 1.2)) starts.push(ws[i].x0); });
    starts.sort((a, b) => a - b);
    const clusters = [];
    starts.forEach((x) => { const c = clusters[clusters.length - 1]; if (c && x - c.max <= h) { c.max = x; c.n++; c.min = Math.min(c.min, x); } else clusters.push({ min: x, max: x, n: 1 }); });
    const bounds = clusters.filter((c) => c.n >= 2 || rows.length < 4).map((c) => c.min - h / 2);
    for (const ws of rows) {
      const cols = [];
      ws.forEach((w, i) => {
        let k = bounds.filter((b) => w.x0 >= b).length;
        if (i > 0 && w.x0 - ws[i - 1].x1 > Math.max(12, h * 1.2) && k <= ws[i - 1].col) k = ws[i - 1].col + 1;
        w.col = k; (cols[k] = cols[k] || []).push(w.text);
      });
      const parts = cols.filter(Boolean).map((c) => c.join(' ').trim()).filter((t) => t && !isPhonetic(t) && !/^[|,.;:—–-]+$/.test(t));
      if (parts.length < 2) continue;
      out.push(parts[0] + ' ; ' + parts[1] + (parts.length > 2 ? ' ; ' + parts.slice(2).join(' ') : ''));
    }
    return { text: out.join('\n'), page };
  }
  async function runOcr(file) {
    const setMsg = (m) => { S.ocrMsg = m; const el = $('#ocrmsg'); if (el) el.textContent = m; };
    if ($('#imp')) syncImportFields();
    try {
      setMsg('Foto wird gelesen … (beim ersten Mal werden ca. 12 MB geladen)');
      await loadTesseract();
      const img = await prepareImage(file);
      const w = await Tesseract.createWorker(['eng', 'deu'], 1, {
        workerPath: 'vendor/tesseract/worker.min.js', corePath: 'vendor/tesseract/', langPath: 'vendor/tesseract/lang', workerBlobURL: false,
        logger: (m) => { if (m.status === 'recognizing text') setMsg('Texterkennung … ' + Math.round(m.progress * 100) + ' %'); }
      });
      const { data } = await w.recognize(img);
      await w.terminate();
      const r = ocrLinesToText(data.lines || []);
      if (!r.text) { setMsg('Auf dem Foto wurden keine Vokabeln erkannt. Tipp: gerade von oben, hell, nur eine Spalte pro Foto.'); return; }
      if (r.page && !S.impPage) S.impPage = r.page;
      addImportText(r.text);
      setMsg(r.text.split('\n').length + ' Zeilen erkannt. Bitte jede Zeile mit dem Buch vergleichen und im Textfeld korrigieren, dann „Vorschau“.');
      rerender();
    } catch (e) {
      console.error(e);
      setMsg('Die Fotoerkennung hat nicht geklappt. Beim ersten Mal ist Internet nötig. Alternativ den Claude-Chat-Weg unten nutzen.');
    }
  }
  function syncImportFields() {
    S.importText = $('#imp').value;
    if ($('#imp-page')) S.impPage = $('#imp-page').value;
    if ($('#imp-newunit')) S.impNewUnit = $('#imp-newunit').value;
  }
  function doImport() {
    syncImportFields(); S.preview = parseImport(S.importText);
    const rows = S.preview.filter((r) => !r.errors.length && !r.dup);
    if (!rows.length) return rerender();
    const status = $('#imp-status') ? $('#imp-status').value : 'aktuell';
    const auto = D.settings.autoApprove;
    const tagNew = !$('#imp-tagnew') || $('#imp-tagnew').checked;
    const checked = auto || !!($('#imp-checked') && $('#imp-checked').checked);
    let lastUnit = null, moved = 0;
    for (const r of rows) {
      let b = D.books.find((x) => x.name.toLowerCase() === r.bookName.toLowerCase());
      if (!b) { b = { id: uid(), name: r.bookName }; D.books.push(b); }
      let u = D.units.find((x) => x.bookId === b.id && x.name.toLowerCase() === r.unit.toLowerCase());
      if (!u) { u = { id: uid(), bookId: b.id, name: r.unit, status, order: D.units.length ? Math.max(...D.units.map((x) => x.order)) + 1 : 1 }; D.units.push(u); }
      lastUnit = u;
      let v = D.vocab.find((x) => x.unitId === u.id && cmpEn(x.en).toLowerCase() === cmpEn(r.en).toLowerCase());
      const fields = { unitId: u.id, page: r.page, en: r.en, de: r.de, pos: r.pos, note: r.note, exEn: r.exEn, exDe: r.exDe, tip: r.tip };
      if (!v && S.impMove !== false) {
        // Aus anderer Unit herüberholen: Bedeutungen zusammenführen, Lernstand (Box, Verlauf) bleibt
        v = findElsewhere(r.en, u.id);
        if (v) { const low = r.de.map((d) => d.toLowerCase()); fields.de = r.de.concat((v.de || []).filter((d) => !low.includes(d.toLowerCase()))); moved++; }
      }
      if (v) {
        // Vorhandenes Wort ergänzen: leere Felder im Import überschreiben nichts, der Lernstand bleibt
        const before = [v.exEn, v.exDe, v.tip].join('|');
        Object.entries(fields).forEach(([k, val]) => { if (['unitId', 'en', 'de'].includes(k) || (val && String(val).trim())) v[k] = val; });
        if (before !== [v.exEn, v.exDe, v.tip].join('|')) { v.checked = checked; v.reviewNew = auto; if (r.tip) v.tipAuto = false; }
      } else {
        const nv = Object.assign({ id: uid(), createdAt: Date.now() + D.vocab.length, homework: tagNew, altEn: [], checked }, fields);
        nv.reviewNew = auto && !!(r.exEn || r.exDe || r.tip);
        if (!nv.tip) { nv.tip = autoTip(nv.en); nv.tipAuto = !!nv.tip; }
        D.vocab.push(nv);
      }
    }
    save();
    toast(rows.length + ' Wörter übernommen' + (moved ? ', davon ' + moved + ' aus anderen Units verschoben (Lernstand bleibt).' : '.'));
    S.preview = null; S.importText = ''; S.impUnit = lastUnit ? lastUnit.id : S.impUnit; S.impNewUnit = ''; S.tab = 'vocab'; S.unitId = lastUnit ? lastUnit.id : null; S.bookId = lastUnit ? lastUnit.bookId : S.bookId;
    render();
  }

  // ---------- Prüfen ----------
  function reviewHtml() {
    const reps = openReports();
    let h = '<div class="card"><h3 style="margin-top:0">„Ich war richtig“-Meldungen</h3>';
    if (!reps.length) h += '<p class="muted">Keine offenen Meldungen.</p>';
    h += reps.map((r) => {
      const v = vocabById(r.vid); if (!v) return '';
      return '<div class="card"><p><b>' + esc(deText(v)) + '</b> → erwartet: <b>' + esc(v.en) + '</b></p><p>Emmas Antwort: <b>' + esc(r.answer) + '</b> <span class="small">(' + fmtDate(r.day) + ')</span></p>' +
        '<label class="check"><input type="checkbox" id="acc-' + r.id + '"> Diese Schreibweise künftig als richtig akzeptieren</label>' +
        '<div class="row"><button class="btn secondary" data-act="rep-no" data-id="' + r.id + '">Bleibt falsch</button><button class="btn good" data-act="rep-yes" data-id="' + r.id + '">Als richtig werten</button></div></div>';
    }).join('') + '</div>';
    h += enrichHtml();
    h += '<div class="card"><details><summary><b>' + ic('book') + ' Inhalte für Sammelalbum und Zungenbrecher</b></summary><p class="small">Von Claude erstellt und auf Richtigkeit geprüft. Diese Texte sieht Emma, sobald sie eine Karte in der Schatztruhe findet. Fehler bitte an Claude Code melden.</p>' +
      '<ul class="list">' + CARDS.map((c) => '<li><span class="grow"><span class="en">' + c.icon + ' ' + esc(c.name) + '</span> <span class="pill">' + esc(c.r) + '</span><br>' + esc(c.en) + '<br><span class="de">' + esc(c.de) + '</span></span></li>').join('') + '</ul>' +
      '<h3>Zungenbrecher</h3><ul class="list">' + TWISTERS.map((t) => '<li><span class="grow"><span class="en">' + esc(t.en) + '</span><br><span class="de">' + esc(t.de) + '</span></span></li>').join('') + '</ul></details></div>';
    const fresh = D.vocab.filter((v) => v.reviewNew && !needsReview(v));
    h += '<div class="card"><h3 style="margin-top:0">' + ic('check') + 'Zum Durchsehen (schon aktiv)</h3><p class="small">Neu ergänzte Beispielsätze und Tipps. Emma sieht sie bereits. Bei Bedarf mit ✏️ korrigieren.</p>';
    if (!fresh.length) h += '<p class="muted">Nichts Neues.</p>';
    else h += '<button class="btn secondary small" data-act="seenall">Alle ' + fresh.length + ' als durchgesehen markieren</button>';
    h += '<ul class="list">' + fresh.slice(0, 100).map((v) => '<li><span class="grow"><span class="en">' + esc(v.en) + '</span> <span class="de">(' + esc(deText(v)) + ')</span>' +
      (v.exEn || v.exDe ? '<br>Beispiel: <i>' + esc(v.exEn) + '</i> – ' + esc(v.exDe) : '') + (v.tip ? '<br>Aussprache: ' + esc(v.tip) : '') + '</span>' +
      '<button class="btn small secondary" data-act="seen" data-id="' + v.id + '">Passt</button><button class="iconbtn" data-act="edit" data-id="' + v.id + '" aria-label="Bearbeiten">' + ic('pencil') + '</button></li>').join('') + '</ul></div>';
    const list = D.vocab.filter(needsReview);
    if (!list.length) return h;
    h += '<div class="card"><h3 style="margin-top:0">Zusatzinhalte freigeben</h3><p class="small">Diese Beispielsätze und Aussprachetipps sieht Emma erst nach Ihrer Freigabe.</p>';
    h += '<button class="btn secondary small" data-act="approveall">Alle ' + list.length + ' freigeben</button>';
    h += '<ul class="list">' + list.map((v) => '<li><span class="grow"><span class="en">' + esc(v.en) + '</span> <span class="de">(' + esc(deText(v)) + ')</span>' +
      (v.exEn || v.exDe ? '<br>Beispiel: <i>' + esc(v.exEn) + '</i> – ' + esc(v.exDe) : '') + (v.tip ? '<br>Aussprache: ' + esc(v.tip) : '') + '</span>' +
      '<button class="btn small good" data-act="approve" data-id="' + v.id + '">Freigeben</button><button class="iconbtn" data-act="edit" data-id="' + v.id + '" aria-label="Bearbeiten">' + ic('pencil') + '</button></li>').join('') + '</ul></div>';
    return h;
  }
  // Beispielsätze über einen Claude-Chat ergänzen (kein Schlüssel, keine Kosten)
  function enrichWords() {
    return sortVocab(D.vocab.filter((v) => !v.exEn && (!S.enrichUnit || v.unitId === S.enrichUnit))).slice(0, 60);
  }
  function enrichText() {
    const clean = (t) => String(t || '').replace(/;/g, ',');
    return ENRICH_HEAD + enrichWords().map((v) => [(unitById(v.unitId) || {}).name, v.page, v.en, deText(v), v.pos, v.note].map(clean).join(';')).join('\n');
  }
  function enrichHtml() {
    const words = enrichWords();
    const total = D.vocab.filter((v) => !v.exEn && (!S.enrichUnit || v.unitId === S.enrichUnit)).length;
    return '<div class="card"><h3 style="margin-top:0">' + ic('bulb') + 'Beispielsätze mit Claude ergänzen</h3>' +
      '<p class="small">Aussprachetipps setzt die App automatisch. Beispielsätze schreibt ein Claude-Chat, je Durchgang bis zu 60 Wörter.</p>' +
      '<label for="enr-unit">Für welche Wörter?</label><select id="enr-unit" data-change="enrunit"><option value="">Alle Units</option>' +
      D.units.slice().sort((a, b) => a.order - b.order).map((u) => '<option value="' + u.id + '"' + (S.enrichUnit === u.id ? ' selected' : '') + '>' + esc(u.name) + '</option>').join('') + '</select>' +
      '<p><b>' + total + '</b> Wörter ohne Beispielsatz' + (total > 60 ? ' (dieser Durchgang: 60)' : '') + '.</p>' +
      (words.length ? '<ol><li><button class="btn small" data-act="copyenrich">' + ic('share') + 'Text für Claude kopieren</button></li><li>In einem Claude-Chat einfügen und senden.</li><li>Claudes Antwort kopieren (Kopieren-Knopf am Codeblock).</li><li><button class="btn small secondary" data-act="pasteenrich">' + ic('clip') + 'Ergebnis übernehmen</button> → Vorschau prüfen → Übernehmen.</li></ol>' : '<p class="muted">Alle Wörter haben einen Beispielsatz.</p>') + '</div>';
  }
  function decideReport(id, yes) {
    const r = D.reports.find((x) => x.id === id); if (!r) return;
    r.status = yes ? 'richtig' : 'falsch';
    const v = vocabById(r.vid);
    if (yes && v) {
      if ($('#acc-' + id) && $('#acc-' + id).checked) { v.altEn = v.altEn || []; if (!v.altEn.includes(r.answer)) v.altEn.push(normEn(r.answer)); }
      const p = prog(r.vid);
      // Lernstand korrigieren, wenn das Wort seitdem nicht erneut abgefragt wurde
      if (r.prevBox && p.last === r.day && !p.lastOk) {
        p.box = Math.min(r.prevBox + 1, 6); p.due = addDays(r.day, INTERVAL[p.box]); p.lastOk = true; p.wrong = Math.max(0, p.wrong - 1); p.right++;
      }
    }
    save(); toast(yes ? 'Als richtig gewertet.' : 'Bleibt falsch.'); rerender();
  }

  // ---------- Statistik: Lernzeiten, Uhrzeiten, Fehler, Zusammenfassung ----------
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const WDL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const dayOf = (iso) => dateStr(new Date(iso));
  const hm = (iso) => { const d = new Date(iso); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const wdOf = (ds) => { const [y, m, d] = ds.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };
  const sessionsOn = (ds) => (D.sessions || []).filter((x) => dayOf(x.start) === ds).sort((a, b) => (a.start < b.start ? -1 : 1));
  const minutesOn = (ds) => { const ms = ((D.stats.days[ds] || {}).ms) || sessionsOn(ds).reduce((t, x) => t + x.ms, 0); return ms > 0 ? Math.max(1, Math.round(ms / 60000)) : 0; };
  function reportFromHtml() {
    return D.reportFrom ? '<div class="card soft" style="padding:12px 16px"><p class="small" style="margin:0">' + ic('download') + ' Stand von Emmas Gerät vom <b>' + fmtDate(D.reportFrom) + ', ' + hm(D.reportFrom) + ' Uhr</b>. Neuer Stand: auf Emmas Gerät „Lernstand an Eltern senden“.</p></div>' : '';
  }
  function barPath(x, y, w, h, r) { r = Math.min(r, h, w / 2); return 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h) + 'Z'; }
  function statsHtml() {
    const N = 14, t = today();
    const days = Array.from({ length: N }, (_, i) => addDays(t, i - N + 1));
    if (!S.statDay || !days.includes(S.statDay)) S.statDay = [...days].reverse().find((d) => minutesOn(d) > 0) || t;
    const mins = days.map(minutesOn), goal = D.settings.dailyMinutes;
    const max = Math.max(goal, ...mins, 5);
    const W = 340, H = 150, top = 18, base = 118, colW = W / N, bw = 14;
    const y = (m) => base - (m / max) * (base - top);
    let svg = '<svg class="statchart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Lernminuten der letzten 14 Tage">';
    svg += '<line x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '" class="st-axis"/>';
    svg += '<line x1="0" x2="' + W + '" y1="' + y(goal).toFixed(1) + '" y2="' + y(goal).toFixed(1) + '" class="st-goal"/><text x="2" y="' + (y(goal) - 4).toFixed(1) + '" class="st-goaltxt" text-anchor="start">Ziel ' + goal + ' Min.</text>';
    days.forEach((d, i) => {
      const x = i * colW + (colW - bw) / 2, m = mins[i], sel = d === S.statDay;
      if (m > 0) svg += '<path d="' + barPath(x, y(m), bw, base - y(m), 4) + '" class="st-bar' + (sel ? ' sel' : '') + '"/>';
      if (sel && m > 0) svg += '<text x="' + (x + bw / 2) + '" y="' + (y(m) - 5).toFixed(1) + '" class="st-val" text-anchor="middle">' + m + '</text>';
      svg += '<text x="' + (x + bw / 2) + '" y="' + (base + 15) + '" class="st-lbl' + (sel ? ' sel' : '') + '" text-anchor="middle">' + WD[wdOf(d)] + '</text><text x="' + (x + bw / 2) + '" y="' + (base + 29) + '" class="st-lbl" text-anchor="middle">' + Number(d.slice(8)) + '.</text>';
      svg += '<rect x="' + (i * colW) + '" y="0" width="' + colW + '" height="' + H + '" class="st-hit" data-act="statday" data-day="' + d + '"><title>' + WD[wdOf(d)] + ' ' + fmtDate(d).slice(0, 6) + ': ' + m + ' Min.</title></rect>';
    });
    svg += '</svg>';
    const total = mins.reduce((a, b) => a + b, 0), active = mins.filter((m) => m > 0).length;
    let h = '<div class="card"><h3 style="margin-top:0">' + ic('book') + 'Lernzeit der letzten 14 Tage</h3><p class="small" style="margin-top:0">' + total + ' Min. an ' + active + ' Tagen · Tippen Sie auf einen Tag für Details.</p>' + svg + '</div>';
    h += dayDetailHtml(S.statDay) + summaryCardHtml();
    return h;
  }
  function evStats(ev) {
    const first = ev.filter((e) => e.p === 1);
    const de = first.filter((e) => e.d === 'de'), en = first.filter((e) => e.d === 'en');
    return { de: de.length, deOk: de.filter((e) => e.ok).length, en: en.length, enOk: en.filter((e) => e.ok).length, wrong: first.filter((e) => !e.ok), right: first.filter((e) => e.ok), up: de.filter((e) => e.up).length };
  }
  const evLine = (e) => '<li><span class="grow">' + (e.d === 'de' ? '<span class="de">' + esc(e.de) + ' →</span> <span class="en">' + esc(e.en) + '</span>' : '<span class="en">' + esc(e.en) + '</span> <span class="de">→ ' + esc(e.de) + '</span>') +
    (!e.ok ? '<br><span class="small">Emma: „' + esc(e.a || '– weiß ich nicht –') + '“</span>' : '') + '</span><span class="pill">' + (e.d === 'de' ? 'DE→EN' : 'EN→DE') + '</span></li>';
  function dayDetailHtml(ds) {
    const ss = sessionsOn(ds), m = minutesOn(ds);
    let h = '<div class="card"><h3 style="margin-top:0">' + WDL[wdOf(ds)] + ', ' + fmtDate(ds) + '</h3>';
    if (!ss.length) return h + '<p class="muted">' + (m ? m + ' Min. gelernt (Einzelheiten werden erst ab Version 1.9 aufgezeichnet).' : 'An diesem Tag wurde nicht gelernt.') + '</p></div>';
    const all = ss.flatMap((x) => x.ev), st = evStats(all);
    h += '<p style="margin-top:0"><b>' + m + ' Min.</b> in ' + ss.length + (ss.length === 1 ? ' Runde' : ' Runden') + ' · Deutsch → Englisch: <b>' + st.deOk + ' von ' + st.de + '</b> richtig' + (st.en ? ' · Englisch → Deutsch: <b>' + st.enOk + ' von ' + st.en + '</b>' : '') + (st.up ? ' · ' + st.up + ' Wörter ein Fach weiter' : '') + '</p>';
    h += ss.map((x) => {
      const e = evStats(x.ev);
      return '<details class="sess"><summary><span class="grow"><b>' + hm(x.start) + '–' + hm(x.end) + ' Uhr</b> · ' + Math.max(1, Math.round(x.ms / 60000)) + ' Min. · ' + esc(MODE_NAME[x.mode] || x.mode) + '</span><span class="pill ' + (e.wrong.length ? 'warn' : 'good') + '">' + e.right.length + ' ✓ · ' + e.wrong.length + ' ✗</span></summary>' +
        (e.wrong.length ? '<p class="small" style="margin-bottom:0"><b>Fehler</b></p><ul class="list">' + e.wrong.map(evLine).join('') + '</ul>' : '<p class="small">Keine Fehler. ' + ic('star') + '</p>') +
        (e.right.length ? '<p class="small" style="margin-bottom:0"><b>Richtig</b></p><ul class="list">' + e.right.map(evLine).join('') + '</ul>' : '') + '</details>';
    }).join('');
    return h + '</div>';
  }
  // Wochenzusammenfassung als Text (regelbasiert, ohne KI)
  function weekSummary() {
    const t = today(), days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
    const ss = (D.sessions || []).filter((x) => days.includes(dayOf(x.start)));
    const mins = days.reduce((a, d) => a + minutesOn(d), 0), act = days.filter((d) => minutesOn(d) > 0);
    const st = evStats(ss.flatMap((x) => x.ev));
    const name = D.settings.nickname || 'Emma';
    const lines = ['Teacup – Wochenbericht ' + fmtDate(days[0]) + ' bis ' + fmtDate(t), ''];
    lines.push('Lernzeit: ' + mins + ' Min. an ' + act.length + ' von 7 Tagen' + (act.length ? ' (Ø ' + Math.round(mins / act.length) + ' Min. pro Lerntag, Tagesziel ' + D.settings.dailyMinutes + ' Min.)' : '') + '.');
    if (act.length) lines.push('Gelernt am: ' + act.map((d) => WD[wdOf(d)] + ' ' + minutesOn(d) + ' Min.').join(', ') + '.');
    if (st.de) lines.push('Deutsch → Englisch (schriftlich): ' + st.deOk + ' von ' + st.de + ' beim ersten Versuch richtig (' + Math.round((st.deOk / st.de) * 100) + ' %).');
    if (st.en) lines.push('Englisch → Deutsch: ' + st.enOk + ' von ' + st.en + ' richtig (' + Math.round((st.enOk / st.en) * 100) + ' %).');
    if (st.up) lines.push(st.up + ' Wörter sind ein Fach weiter gekommen.');
    const cnt = {}; st.wrong.forEach((e) => { const k = e.en; cnt[k] = cnt[k] || { n: 0, a: [] }; cnt[k].n++; if (e.a && !cnt[k].a.includes(e.a)) cnt[k].a.push(e.a); });
    const top = Object.entries(cnt).sort((a, b) => b[1].n - a[1].n).slice(0, 5);
    if (top.length) lines.push('', 'Häufigste Fehler:', ...top.map(([en, c]) => '- ' + en + ' (' + c.n + '×' + (c.a.length ? ', geschrieben: ' + c.a.slice(0, 2).join(' / ') : '') + ')'));
    const weak = weakCats().slice(0, 3);
    if (weak.length) lines.push('', 'Schwerpunkte zum Üben: ' + weak.map((w) => w.cat.label).join(', ') + '.');
    const c = boxCounts(true);
    lines.push('', 'Lernkartei jetzt: Fach 1: ' + c[1] + ', Fach 2: ' + c[2] + ', Fach 3: ' + c[3] + ', Fach 4: ' + c[4] + ', Fach 5: ' + c[5] + ', sitzt: ' + c[6] + '.');
    if (!ss.length && !mins) lines.push('', 'In dieser Woche wurde noch nicht gelernt.');
    else if (st.de && st.deOk / st.de >= 0.85) lines.push('', 'Fazit: ' + name + ' ist sehr sicher – weiter so.');
    else if (st.de && st.deOk / st.de >= 0.6) lines.push('', 'Fazit: Gute Woche. Die Fehlerwörter oben lohnen eine kurze Extra-Übung.');
    else if (st.de) lines.push('', 'Fazit: Noch einige Unsicherheiten. Kürzer, dafür täglich üben hilft am meisten.');
    return lines.join('\n');
  }
  function summaryCardHtml() {
    return '<div class="card"><h3 style="margin-top:0">' + ic('file') + 'Wochenzusammenfassung</h3>' +
      (S.showSummary ? '<pre class="summary">' + esc(weekSummary()) + '</pre><div class="row"><button class="btn secondary" data-act="copysummary">' + ic('clip') + 'Kopieren</button>' + (navigator.share ? '<button class="btn secondary" data-act="sharesummary">' + ic('share') + 'Teilen …</button>' : '') + '</div>'
        : '<p class="small" style="margin-top:0">Lernzeit, Trefferquote, häufigste Fehler und Schwerpunkte der letzten 7 Tage.</p><button class="btn" data-act="showsummary">Zusammenfassung anzeigen</button>') + '</div>';
  }

  // ---------- Auswertung ----------
  const pct = (r) => (r === null ? '–' : Math.round(r * 100) + ' %');
  function analysisHtml() {
    const weak = weakCats();
    let h = '<div class="card soft"><p style="margin-top:0"><b>So funktioniert es:</b> Die App merkt sich bei jedem Fehler, an welcher Stelle im Wort er passiert ist (z. B. beim „th“ oder bei der Großschreibung), und beim Nachsprechen, welche Laute nicht verstanden wurden. Fällt ein Bereich auf (ab 3 Versuchen, mindestens jede dritte Antwort falsch), wird er zum <b>Schwerpunkt</b>:</p>' +
      '<ul><li>Bis zu 5 passende Wörter kommen zusätzlich in jede Lernrunde.</li><li>Auf Emmas Startseite erscheint eine kurze Schwerpunkt-Übung.</li><li>Bei passenden Wörtern zeigt die App den Tipp dazu.</li></ul><p class="small">Neuere Ergebnisse zählen mehr. Wird Emma besser, verschwindet der Schwerpunkt von selbst. Auch Schwerpunkt-Übungen zählen für die Lernkartei (höchstens ein Fach pro Wort und Tag).</p></div>';
    h += '<div class="card"><h3 style="margin-top:0">Aktuelle Schwerpunkte</h3>' + (weak.length ? '<ul class="list">' + weak.map((w) => {
      const ex = [].concat((D.skills[w.cat.id + ':write'] || {}).ex || [], (D.skills[w.cat.id + ':say'] || {}).ex || []).slice(0, 3);
      return '<li><span class="grow"><span class="en">' + esc(w.cat.label) + '</span> ' + (w.manual ? '<span class="pill">von Ihnen gesetzt</span>' : '<span class="pill warn">automatisch erkannt</span>') +
        (ex.length ? '<br><span class="de">Beispiele: ' + ex.map((e) => esc(e.en) + (e.answer ? ' → „' + esc(e.answer) + '“' : '')).join(' · ') + '</span>' : '') + '</span></li>';
    }).join('') + '</ul>' : '<p class="muted">Zurzeit keine. Es braucht ein paar Lernrunden, bis Muster erkennbar sind.</p>') + '</div>';
    h += '<div class="card"><h3 style="margin-top:0">Alle Bereiche</h3><p class="small">Fehlerquote beim Schreiben und Aussprechen. „Immer üben“ setzt einen Schwerpunkt auch ohne Auswertung (z. B. wenn die Lehrerin etwas angemerkt hat).</p><ul class="list">' +
      allCats().map((c) => {
        const w = skillRate(c.id + ':write'), sy = skillRate(c.id + ':say'), mode = (D.focusMode || {})[c.id] || 'auto';
        const n = ((D.skills[c.id + ':write'] || {}).n || 0) + ((D.skills[c.id + ':say'] || {}).n || 0);
        const bad = (w !== null && w >= WEAK) || (sy !== null && sy >= WEAK);
        return '<li><span class="grow"><span class="en">' + esc(c.label) + '</span><br><span class="de">Schreiben ' + pct(w) + (c.say ? ' · Aussprechen ' + pct(sy) : '') + ' · ' + n + ' Versuche</span> ' + (bad ? '<span class="pill bad">auffällig</span>' : '') + '</span>' +
          '<select data-change="focusmode" data-id="' + esc(c.id) + '" style="width:auto;min-height:44px"><option value="auto"' + (mode === 'auto' ? ' selected' : '') + '>Automatisch</option><option value="on"' + (mode === 'on' ? ' selected' : '') + '>Immer üben</option><option value="off"' + (mode === 'off' ? ' selected' : '') + '>Nicht üben</option></select>' +
          (c.custom ? '<button class="iconbtn" data-act="delcat" data-id="' + esc(c.id) + '" aria-label="Entfernen">' + ic('trash') + '</button>' : '') + '</li>';
      }).join('') + '</ul>' +
      '<h3>Eigenen Schwerpunkt hinzufügen</h3><p class="small">Buchstaben oder Wörter, z. B. „I am“, „ch“ oder „-ing“. Die App übt dann alle Vokabeln, in denen das vorkommt.</p>' +
      '<div class="row"><input type="text" id="newcat" placeholder="z. B. I am" style="flex:2 1 160px"><button class="btn secondary" data-act="addcat">+ Hinzufügen</button></div>' +
      '<label for="newcattip">Tipp für Emma (optional)</label><input type="text" id="newcattip" placeholder="z. B. I am = ich bin, immer mit großem I"></div>';
    const top = D.vocab.filter((v) => prog(v.id).wrong > 0).sort((a, b) => prog(b.id).wrong - prog(a.id).wrong || prog(a.id).right - prog(b.id).right).slice(0, 10);
    h += '<div class="card"><h3 style="margin-top:0">Problemwörter (Top 10)</h3>' + (top.length ? '<ul class="list">' + top.map((v) => '<li><span class="grow"><span class="en">' + esc(v.en) + '</span> <span class="de">' + esc(deText(v)) + '</span></span><span class="pill bad">' + prog(v.id).wrong + '× falsch</span><span class="pill">' + BOX_NAME[prog(v.id).box] + '</span></li>').join('') + '</ul>' : '<p class="muted">Noch keine.</p>') + '</div>';
    return h;
  }

  // ---------- Einstellungen ----------
  function settingsHtml() {
    const s = D.settings, gb = gbVoice();
    return '<div class="card"><label for="s-nick">Spitzname (wird auf der Startseite angezeigt)</label><input type="text" id="s-nick" value="' + esc(s.nickname) + '" data-change="nick" maxlength="20">' +
      '<label for="s-round">Wörter pro Runde</label><select id="s-round" data-change="roundsize">' + [5, 10, 15, 20].map((n) => '<option value="' + n + '"' + (Number(s.roundSize) === n ? ' selected' : '') + '>' + n + ' Wörter</option>').join('') + '</select>' +
      '<p class="small">Jede Runde hat zwei Teile: erst Deutsch → Englisch, dann dieselben Wörter Englisch → Deutsch.</p>' +
      '<label for="s-say">Nachsprechen</label><select id="s-say" data-change="saymode">' + [['immer', 'bei jedem Wort'], ['haeufig', 'häufig: neue, falsche und jedes zweite Wort (empfohlen)'], ['neu', 'nur bei neuen Wörtern']].map(([k, l]) => '<option value="' + k + '"' + ((s.sayMode || 'haeufig') === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' +
      '<label for="s-min">Tagesziel</label><select id="s-min" data-change="minutes">' + [10, 12, 15, 20].map((m) => '<option value="' + m + '"' + (s.dailyMinutes === m ? ' selected' : '') + '>' + m + ' Minuten</option>').join('') + '</select>' +
      '<label class="check"><input type="checkbox" data-change="toopt" ' + (s.toOptional ? 'checked' : '') + '> Bei Verben ist „to“ freiwillig (z. B. „write“ statt „to write“ gilt als richtig)</label>' +
      '<label class="check"><input type="checkbox" data-change="paperallowed" ' + (s.paperAllowed ? 'checked' : '') + '> Papier-Variante anbieten (Emma schreibt auf Papier und bewertet selbst)</label>' +
      '<label class="check"><input type="checkbox" data-change="autoapprove" ' + (s.autoApprove ? 'checked' : '') + '> Neue Beispielsätze und Aussprachetipps sofort aktiv (Durchsehen unter „Prüfen“)</label>' +
      '<label class="check"><input type="checkbox" data-change="sound" ' + (s.sound ? 'checked' : '') + '> Töne bei richtig und falsch</label>' +
      '<label for="s-theme">Darstellung</label><select id="s-theme" data-change="theme"><option value="auto"' + (s.theme === 'auto' ? ' selected' : '') + '>Automatisch (wie das Gerät)</option><option value="light"' + (s.theme === 'light' ? ' selected' : '') + '>Hell</option><option value="dark"' + (s.theme === 'dark' ? ' selected' : '') + '>Dunkel</option></select></div>' +
      '<div class="card"><h3 style="margin-top:0">Spracherkennung</h3>' + (SR ? '' : '<p class="pill bad">Dieser Browser hat keine Spracherkennung. Bitte Chrome verwenden.</p>') +
      '<p class="small">Datenschutz-Hinweis: Die Spracherkennung von Chrome schickt die Sprachaufnahme zur Auswertung an Google. Dafür braucht es Internet. Die App selbst speichert keine Aufnahmen. Ist die Erkennung aus, spricht Emma laut und bewertet sich selbst.</p>' +
      (s.speech ? '<p><span class="pill good">eingeschaltet</span></p><button class="btn secondary" data-act="speechoff">Ausschalten</button> <button class="btn secondary" data-act="mictest">Mikrofon testen</button>'
        : '<button class="btn" data-act="speechon"' + (SR ? '' : ' disabled') + '>Hinweis gelesen, einschalten</button>') + '<p id="mictest" class="small"></p></div>' +
      voiceHtml() +
      '<div class="card"><h3 style="margin-top:0">' + ic('flag') + 'PIN vergessen? Notfall-Code</h3><p class="small" style="margin-top:0">' + (D.recovery ? 'Eingerichtet am ' + fmtDate(D.recoveryAt) + '. Der Code steht in Ihrer E-Mail „Teacup – Notfall-Code“.' : 'Noch nicht eingerichtet.') + '</p>' +
      '<label for="s-mail">E-Mail-Adresse der Eltern</label><input type="text" id="s-mail" inputmode="email" value="' + esc(D.settings.parentEmail || '') + '" placeholder="name@beispiel.de" data-change="parentemail">' +
      '<button class="btn secondary" data-act="setuprecovery" style="margin-top:10px">' + (D.recovery ? 'Neuen Notfall-Code erzeugen und senden' : 'Notfall-Code einrichten') + '</button><p class="small">Ein neuer Code macht den alten ungültig.</p></div>' +
      '<div class="card"><button class="btn secondary" data-act="changepin">PIN ändern</button>' + (installEvt ? ' <button class="btn secondary" data-act="install">App installieren</button>' : '') + '<p class="small">Teacup Version ' + APP_VERSION + ' · Alle Daten bleiben auf diesem Gerät.</p></div>';
  }

  function voiceHtml() {
    const gb = gbVoices(), cur = gbVoice();
    let h = '<div class="card"><h3 style="margin-top:0">' + ic('speaker') + 'Stimme zum Vorsprechen</h3>';
    if (!gb.length) h += '<p>Noch keine britische Stimme gefunden. Android: Einstellungen → System → Sprachen → Sprachausgabe (Text-in-Sprache) → Google → Zahnrad → „Sprachdaten installieren“ → „Englisch (Vereinigtes Königreich)“.</p>';
    else {
      h += '<p class="small">Britische Stimmen auf diesem Gerät. Mit ▶ probehören, mit „Wählen“ festlegen.</p><ul class="list">' + gb.map((v) =>
        '<li><span class="grow"><span class="en">' + esc(v.name) + '</span>' + (isFemale(v) ? ' <span class="pill warn">weiblich</span>' : '') + (cur && cur.name === v.name ? ' <span class="pill good">aktiv</span>' : '') + '</span>' +
        '<button class="iconbtn" data-act="tryvoice" data-name="' + esc(v.name) + '" aria-label="Probehören">' + ic('speaker') + '</button>' +
        (cur && cur.name === v.name ? '' : '<button class="btn small secondary" data-act="pickvoice" data-name="' + esc(v.name) + '">Wählen</button>') + '</li>').join('') + '</ul>';
      if (gb.length === 1 || !gb.some(isFemale)) h += '<div class="tip">' + ic('bulb') + '<span>Auf Android-Handys zeigt Chrome meist nur <b>eine</b> britische Stimme. Ob sie weiblich ist, stellen Sie im Handy ein: Einstellungen → System → Sprachen → Sprachausgabe → Google → Zahnrad → Sprache „Englisch (Vereinigtes Königreich)“ → eine weibliche Stimme wählen. Dort auch „Nur WLAN“/„Hohe Qualität“ wählen: Das klingt deutlich klarer.</span></div>';
    }
    h += '<label for="s-slow">Tempo bei „Langsam“</label><select id="s-slow" data-change="slowspeed">' + Object.keys(SLOW_RATES).map((k) => '<option' + (D.settings.slowSpeed === k ? ' selected' : '') + '>' + k + '</option>').join('') + '</select>' +
      '<p class="small">Bei Sätzen spricht „Langsam“ zusätzlich Wort für Wort mit kleinen Pausen.</p>' +
      '<label for="s-normal">Normales Tempo</label><select id="s-normal" data-change="normalrate">' + [[1, 'normal'], [0.85, 'etwas ruhiger (empfohlen)'], [0.75, 'ruhig']].map(([r, l]) => '<option value="' + r + '"' + (Number(D.settings.normalRate) === r ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' +
      '<div class="row" style="margin-top:12px"><button class="btn secondary" data-act="say" data-text="Hello! What\'s your name?">' + ic('speaker') + 'Normal testen</button><button class="btn secondary" data-act="sayslow" data-text="Hello! What\'s your name?">' + ic('snail') + 'Langsam testen</button></div></div>';
    return h;
  }

  // ---------- Sicherung ----------
  function betaHtml() {
    if (!BETA) return '';
    const live = localStorage.getItem(LIVE_KEY);
    return '<div class="card warn"><h3 style="margin-top:0">Testversion</h3><p class="small" style="margin-top:0">Diese Testversion hat einen eigenen Speicher. Beim ersten Öffnen wurde eine Kopie der Daten aus der normalen Teacup-App auf diesem Gerät übernommen. Die normale App wird nie verändert.</p>' +
      (live ? '<button class="btn secondary" data-act="betareload">Daten der normalen App neu übernehmen</button><p class="small">Ersetzt den Stand der Testversion durch den aktuellen Stand der normalen App.</p>' : '<p class="small">Auf diesem Gerät gibt es keine normale Teacup-App mit Daten.</p>') + '</div>';
  }
  function backupHtml() {
    const share = (kind, label) => '<div class="row"><button class="btn" data-act="sendfile" data-kind="' + kind + '">' + ic('share') + label + '</button><button class="btn secondary" data-act="savefile" data-kind="' + kind + '">' + ic('download') + 'Herunterladen</button></div>';
    let h = betaHtml() + '<div class="card soft"><p style="margin:0"><b>Zwei Geräte, ein Stand:</b> Vokabeln pflegen Sie auf Ihrem Handy und senden sie an Emmas Gerät. Emmas Lernstand senden Sie von ihrem Gerät an Ihr Handy, um dort Auswertung und Statistik zu sehen. Übertragen wird per Datei (z. B. WhatsApp, E-Mail, Drive, Quick Share).</p></div>' +
      '<div class="card"><h3 style="margin-top:0">' + ic('book') + '1. Vokabeln an Emmas Gerät senden</h3><p class="small" style="margin-top:0">Nur Units und Vokabeln (inkl. Beispielsätze, Tipps, Markierung „neu“). Auf Emmas Gerät werden neue Wörter ergänzt und geänderte aktualisiert. <b>Ihr Lernstand bleibt erhalten.</b></p>' + share('vokabeln', 'Vokabeln senden …') + '</div>' +
      '<div class="card"><h3 style="margin-top:0">' + ic('star') + '2. Lernstand an Eltern senden</h3><p class="small" style="margin-top:0">Auf <b>Emmas Gerät</b> antippen. Auf Ihrem Handy sehen Sie danach Auswertung und Statistik. Ihre Vokabeln dort bleiben erhalten.</p>' + share('lernstand', 'Lernstand senden …') + '</div>' +
      '<div class="card"><h3 style="margin-top:0">' + ic('file') + '3. Empfangene Datei einspielen</h3><p class="small" style="margin-top:0">Die App erkennt selbst, ob es Vokabeln, ein Lernstand oder eine komplette Sicherung ist, und zeigt vorher an, was passiert.</p>' +
      '<label class="btn secondary" style="margin:0">' + ic('file') + 'Datei auswählen<input type="file" id="bfile" data-change="bfile" accept=".json,application/json,application/octet-stream,text/plain" hidden></label>' + incomingHtml() + '</div>';
    h += '<div class="card"><h3 style="margin-top:0">Komplette Sicherung</h3><p>Letzte Sicherung: <b>' + (D.lastBackupAt ? fmtDate(D.lastBackupAt) : 'noch keine') + '</b></p>' +
      '<p class="small">Die Datei enthält alle Vokabeln, den Lernstand und die Einstellungen. Bitte einmal im Monat sichern und die Datei z. B. per E-Mail an sich selbst schicken oder in Google Drive ablegen.</p>' +
      '<div class="row"><button class="btn" data-act="export">' + ic('download') + 'Sicherung herunterladen</button>' + (navigator.canShare ? '<button class="btn secondary" data-act="share">' + ic('share') + 'Teilen …</button>' : '') + '</div><p class="small">Eine komplette Sicherung spielen Sie ebenfalls über „3. Empfangene Datei einspielen“ ein. Sie ersetzt dann alles auf dem Gerät.</p></div>' +
      '<div class="card"><h3 style="margin-top:0">Lernstand zurücksetzen</h3><p class="small" style="margin-top:0">Für einen Neustart, z. B. nach dem Ausprobieren. Gelöscht werden auf <b>diesem Gerät</b>: Lernkartei-Fächer, Statistik, Lernzeiten, Fehler, Lernpfad, Sterne, Begleiter, Album und Shop. <b>Erhalten bleiben</b> alle Vokabeln, Units, Testtermine, Einstellungen und die PIN.</p>' +
      '<button class="btn secondary" data-act="resetprogress">Lernstand auf diesem Gerät zurücksetzen</button></div>';
    return h;
  }
  function backupBlob() {
    const payload = { app: 'teacup', kind: 'sicherung', version: APP_VERSION, schema: SCHEMA, exportedAt: new Date().toISOString(), data: D };
    return new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
  }
  const backupName = () => 'teacup-sicherung-' + today() + '.json';
  function markBackup() { D.lastBackupAt = new Date().toISOString(); save(); rerender(); }
  function doExport() {
    const url = URL.createObjectURL(backupBlob());
    const a = document.createElement('a'); a.href = url; a.download = backupName(); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    markBackup(); toast('Sicherung gespeichert (Ordner „Downloads“).');
  }
  async function doShare() {
    const file = new File([backupBlob()], backupName(), { type: 'application/json' });
    if (!navigator.canShare({ files: [file] })) return doExport();
    try { await navigator.share({ files: [file], title: 'Teacup-Sicherung' }); markBackup(); } catch (e) { /* abgebrochen */ }
  }
  function readBackup(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const o = JSON.parse(fr.result);
        const ok = o.app === 'teacup' && ((o.kind === 'sicherung' && o.data && Array.isArray(o.data.vocab)) || (o.kind === 'vokabeln' && Array.isArray(o.vocab)) || (o.kind === 'lernstand' && o.progress));
        if (!ok) throw new Error('format');
        S.backupFile = o; rerender();
      } catch (e) { S.backupFile = null; toast('Das ist keine gültige Teacup-Datei.'); }
    };
    fr.readAsText(file);
  }
  // ---------- Übertragen zwischen Geräten ----------
  function packVokabeln() { return { app: 'teacup', kind: 'vokabeln', version: APP_VERSION, exportedAt: new Date().toISOString(), books: D.books, units: D.units, vocab: D.vocab, customCats: D.customCats || [], tests: tests() }; }
  function packLernstand() { return { app: 'teacup', kind: 'lernstand', version: APP_VERSION, exportedAt: new Date().toISOString(), books: D.books, units: D.units, vocab: D.vocab, progress: D.progress, stats: D.stats, sessions: D.sessions || [], skills: D.skills, reports: D.reports, newByDay: D.newByDay, allCycle: D.allCycle || [], game: D.game || {}, path: D.path || {}, bossWon: D.bossWon || {}, tests: tests() }; }
  const FILE_NAMES = { vokabeln: 'teacup-vokabeln-', lernstand: 'teacup-lernstand-' };
  async function sendPack(kind, download) {
    const obj = kind === 'vokabeln' ? packVokabeln() : packLernstand();
    const name = FILE_NAMES[kind] + today() + '.json';
    const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
    if (!download && navigator.canShare) {
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Teacup' }); } catch (e) { /* abgebrochen */ } return; }
    }
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000); toast('Gespeichert (Ordner „Downloads“).');
  }
  // Vokabeln zusammenführen: neue ergänzen, geänderte aktualisieren, Lernstand nie anfassen
  function mergeVokabeln(pkg, dry) {
    const res = { added: 0, updated: 0, same: 0, units: 0 };
    const T = dry ? JSON.parse(JSON.stringify({ books: D.books, units: D.units, vocab: D.vocab })) : D;
    const bookName = {}; (pkg.books || []).forEach((b) => { bookName[b.id] = b.name; });
    const unitMap = {};
    (pkg.units || []).forEach((pu) => {
      const bn = bookName[pu.bookId] || 'Green Line 1';
      let b = T.books.find((x) => x.name.toLowerCase() === bn.toLowerCase());
      if (!b) { b = { id: T.books.some((x) => x.id === pu.bookId) ? uid() : pu.bookId, name: bn }; T.books.push(b); }
      let u = T.units.find((x) => x.id === pu.id) || T.units.find((x) => x.bookId === b.id && x.name.toLowerCase() === pu.name.toLowerCase());
      if (!u) { u = { id: T.units.some((x) => x.id === pu.id) ? uid() : pu.id, bookId: b.id, name: pu.name, status: pu.status, order: pu.order }; T.units.push(u); res.units++; }
      else { u.name = pu.name; u.status = pu.status; }
      unitMap[pu.id] = u.id;
    });
    const FIELDS = ['page', 'en', 'de', 'pos', 'note', 'exEn', 'exDe', 'tip', 'tipAuto', 'checked', 'altEn', 'reviewNew'];
    (pkg.vocab || []).forEach((pv) => {
      const unitId = unitMap[pv.unitId]; if (!unitId) return;
      let v = T.vocab.find((x) => x.id === pv.id) || T.vocab.find((x) => x.unitId === unitId && cmpEn(x.en).toLowerCase() === cmpEn(pv.en).toLowerCase());
      if (!v) { const nv = JSON.parse(JSON.stringify(pv)); nv.unitId = unitId; if (T.vocab.some((x) => x.id === nv.id)) nv.id = uid(); T.vocab.push(nv); res.added++; return; }
      const before = JSON.stringify([v.unitId, ...FIELDS.map((f) => v[f]), v.homework]);
      v.unitId = unitId; FIELDS.forEach((f) => { if (pv[f] !== undefined) v[f] = JSON.parse(JSON.stringify(pv[f])); });
      const p = D.progress[v.id];
      v.homework = !!pv.homework && !(p && p.seen && p.box >= 3);
      if (before !== JSON.stringify([v.unitId, ...FIELDS.map((f) => v[f]), v.homework])) res.updated++; else res.same++;
    });
    if (!dry && pkg.tests) {
      // Testtermine von den Eltern übernehmen (Fortschritt im Test-Turbo bleibt)
      const old = tests();
      D.tests = pkg.tests.map((pt) => { const o = old.find((x) => x.id === pt.id) || {}; return Object.assign({}, pt, { unitIds: (pt.unitIds || []).map((id) => unitMap[id] || id), cycle: o.cycle || [], cycleDay: o.cycleDay || '', probe: o.probe || pt.probe }); });
    }
    if (!dry) {
      (pkg.customCats || []).forEach((c) => { if (!(D.customCats || []).some((x) => x.text === c.text)) { D.customCats.push(c); D.focusMode[c.id] = 'on'; } });
      save();
    }
    return res;
  }
  // Lernstand von Emmas Gerät übernehmen: Fortschritt, Zeiten, Fehler; eigene Vokabeln bleiben
  function applyLernstand(pkg) {
    const added = mergeVokabeln({ books: pkg.books, units: pkg.units, vocab: (pkg.vocab || []).filter((pv) => !D.vocab.some((x) => x.id === pv.id)) }, false).added;
    D.progress = pkg.progress || {}; D.stats = Object.assign({ days: {} }, pkg.stats || {}); D.sessions = pkg.sessions || [];
    D.skills = pkg.skills || {}; D.reports = pkg.reports || []; D.newByDay = pkg.newByDay || {}; D.allCycle = pkg.allCycle || [];
    if (pkg.game) D.game = pkg.game; if (pkg.path) D.path = pkg.path; if (pkg.bossWon) D.bossWon = pkg.bossWon;
    D.reportFrom = pkg.exportedAt; save();
    return added;
  }
  function incomingHtml() {
    const f = S.backupFile; if (!f) return '';
    const when = fmtDate(f.exportedAt) + ', ' + hm(f.exportedAt) + ' Uhr';
    if (f.kind === 'vokabeln') {
      const r = mergeVokabeln(f, true);
      return '<div class="card soft"><p><b>Vokabeln</b> vom ' + when + ': ' + f.vocab.length + ' Wörter.<br>Auf diesem Gerät: <b>' + r.added + '</b> neu · <b>' + r.updated + '</b> geändert · ' + r.same + ' unverändert' + (r.units ? ' · ' + r.units + ' neue Units' : '') + '.</p><p class="small">Der Lernstand auf diesem Gerät bleibt vollständig erhalten.</p>' +
        '<button class="btn good" data-act="applyvok">Vokabeln übernehmen</button> <button class="btn secondary" data-act="cancelrestore">Abbrechen</button></div>';
    }
    if (f.kind === 'lernstand') {
      const ss = f.sessions || [], last = ss.length ? ss[ss.length - 1].end : null;
      return '<div class="card soft"><p><b>Lernstand von Emmas Gerät</b> vom ' + when + ': ' + Object.values(f.progress).filter((p) => p.seen).length + ' gelernte Wörter, ' + ss.length + ' Lernrunden' + (last ? ', zuletzt gelernt am ' + fmtDate(last) + ' um ' + hm(last) + ' Uhr' : '') + '.</p><p class="small">Ersetzt auf diesem Gerät nur Lernstand, Lernzeiten und Auswertung. Ihre Vokabeln bleiben; Wörter, die nur auf Emmas Gerät existieren, werden ergänzt.</p>' +
        '<button class="btn good" data-act="applyls">Lernstand übernehmen</button> <button class="btn secondary" data-act="cancelrestore">Abbrechen</button></div>';
    }
    const b = f.data;
    return '<div class="card warn"><p><b>Komplette Sicherung</b> vom ' + when + ': ' + b.vocab.length + ' Wörter in ' + b.units.length + ' Units, ' + Object.values(b.progress || {}).filter((p) => p.seen).length + ' schon gelernt.</p><p class="small"><b>Ersetzt alles</b> auf diesem Gerät, auch den Lernstand. Danach gilt die PIN aus der Sicherung.</p>' +
      '<button class="btn good" data-act="restore">Sicherung einspielen</button> <button class="btn secondary" data-act="cancelrestore">Abbrechen</button></div>';
  }
  function restore() {
    try { localStorage.setItem('teacup-data-vor-einspielen', JSON.stringify(D)); } catch (e) { /* */ }
    D = migrate(S.backupFile.data); D.lastBackupAt = D.lastBackupAt || S.backupFile.exportedAt;
    save(); applyTheme(); S.backupFile = null; S.tab = 'vocab'; S.unitId = null; S.bookId = D.books[0].id;
    toast('Sicherung eingespielt.'); render();
  }

  // ---------- Aktionen ----------
  const ACT = {
    parent: () => { S.view = 'parent'; render(); },
    home: () => { S.view = 'home'; S.R = null; render(); },
    leave: () => { S.unlocked = false; S.view = 'home'; S.editId = null; render(); },
    install: async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { /* */ } installEvt = null; render(); },
    start: () => startRound(false),
    extra: () => startRound(false, null, 'all'),
    forgotpin: () => { S.pinStep = 'recover'; render(); },
    cancelrecover: () => { S.pinStep = null; render(); },
    checkrecover: async () => {
      const val = normCode($('#rcode').value);
      if (val.length !== 12) { $('#pinmsg').textContent = 'Der Code hat 12 Zeichen (z. B. ABCD-EF23-GH45).'; return; }
      if ((await hashPin('notfall:' + val)) !== D.recovery) { $('#pinmsg').textContent = 'Dieser Code stimmt nicht.'; return; }
      S.pinStep = 'change'; S.pinFirst = ''; S.unlocked = false; render(); toast('Code richtig. Bitte neue PIN festlegen.');
    },
    setuprecovery: async () => { if ($('#s-mail')) D.settings.parentEmail = $('#s-mail').value.trim(); await makeRecovery(); S.pinStep = 'showcode'; render(); },
    recoverydone: () => { S.pinStep = null; S.recoveryCode = null; render(); },
    mailcode: () => {
      const mail = (($('#r-mail') || {}).value || D.settings.parentEmail || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return toast('Bitte zuerst eine gültige E-Mail-Adresse eintragen.');
      D.settings.parentEmail = mail; save();
      location.href = 'mailto:' + encodeURIComponent(mail).replace('%40', '@') + '?subject=' + encodeURIComponent('Teacup – Notfall-Code für die PIN') + '&body=' + encodeURIComponent(recoveryMailBody(S.recoveryCode));
    },
    copycode: async () => { try { await navigator.clipboard.writeText(recoveryMailBody(S.recoveryCode)); toast('Kopiert.'); } catch (e) { toast('Kopieren nicht möglich – bitte abschreiben.'); } },
    newtest: () => { S.testForm = { scope: 'units', unitIds: [] }; rerender(); },
    canceltest: () => { S.testForm = null; rerender(); },
    savetest: () => {
      const f = readTestForm();
      if (!f.date || f.date < today()) return toast('Bitte ein Datum ab heute wählen.');
      if (f.scope === 'units' && !(f.unitIds || []).length) return toast('Bitte mindestens eine Unit wählen.');
      D.tests = tests(); D.tests.push({ id: uid(), name: (f.name || 'Vokabeltest').trim(), date: f.date, scope: f.scope || 'units', unitIds: f.scope === 'units' ? f.unitIds : [], cycle: [], cycleDay: '' });
      S.testForm = null; save(); toast('Testtermin gespeichert.'); rerender();
    },
    deltest: (el) => { if (!confirm('Testtermin löschen?')) return; D.tests = tests().filter((x) => x.id !== el.dataset.id); save(); rerender(); },
    karteihelp: () => { S.karteiHelp = !S.karteiHelp; rerender(); },
    namepet: () => { const n = ($('#petname').value || '').trim(); if (!n) return; G().petName = n.slice(0, 16); save(); rerender(); toast('Hallo ' + n + '!'); },
    openchest: () => openChest(),
    opengames: () => { if (S.G && S.G.timer) clearInterval(S.G.timer); recReset(); S.G = null; S.view = 'games'; render(); },
    openshop: () => { S.view = 'shop'; render(); },
    openalbum: () => { S.cardOpen = null; S.view = 'album'; render(); },
    openbadges: () => { S.view = 'badges'; render(); },
    opencard: (el) => { S.cardOpen = el.dataset.id; render(); },
    closecard: () => { S.cardOpen = null; render(); },
    buy: (el) => { const it = SHOP.find((x) => x.id === el.dataset.id), g = G(); if (!it || g.owned.includes(it.id) || g.stars < it.price || !unlocked()) return; g.stars -= it.price; g.owned.push(it.id); g.equipped[it.slot] = it.id; save(); confetti(20); rerender(); },
    equip: (el) => { const it = SHOP.find((x) => x.id === el.dataset.id), g = G(); if (!it || !g.owned.includes(it.id)) return; g.equipped[it.slot] = g.equipped[it.slot] === it.id ? null : it.id; save(); rerender(); },
    startgame: (el) => { if (!unlocked()) return; if (S.G && S.G.timer) clearInterval(S.G.timer); startGame(el.dataset.id); },
    memflip: (el) => {
      const gm = S.G, i = Number(el.dataset.i); if (gm.open.length >= 2 || gm.open.includes(i)) return;
      gm.open.push(i); gm.flips++;
      if (gm.open.length === 2) {
        const [a, b] = gm.open.map((k) => gm.cards[k]);
        if (a.vid === b.vid) { gm.found.push(a.vid); gm.open = []; beep(true); if (gm.found.length * 2 === gm.cards.length) return finishGame(Math.max(1, 5 - Math.floor(Math.max(0, gm.flips - gm.cards.length) / 4))); }
        else setTimeout(() => { gm.open = []; if (S.G === gm) rerender(); }, 1100);
      }
      rerender();
    },
    gtile: (el) => { S.G.used.push(Number(el.dataset.i)); rerender(); },
    gundo: () => { S.G.used.pop(); rerender(); },
    gscramble: () => {
      const gm = S.G, v = vocabById(gm.words[gm.i]), built = gm.used.map((i) => gm.tiles.find((x) => x.i === i).x).join('');
      if (built === v.en) { gm.score++; gm.msg = 'Richtig: ' + v.en + '!'; beep(true); } else { gm.msg = 'Fast! Richtig ist: ' + v.en; beep(false); }
      gm.i++; gm.tiles = null; if (gm.i >= gm.words.length) return finishGame(gm.score); rerender();
    },
    gsnake: () => {
      const gm = S.G, val = ($('#gans').value || '').trim().toLowerCase(); if (!val) return;
      const last = vocabById(gm.chain[gm.chain.length - 1]), letter = last.en.slice(-1).toLowerCase();
      const hit = singleWords().find((v) => v.en.toLowerCase() === val && !gm.chain.includes(v.id));
      if (hit && hit.en[0].toLowerCase() === letter) { gm.chain.push(hit.id); gm.score++; gm.msg = ''; gm.hint = ''; beep(true); if (gm.score >= 5) return finishGame(5); }
      else { gm.msg = hit ? 'Das Wort beginnt nicht mit „' + letter.toUpperCase() + '“.' : 'Dieses Wort kenne ich nicht aus deinen Vokabeln.'; beep(false); }
      rerender();
    },
    gsnakehint: () => { const gm = S.G, last = vocabById(gm.chain[gm.chain.length - 1]), letter = last.en.slice(-1).toLowerCase(); const o = singleWords().find((v) => v.en[0].toLowerCase() === letter && !gm.chain.includes(v.id)); gm.hint = o ? deText(o) : ''; rerender(); },
    gsnakeend: () => finishGame(S.G.score),
    gspeed: () => {
      const gm = S.G; if (gm.done) return; const v = vocabById(gm.pool[gm.i % gm.pool.length]), val = ($('#gans').value || '').trim(); if (!val) return;
      if (gradeEn(val, v).ok) { gm.ok++; gm.msg = 'Richtig!'; beep(true); } else { gm.msg = 'Richtig wäre: ' + v.en; beep(false); }
      gm.i++; rerender();
    },
    gspeedskip: () => { const gm = S.G; gm.msg = 'Das war: ' + vocabById(gm.pool[gm.i % gm.pool.length]).en; gm.i++; rerender(); },
    gkey: (el) => {
      const gm = S.G, c = el.dataset.c, v = vocabById(gm.words[gm.i]), w = v.en.toLowerCase();
      gm.guess.push(c); gm.msg = '';
      if (!w.includes(c)) gm.miss++;
      const solved = w.split('').every((ch) => !/[a-z]/.test(ch) || gm.guess.includes(ch));
      if (solved || gm.miss >= 6) {
        if (solved) { gm.solved++; beep(true); } else beep(false);
        const msg = solved ? 'Geschafft: ' + v.en + '!' : 'Der Ballon ist leer – das Wort war ' + v.en + '.';
        gm.i++; gm.guess = []; gm.miss = 0;
        if (gm.i >= gm.words.length) return finishGame(Math.min(5, gm.solved + (gm.solved === gm.words.length ? 2 : 0)));
        gm.msg = msg;
      }
      rerender();
    },
    gtwister: () => { const gm = S.G; recReset(); gm.said++; gm.i++; if (gm.i >= gm.list.length) return finishGame(3); rerender(); },
    resetprogress: () => {
      if (!confirm('Lernstand auf diesem Gerät wirklich zurücksetzen? Die Vokabeln bleiben erhalten.')) return;
      const before = JSON.stringify(D);
      Object.assign(D, { progress: {}, stats: { days: {} }, sessions: [], skills: {}, reports: [], newByDay: {}, allCycle: [], game: {}, path: {}, bossWon: {} });
      save(); rerender();
      toast('Lernstand zurückgesetzt. Emma startet bei null.', 'Rückgängig', () => { D = migrate(JSON.parse(before)); save(); rerender(); toast('Wiederhergestellt.'); });
    },
    betareload: () => { if (!confirm('Stand der Testversion durch die Daten der normalen App ersetzen?')) return; const raw = localStorage.getItem(LIVE_KEY); if (!raw) return; localStorage.setItem(STORE_KEY, raw); D = load(); S.unlocked = false; S.view = 'home'; render(); toast('Daten der normalen App übernommen.'); },
    openpath: () => { recReset(); S.view = 'path'; render(); },
    pathunit: (el) => { S.pathUnit = el.dataset.id; render(); },
    startlesson: (el) => startLesson(S.pathUnit, Number(el.dataset.idx)),
    startboss: (el) => { S.bossUnit = el.dataset.id; startRound(false, null, 'boss'); },
    quitlesson: () => { lessonTick(); recReset(); if (S.L && !S.L.session.ev.length) D.sessions = D.sessions.filter((x) => x !== S.L.session); S.L = null; save(); S.view = 'path'; render(); toast('Lektion beendet. Du kannst jederzeit neu starten.'); },
    lpick: (el) => { const t = curL(); if (t.done) return; lessonAnswer(el.dataset.val === t.correct, el.dataset.val); },
    lpair: (el) => {
      const t = curL(); if (t.done) return;
      const side = el.dataset.side, id = el.dataset.id; t.flash = null;
      if (!t.sel || t.sel.side === side) { t.sel = { side, id }; return rerender(); }
      if (t.sel.id === id) { t.matched.push(id); t.sel = null; beep(true); if (t.matched.length === t.left.length) { t.done = true; t.ok = true; S.L.mistakes += Math.min(t.errs, 2); setTimeout(() => confetti(10), 60); save(); } }
      else { t.errs++; t.flash = { side, id }; t.sel = null; beep(false); }
      rerender();
    },
    ltile: (el) => { const t = curL(); if (t.done) return; t.used.push(Number(el.dataset.i)); rerender(); },
    lundo: () => { const t = curL(); t.used.pop(); rerender(); },
    lcheckletters: () => { const t = curL(), v = vocabById(t.vid); const built = t.used.map((i) => t.tiles.find((x) => x.i === i).x).join(v.en.includes(' ') ? ' ' : ''); lessonAnswer(built === v.en, built); },
    lcheckbuilder: () => { const t = curL(); const built = t.used.map((i) => t.tiles.find((x) => x.i === i).x).join(' '); lessonAnswer(cmpEn(built).toLowerCase() === cmpEn(t.correct).toLowerCase(), built); },
    lcheckwrite: () => {
      const t = curL(), v = vocabById(t.vid), el = $('#lans'); if (!el) return; const val = el.value; if (!val.trim()) return el.focus();
      if (t.type === 'gap') { const g = gapFor(v); const ok = cmpEn(val).toLowerCase() === cmpEn(g.answer).toLowerCase() || gradeEn(val, v).ok; return lessonAnswer(ok, val, { msg: ok ? '' : 'Noch nicht ganz. Richtig ist „' + g.answer + '“.' }); }
      const g = gradeEn(val, v); let diff = '';
      if (!g.ok && lev(cmpEn(val).toLowerCase(), g.target.toLowerCase()) <= Math.ceil(g.target.length / 2)) { const d = renderDiff(val, g.target); diff = '<p class="center small" style="margin-bottom:0">Deine Antwort</p><div class="diff">' + d.mine + '</div><div class="diff">' + d.sol + '</div>'; }
      const msg = g.ok ? (g.kind === 'longform' ? '✓ Richtig! Im Buch steht die Kurzform.' : '') : ({ near: 'Fast! Nur ein Buchstabe ist anders.', swap: 'Fast! Zwei Buchstaben sind vertauscht.', case: 'Fast! Achte auf die Großschreibung.' }[g.kind] || 'Noch nicht ganz.');
      lessonAnswer(g.ok, val, { grade: g, diff, msg });
    },
    ldontknow: () => lessonAnswer(false, '', { msg: 'Kein Problem, so lernst du es jetzt.' }),
    lmic: () => lessonMic(),
    lselfspeak: () => { S.L.ui.selfMode = true; rerender(); },
    lspoke: () => lessonAnswer(true, ''),
    lnext: () => lessonNext(),
    saysyl: (el) => speak(el.dataset.text, true),
    recstart: (el) => recStart(el.dataset.text),
    recstop: () => { if (recState && recState.mr && recState.mr.state === 'recording') recState.mr.stop(); },
    reccompare: () => recCompare(),
    startturbo: () => startRound(false, null, 'turbo'),
    startprobe: () => startRound(false, null, 'probe'),
    startfresh: () => startRound(false, null, 'fresh'),
    startall: () => startRound(false, null, 'all'),
    focus: (el) => startRound(false, el.dataset.id),
    quit: () => { tick(); closeSession(); save(); S.R = null; S.view = 'home'; render(); toast('Runde beendet. Dein Fortschritt ist gespeichert.'); },
    say: (el) => speak(el.dataset.text, false),
    sayslow: (el) => speak(el.dataset.text, true),
    check: () => {
      const T = curTask(), v = vocabById(T.vid), val = $('#ans').value;
      if (!val.trim()) { $('#ans').focus(); return; }
      const g = gradeEn(val, v); setWrite(g.ok, val, g); if (S.R.exam) return nextPhase(); T.phase = 'check'; T.ui = {}; tick(); render();
    },
    dontknow: () => { const T = curTask(), v = vocabById(T.vid); setWrite(false, '', { kind: 'empty', target: v.en }); if (S.R.exam) return nextPhase(); T.phase = 'check'; T.ui = {}; tick(); render(); },
    reveal: () => { const T = curTask(); T.phase = 'check'; T.ui = {}; tick(); render(); },
    'paper-yes': () => { setWrite(true, '', null); nextPhase(); },
    'paper-no': () => { setWrite(false, '', null); nextPhase(); },
    next: () => nextPhase(),
    iwasright: () => {
      const T = curTask(), p = prog(T.vid);
      if (!S.R.reported.has(T.vid)) {
        S.R.reported.add(T.vid);
        D.reports.push({ id: uid(), vid: T.vid, answer: normEn(T.answer), day: today(), prevBox: T.pass === 1 && p.prev ? p.prev.box : null, status: 'offen' });
      }
      T.writeOk = true; T.ui.reported = true; save(); nextPhase();
    },
    'listen-de': async () => {
      const T = curTask(); T.ui.listening = true; T.ui.heard = $('#ans') ? $('#ans').value : ''; render();
      const r = await listen('de-DE'); T.ui.listening = false;
      if (r.error && !r.list.length) { T.ui.msg = speechErrorText(r.error); return render(); }
      T.ui.heard = r.list[0]; T.ui.alts = r.list; render();
    },
    decheck: () => {
      const T = curTask(), v = vocabById(T.vid), val = ($('#ans').value || '').trim();
      if (!val) { $('#ans').focus(); return; }
      const alts = T.ui.alts && T.ui.heard === val ? T.ui.alts : [val];
      setDe(matchDe(alts, v), val); if (S.R.exam) return nextPhase(); T.phase = 'decheck'; T.ui = {}; tick(); render();
    },
    dedontknow: () => { const T = curTask(); setDe(false, ''); if (S.R.exam) return nextPhase(); T.phase = 'decheck'; T.ui = {}; tick(); render(); },
    dereveal: () => { const T = curTask(); T.phase = 'decheck'; T.ui = {}; tick(); render(); },
    'depaper-yes': () => { setDe(true, ''); nextPhase(); },
    'depaper-no': () => { setDe(false, ''); nextPhase(); },
    'de-right': () => { const T = curTask(); T.deOk = true; nextPhase(); },
    part2: () => startPart2(),
    part2skip: () => endRound(),
    'listen-en': async () => {
      const T = curTask(), v = vocabById(T.vid), u = T.ui; u.listening = true; u.level = ''; render();
      const r = await listen('en-GB'); u.listening = false;
      const hard = ['not-allowed', 'service-not-allowed', 'network', 'audio-capture'];
      if (r.error && !r.list.length && (hard.includes(r.error) || r.error === 'aborted')) { u.msg = speechErrorText(r.error); if (hard.includes(r.error)) u.selfMode = true; return render(); }
      // Nichts erkannt (z. B. undeutlich ausgesprochen) zählt als Fehlversuch mit klarer Rückmeldung
      u.tries++; u.heard = r.list[0] || ''; u.level = r.list.length ? matchEnSpeech(r.list, v) : 'nochmal'; beep(u.level === 'super');
      if (u.tries === 1) { trackSay(v, u.level === 'super', u.heard); if (u.level === 'super') onSpokenRight(v.id); save(); }
      render();
      if (u.tries === 2 && u.level !== 'super') setTimeout(() => speak(v.en, true), 400);
    },
    'self-en': () => { curTask().ui.selfMode = true; render(); },
    // Elternbereich
    pin: () => submitPin(),
    tab: (el) => { S.tab = el.dataset.tab; S.editId = null; if (S.tab !== 'vocab') S.unitId = null; render(); },
    openunit: (el) => { S.unitId = el.dataset.id; render(); },
    backunits: () => { S.unitId = null; render(); },
    addunit: () => {
      const name = $('#newunit').value.trim(); if (!name) return;
      if (D.units.some((u) => u.bookId === S.bookId && u.name.toLowerCase() === name.toLowerCase())) return toast('Diese Unit gibt es schon.');
      D.units.push({ id: uid(), bookId: S.bookId, name, status: 'kommt', order: D.units.length ? Math.max(...D.units.map((x) => x.order)) + 1 : 1 }); save(); rerender();
    },
    addbook: () => { const name = prompt('Name des Buchs, z. B. Green Line 2'); if (!name || !name.trim()) return; const b = { id: uid(), name: name.trim() }; D.books.push(b); S.bookId = b.id; save(); render(); },
    renameunit: () => { const u = unitById(S.unitId), n = $('#uname').value.trim(); if (u && n) { u.name = n; save(); toast('Umbenannt.'); } },
    delunit: () => {
      const u = unitById(S.unitId); if (!u) return;
      const n = D.vocab.filter((v) => v.unitId === u.id).length;
      if (!confirm('„' + u.name + '“ mit ' + n + ' Wörtern und deren Lernstand endgültig löschen?')) return;
      D.vocab.filter((v) => v.unitId === u.id).forEach((v) => delete D.progress[v.id]);
      D.vocab = D.vocab.filter((v) => v.unitId !== u.id); D.units = D.units.filter((x) => x.id !== u.id);
      D.reports = D.reports.filter((r) => vocabById(r.vid));
      save(); S.unitId = null; toast('Unit gelöscht.'); render();
    },
    clearfresh: (el) => { D.vocab.forEach((v) => { if (v.unitId === el.dataset.id) v.homework = false; }); save(); rerender(); },
    hw: (el) => { const v = vocabById(el.dataset.id); v.homework = !v.homework; save(); rerender(); },
    edit: (el) => { S.editId = el.dataset.id; S.tab = 'vocab'; const v = vocabById(el.dataset.id); if (v) S.unitId = v.unitId; render(); },
    newword: () => { S.editId = 'new'; render(); },
    canceledit: () => { S.editId = null; render(); },
    saveword: () => saveWord(),
    delword: () => {
      const v = vocabById(S.editId); if (!v || !confirm('„' + v.en + '“ löschen?')) return;
      D.vocab = D.vocab.filter((x) => x.id !== v.id); delete D.progress[v.id]; D.reports = D.reports.filter((r) => r.vid !== v.id);
      save(); S.editId = null; toast('Gelöscht.'); render();
    },
    sample: () => { S.importText = SAMPLE_CSV; S.preview = null; rerender(); },
    preview: () => { syncImportFields(); S.preview = parseImport(S.importText); if (!S.preview.length) toast('Keine Zeilen gefunden.'); rerender(); },
    cancelimport: () => { S.preview = null; rerender(); },
    doimport: () => doImport(),
    copycard: async () => { try { await navigator.clipboard.writeText(CARD_PROMPT); toast('Kopiert.'); } catch (e) { $('#cardprompt').select(); toast('Bitte markierten Text kopieren.'); } },
    pasteclip: async () => {
      try {
        const t = await navigator.clipboard.readText();
        if (!t || !t.trim()) return toast('Die Zwischenablage ist leer.');
        syncImportFields(); addImportText(t.replace(/^```[a-z]*\s*|```\s*$/gim, '')); S.ocrMsg = 'Text eingefügt. Bitte jede Zeile prüfen.'; rerender();
      } catch (e) { toast('Einfügen nicht erlaubt. Bitte lange ins Textfeld tippen → „Einfügen“.'); }
    },
    copyprompt: async () => { try { await navigator.clipboard.writeText(PHOTO_PROMPT); toast('Kopiert.'); } catch (e) { $('#photoprompt').select(); toast('Bitte markierten Text kopieren.'); } },
    'rep-yes': (el) => decideReport(el.dataset.id, true),
    'rep-no': (el) => decideReport(el.dataset.id, false),
    tryvoice: (el) => { const old = D.settings.voiceName; D.settings.voiceName = el.dataset.name; speak('Hello! My name is Teacup. Nice to meet you.'); D.settings.voiceName = old; },
    pickvoice: (el) => { D.settings.voiceName = el.dataset.name; save(); rerender(); speak('Hello! I will be your voice.'); },
    seen: (el) => { vocabById(el.dataset.id).reviewNew = false; save(); rerender(); },
    seenall: () => { D.vocab.forEach((v) => { v.reviewNew = false; }); save(); rerender(); },
    copyenrich: async () => { try { await navigator.clipboard.writeText(enrichText()); toast('Kopiert. Jetzt in einem Claude-Chat einfügen.'); } catch (e) { toast('Kopieren nicht möglich.'); } },
    pasteenrich: async () => {
      try {
        const t = await navigator.clipboard.readText();
        if (!t || !/englisch/i.test(t)) return toast('In der Zwischenablage ist noch keine Antwort von Claude.');
        S.tab = 'import'; S.importText = t.replace(/^```[a-z]*\s*|```\s*$/gim, '').trim(); S.preview = parseImport(S.importText); render();
      } catch (e) { toast('Einfügen nicht erlaubt. Bitte im Reiter „Importieren“ lange ins Textfeld tippen → „Einfügen“.'); }
    },
    approve: (el) => { vocabById(el.dataset.id).checked = true; save(); rerender(); },
    approveall: () => { if (!confirm('Alle Zusatzinhalte freigeben? Bitte vorher durchlesen.')) return; D.vocab.forEach((v) => { if (needsReview(v)) v.checked = true; }); save(); rerender(); },
    speechon: () => { D.settings.speech = true; save(); rerender(); toast('Spracherkennung eingeschaltet. Chrome fragt beim ersten Mal nach dem Mikrofon: bitte erlauben.'); },
    speechoff: () => { D.settings.speech = false; save(); rerender(); },
    mictest: async () => {
      const out = $('#mictest'); out.textContent = 'Bitte jetzt „hello“ sagen …';
      const r = await listen('en-GB');
      const el = $('#mictest'); if (el) el.textContent = r.list.length ? 'Verstanden: „' + r.list[0] + '“ ✓' : speechErrorText(r.error);
    },
    changepin: () => { S.unlocked = false; S.pinStep = 'change'; S.pinFirst = ''; render(); },
    export: () => doExport(),
    share: () => doShare(),
    restore: () => { if (confirm('Den aktuellen Stand auf diesem Gerät durch die Sicherung ersetzen?')) restore(); },
    cancelrestore: () => { S.backupFile = null; rerender(); },
    sendfile: (el) => sendPack(el.dataset.kind, false),
    savefile: (el) => sendPack(el.dataset.kind, true),
    applyvok: () => { const r = mergeVokabeln(S.backupFile, false); S.backupFile = null; toast(r.added + ' neue und ' + r.updated + ' geänderte Vokabeln übernommen. Lernstand unverändert.'); rerender(); },
    applyls: () => { if (!confirm('Lernstand von Emmas Gerät übernehmen? Der Lernstand auf DIESEM Gerät wird ersetzt.')) return; const n = applyLernstand(S.backupFile); S.backupFile = null; S.tab = 'stats'; toast('Lernstand übernommen' + (n ? ', ' + n + ' Wörter ergänzt' : '') + '.'); render(); },
    statday: (el) => { S.statDay = el.dataset.day; rerender(); },
    showsummary: () => { S.showSummary = true; rerender(); },
    copysummary: async () => { try { await navigator.clipboard.writeText(weekSummary()); toast('Kopiert.'); } catch (e) { toast('Kopieren nicht möglich.'); } },
    sharesummary: async () => { try { await navigator.share({ title: 'Teacup – Wochenbericht', text: weekSummary() }); } catch (e) { /* abgebrochen */ } },
    addcat: () => {
      const text = normEn($('#newcat').value); if (!text) return;
      if (allCats().some((c) => c.custom && c.label === '„' + text + '“')) return toast('Gibt es schon.');
      const id = 'c' + uid(); D.customCats.push({ id, text, tip: $('#newcattip').value.trim() }); D.focusMode[id] = 'on'; save(); toast('Schwerpunkt hinzugefügt.'); rerender();
    },
    delcat: (el) => { D.customCats = D.customCats.filter((c) => c.id !== el.dataset.id); delete D.focusMode[el.dataset.id]; delete D.skills[el.dataset.id + ':write']; delete D.skills[el.dataset.id + ':say']; save(); rerender(); }
  };
  const CHANGE = {
    paper: (el) => { D.settings.paperChosen = el.checked; save(); },
    book: (el) => { S.bookId = el.value; render(); },
    ustatus: (el) => { const u = unitById(el.dataset.id); u.status = el.value; save(); toast('Status: ' + STATUS[u.status]); },
    nick: (el) => { D.settings.nickname = el.value.trim(); save(); },
    minutes: (el) => { D.settings.dailyMinutes = Number(el.value); save(); },
    toopt: (el) => { D.settings.toOptional = el.checked; save(); },
    paperallowed: (el) => { D.settings.paperAllowed = el.checked; save(); },
    sound: (el) => { D.settings.sound = el.checked; save(); },
    theme: (el) => { D.settings.theme = el.value; save(); applyTheme(); },
    bfile: (el) => { if (el.files && el.files[0]) readBackup(el.files[0]); },
    parentemail: (el) => { D.settings.parentEmail = el.value.trim(); save(); },
    tscope: () => { readTestForm(); rerender(); },
    focusmode: (el) => { D.focusMode[el.dataset.id] = el.value; save(); rerender(); },
    impunit: (el) => { S.importText = $('#imp').value; S.impUnit = el.value; S.preview = null; rerender(); },
    impnewunit: (el) => { S.impNewUnit = el.value; },
    imppage: (el) => { S.impPage = el.value; },
    saymode: (el) => { D.settings.sayMode = el.value; save(); },
    roundsize: (el) => { D.settings.roundSize = Number(el.value); save(); },
    slowspeed: (el) => { D.settings.slowSpeed = el.value; save(); },
    normalrate: (el) => { D.settings.normalRate = Number(el.value); save(); },
    enrunit: (el) => { S.enrichUnit = el.value; rerender(); },
    autoapprove: (el) => { D.settings.autoApprove = el.checked; save(); },
    impmove: (el) => { S.impMove = el.checked; syncImportFields(); rerender(); },
    imppairs: (el) => { S.impPairs = el.checked; if (S.preview) { syncImportFields(); S.preview = parseImport(S.importText); rerender(); } },
    textfile: (el) => { if (el.files && el.files[0]) readTextFile(el.files[0]); el.value = ''; },
    photo: (el) => { if (el.files && el.files[0]) runOcr(el.files[0]); el.value = ''; }
  };
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (el && !el.disabled && ACT[el.dataset.act]) { e.preventDefault(); ACT[el.dataset.act](el, e); }
  });
  document.addEventListener('change', (e) => { const el = e.target.closest('[data-change]'); if (el && CHANGE[el.dataset.change]) CHANGE[el.dataset.change](el, e); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const el = e.target.closest('[data-enter]');
    if (el && ACT[el.dataset.enter]) { e.preventDefault(); ACT[el.dataset.enter](el, e); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (S.R) { tick(); save(); } } else if (S.R) S.R.last = Date.now(); });
  // App in einem zweiten Fenster geändert: neuesten Stand übernehmen statt ihn zu überschreiben
  window.addEventListener('storage', (e) => { if (e.key === STORE_KEY && e.newValue && !S.R) { D = load(); applyTheme(); render(); } });

  // ---------- Updates (Service Worker) ----------
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    // Nur der eigene Service Worker zählt (die normale App und die Testversion liegen unter derselben Adresse)
    const ownSW = () => { const c = navigator.serviceWorker.controller; return !!c && c.scriptURL === new URL('sw.js', location.href).href; };
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const offer = (w) => toast('Neue Version verfügbar.', 'Aktualisieren', () => w.postMessage('skipWaiting'));
      if (reg.waiting && ownSW()) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && ownSW()) offer(w); });
      });
    }).catch(() => {});
    // Nur nach einem echten Update neu laden, nicht bei der allerersten Installation.
    let reloaded = false;
    const hadController = ownSW();
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  }

  // Lernzeiten-Protokoll auf 180 Tage begrenzen
  if (D.sessions && D.sessions.length) { const cut = new Date(Date.now() - 180 * 864e5).toISOString(); D.sessions = D.sessions.filter((x) => x.start >= cut); }

  // Einmalig: Aussprachetipps für vorhandene Wörter ergänzen (ändert nichts, wo schon ein Tipp steht)
  if (!D.autoTipsV1) { D.vocab.forEach((v) => { if (!v.tip) { v.tip = autoTip(v.en); v.tipAuto = !!v.tip; if (v.tip && !v.exEn && !v.exDe) v.checked = true; } }); D.autoTipsV1 = true; save(); }

  // Für die automatischen Tests
  window.__teacup = { gradeEn, matchDe, matchEnSpeech, trackWrite, weakCats, catsIn, data: () => D, version: APP_VERSION, syllables, buildLesson: (ids) => buildLesson(ids.map(vocabById)), stations, lesson: () => S.L && { i: S.L.i, n: S.L.tasks.length, t: S.L.tasks[S.L.i] }, todayStr: today, openChestForTest: () => { const v = S.view; openChest(); S.view = v; }, gapFor: (id) => gapFor(vocabById(id)), state: () => S };
  render();
})();
