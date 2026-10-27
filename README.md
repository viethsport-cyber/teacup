# Teacup – Englisch-Vokabeln

Private Lern-App (PWA) für Englisch-Vokabeln, Green Line 1. Stufe 1: Grundgerüst und Karteikarten.

- Läuft komplett im Browser (Chrome), installierbar auf dem Startbildschirm, offline nutzbar.
- Alle Daten nur lokal auf dem Gerät (localStorage). Kein Server, keine Anmeldung, keine Kosten.
- Kein Build-Schritt: `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`, `icons/`.

Bei jedem Update die Versionsnummer in `sw.js` (`VERSION`) und `app.js` (`APP_VERSION`) erhöhen.
Gespeicherte Daten werden bei Updates nie gelöscht (`migrate()` ergänzt nur fehlende Felder).
