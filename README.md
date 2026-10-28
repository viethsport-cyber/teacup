# Teacup – Englisch-Vokabeln

Private Lern-App (PWA) für Englisch-Vokabeln, Green Line 1. Stufe 1: Grundgerüst und Karteikarten.

- Läuft komplett im Browser (Chrome), installierbar auf dem Startbildschirm, offline nutzbar.
- Alle Daten nur lokal auf dem Gerät (localStorage). Kein Server, keine Anmeldung, keine Kosten.
- Kein Build-Schritt: `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`, `icons/`.

Version 1.1: Schwerpunkt-Erkennung (Fehlerstellen je Laut-/Schreibmuster), Import per Kurzform, Textdatei und Foto (Tesseract.js, lokal in `vendor/`, Apache-2.0).

Version 2.0: Test-Turbo mit Probetest, PIN-Notfall-Code, Lernpfad (9 Aufgabentypen), Aufnahme/Vergleich, Silbenhilfe, Sammelsystem (Sterne, Begleiter, Truhe, Album, Abzeichen, Shop, Serie), Minispiele, Boss-Kampf.

Testversion: Ordner `beta/` (eigener Speicher). Live schalten mit `python3 tools/beta_live.py . <version>`.

Bei jedem Update die Versionsnummer in `sw.js` (`VERSION`) und `app.js` (`APP_VERSION`) erhöhen.
Gespeicherte Daten werden bei Updates nie gelöscht (`migrate()` ergänzt nur fehlende Felder).
