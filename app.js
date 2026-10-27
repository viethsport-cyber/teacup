'use strict';
/* Teacup – Englisch-Vokabeln (Stufe 1: Grundgerüst und Karteikarten)
   Alle Daten liegen nur auf diesem Gerät (localStorage). Kein Server, keine Anmeldung. */
(() => {
  const APP_VERSION = '1.4.2';
  const STORE_KEY = 'teacup-data';
  const SAFETY_KEY = 'teacup-data-tagessicherung';
  const SCHEMA = 1;
  const ROUND_MAX = 15;
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
    { id: 'w', label: '„w“', re: /\bw(?!r)/gi, say: true, tip: '„w“: Lippen rund wie beim Pusten, nicht wie das deutsche „w“.' },
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
      settings: { nickname: '', dailyMinutes: 15, toOptional: true, speech: false, paperAllowed: true, paperChosen: false, sound: true, theme: 'auto' },
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
    try { const raw = localStorage.getItem(STORE_KEY); return migrate(raw ? JSON.parse(raw) : null); }
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
    t.innerHTML = esc(msg) + (actionLabel ? ' <button class="btn small" id="toastAct">' + esc(actionLabel) + '</button>' : '');
    t.hidden = false;
    if (actionLabel) document.getElementById('toastAct').onclick = () => { t.hidden = true; action(); };
    clearTimeout(toastTimer);
    if (!actionLabel) toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
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
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
  };
  // Londoner Skyline: Big Ben, Tower Bridge, London Eye, Doppeldeckerbus (Farben über CSS, auch im Dunkelmodus)
  const SKYLINE = '<svg class="skyline" viewBox="0 0 360 130" aria-hidden="true" preserveAspectRatio="xMidYMax slice">' +
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
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function gbVoice() {
    const gb = voices.filter((v) => v.lang && v.lang.replace('_', '-').toLowerCase() === 'en-gb');
    return gb.find((v) => /google/i.test(v.name)) || gb.find((v) => v.localService) || gb[0] || null;
  }
  function speak(text, slow) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) { toast('Dieses Gerät kann nicht vorsprechen.'); return resolve(); }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-GB';
      const v = gbVoice(); if (v) u.voice = v;
      u.rate = slow ? 0.55 : 0.9;
      u.onend = u.onerror = () => resolve();
      speechSynthesis.speak(u);
      setTimeout(resolve, 6000);
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
      if (v.homework) hw.push(v);
      else if (u.status === 'kommt') continue;
      else if (p.seen && p.due <= t) due.push(v);
      else if (!p.seen && u.status === 'aktuell') fresh.push(v);
    }
    due.sort((a, b) => prog(a.id).box - prog(b.id).box || (prog(a.id).due < prog(b.id).due ? -1 : 1));
    sortVocab(fresh); sortVocab(hw);
    let newLeft = Math.max(0, NEW_PER_DAY - introducedToday() - hw.filter((v) => !prog(v.id).seen).length);
    const freshPick = fresh.slice(0, newLeft);
    const list = [...hw, ...due, ...freshPick].slice(0, ROUND_MAX);
    // Schwerpunkt-Wörter zusätzlich (ändern die Lernkartei nicht), nur wenn ohnehin gelernt wird
    const focusIds = new Set();
    const weak = weakCats();
    if (list.length && weak.length && list.length < ROUND_MAX) {
      const inList = new Set(list.map((v) => v.id));
      const cand = [];
      weak.forEach((w) => catWords(w.cat.id).forEach((v) => { if (!inList.has(v.id) && !cand.includes(v)) cand.push(v); }));
      cand.sort((a, b) => prog(b.id).wrong - prog(a.id).wrong || prog(a.id).box - prog(b.id).box);
      cand.slice(0, Math.min(5, ROUND_MAX - list.length)).forEach((v) => { list.push(v); focusIds.add(v.id); });
    }
    return { list, focusIds, hw: hw.length, due: due.length, fresh: freshPick.length, freshWaiting: fresh.length };
  }
  function recordWrite(vid, ok) {
    const p = prog(vid), t = today();
    const before = p.box;
    if (!p.seen) { p.seen = true; p.firstSeen = t; D.newByDay[t] = (D.newByDay[t] || 0) + 1; }
    p.prev = { box: p.box, due: p.due, day: t };
    if (ok) { p.box = Math.min(p.box + 1, 6); p.right++; }
    else { p.box = 1; p.wrong++; }
    p.due = addDays(t, INTERVAL[p.box]);
    p.last = t; p.lastOk = ok;
    const v = vocabById(vid); if (ok && v && v.homework) v.homework = false;
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
    } else if (P.list.length) {
      const parts = [];
      if (P.hw) parts.push(P.hw + ' Hausaufgabe');
      if (P.due) parts.push(Math.min(P.due, ROUND_MAX) + ' Wiederholung');
      if (P.fresh) parts.push(P.fresh + ' neu');
      if (P.focusIds.size) parts.push(P.focusIds.size + ' Schwerpunkt ' + ic('target'));
      main = '<div class="card"><h2 style="margin-top:0">Heute dran: ' + P.list.length + ' Wörter</h2><p class="muted">' + esc(parts.join(' · ')) + '</p>' +
        (D.settings.paperAllowed ? '<label class="check"><input type="checkbox" data-change="paper" ' + (D.settings.paperChosen ? 'checked' : '') + '> Ich schreibe auf Papier</label>' : '') +
        '<button class="btn big" data-act="start">Lernrunde starten</button></div>';
    } else {
      const seen = D.vocab.some((v) => prog(v.id).seen);
      main = '<div class="card good center"><p class="feedback">Alles erledigt für heute! ' + ic('party') + '</p><p>Morgen geht es weiter.</p>' +
        (seen ? '<button class="btn secondary" data-act="extra">Freiwillig üben</button><p class="small">Freiwilliges Üben ändert die Lernkartei nicht.</p>' : '') + '</div>';
    }
    app.innerHTML =
      '<div class="topbar"><h1>' + ic('cup') + 'Teacup</h1><button class="iconbtn" data-act="parent" aria-label="Elternbereich">' + ic('gear') + (dot ? '<span class="badge-dot"></span>' : '') + '</button></div>' +
      '<div class="hero-city">' + SKYLINE + '<div class="hello"><b>Hello' + name + '!</b><span>Schön, dass du da bist.</span></div></div>' + main +
      '<div class="card"><div class="row"><b>Heute gelernt</b><span class="spacer"></span><span>' + mins + ' von ' + goal + ' Min.</span></div>' +
      '<div class="progress" style="margin-top:8px"><div style="width:' + Math.min(100, Math.round((mins / goal) * 100)) + '%"></div></div>' +
      (mins >= goal ? '<p class="center"><b>Für heute geschafft! ' + ic('star') + '</b> Weiterlernen ist freiwillig.</p>' : '') + '</div>' +
      focusCardHtml() +
      '<div class="card"><h3 style="margin-top:0">Deine Lernkartei</h3>' + boxesHtml(boxCounts(true)) + '</div>' +
      (installEvt ? '<button class="btn secondary big" data-act="install">' + ic('download') + 'App auf dem Startbildschirm installieren</button>' : '');
  }

  function focusCardHtml() {
    const weak = weakCats().filter((w) => catWords(w.cat.id).length).slice(0, 3);
    if (!weak.length) return '';
    return '<div class="card"><h3 style="margin-top:0">' + ic('target') + 'Deine Schwerpunkte</h3><p class="small">Das übst du gerade besonders. Jede Übung dauert 2–3 Minuten.</p>' +
      weak.map((w) => '<button class="btn secondary" style="width:100%;margin-top:8px" data-act="focus" data-id="' + esc(w.cat.id) + '">' + esc(w.cat.label) + ' üben</button>').join('') + '</div>';
  }

  // ---------- Lernrunde ----------
  function startRound(extra, focusCat) {
    let list, focusIds = new Set();
    if (focusCat) {
      list = catWords(focusCat).sort(() => Math.random() - 0.5).sort((a, b) => prog(b.id).wrong - prog(a.id).wrong).slice(0, 10);
      list.forEach((v) => focusIds.add(v.id));
      if (!list.length) return toast('Dazu gibt es noch keine gelernten Wörter.');
    } else if (extra) {
      list = D.vocab.filter((v) => { const u = unitById(v.unitId); return u && u.status !== 'kommt' && prog(v.id).seen; });
      list = list.sort(() => Math.random() - 0.5).slice(0, 10);
    } else { const P = plan(); list = P.list; focusIds = P.focusIds; }
    if (!list.length) return;
    const weak = weakCats();
    S.R = {
      extra, focusCat: focusCat || null, paper: D.settings.paperAllowed && D.settings.paperChosen,
      tasks: list.map((v) => {
        const wc = wordWeakCats(v, weak);
        const fc = focusCat ? catById(focusCat) : null;
        return { vid: v.id, pass: 1, isNew: !prog(v.id).seen, focus: focusIds.has(v.id), sayFocus: focusIds.has(v.id) && ((fc && fc.say && speechOn()) || wc.some((w) => w.sayWeak)) };
      }),
      i: 0, total: list.length, doneWords: new Set(), speakOk: {}, moves: {}, firstOk: 0, reported: new Set(), last: Date.now()
    };
    S.R.tasks.forEach((t) => (t.phase = 'write'));
    S.view = 'round'; render();
  }
  function tick() { if (S.R) { const n = Date.now(); addLearnTime(n - S.R.last); S.R.last = n; } }
  const curTask = () => S.R.tasks[S.R.i];
  function nextPhase() {
    tick();
    const T = curTask();
    const order = ['write', 'check', 'speak', 'repeat'];
    let idx = order.indexOf(T.phase) + 1;
    while (idx < order.length) {
      const ph = order[idx];
      if (ph === 'speak' && !T.focus && (T.pass === 1 || !S.R.speakOk[T.vid])) break;
      if (ph === 'repeat' && T.pass === 1 && (T.isNew || T.sayFocus)) break;
      idx++;
    }
    if (idx < order.length) { T.phase = order[idx]; T.ui = {}; save(); return render(); }
    finishTask();
  }
  function finishTask() {
    const R = S.R, T = curTask();
    if (T.speakOk === true) R.speakOk[T.vid] = true;
    if (T.writeOk && (T.speakOk !== false)) R.doneWords.add(T.vid);
    else R.tasks.push({ vid: T.vid, pass: T.pass + 1, isNew: false, focus: T.focus, phase: 'write' });
    R.i++;
    save();
    if (R.i >= R.tasks.length) { addLearnTime(0); D.stats.days[today()].rounds++; save(); S.view = 'summary'; }
    render();
  }
  function setWrite(ok, answer, grade) {
    const R = S.R, T = curTask();
    T.writeOk = ok; T.answer = answer; T.grade = grade;
    if (T.pass === 1) {
      if (ok) R.firstOk++;
      if (!R.extra && !T.focus) R.moves[T.vid] = recordWrite(T.vid, ok);
      if (!R.paper) { T.errCats = trackWrite(vocabById(T.vid), answer, grade); save(); }
    } else if (ok) { const v = vocabById(T.vid); if (v && v.homework) { v.homework = false; save(); } }
    beep(ok);
    if (ok) setTimeout(() => confetti(14), 60);
  }
  function roundHeader() {
    const R = S.R, T = curTask();
    const pct = Math.round((R.doneWords.size / R.total) * 100);
    const label = T.pass > 1 ? 'Noch einmal üben' : 'Wort ' + Math.min(R.total, R.i + 1) + ' von ' + R.total;
    const mark = (T.focus && !R.focusCat) || R.focusCat ? ' ' + ic('target') : '';
    const steps = { write: ic('pencil') + 'Schreiben', check: ic('check') + 'Kontrollieren', speak: ic('speech') + 'Sprechen', repeat: ic('repeat') + 'Nachsprechen' };
    return '<div class="topbar"><button class="iconbtn" data-act="quit" aria-label="Runde beenden">' + ic('x') + '</button><h1 style="font-size:1.05rem">' + esc(label) + (R.extra ? ' · Extra' : '') + mark + '</h1><span class="pill">' + steps[T.phase] + '</span></div>' +
      '<div class="track"><div class="fill" style="width:' + pct + '%"></div><span class="bus" style="left:' + pct + '%">' + BUS + '</span></div><div class="steps"><span>' + R.doneWords.size + ' geschafft</span><span>' + R.total + ' Wörter</span></div>';
  }
  const speakBtns = (text) => '<div class="speak-row"><button class="btn secondary" data-act="say" data-text="' + esc(text) + '">' + ic('speaker') + 'Anhören</button><button class="btn secondary" data-act="sayslow" data-text="' + esc(text) + '">' + ic('snail') + 'Langsam</button></div>';
  function renderRound() {
    const T = curTask(), v = vocabById(T.vid);
    if (!v) { S.R.doneWords.add(T.vid); return finishTask(); }
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
    else if (T.phase === 'speak') body = speakHtml(T, v);
    else if (T.phase === 'repeat') body = repeatHtml(T, v);
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
  function speakHtml(T, v) {
    const u = T.ui;
    let h = '<div class="card"><div class="prompt"><div class="label">Was heißt das auf Deutsch? Sag es laut.</div><div class="word' + (v.en.length > 24 ? ' long' : '') + '">' + esc(v.en) + '</div></div>';
    if (u.result === undefined) {
      if (speechOn() && !u.selfMode) {
        h += '<div class="center"><button class="mic' + (u.listening ? ' listening' : '') + '" data-act="listen-de" aria-label="Sprechen">' + ic('mic') + '</button><p>' + (u.listening ? 'Ich höre zu …' : esc(u.msg || 'Tippe aufs Mikrofon und sag die deutsche Bedeutung.')) + '</p></div>' +
          '<button class="btn ghost" data-act="self-de">Ohne Mikrofon weiter</button>';
      } else if (!u.revealed) {
        h += '<p class="center">Sag die deutsche Bedeutung laut. Dann deck auf.</p><button class="btn big" data-act="reveal-de">Aufdecken</button>';
      } else {
        h += '<div class="solution' + (deText(v).length > 24 ? ' long' : '') + '">' + esc(deText(v)) + '</div><div class="row"><button class="btn bad" data-act="de-no">✗ Nicht gewusst</button><button class="btn good" data-act="de-yes">✓ Gewusst</button></div>';
      }
      return h + '</div>';
    }
    if (u.result) h = '<div class="card good"><p class="feedback">✓ Richtig!</p><div class="solution' + (deText(v).length > 24 ? ' long' : '') + '">' + esc(deText(v)) + '</div>';
    else h = '<div class="card bad"><p class="feedback">Noch nicht ganz.</p>' + (u.heard ? '<p class="center small">Ich habe verstanden: „' + esc(u.heard) + '“</p>' : '') + '<p class="center small" style="margin-bottom:0">Richtig ist</p><div class="solution' + (deText(v).length > 24 ? ' long' : '') + '">' + esc(deText(v)) + '</div>';
    h += '</div>';
    if (!u.result && u.heard) h += '<button class="btn ghost" data-act="de-right">' + ic('flag') + 'Ich war richtig</button>';
    return h + '<button class="btn big" data-act="next">Weiter</button>';
  }
  function repeatHtml(T, v) {
    const u = T.ui; u.tries = u.tries || 0;
    let h = '<div class="card"><div class="prompt"><div class="label">' + (T.isNew ? 'Neues Wort: ' : ic('target') + 'Aussprache üben: ') + 'Hör zu und sprich nach.</div><div class="word' + (v.en.length > 24 ? ' long' : '') + '">' + esc(v.en) + '</div><div class="meta">' + esc(deText(v)) + '</div></div>' + speakBtns(v.en);
    if (speechOn() && !u.selfMode) {
      const fin = u.level === 'super' || u.tries >= 3;
      if (!fin) h += '<div class="center"><button class="mic' + (u.listening ? ' listening' : '') + '" data-act="listen-en" aria-label="Nachsprechen">' + ic('mic') + '</button><p>' + (u.listening ? 'Ich höre zu …' : 'Tippe aufs Mikrofon und sprich nach.') + '</p></div>';
      if (u.level) {
        const fb = { super: ['good', ic('star') + 'Super verstanden!'], fast: ['warn', 'Fast, hör noch mal hin.'], nochmal: ['bad', 'Noch mal probieren.'] }[u.level];
        h += '<div class="card ' + fb[0] + ' center"><p class="feedback">' + fb[1] + '</p>' + (u.heard ? '<p class="small">Ich habe verstanden: „' + esc(u.heard) + '“</p>' : '') + '</div>';
      } else if (u.msg) h += '<p class="center">' + esc(u.msg) + '</p>';
      if (u.tries >= 2 && u.level !== 'super') h += '<div class="tip">' + ic('bulb') + esc(v.checked && v.tip ? v.tip : ((catsIn(normEn(v.en)).find((x) => x.cat.say && x.cat.id !== 'final') || {}).cat || { tip: 'Hör genau hin: Ich spreche es dir langsam vor. Achte auf jeden Laut.' }).tip) + '</div>';
      if (fin) h += '<p class="center small">' + (u.level === 'super' ? '' : 'Gut geübt! Wir machen weiter.') + '</p>';
      h += '</div>' + (fin ? '<button class="btn big" data-act="next">Weiter</button>' : '<button class="btn ghost" data-act="self-en">Ohne Mikrofon weiter</button>');
      return h;
    }
    return h + '<p class="center">Sprich das Wort laut nach. Hör dir den Vergleich so oft an, wie du willst.</p></div><button class="btn big" data-act="next">✓ Nachgesprochen, weiter</button>';
  }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function renderSummary() {
    const R = S.R;
    const ups = Object.entries(R.moves).filter(([, m]) => m.after > m.before);
    const mins = minutesToday();
    setTimeout(() => confetti(40), 100);
    let h = '<div class="hero-city small-city">' + SKYLINE + '<div class="hello"><b>Runde geschafft!</b><span>Well done!</span></div></div><div class="card"><p><b>' + R.firstOk + ' von ' + R.total + '</b> Wörter beim ersten Mal richtig geschrieben.</p>';
    if (R.focusCat) h += '<p class="small">' + ic('target') + 'Schwerpunkt ' + esc((catById(R.focusCat) || {}).label || '') + ' geübt. Die Lernkartei bleibt unverändert.</p>';
    else if (R.extra) h += '<p class="small">Extra-Übung: Die Lernkartei bleibt unverändert.</p>';
    else if (ups.length) h += '<p>' + ups.length + ' Wörter sind ein Fach weiter gekommen.</p>';
    h += '</div>';
    const rows = Object.entries(R.moves).map(([vid, m]) => { const v = vocabById(vid); return v ? '<li><span class="grow"><span class="en">' + esc(v.en) + '</span></span><span class="pill ' + (m.after > m.before ? 'good' : 'warn') + '">' + BOX_NAME[m.after] + '</span></li>' : ''; }).join('');
    if (rows) h += '<div class="card"><h3 style="margin-top:0">Deine Wörter</h3><ul class="list">' + rows + '</ul></div>';
    if (mins >= D.settings.dailyMinutes) h += '<div class="card good center"><p class="feedback">Für heute geschafft! ' + ic('star') + '</p><p>Du kannst freiwillig weiterlernen.</p></div>';
    h += '<button class="btn big" data-act="home">Zur Startseite</button>';
    app.innerHTML = h;
    S.R = null;
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
  function renderLock() {
    const setting = !D.pin || S.pinStep === 'change';
    const title = setting ? (S.pinFirst ? 'PIN wiederholen' : (S.pinStep === 'change' ? 'Neue PIN festlegen' : 'Elternbereich einrichten')) : 'Elternbereich';
    const hint = setting ? (S.pinFirst ? 'Bitte dieselbe PIN noch einmal eingeben.' : 'Legen Sie eine 4-stellige PIN fest. Emma sollte sie nicht kennen.') : 'Bitte die 4-stellige PIN eingeben.';
    app.innerHTML = '<div class="topbar"><button class="iconbtn" data-act="home" aria-label="Zurück">' + ic('back') + '</button><h1>' + esc(title) + '</h1></div>' +
      '<div class="card"><p>' + esc(hint) + '</p><input type="password" id="pin" class="pin-input" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" data-enter="pin">' +
      '<p id="pinmsg" class="small" style="color:var(--bad)"></p><button class="btn big" data-act="pin">' + (setting ? 'Weiter' : 'Öffnen') + '</button></div>';
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
      return render();
    }
    if ((await hashPin(val)) === D.pin) { S.unlocked = true; render(); }
    else { $('#pin').value = ''; msg.textContent = 'Falsche PIN.'; }
  }

  // ---------- Elternbereich ----------
  function renderParent() {
    const nRev = openReports().length + D.vocab.filter(needsReview).length;
    const tabs = [['vocab', 'Vokabeln'], ['import', 'Importieren'], ['review', 'Prüfen' + (nRev ? ' (' + nRev + ')' : '')], ['analysis', 'Auswertung'], ['settings', 'Einstellungen'], ['backup', 'Sicherung']];
    let h = '<div class="topbar"><button class="iconbtn" data-act="leave" aria-label="Elternbereich verlassen">' + ic('back') + '</button><h1>Elternbereich</h1></div>' +
      '<div class="tabs" role="tablist">' + tabs.map(([k, l]) => '<button role="tab" aria-selected="' + (S.tab === k) + '" data-act="tab" data-tab="' + k + '">' + esc(l) + '</button>').join('') + '</div>';
    if (backupDue() && S.tab !== 'backup') h += '<div class="card warn"><b>Erinnerung:</b> ' + (D.lastBackupAt ? 'Die letzte Sicherung ist über einen Monat her.' : 'Es gibt noch keine Sicherung.') + ' <button class="btn small" data-act="tab" data-tab="backup">Jetzt sichern</button></div>';
    if (S.tab === 'vocab') h += S.editId ? editHtml() : S.unitId ? unitHtml() : unitsHtml();
    if (S.tab === 'import') h += importHtml();
    if (S.tab === 'review') h += reviewHtml();
    if (S.tab === 'analysis') h += analysisHtml();
    if (S.tab === 'settings') h += settingsHtml();
    if (S.tab === 'backup') h += backupHtml();
    app.innerHTML = h;
  }
  function unitsHtml() {
    const book = bookById(S.bookId) || D.books[0];
    const units = D.units.filter((u) => u.bookId === book.id).sort((a, b) => a.order - b.order);
    let h = '';
    if (!D.vocab.length) h += '<div class="card soft"><h3 style="margin-top:0">Erste Schritte</h3><ol><li>Unter <b>Importieren</b> Vokabeln einfügen (zum Testen gibt es 20 Beispielwörter).</li><li>Den Status der Unit auf <b>Aktuell</b> setzen.</li><li>Unter <b>Einstellungen</b> Spitzname und Spracherkennung festlegen.</li><li>Unter <b>Sicherung</b> regelmäßig eine Sicherung speichern.</li></ol></div>';
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
  function unitHtml() {
    const u = unitById(S.unitId); if (!u) { S.unitId = null; return unitsHtml(); }
    const words = sortVocab(D.vocab.filter((v) => v.unitId === u.id));
    let h = '<div class="card"><button class="btn ghost" data-act="backunits">← Alle Units</button>' +
      '<label for="uname">Name der Unit</label><div class="row"><input type="text" id="uname" value="' + esc(u.name) + '" style="flex:2 1 200px"><button class="btn secondary small" data-act="renameunit">Umbenennen</button></div>' +
      '<label for="ust">Status</label><select id="ust" data-change="ustatus" data-id="' + u.id + '">' + Object.entries(STATUS).map(([k, l]) => '<option value="' + k + '"' + (u.status === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' +
      '<p class="small">Kommt noch = für Emma unsichtbar · Aktuell = neue Wörter werden eingeführt · Gelernt = nur Wiederholung nach Plan</p></div>';
    h += '<div class="card"><div class="row"><h3 style="margin:0;flex:1">' + words.length + ' Wörter</h3><button class="btn small" data-act="newword">+ Wort</button></div>' +
      '<p class="small">' + ic('book') + '= als Hausaufgabe markieren (kommt in der nächsten Runde zuerst dran).</p><ul class="list">' +
      words.map((v) => {
        const p = prog(v.id);
        return '<li><span class="grow"><span class="en">' + esc(v.en) + '</span><br><span class="de">' + esc(deText(v)) + (v.page ? ' · S. ' + esc(v.page) : '') + '</span><br>' +
          '<span class="pill">' + (p.seen ? BOX_NAME[p.box] : 'neu') + '</span> ' + (v.homework ? '<span class="pill warn">Hausaufgabe</span> ' : '') + (needsReview(v) ? '<span class="pill bad">ungeprüft</span>' : '') + '</span>' +
          '<button class="iconbtn" data-act="hw" data-id="' + v.id + '" aria-label="Hausaufgabe" aria-pressed="' + !!v.homework + '" style="' + (v.homework ? 'background:var(--warn-soft);border-color:var(--warn)' : '') + '">' + ic('book') + '</button>' +
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
      return rec;
    });
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
      const nNew = ok.filter((r) => !r.existing).length, nUpd = ok.length - nNew;
      const newUnits = [...new Set(ok.filter((r) => r.newUnit).map((r) => r.unit))];
      h += '<div class="card"><h3 style="margin-top:0">Vorschau</h3><p><b>' + nNew + '</b> neu · <b>' + nUpd + '</b> werden aktualisiert (Lernstand bleibt) · <b' + (bad ? ' style="color:var(--bad)"' : '') + '>' + bad + '</b> mit Fehler (werden übersprungen)' + (dup ? ' · <b>' + dup + '</b> doppelt' : '') + '</p>' +
        errorSummaryHtml(P) +
        (newUnits.length ? '<p>Neue Units: ' + esc(newUnits.join(', ')) + '</p><label for="imp-status">Status der neuen Units</label><select id="imp-status">' + Object.entries(STATUS).map(([k, l]) => '<option value="' + k + '"' + (k === 'aktuell' ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' : '') +
        '<label class="check"><input type="checkbox" id="imp-checked"> Beispielsätze und Aussprachetipps sind geprüft (sonst später unter „Prüfen“ freigeben)</label>' +
        '<div class="tablewrap"><table><thead><tr><th>#</th><th>Unit</th><th>S.</th><th>Englisch</th><th>Deutsch</th><th>Status</th></tr></thead><tbody>' +
        P.map((r) => '<tr' + (r.errors.length ? ' class="err"' : '') + '><td>' + r.line + '</td><td>' + esc(r.unit) + '</td><td>' + esc(r.page) + '</td><td>' + esc(r.en) + '</td><td>' + esc(r.de.join(' / ')) + '</td><td>' + (r.errors.length ? esc(r.errors.join(', ')) : r.dup ? 'doppelt, wird übersprungen' : r.existing ? 'aktualisieren' : 'neu') + '</td></tr>').join('') +
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
    const checked = $('#imp-checked').checked;
    let lastUnit = null;
    for (const r of rows) {
      let b = D.books.find((x) => x.name.toLowerCase() === r.bookName.toLowerCase());
      if (!b) { b = { id: uid(), name: r.bookName }; D.books.push(b); }
      let u = D.units.find((x) => x.bookId === b.id && x.name.toLowerCase() === r.unit.toLowerCase());
      if (!u) { u = { id: uid(), bookId: b.id, name: r.unit, status, order: D.units.length ? Math.max(...D.units.map((x) => x.order)) + 1 : 1 }; D.units.push(u); }
      lastUnit = u;
      let v = D.vocab.find((x) => x.unitId === u.id && cmpEn(x.en).toLowerCase() === cmpEn(r.en).toLowerCase());
      const fields = { unitId: u.id, page: r.page, en: r.en, de: r.de, pos: r.pos, note: r.note, exEn: r.exEn, exDe: r.exDe, tip: r.tip };
      if (v) {
        const extraChanged = v.exEn !== r.exEn || v.exDe !== r.exDe || v.tip !== r.tip;
        Object.assign(v, fields); if (extraChanged) v.checked = checked;
      } else D.vocab.push(Object.assign({ id: uid(), createdAt: Date.now() + D.vocab.length, homework: false, altEn: [], checked }, fields));
    }
    save();
    toast(rows.length + ' Wörter übernommen.');
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
    const list = D.vocab.filter(needsReview);
    h += '<div class="card"><h3 style="margin-top:0">Zusatzinhalte freigeben</h3><p class="small">Beispielsätze und Aussprachetipps sieht Emma erst nach Ihrer Freigabe.</p>';
    if (!list.length) h += '<p class="muted">Alles geprüft.</p>';
    else h += '<button class="btn secondary small" data-act="approveall">Alle ' + list.length + ' freigeben</button>';
    h += '<ul class="list">' + list.map((v) => '<li><span class="grow"><span class="en">' + esc(v.en) + '</span> <span class="de">(' + esc(deText(v)) + ')</span>' +
      (v.exEn || v.exDe ? '<br>Beispiel: <i>' + esc(v.exEn) + '</i> – ' + esc(v.exDe) : '') + (v.tip ? '<br>Aussprache: ' + esc(v.tip) : '') + '</span>' +
      '<button class="btn small good" data-act="approve" data-id="' + v.id + '">Freigeben</button><button class="iconbtn" data-act="edit" data-id="' + v.id + '" aria-label="Bearbeiten">' + ic('pencil') + '</button></li>').join('') + '</ul></div>';
    return h;
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
        if (v.homework) v.homework = false;
      }
    }
    save(); toast(yes ? 'Als richtig gewertet.' : 'Bleibt falsch.'); rerender();
  }

  // ---------- Auswertung ----------
  const pct = (r) => (r === null ? '–' : Math.round(r * 100) + ' %');
  function analysisHtml() {
    const weak = weakCats();
    let h = '<div class="card soft"><p style="margin-top:0"><b>So funktioniert es:</b> Die App merkt sich bei jedem Fehler, an welcher Stelle im Wort er passiert ist (z. B. beim „th“ oder bei der Großschreibung), und beim Nachsprechen, welche Laute nicht verstanden wurden. Fällt ein Bereich auf (ab 3 Versuchen, mindestens jede dritte Antwort falsch), wird er zum <b>Schwerpunkt</b>:</p>' +
      '<ul><li>Bis zu 5 passende Wörter kommen zusätzlich in jede Lernrunde.</li><li>Auf Emmas Startseite erscheint eine kurze Schwerpunkt-Übung.</li><li>Bei passenden Wörtern zeigt die App den Tipp dazu.</li></ul><p class="small">Neuere Ergebnisse zählen mehr. Wird Emma besser, verschwindet der Schwerpunkt von selbst. Schwerpunkt-Übungen verändern die Lernkartei nicht.</p></div>';
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
      '<label for="s-min">Tagesziel</label><select id="s-min" data-change="minutes">' + [10, 12, 15, 20].map((m) => '<option value="' + m + '"' + (s.dailyMinutes === m ? ' selected' : '') + '>' + m + ' Minuten</option>').join('') + '</select>' +
      '<label class="check"><input type="checkbox" data-change="toopt" ' + (s.toOptional ? 'checked' : '') + '> Bei Verben ist „to“ freiwillig (z. B. „write“ statt „to write“ gilt als richtig)</label>' +
      '<label class="check"><input type="checkbox" data-change="paperallowed" ' + (s.paperAllowed ? 'checked' : '') + '> Papier-Variante anbieten (Emma schreibt auf Papier und bewertet selbst)</label>' +
      '<label class="check"><input type="checkbox" data-change="sound" ' + (s.sound ? 'checked' : '') + '> Töne bei richtig und falsch</label>' +
      '<label for="s-theme">Darstellung</label><select id="s-theme" data-change="theme"><option value="auto"' + (s.theme === 'auto' ? ' selected' : '') + '>Automatisch (wie das Gerät)</option><option value="light"' + (s.theme === 'light' ? ' selected' : '') + '>Hell</option><option value="dark"' + (s.theme === 'dark' ? ' selected' : '') + '>Dunkel</option></select></div>' +
      '<div class="card"><h3 style="margin-top:0">Spracherkennung</h3>' + (SR ? '' : '<p class="pill bad">Dieser Browser hat keine Spracherkennung. Bitte Chrome verwenden.</p>') +
      '<p class="small">Datenschutz-Hinweis: Die Spracherkennung von Chrome schickt die Sprachaufnahme zur Auswertung an Google. Dafür braucht es Internet. Die App selbst speichert keine Aufnahmen. Ist die Erkennung aus, spricht Emma laut und bewertet sich selbst.</p>' +
      (s.speech ? '<p><span class="pill good">eingeschaltet</span></p><button class="btn secondary" data-act="speechoff">Ausschalten</button> <button class="btn secondary" data-act="mictest">Mikrofon testen</button>'
        : '<button class="btn" data-act="speechon"' + (SR ? '' : ' disabled') + '>Hinweis gelesen, einschalten</button>') + '<p id="mictest" class="small"></p></div>' +
      '<div class="card"><h3 style="margin-top:0">Stimme</h3><p>' + (gb ? 'Britische Stimme gefunden: ' + esc(gb.name) : 'Noch keine britische Stimme gefunden. Unter Android: Einstellungen → System → Sprachen → Text-in-Sprache → Google, Sprachdaten „English (United Kingdom)“ laden.') + '</p><button class="btn secondary" data-act="say" data-text="Hello! I am your English teacher.">' + ic('speaker') + 'Stimme testen</button></div>' +
      '<div class="card"><button class="btn secondary" data-act="changepin">PIN ändern</button>' + (installEvt ? ' <button class="btn secondary" data-act="install">App installieren</button>' : '') + '<p class="small">Teacup Version ' + APP_VERSION + ' · Alle Daten bleiben auf diesem Gerät.</p></div>';
  }

  // ---------- Sicherung ----------
  function backupHtml() {
    let h = '<div class="card"><h3 style="margin-top:0">Sicherung speichern</h3><p>Letzte Sicherung: <b>' + (D.lastBackupAt ? fmtDate(D.lastBackupAt) : 'noch keine') + '</b></p>' +
      '<p class="small">Die Datei enthält alle Vokabeln, den Lernstand und die Einstellungen. Bitte einmal im Monat sichern und die Datei z. B. per E-Mail an sich selbst schicken oder in Google Drive ablegen.</p>' +
      '<div class="row"><button class="btn" data-act="export">' + ic('download') + 'Sicherung herunterladen</button>' + (navigator.canShare ? '<button class="btn secondary" data-act="share">' + ic('share') + 'Teilen …</button>' : '') + '</div></div>' +
      '<div class="card"><h3 style="margin-top:0">Sicherung einspielen</h3><p class="small">Zum Beispiel auf einem zweiten Gerät. Achtung: Der Stand auf diesem Gerät wird dabei ersetzt. Die PIN der Sicherung gilt danach.</p>' +
      '<input type="file" id="bfile" data-change="bfile" style="font-size:16px;min-height:48px">';
    if (S.backupFile) {
      const b = S.backupFile.data;
      h += '<div class="card soft"><p>Sicherung vom <b>' + fmtDate(S.backupFile.exportedAt) + '</b>: ' + b.vocab.length + ' Wörter in ' + b.units.length + ' Units, ' + Object.values(b.progress || {}).filter((p) => p.seen).length + ' schon gelernt.</p>' +
        '<button class="btn good" data-act="restore">Diese Sicherung einspielen</button> <button class="btn secondary" data-act="cancelrestore">Abbrechen</button></div>';
    }
    return h + '</div>';
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
        if (o.app !== 'teacup' || !o.data || !Array.isArray(o.data.vocab) || !Array.isArray(o.data.units)) throw new Error('format');
        S.backupFile = o; rerender();
      } catch (e) { S.backupFile = null; toast('Das ist keine gültige Teacup-Sicherung.'); }
    };
    fr.readAsText(file);
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
    extra: () => startRound(true),
    focus: (el) => startRound(false, el.dataset.id),
    quit: () => { tick(); save(); S.R = null; S.view = 'home'; render(); toast('Runde beendet. Dein Fortschritt ist gespeichert.'); },
    say: (el) => speak(el.dataset.text, false),
    sayslow: (el) => speak(el.dataset.text, true),
    check: () => {
      const T = curTask(), v = vocabById(T.vid), val = $('#ans').value;
      if (!val.trim()) { $('#ans').focus(); return; }
      const g = gradeEn(val, v); setWrite(g.ok, val, g); T.phase = 'check'; T.ui = {}; tick(); render();
    },
    dontknow: () => { const T = curTask(), v = vocabById(T.vid); setWrite(false, '', { kind: 'empty', target: v.en }); T.phase = 'check'; T.ui = {}; tick(); render(); },
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
      const T = curTask(), v = vocabById(T.vid); T.ui.listening = true; render();
      const r = await listen('de-DE'); T.ui.listening = false;
      if (r.error && !r.list.length) { T.ui.msg = speechErrorText(r.error); if (['not-allowed', 'service-not-allowed', 'network', 'audio-capture'].includes(r.error)) T.ui.selfMode = true; return render(); }
      T.ui.heard = r.list[0]; T.ui.result = matchDe(r.list, v); T.speakOk = T.ui.result; beep(T.ui.result); render();
    },
    'self-de': () => { curTask().ui.selfMode = true; render(); },
    'reveal-de': () => { curTask().ui.revealed = true; render(); },
    'de-yes': () => { const T = curTask(); T.speakOk = true; beep(true); nextPhase(); },
    'de-no': () => { const T = curTask(); T.speakOk = false; beep(false); nextPhase(); },
    'de-right': () => { const T = curTask(); T.speakOk = true; nextPhase(); },
    'listen-en': async () => {
      const T = curTask(), v = vocabById(T.vid), u = T.ui; u.listening = true; u.level = ''; render();
      const r = await listen('en-GB'); u.listening = false;
      if (r.error && !r.list.length) { u.msg = speechErrorText(r.error); if (['not-allowed', 'service-not-allowed', 'network', 'audio-capture'].includes(r.error)) u.selfMode = true; return render(); }
      u.tries++; u.heard = r.list[0]; u.level = matchEnSpeech(r.list, v); beep(u.level === 'super');
      if (u.tries === 1) { trackSay(v, u.level === 'super', u.heard); save(); }
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
    focusmode: (el) => { D.focusMode[el.dataset.id] = el.value; save(); rerender(); },
    impunit: (el) => { S.importText = $('#imp').value; S.impUnit = el.value; S.preview = null; rerender(); },
    impnewunit: (el) => { S.impNewUnit = el.value; },
    imppage: (el) => { S.impPage = el.value; },
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
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const offer = (w) => toast('Neue Version verfügbar.', 'Aktualisieren', () => w.postMessage('skipWaiting'));
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
      });
    }).catch(() => {});
    // Nur nach einem echten Update neu laden, nicht bei der allerersten Installation.
    let reloaded = false;
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  }

  // Für die automatischen Tests
  window.__teacup = { gradeEn, matchDe, matchEnSpeech, trackWrite, weakCats, catsIn, data: () => D, version: APP_VERSION };
  render();
})();
