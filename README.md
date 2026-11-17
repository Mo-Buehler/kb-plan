# KB Plan

Trainings-App für einen 16-Wochen-Plan mit Kettlebell, Rad und Knie-Programm. Sie läuft als Web-App (PWA) auf iPhone und iPad, speichert alle Eingaben nur auf dem Gerät und funktioniert ohne Internet.

Die Website ist öffentlich: https://mo-buehler.github.io/kb-plan/

**Datenschutz:** Der Code und die Plan-Datei (`src/data/plan-seed.json`) enthalten nur den Trainingsplan, keine persönlichen Angaben. Name, Alter, Größe, Startgewicht und alle Ergebnisse liegen ausschließlich im Browser-Speicher deines Geräts. Es gibt keinen Server, kein Login, keine Analyse- und keine externen Schriften oder Skripte.

## Was die App kann

- **Heute:** die Einheit des Tages, Hinweise zu Deload-Wochen und Phasenbeginn, Erinnerungen (Backup, überfällige Einträge).
- **Einheiten durchführen:** Kettlebell A und B (Warm-up, Knie-Block, Supersätze, Arm-Finisher, Cool-down) mit einem Tipp pro Satz, Pausentimer mit Ton, Technikhinweisen und RPE/Knieschmerz am Ende. Außerdem Rad (MyWhoosh-Workout und Ergebnis), Knie-Programm, Workout C (AMRAP-Timer), FTP- und Swing-Test.
- **Kalender:** Wochen 0 bis 16 mit Status (geplant, erledigt, ausgelassen, verschoben), Einheiten verschieben oder auslassen, Wochenstufe Voll/Kompakt/Minimum.
- **Plan bearbeiten:** Sätze, Wiederholungen, Zeit und Gewicht ändern (nur diese Woche oder alle folgenden), Ersatzübung bei Schmerzen. Der Originalplan bleibt unverändert.
- **Fortschritt:** Körpergewicht mit Zielkorridor und Kontrollpunkten, Taille, FTP, Swing-Test, Workout-C-Runden, Kettlebell-Gewicht und -Volumen, Erfüllungsquote. Regel-Hinweise sind nur Vorschläge und brauchen deine Bestätigung.
- **Mehr:** Checklisten, Einkaufsliste mit Bestellterminen, Backup und Import, Einstellungen.

## Installation auf iPhone und iPad

1. Öffne https://mo-buehler.github.io/kb-plan/ in **Safari**.
2. Tippe auf **Teilen** und dann auf **Zum Home-Bildschirm**.
3. Starte die App **vom Home-Bildschirm**.
4. Erst dort den Einrichtungsdialog ausfüllen.

> **Wichtig:** Erst installieren, dann nutzen. Die Home-Bildschirm-App speichert ihre Daten getrennt vom Safari-Tab. Was du vorher im Safari-Tab eingibst, ist in der installierten App nicht vorhanden.

Beim ersten Start öffnet die App einmal die Seite online und lädt sich komplett auf das Gerät. Danach funktioniert sie auch im Flugmodus.

**Updates:** Nach einer neuen Veröffentlichung zeigt die App beim nächsten Öffnen „Neue Version verfügbar". Tippe auf „Neu laden". Deine Daten bleiben dabei erhalten.

## Backup und Übertragung zwischen Geräten

Mehr, **Backup und Import**:

- **Sichern:** „Jetzt sichern" öffnet das iOS-Teilen-Menü. Wähle „In Dateien sichern" und einen Ordner in iCloud Drive. Nach 7 Tagen ohne Sicherung erinnert dich „Heute".
- **Importieren:** Sicherungsdatei wählen, Vorschau prüfen, bestätigen. Der Import **ersetzt alle Daten** auf dem Gerät.
- **iPhone zu iPad:** auf dem einen Gerät sichern, auf dem anderen importieren. Die Daten werden nicht automatisch synchronisiert. Importiere immer den neuesten Stand und arbeite danach auf einem Gerät weiter.

