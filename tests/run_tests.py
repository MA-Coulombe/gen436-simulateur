"""
Lance les pages de test dans Edge ou Chrome sans interface (headless) et affiche le résultat :
  - tests.html    : modèle de calcul (comparaison à reference.py, valeurs et équations du cours) ;
  - ui_tests.html : interface (curseurs, conventions, modes, préconfigurations, dynamique).

    python tests/run_tests.py

Code de retour 0 si toutes les vérifications passent.
"""
import html
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "google-chrome", "chromium", "chromium-browser", "msedge",
]


def find_browser():
    for c in CANDIDATES:
        if os.path.isfile(c):
            return c
        found = shutil.which(c)
        if found:
            return found
    sys.exit("Aucun navigateur Edge/Chrome trouvé : ouvrez tests/tests.html à la main.")


def dump_dom(url, budget_ms=20000, extra=()):
    cmd = [find_browser(), "--headless=new", "--disable-gpu", "--no-first-run",
           "--allow-file-access-from-files", f"--virtual-time-budget={budget_ms}",
           "--window-size=1800,1400", *extra, "--dump-dom", url]
    return subprocess.run(cmd, capture_output=True, timeout=600).stdout.decode("utf-8", "replace")


def run_page(name, budget_ms, extra=()):
    page = Path(__file__).resolve().parent / name
    dom = dump_dom(page.as_uri(), budget_ms, extra)
    status = re.search(r'data-status="(\w+)"', dom)
    out = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
    summary = re.search(r'<div id="summary"[^>]*>(.*?)</div>', dom, re.S)
    text = re.sub(r"<[^>]+>", "", out.group(1)) if out else dom[:2000]
    print(f"===== {name} =====")
    print(html.unescape(text))
    print(html.unescape(summary.group(1)) if summary else "Pas de résumé : la page n'a pas terminé.")
    return bool(status and status.group(1) == "PASS")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ok = run_page("tests.html", 20000)
    # Les tests d'interface lisent le simulateur dans un iframe : sous file://, il faut
    # désactiver la politique de même origine (profil temporaire, jeté ensuite).
    with tempfile.TemporaryDirectory() as prof:
        ok = run_page("ui_tests.html", 120000, ["--disable-web-security", f"--user-data-dir={prof}"]) and ok
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
