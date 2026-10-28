#!/usr/bin/env python3
"""Macht aus der Testversion (beta/) die normale App im Hauptordner.

Aufruf:  python3 tools/beta_live.py <zielordner> <version>
Beispiel: python3 tools/beta_live.py . 2.0.0

Ändert nur Speicherschlüssel, Pfade, Namen und Versionsnummer. Die Daten von
Emma liegen im Gerät (localStorage 'teacup-data') und bleiben unberührt.
"""
import json, os, sys

src = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'beta')
dst = sys.argv[1] if len(sys.argv) > 1 else '.'
ver = sys.argv[2] if len(sys.argv) > 2 else '2.0.0'

def rd(n): return open(os.path.join(src, n), encoding='utf-8').read()
def wr(n, t): open(os.path.join(dst, n), 'w', encoding='utf-8').write(t)
def must(t, old, new):
    assert old in t, 'nicht gefunden: ' + old[:60]
    return t.replace(old, new)

a = rd('app.js')
a = must(a, "const STORE_KEY = 'teacup-beta-data';", "const STORE_KEY = 'teacup-data';")
a = must(a, "const LIVE_KEY = 'teacup-data';  // Testversion: Daten der normalen App nur lesen, nie schreiben", "const LIVE_KEY = 'teacup-data';")
a = must(a, "const BETA = true;", "const BETA = false;")
a = must(a, "const SAFETY_KEY = 'teacup-beta-tagessicherung';", "const SAFETY_KEY = 'teacup-data-tagessicherung';")
a = a.replace("'../vendor/", "'vendor/")
import re
a = re.sub(r"const APP_VERSION = '[^']+';", "const APP_VERSION = '%s';" % ver, a)
wr('app.js', a)

c = rd('styles.css').replace('url("../fonts/', 'url("fonts/')
wr('styles.css', c)

h = rd('index.html').replace('href="../icons/', 'href="icons/').replace('<title>Teacup Test</title>', '<title>Teacup – Englisch-Vokabeln</title>')
wr('index.html', h)

w = rd('sw.js')
w = must(w, "const CACHE = 'tcbeta-' + VERSION;", "const CACHE = 'teacup-' + VERSION;")
w = must(w, "k.startsWith('tcbeta-') && k !== CACHE", "k.startsWith('teacup-') && k !== CACHE && k !== VENDOR")
w = w.replace("'../icons/icon.svg', '../fonts/nunito-latin-wght-normal.woff2', '../fonts/nunito-latin-ext-wght-normal.woff2', '../icons/icon-192.png'",
              "'./icons/icon.svg', './fonts/nunito-latin-wght-normal.woff2', './fonts/nunito-latin-ext-wght-normal.woff2', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'")
w = re.sub(r"const VERSION = '[^']+';", "const VERSION = '%s';" % ver, w)
wr('sw.js', w)

m = json.loads(rd('manifest.webmanifest'))
m['name'] = 'Teacup – Englisch-Vokabeln'; m['short_name'] = 'Teacup'; m.pop('id', None)
for i in m['icons']: i['src'] = i['src'].replace('../', '')
open(os.path.join(dst, 'manifest.webmanifest'), 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, indent=2))
print('Live-Fassung', ver, 'geschrieben nach', os.path.abspath(dst))
