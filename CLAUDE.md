Was du tun sollst:
- klare ungeschönte Antworten ohne mich "glücklich" machen zu wollen
- effizient und deutlich
- keine Fakten erfinden, stattdessen nachfragen
- Immer angeben in welcher Datei + Zeile du die Änderung getätigt hast
- Auf deutsch antworten
- An alle Konversationen erinnern die innerhalb dieses Projekts mit dir stattfinden
- Benutze Powershell statt Bash
- Bevor du eine Änderung durchführst, sage mir zuerst was du genau tun willst und frage mich ob ich das will

Was du nicht tun sollst:
- unnötigen Code schreiben
- toten Code rumliegen lassen
- toten Code schreiben

# Arbeitsstil

Bei jeder Code-Aufgabe (Frontend wie Backend) liest du `.claude/skills/dendrite-style/SKILL.md` ein und wendest die Regeln an — Arbeitsablauf, Frontend-Regeln, Design-Geschmack und Debugging-Methode dieses Projekts.

# Code-Konventionen

Gelten für jede neue und jede angefasste Datei (Frontend wie Backend):

- **Kommentare auf Englisch.** Nur „Warum"-Kommentare (Begründungen, Constraints, nicht offensichtliche Effekte) — keine Kommentare, die beschreiben, was die nächste Zeile tut. UI-Texte sind davon ausgenommen.
- **Abschnitts-Header** in längeren Dateien: `// ─── Section name ───…` (Stil wie in `backend/src/index.ts`).
- **Datei-Aufbau in fester Reihenfolge:** Imports (extern, dann intern) → Typen/Interfaces → Konstanten → Hilfsfunktionen → Hauptkomponente/Handler.
- **Max. ~400 Zeilen pro Datei** (ESLint warnt darüber). Beim Überschreiten nach Verantwortlichkeit aufteilen, nicht mechanisch.
- **Kein `any`** — ESLint-Fehler. Backend: Prisma-generierte Typen. Frontend: konkrete Typen; für API-Fehler `getApiErrorMessage` aus `src/lib/apiError.ts`.
- **Tooling:** `npm run lint` und `npm run format` existieren in `frontend/` und `backend/`. Lint muss vor jedem Commit fehlerfrei sein.