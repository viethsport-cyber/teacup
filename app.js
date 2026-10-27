'use strict';
/* Teacup – Englisch-Vokabeln (Stufe 1: Grundgerüst und Karteikarten)
   Alle Daten liegen nur auf diesem Gerät (localStorage). Kein Server, keine Anmeldung. */
(() => {
  const APP_VERSION = '1.0.0';
  const STORE_KEY = 'teacup-data';
  const SAFETY_KEY = 'teacup-data-tagessicherung';
  const SCHEMA = 1;
  const ROUND_MAX = 15;
  const NEW_PER_DAY = 10;
  // Tage bis zur nächsten Abfrage je Fach (6 = „Sitzt“, Kontrolle nach 30 Tagen)
  const INTERVAL = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14, 6: 30 };
  const BOX_NAME = { 1: 'Fach 1', 2: 'Fach 2', 3: 'Fach 3', 4: 'Fach 4', 5: 'Fach 5', 6: 'Sitzt' };
  const STATUS = { kommt: 'Kommt noch', aktuell: 'Aktuell', gelernt: 'Gelernt' };
  const POS = ['', 'Nomen', 'Verb', 'Adjektiv', 'Adverb', 'Präposition', 'Pronomen', 'Konjunktion', 'Zahlwort', 'Interjektion', 'Ausdruck'];

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

  const PHOTO_PROMPT = 'Wandle die Vokabeln auf diesem Foto (Green Line 1, Klett) in folgendes Format um.\n' +
    '- Eine Zeile pro Vokabel, Trennzeichen Semikolon.\n' +
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
      pin: null, stats: { days: {} }, newByDay: {}, lastBackupAt: null
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
  const normEn = (s) => String(s).replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  const isVerb = (v) => /verb/i.test(v.pos || '') || (!v.pos && /^to /i.test(v.en));
  function enCandidates(v) {
    const list = [v.en, ...(v.altEn || [])].map(normEn);
    if (D.settings.toOptional && isVerb(v)) list.slice().forEach((c) => { if (/^to /i.test(c)) list.push(c.slice(3)); });
    return list;
  }
  // Groß-/Kleinschreibung zählt nur dort, wo die Lösung Großbuchstaben hat (Namen, Wochentage, Monate, „I“).
  function caseOk(a, c) {
    const ta = a.split(' '), tc = c.split(' ');
    if (ta.length !== tc.length) return false;
    return tc.every((t, i) => (/[A-ZÄÖÜ]/.test(t) ? ta[i] === t : ta[i].toLowerCase() === t.toLowerCase()));
  }
  function gradeEn(answer, v) {
    const a = normEn(answer);
    const cands = enCandidates(v);
    if (!a) return { ok: false, kind: 'empty', target: cands[0] };
    for (const c of cands) if (caseOk(a, c)) return { ok: true, kind: 'ok', target: c };
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
    const ops = diffOps(normEn(answer), target);
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
  const tolerance = (len) => (len <= 3 ? 0 : len <= 7 ? 1 : 2);
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
  function matchEnSpeech(heard, v) {
    const target = normEn(v.en).toLowerCase().replace(/^to /, '').replace(/[^a-z' ]/g, '');
    let best = 'nochmal';
    for (const h of heard) {
      const hn = normEn(h).toLowerCase().replace(/^to /, '').replace(/[^a-z' ]/g, '').trim();
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
    return { list, hw: hw.length, due: due.length, fresh: freshPick.length, freshWaiting: fresh.length };
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
    return '<div class="boxes">' + [1, 2, 3, 4, 5, 6].map((b) => '<div><b>' + c[b] + '</b><span>' + (b === 6 ? 'Sitzt' : 'Fach ' + b) + '</span></div>').join('') + '</div>';
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
      main = '<div class="card"><h2 style="margin-top:0">Heute dran: ' + P.list.length + ' Wörter</h2><p class="muted">' + esc(parts.join(' · ')) + '</p>' +
        (D.settings.paperAllowed ? '<label class="check"><input type="checkbox" data-change="paper" ' + (D.settings.paperChosen ? 'checked' : '') + '> Ich schreibe auf Papier</label>' : '') +
        '<button class="btn big" data-act="start">Lernrunde starten</button></div>';
    } else {
      const seen = D.vocab.some((v) => prog(v.id).seen);
      main = '<div class="card good center"><p class="feedback">Alles erledigt für heute! 🎉</p><p>Morgen geht es weiter.</p>' +
        (seen ? '<button class="btn secondary" data-act="extra">Freiwillig üben</button><p class="small">Freiwilliges Üben ändert die Lernkartei nicht.</p>' : '') + '</div>';
    }
    app.innerHTML =
      '<div class="topbar"><h1>☕ Teacup</h1><button class="iconbtn" data-act="parent" aria-label="Elternbereich">⚙️' + (dot ? '<span class="badge-dot"></span>' : '') + '</button></div>' +
      '<div class="hero"><p style="font-size:1.3rem;margin:0"><b>Hallo' + name + '!</b></p></div>' + main +
      '<div class="card"><div class="row"><b>Heute gelernt</b><span class="spacer"></span><span>' + mins + ' von ' + goal + ' Min.</span></div>' +
      '<div class="progress" style="margin-top:8px"><div style="width:' + Math.min(100, Math.round((mins / goal) * 100)) + '%"></div></div>' +
      (mins >= goal ? '<p class="center"><b>Für heute geschafft! 💪</b> Weiterlernen ist freiwillig.</p>' : '') + '</div>' +
      '<div class="card"><h3 style="margin-top:0">Deine Lernkartei</h3>' + boxesHtml(boxCounts(true)) + '</div>' +
      (installEvt ? '<button class="btn secondary big" data-act="install">📲 App auf dem Startbildschirm installieren</button>' : '');
  }

  // ---------- Lernrunde ----------
  function startRound(extra) {
    let list;
    if (extra) {
      list = D.vocab.filter((v) => { const u = unitById(v.unitId); return u && u.status !== 'kommt' && prog(v.id).seen; });
      list = list.sort(() => Math.random() - 0.5).slice(0, 10);
    } else list = plan().list;
    if (!list.length) return;
    S.R = {
      extra, paper: D.settings.paperAllowed && D.settings.paperChosen,
      tasks: list.map((v) => ({ vid: v.id, pass: 1, isNew: !prog(v.id).seen })),
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
      if (ph === 'speak' && (T.pass === 1 || !S.R.speakOk[T.vid])) break;
      if (ph === 'repeat' && T.isNew && T.pass === 1) break;
      idx++;
    }
    if (idx < order.length) { T.phase = order[idx]; T.ui = {}; save(); return render(); }
    finishTask();
  }
  function finishTask() {
    const R = S.R, T = curTask();
    if (T.speakOk === true) R.speakOk[T.vid] = true;
    if (T.writeOk && (T.speakOk !== false)) R.doneWords.add(T.vid);
    else R.tasks.push({ vid: T.vid, pass: T.pass + 1, isNew: false, phase: 'write' });
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
      if (!R.extra) R.moves[T.vid] = recordWrite(T.vid, ok);
    } else if (ok) { const v = vocabById(T.vid); if (v && v.homework) { v.homework = false; save(); } }
    beep(ok);
  }
  function roundHeader() {
    const R = S.R, T = curTask();
    const pct = Math.round((R.doneWords.size / R.total) * 100);
    const label = T.pass > 1 ? 'Noch einmal üben' : 'Wort ' + Math.min(R.total, R.i + 1) + ' von ' + R.total;
    const steps = { write: '✏️ Schreiben', check: '✅ Kontrollieren', speak: '🗣️ Sprechen', repeat: '🔁 Nachsprechen' };
    return '<div class="topbar"><button class="iconbtn" data-act="quit" aria-label="Runde beenden">✕</button><h1 style="font-size:1.05rem">' + esc(label) + (R.extra ? ' · Extra' : '') + '</h1><span class="pill">' + steps[T.phase] + '</span></div>' +
      '<div class="progress"><div style="width:' + pct + '%"></div></div><div class="steps"><span>' + R.doneWords.size + ' geschafft</span><span>' + R.total + ' Wörter</span></div>';
  }
  const speakBtns = (text) => '<div class="speak-row"><button class="btn secondary" data-act="say" data-text="' + esc(text) + '">🔊 Anhören</button><button class="btn secondary" data-act="sayslow" data-text="' + esc(text) + '">🐢 Langsam</button></div>';
  function renderRound() {
    const T = curTask(), v = vocabById(T.vid);
    if (!v) { S.R.doneWords.add(T.vid); return finishTask(); }
    T.ui = T.ui || {};
    let body = '';
    const meta = [v.pos, unitById(v.unitId) ? unitById(v.unitId).name + (v.page ? ', S. ' + v.page : '') : ''].filter(Boolean).join(' · ');
    if (T.phase === 'write') {
      body = '<div class="card"><div class="prompt"><div class="label">Wie heißt das auf Englisch?</div><div class="word">' + esc(deText(v)) + '</div><div class="meta">' + esc(meta) + '</div></div>';
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
    if (v.note) h += '<div class="tip">💡 ' + esc(v.note) + '</div>';
    if (v.checked && (v.exEn || v.exDe)) h += '<p class="center"><i>' + esc(v.exEn) + '</i>' + (v.exDe ? '<br><span class="muted">' + esc(v.exDe) + '</span>' : '') + '</p>';
    return h;
  }
  function checkHtml(T, v) {
    if (S.R.paper && T.writeOk === undefined) {
      return '<div class="card"><div class="prompt"><div class="label">' + esc(deText(v)) + '</div><div class="solution">' + esc(v.en) + '</div></div>' + speakBtns(v.en) + extrasHtml(v) +
        '<p class="center"><b>Hast du es richtig geschrieben?</b> Vergleiche jeden Buchstaben.</p>' +
        '<div class="row"><button class="btn bad" data-act="paper-no">✗ Nicht gewusst</button><button class="btn good" data-act="paper-yes">✓ Gewusst</button></div></div>';
    }
    const g = T.grade || { kind: T.writeOk ? 'ok' : 'wrong', target: v.en };
    let h;
    if (T.writeOk) {
      h = '<div class="card good"><p class="feedback">✓ ' + esc(pick(['Richtig!', 'Super!', 'Klasse!', 'Genau!'])) + '</p><div class="solution">' + esc(v.en) + '</div>';
    } else {
      const msg = {
        near: 'Fast! Nur ein Buchstabe ist anders. Schau dir die rote Stelle an.',
        swap: 'Fast! Zwei Buchstaben sind vertauscht.',
        case: 'Fast! Achte auf die Großschreibung.',
        empty: 'Kein Problem, so lernst du es jetzt.',
        wrong: 'Noch nicht ganz. Schau dir die Lösung genau an.'
      }[g.kind] || '';
      h = '<div class="card bad"><p class="feedback">' + esc(msg) + '</p>';
      if (T.answer && !S.R.paper && lev(normEn(T.answer).toLowerCase(), g.target.toLowerCase()) <= Math.ceil(g.target.length / 2)) {
        const d = renderDiff(T.answer, g.target);
        h += '<p class="center small" style="margin-bottom:0">Deine Antwort</p><div class="diff">' + d.mine + '</div><p class="center small" style="margin-bottom:0">Richtig ist</p><div class="diff">' + d.sol + '</div>';
      } else h += (T.answer ? '<p class="center small" style="margin-bottom:0">Deine Antwort</p><div class="diff"><s>' + esc(T.answer) + '</s></div>' : '') + '<p class="center small" style="margin-bottom:0">Richtig ist</p><div class="solution">' + esc(v.en) + '</div>';
      if (g.kind === 'case') h += '<p class="center small">Namen, Wochentage, Monate und „I“ schreibt man im Englischen groß.</p>';
    }
    h += speakBtns(v.en) + extrasHtml(v) + '</div>';
    if (!T.writeOk && T.answer && !S.R.paper) h += '<button class="btn ghost" data-act="iwasright">🙋 Ich war richtig</button>';
    if (T.ui.reported) h += '<p class="small center">Gemeldet. Papa oder Mama schauen es sich an.</p>';
    h += '<button class="btn big" data-act="next">Weiter</button>';
    return h;
  }
  function speakHtml(T, v) {
    const u = T.ui;
    let h = '<div class="card"><div class="prompt"><div class="label">Was heißt das auf Deutsch? Sag es laut.</div><div class="word">' + esc(v.en) + '</div></div>';
    if (u.result === undefined) {
      if (speechOn() && !u.selfMode) {
        h += '<div class="center"><button class="mic' + (u.listening ? ' listening' : '') + '" data-act="listen-de" aria-label="Sprechen">🎤</button><p>' + (u.listening ? 'Ich höre zu …' : esc(u.msg || 'Tippe aufs Mikrofon und sag die deutsche Bedeutung.')) + '</p></div>' +
          '<button class="btn ghost" data-act="self-de">Ohne Mikrofon weiter</button>';
      } else if (!u.revealed) {
        h += '<p class="center">Sag die deutsche Bedeutung laut. Dann deck auf.</p><button class="btn big" data-act="reveal-de">Aufdecken</button>';
      } else {
        h += '<div class="solution">' + esc(deText(v)) + '</div><div class="row"><button class="btn bad" data-act="de-no">✗ Nicht gewusst</button><button class="btn good" data-act="de-yes">✓ Gewusst</button></div>';
      }
      return h + '</div>';
    }
    if (u.result) h = '<div class="card good"><p class="feedback">✓ Richtig!</p><div class="solution">' + esc(deText(v)) + '</div>';
    else h = '<div class="card bad"><p class="feedback">Noch nicht ganz.</p>' + (u.heard ? '<p class="center small">Ich habe verstanden: „' + esc(u.heard) + '“</p>' : '') + '<p class="center small" style="margin-bottom:0">Richtig ist</p><div class="solution">' + esc(deText(v)) + '</div>';
    h += '</div>';
    if (!u.result && u.heard) h += '<button class="btn ghost" data-act="de-right">🙋 Ich war richtig</button>';
    return h + '<button class="btn big" data-act="next">Weiter</button>';
  }
  function repeatHtml(T, v) {
    const u = T.ui; u.tries = u.tries || 0;
    let h = '<div class="card"><div class="prompt"><div class="label">Neues Wort: Hör zu und sprich nach.</div><div class="word">' + esc(v.en) + '</div><div class="meta">' + esc(deText(v)) + '</div></div>' + speakBtns(v.en);
    if (speechOn() && !u.selfMode) {
      const fin = u.level === 'super' || u.tries >= 3;
      if (!fin) h += '<div class="center"><button class="mic' + (u.listening ? ' listening' : '') + '" data-act="listen-en" aria-label="Nachsprechen">🎤</button><p>' + (u.listening ? 'Ich höre zu …' : 'Tippe aufs Mikrofon und sprich nach.') + '</p></div>';
      if (u.level) {
        const fb = { super: ['good', '🌟 Super verstanden!'], fast: ['warn', 'Fast, hör noch mal hin.'], nochmal: ['bad', 'Noch mal probieren.'] }[u.level];
        h += '<div class="card ' + fb[0] + ' center"><p class="feedback">' + fb[1] + '</p>' + (u.heard ? '<p class="small">Ich habe verstanden: „' + esc(u.heard) + '“</p>' : '') + '</div>';
      } else if (u.msg) h += '<p class="center">' + esc(u.msg) + '</p>';
      if (u.tries >= 2 && u.level !== 'super') h += '<div class="tip">👄 ' + esc(v.checked && v.tip ? v.tip : 'Hör genau hin: Ich spreche es dir langsam vor. Achte auf jeden Laut.') + '</div>';
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
    let h = '<div class="hero"><div class="cup">🎉</div><h1>Runde geschafft!</h1></div><div class="card"><p><b>' + R.firstOk + ' von ' + R.total + '</b> Wörter beim ersten Mal richtig geschrieben.</p>';
    if (R.extra) h += '<p class="small">Extra-Übung: Die Lernkartei bleibt unverändert.</p>';
    else if (ups.length) h += '<p>' + ups.length + ' Wörter sind ein Fach weiter gekommen.</p>';
    h += '</div>';
    const rows = Object.entries(R.moves).map(([vid, m]) => { const v = vocabById(vid); return v ? '<li><span class="grow"><span class="en">' + esc(v.en) + '</span></span><span class="pill ' + (m.after > m.before ? 'good' : 'warn') + '">' + BOX_NAME[m.after] + '</span></li>' : ''; }).join('');
    if (rows) h += '<div class="card"><h3 style="margin-top:0">Deine Wörter</h3><ul class="list">' + rows + '</ul></div>';
    if (mins >= D.settings.dailyMinutes) h += '<div class="card good center"><p class="feedback">Für heute geschafft! 💪</p><p>Du kannst freiwillig weiterlernen.</p></div>';
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
    app.innerHTML = '<div class="topbar"><button class="iconbtn" data-act="home" aria-label="Zurück">←</button><h1>' + esc(title) + '</h1></div>' +
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
    const tabs = [['vocab', 'Vokabeln'], ['import', 'Importieren'], ['review', 'Prüfen' + (nRev ? ' (' + nRev + ')' : '')], ['settings', 'Einstellungen'], ['backup', 'Sicherung']];
    let h = '<div class="topbar"><button class="iconbtn" data-act="leave" aria-label="Elternbereich verlassen">←</button><h1>Elternbereich</h1></div>' +
      '<div class="tabs" role="tablist">' + tabs.map(([k, l]) => '<button role="tab" aria-selected="' + (S.tab === k) + '" data-act="tab" data-tab="' + k + '">' + esc(l) + '</button>').join('') + '</div>';
    if (backupDue() && S.tab !== 'backup') h += '<div class="card warn"><b>Erinnerung:</b> ' + (D.lastBackupAt ? 'Die letzte Sicherung ist über einen Monat her.' : 'Es gibt noch keine Sicherung.') + ' <button class="btn small" data-act="tab" data-tab="backup">Jetzt sichern</button></div>';
    if (S.tab === 'vocab') h += S.editId ? editHtml() : S.unitId ? unitHtml() : unitsHtml();
    if (S.tab === 'import') h += importHtml();
    if (S.tab === 'review') h += reviewHtml();
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
      '<p class="small">📝 = als Hausaufgabe markieren (kommt in der nächsten Runde zuerst dran).</p><ul class="list">' +
      words.map((v) => {
        const p = prog(v.id);
        return '<li><span class="grow"><span class="en">' + esc(v.en) + '</span><br><span class="de">' + esc(deText(v)) + ' · S. ' + esc(v.page) + '</span><br>' +
          '<span class="pill">' + (p.seen ? BOX_NAME[p.box] : 'neu') + '</span> ' + (v.homework ? '<span class="pill warn">Hausaufgabe</span> ' : '') + (needsReview(v) ? '<span class="pill bad">ungeprüft</span>' : '') + '</span>' +
          '<button class="iconbtn" data-act="hw" data-id="' + v.id + '" aria-label="Hausaufgabe" aria-pressed="' + !!v.homework + '" style="' + (v.homework ? 'background:var(--warn-soft);border-color:var(--warn)' : '') + '">📝</button>' +
          '<button class="iconbtn" data-act="edit" data-id="' + v.id + '" aria-label="Bearbeiten">✏️</button></li>';
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
      f('f-page', 'Seite *', v.page, 'z. B. 12') + f('f-en', 'Englisch *', v.en, 'z. B. to have breakfast') + f('f-de', 'Deutsch * (mehrere Bedeutungen mit / trennen)', deText(v), 'z. B. frühstücken') +
      '<label for="f-pos">Wortart</label><select id="f-pos">' + POS.map((p) => '<option' + (p === (v.pos || '') ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + (v.pos && !POS.includes(v.pos) ? '<option selected>' + esc(v.pos) + '</option>' : '') + '</select>' +
      f('f-note', 'Hinweis aus dem Buch', v.note, 'z. B. Plural: children') + '<h3>Zusatzinhalte</h3>' + f('f-exen', 'Beispielsatz Englisch', v.exEn) + f('f-exde', 'Beispielsatz Deutsch', v.exDe) + f('f-tip', 'Aussprachetipp', v.tip) +
      (v.altEn && v.altEn.length ? '<p class="small">Zusätzlich akzeptiert: ' + esc(v.altEn.join(', ')) + '</p>' : '') +
      '<label class="check"><input type="checkbox" id="f-checked" ' + (v.checked ? 'checked' : '') + '> Zusatzinhalte geprüft und freigegeben</label>' +
      '<p id="fmsg" class="small" style="color:var(--bad)"></p><div class="row"><button class="btn" data-act="saveword">Speichern</button>' + (isNew ? '' : '<button class="btn bad" data-act="delword">Löschen</button>') + '</div>' +
      (isNew ? '' : '<p class="small">Der Lernstand des Wortes bleibt beim Bearbeiten erhalten.</p>') + '</div>';
  }
  function saveWord() {
    const g = (id) => ($('#' + id).value || '').trim();
    const en = normEn(g('f-en')), de = g('f-de').split('/').map((s) => s.trim()).filter(Boolean);
    if (!g('f-unit') || !g('f-page') || !en || !de.length) { $('#fmsg').textContent = 'Bitte Unit, Seite, Englisch und Deutsch ausfüllen.'; return; }
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
  function parseImport(text) {
    const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
    if (!lines.length) return [];
    const delim = lines[0].includes('\t') ? '\t' : ';';
    let map = COLS;
    const first = splitLine(lines[0], delim).map((s) => s.toLowerCase().replace(/\s+/g, '_'));
    if (first.includes('englisch') || first.includes('english')) { map = first.map((c) => ALIAS[c] || c); lines.shift(); }
    const book = bookById(S.bookId) || D.books[0];
    const seen = new Set();
    return lines.map((line, n) => {
      const cells = splitLine(line, delim); const r = {};
      map.forEach((k, i) => { r[k] = cells[i] || ''; });
      const rec = { line: n + 1, bookName: r.buch || book.name, unit: r.unit, page: r.seite, en: normEn(r.englisch || ''), de: (r.deutsch || '').split('/').map((s) => s.trim()).filter(Boolean), pos: r.wortart, note: r.hinweis, exEn: r.beispiel_en, exDe: r.beispiel_de, tip: r.aussprache, errors: [] };
      if (!rec.unit) rec.errors.push('Unit fehlt'); if (!rec.page) rec.errors.push('Seite fehlt');
      if (!rec.en) rec.errors.push('Englisch fehlt'); if (!rec.de.length) rec.errors.push('Deutsch fehlt');
      const key = (rec.bookName + '|' + rec.unit + '|' + rec.en).toLowerCase();
      if (rec.en && seen.has(key)) rec.errors.push('doppelt in der Liste'); seen.add(key);
      const b = D.books.find((x) => x.name.toLowerCase() === rec.bookName.toLowerCase());
      const u = b && D.units.find((x) => x.bookId === b.id && x.name.toLowerCase() === (rec.unit || '').toLowerCase());
      rec.existing = u ? D.vocab.find((v) => v.unitId === u.id && v.en.toLowerCase() === rec.en.toLowerCase()) : null;
      rec.newUnit = !u;
      return rec;
    });
  }
  function importHtml() {
    let h = '<div class="card"><h3 style="margin-top:0">Liste einfügen</h3><p>Tabelle aus Excel kopieren oder Text im Importformat einfügen. Erste Zeile darf die Kopfzeile sein.</p>' +
      '<details><summary><b>Importformat anzeigen</b></summary><pre style="white-space:pre-wrap;font-size:16px">unit;seite;englisch;deutsch;wortart;hinweis;beispiel_en;beispiel_de;aussprache\nUnit 1;12;breakfast;Frühstück;Nomen;;I have breakfast at 7.;Ich frühstücke um 7.;\nUnit 1;13;child;Kind;Nomen;Plural: children;;;</pre><p class="small">Trennzeichen Semikolon (aus Excel: Tabulator, geht automatisch). Mehrere Bedeutungen mit Schrägstrich. Die Spalte „aussprache“ ist optional.</p></details>' +
      '<label for="imp">Vokabeln</label><textarea id="imp" placeholder="Hier einfügen …">' + esc(S.importText) + '</textarea>' +
      '<div class="row" style="margin-top:10px"><button class="btn secondary" data-act="sample">20 Testwörter einsetzen</button><button class="btn" data-act="preview">Vorschau</button></div></div>';
    if (S.preview) {
      const P = S.preview, ok = P.filter((r) => !r.errors.length), bad = P.length - ok.length;
      const nNew = ok.filter((r) => !r.existing).length, nUpd = ok.length - nNew;
      const newUnits = [...new Set(ok.filter((r) => r.newUnit).map((r) => r.unit))];
      h += '<div class="card"><h3 style="margin-top:0">Vorschau</h3><p><b>' + nNew + '</b> neu · <b>' + nUpd + '</b> werden aktualisiert (Lernstand bleibt) · <b' + (bad ? ' style="color:var(--bad)"' : '') + '>' + bad + '</b> mit Fehler (werden übersprungen)</p>' +
        (newUnits.length ? '<p>Neue Units: ' + esc(newUnits.join(', ')) + '</p><label for="imp-status">Status der neuen Units</label><select id="imp-status">' + Object.entries(STATUS).map(([k, l]) => '<option value="' + k + '"' + (k === 'aktuell' ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' : '') +
        '<label class="check"><input type="checkbox" id="imp-checked"> Beispielsätze und Aussprachetipps sind geprüft (sonst später unter „Prüfen“ freigeben)</label>' +
        '<div class="tablewrap"><table><thead><tr><th>#</th><th>Unit</th><th>S.</th><th>Englisch</th><th>Deutsch</th><th>Status</th></tr></thead><tbody>' +
        P.map((r) => '<tr' + (r.errors.length ? ' class="err"' : '') + '><td>' + r.line + '</td><td>' + esc(r.unit) + '</td><td>' + esc(r.page) + '</td><td>' + esc(r.en) + '</td><td>' + esc(r.de.join(' / ')) + '</td><td>' + (r.errors.length ? esc(r.errors.join(', ')) : r.existing ? 'aktualisieren' : 'neu') + '</td></tr>').join('') +
        '</tbody></table></div><div class="row" style="margin-top:12px"><button class="btn secondary" data-act="cancelimport">Verwerfen</button><button class="btn good" data-act="doimport"' + (ok.length ? '' : ' disabled') + '>' + ok.length + ' Wörter übernehmen</button></div></div>';
    }
    h += '<div class="card"><h3 style="margin-top:0">Foto-Weg (außerhalb der App)</h3><ol><li>Vokabelseite im Buch fotografieren.</li><li>Foto in einem Claude-Chat hochladen, zusammen mit dem Text unten.</li><li>Ergebnis prüfen, kopieren und oben einfügen.</li></ol>' +
      '<textarea readonly id="photoprompt" style="min-height:220px">' + esc(PHOTO_PROMPT) + '</textarea><button class="btn secondary" data-act="copyprompt" style="margin-top:10px">Text kopieren</button></div>';
    return h;
  }
  function doImport() {
    const rows = S.preview.filter((r) => !r.errors.length);
    const status = $('#imp-status') ? $('#imp-status').value : 'aktuell';
    const checked = $('#imp-checked').checked;
    let lastUnit = null;
    for (const r of rows) {
      let b = D.books.find((x) => x.name.toLowerCase() === r.bookName.toLowerCase());
      if (!b) { b = { id: uid(), name: r.bookName }; D.books.push(b); }
      let u = D.units.find((x) => x.bookId === b.id && x.name.toLowerCase() === r.unit.toLowerCase());
      if (!u) { u = { id: uid(), bookId: b.id, name: r.unit, status, order: D.units.length ? Math.max(...D.units.map((x) => x.order)) + 1 : 1 }; D.units.push(u); }
      lastUnit = u;
      let v = D.vocab.find((x) => x.unitId === u.id && x.en.toLowerCase() === r.en.toLowerCase());
      const fields = { unitId: u.id, page: r.page, en: r.en, de: r.de, pos: r.pos, note: r.note, exEn: r.exEn, exDe: r.exDe, tip: r.tip };
      if (v) {
        const extraChanged = v.exEn !== r.exEn || v.exDe !== r.exDe || v.tip !== r.tip;
        Object.assign(v, fields); if (extraChanged) v.checked = checked;
      } else D.vocab.push(Object.assign({ id: uid(), createdAt: Date.now() + D.vocab.length, homework: false, altEn: [], checked }, fields));
    }
    save();
    toast(rows.length + ' Wörter übernommen.');
    S.preview = null; S.importText = ''; S.tab = 'vocab'; S.unitId = lastUnit ? lastUnit.id : null; S.bookId = lastUnit ? lastUnit.bookId : S.bookId;
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
      '<button class="btn small good" data-act="approve" data-id="' + v.id + '">Freigeben</button><button class="iconbtn" data-act="edit" data-id="' + v.id + '" aria-label="Bearbeiten">✏️</button></li>').join('') + '</ul></div>';
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
      '<div class="card"><h3 style="margin-top:0">Stimme</h3><p>' + (gb ? 'Britische Stimme gefunden: ' + esc(gb.name) : 'Noch keine britische Stimme gefunden. Unter Android: Einstellungen → System → Sprachen → Text-in-Sprache → Google, Sprachdaten „English (United Kingdom)“ laden.') + '</p><button class="btn secondary" data-act="say" data-text="Hello! I am your English teacher.">🔊 Stimme testen</button></div>' +
      '<div class="card"><button class="btn secondary" data-act="changepin">PIN ändern</button>' + (installEvt ? ' <button class="btn secondary" data-act="install">App installieren</button>' : '') + '<p class="small">Teacup Version ' + APP_VERSION + ' · Alle Daten bleiben auf diesem Gerät.</p></div>';
  }

  // ---------- Sicherung ----------
  function backupHtml() {
    let h = '<div class="card"><h3 style="margin-top:0">Sicherung speichern</h3><p>Letzte Sicherung: <b>' + (D.lastBackupAt ? fmtDate(D.lastBackupAt) : 'noch keine') + '</b></p>' +
      '<p class="small">Die Datei enthält alle Vokabeln, den Lernstand und die Einstellungen. Bitte einmal im Monat sichern und die Datei z. B. per E-Mail an sich selbst schicken oder in Google Drive ablegen.</p>' +
      '<div class="row"><button class="btn" data-act="export">⬇️ Sicherung herunterladen</button>' + (navigator.canShare ? '<button class="btn secondary" data-act="share">📤 Teilen …</button>' : '') + '</div></div>' +
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
    preview: () => { S.importText = $('#imp').value; S.preview = parseImport(S.importText); if (!S.preview.length) toast('Keine Zeilen gefunden.'); rerender(); },
    cancelimport: () => { S.preview = null; rerender(); },
    doimport: () => doImport(),
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
    cancelrestore: () => { S.backupFile = null; rerender(); }
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
    bfile: (el) => { if (el.files && el.files[0]) readBackup(el.files[0]); }
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
  document.addEventListener('visibilitychange', () => { if (document.hidden) { tick(); save(); } else if (S.R) S.R.last = Date.now(); });

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
  window.__teacup = { gradeEn, matchDe, matchEnSpeech, data: () => D, version: APP_VERSION };
  render();
})();