## Lokal starten (für Änderungen am Code)

Voraussetzung: Node.js 22 oder neuer.

```bash
npm install
npm run dev
```

Die App läuft dann unter `http://localhost:5173/kb-plan/`.

```bash
npm test          # Tests (Plan-Daten, Regeln, Backup, Speicher)
npm run build     # Produktions-Build in dist/
```

## Veröffentlichen

Jeder Push auf den Branch `main` startet den Workflow `.github/workflows/deploy.yml`. Er führt die Tests aus, baut die App und veröffentlicht sie auf GitHub Pages. Nach etwa einer Minute ist die neue Version online.

```bash
git add -A
git commit -m "Beschreibung der Änderung"
git push origin main
```

## Neuen Zyklus einspielen (neue `trainingsplan.md`)

Die Plan-Datei `trainingsplan.md` ist die einzige Quelle für Übungen, Sätze, Gewichte, Kalender, Zielgewichte und Regeln. Sie steht **nicht** im Repository, weil sie persönliche Angaben enthält.

1. Lege die neue `trainingsplan.md` in den Projektordner (gleiche Struktur wie bisher).
2. Erzeuge die Seed-Datei neu:
   ```bash
   npm run seed
   ```
   Das Skript bricht mit einer Fehlermeldung ab, wenn es eine Zelle nicht eindeutig lesen kann, und prüft, dass keine persönlichen Angaben aus Abschnitt 1 in der Seed-Datei landen.
3. Prüfe die Stichproben in `src/test/seed.test.ts` und passe sie an die neuen Werte an, dann `npm test`.
4. Den Planstart liest das Skript aus Abschnitt 1 („Planstart (Woche 1)", muss ein Montag sein). Alle Datumsangaben in der Datei (Kalender, Phasen, Zielgewichte, Einkaufsliste, MyWhoosh-Termine) müssen zu diesem Start passen. Den Start zu verschieben heißt also: alle Daten in `trainingsplan.md` um dieselbe Zahl Tage verschieben und `npm run seed` ausführen.
5. Committen und pushen (siehe oben).

**Was mit deinen Daten passiert:** Beim nächsten Öffnen erkennt die App den neuen Plan und zeigt „Neuer Trainingsplan erkannt". Nach deiner Bestätigung bleiben Messwerte, Einheiten, Sätze und Profil erhalten. Haken in Checklisten und Einkaufsliste bleiben, solange es den Eintrag im neuen Plan noch gibt. Plan-Änderungen, Verschiebungen, Wochenstufen und beantwortete Hinweise gehören zum alten Plan und werden zurückgesetzt. Ergebnisse, die du unter einem Datum des alten Plans erfasst hast, bleiben gespeichert, passen aber nicht mehr zu den Einheiten des neuen Kalenders. Sichere vorher deine Daten.

## Projektstruktur

| Pfad | Inhalt |
| --- | --- |
| `src/data/plan-seed.json` | Trainingsplan als Daten (ohne Personenbezug) |
| `scripts/build-seed.mjs` | erzeugt die Seed-Datei aus `trainingsplan.md` |
| `src/domain/` | reine Logik: Schritte einer Einheit, Kalender, Regeln, Fortschritt |
| `src/db/` | Speicher (IndexedDB über Dexie), Backup, Plan-Änderungen |
| `src/features/` | Bildschirme: Heute, Einheit, Kalender, Fortschritt, Mehr |
| `src/hooks/` | Timer, Bildschirm wach halten, Ton |
| `src/test/` | Tests |

## Abhängigkeiten

React und React Router (Oberfläche und Navigation), Dexie (IndexedDB, lokale Speicherung), Recharts (Diagramme, wird erst im Tab Fortschritt geladen), `vite-plugin-pwa` (Manifest, Service Worker, Offline), Vitest und `fake-indexeddb` (Tests).
