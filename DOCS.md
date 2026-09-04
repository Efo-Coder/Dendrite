# Dendrite — Technische Dokumentation

Diese Datei enthält alles Technische: Stack, lokale Entwicklung, Aufbau des
Projekts und Deployment. Die Präsentation der App steht im
[README](README.md).

Ergänzend im Repo: [SETUP.md](SETUP.md) (Docker-Einstieg).

---

## Tech Stack

### Frontend

| Bereich | Verwendet |
|---|---|
| Basis | React 18, TypeScript 5.6, Vite 5.4 |
| Styling | Tailwind CSS v4, Base UI, lucide-react |
| State | Zustand 5 (mit `persist`) |
| Routing | React Router 6 |
| Editor | Lexical 0.37 (`@lexical/react`, `-rich-text`, `-list`, `-table`, `-markdown`, `-yjs`) |
| Kollaboration | Yjs 13, y-websocket |
| Animation | GSAP 3 + `@gsap/react`, Motion 12, Lenis (Smooth Scroll) |
| 3D / WebGL | Three.js, `@react-three/fiber`, `@react-three/drei`, OGL |
| Sonstiges | date-fns, turndown (HTML → Markdown), axios |

### Backend

| Bereich | Verwendet |
|---|---|
| Basis | Node.js, Express 4.21, TypeScript |
| Datenbank | PostgreSQL 16 über Prisma 5.22 |
| Kollaboration | `ws`, Yjs, y-protocols |
| Auth | JWT (`jsonwebtoken`), bcrypt, speakeasy + qrcode (TOTP-2FA) |
| E-Mail | nodemailer (SMTP über Brevo) |
| Zahlungen | Stripe 22 |
| PDF-Export | Puppeteer 25 |
| Uploads | multer |
| Sicherheit | helmet, express-rate-limit |
| KI | `@anthropic-ai/sdk` — Modell in `backend/src/controllers/ai.controller.ts` |

### Infrastruktur

PostgreSQL 16 · Docker & Docker Compose · nginx (Reverse Proxy, TLS) ·
Hetzner Cloud CPX22

---

## Lokale Entwicklung

### Voraussetzungen

- Docker & Docker Compose (Docker Desktop muss laufen)
- Node.js 20+
- Git

### Setup

```bash
git clone https://github.com/Efo-Coder/Dendrite.git
cd Dendrite
cp .env.example .env   # Umgebungsvariablen anpassen
docker compose up --build
```

| Dienst | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| PostgreSQL | localhost:5432 |

### Nützliche Befehle

```bash
# Neu bauen und im Hintergrund starten
docker compose up -d --build

# Einzelne Dienste
docker compose up backend
docker compose up frontend

# Container stoppen
docker compose down

# Container + Volumes löschen
docker compose down -v
```

Nach Änderungen an Paketen (`package.json`) muss das Image neu gebaut werden —
ein Neustart allein reicht nicht.

### Qualitätssicherung

In `frontend/` und `backend/` liegen jeweils `npm run lint` und
`npm run format`. Lint muss vor jedem Commit fehlerfrei sein.

---

## Projektstruktur

```
Dendrite/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── editor/        # Lexical Editor, Toolbar, Plugins
│       │   ├── landing/       # Landing-Page Sektionen
│       │   ├── modals/        # Alle Modal-Komponenten
│       │   ├── noteList/      # Notizenübersicht
│       │   ├── sidebar/       # Sidebar-Komponenten
│       │   └── ui/            # Wiederverwendbare UI-Elemente
│       ├── pages/             # Seiten- und View-Komponenten
│       ├── services/          # API-Aufrufe
│       ├── store/             # Zustand Stores
│       ├── hooks/             # Custom Hooks
│       ├── types/             # TypeScript-Typen
│       └── lib/               # Hilfsfunktionen
├── backend/
│   ├── src/
│   │   ├── controllers/       # Request Handler
│   │   ├── routes/            # Express Router
│   │   ├── middleware/        # Auth-Middleware
│   │   ├── services/          # Business Logic (E-Mail, Constellations etc.)
│   │   ├── config/            # Konfiguration (Multer etc.)
│   │   └── utils/             # Hilfsfunktionen
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
├── docs/screenshots/          # Bilder für das README
├── nginx/nginx.conf           # Reverse Proxy (Produktion)
├── docker-compose.yml
└── docker-compose.prod.yml
```

### Views statt Routen

Das Dashboard hat nur eine Route (`/*`). Die einzelnen Ansichten — `home`,
`spaces`, `library`, `notes`, `container`, `reflection`, `constellations`,
`explore`, `profile` — sind Komponenten-State in `DashboardPage.tsx` und werden
in `sessionStorage['dendrite:nav']` gehalten, damit ein Reload dieselbe Ansicht
und die offene Notiz wiederherstellt. Der Editor ist ein Overlay, keine eigene
Route.

### API-Routen

`/api/…` mit den Bereichen `auth`, `note`, `space`, `folder`, `bookmark`,
`attachment`, `upload`, `collaborator`, `published`, `profile`, `notification`,
`reflection`, `reminder`, `constellation`, `checkout`, `feedback`, `ai`.
Kollaboration läuft separat über `/collaboration/` (WebSocket).

---

## Deployment (Produktion)

Server: Hetzner CPX22, Ubuntu — Repo unter `/opt/dendrite`.

```bash
ssh root@178.105.243.68
deploy   # Alias für Pull + Rebuild via docker-compose.prod.yml
```

Der Alias existiert nur in interaktiven Shells. Über SSH direkt:

```bash
ssh root@178.105.243.68 "bash -i -c 'deploy'"
```

Env-Datei auf dem Server: `/opt/dendrite/.env.prod`

### TLS-Zertifikate

Let's Encrypt für `dendrite-notes.de`, `www.dendrite-notes.de`,
`dendrite-notes.com` und `www.dendrite-notes.com`, erneuert vom
`certbot.timer` (zweimal täglich).

**Der Authenticator ist `webroot`, nicht `standalone`.** `standalone` kann hier
grundsätzlich nicht funktionieren: Es will Port 80 selbst binden, den hält aber
der nginx-Container. Dazu gehören drei Dinge, die zusammenbleiben müssen:

- Webroot `/var/www/certbot` auf dem Host, in `docker-compose.prod.yml` als
  `:ro` in den nginx-Container gemountet
- In `nginx/nginx.conf` steht im `:80`-Block `location
  /.well-known/acme-challenge/` **vor** dem Redirect, und der Redirect liegt in
  `location /`. Ein `return 301` direkt im Server-Block läuft vor dem
  Location-Matching und würde die ACME-Challenge wegleiten.
- Der Deploy-Hook `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh` führt
  `docker exec dendrite-nginx nginx -s reload` aus. Ohne ihn liefert nginx nach
  einer erfolgreichen Erneuerung weiter das alte Zertifikat aus dem Speicher.

Prüfen: `certbot certificates`, `certbot renew --dry-run`, und bei Verdacht
`journalctl -u certbot.service -n 40`.

---

## Screenshots erzeugen

Die Bilder in `docs/screenshots/` entstehen headless über Playwright gegen die
lokal laufende App. Die Mechanik (Login per Token-Injection in `localStorage`,
Ansichtswahl über `sessionStorage['dendrite:nav']`) ist im Skill
`.claude/skills/verifier-browser/` beschrieben.

Zu beachten:

- Der Cookie-Banner muss über `localStorage['dendrite-cookie-consent']`
  vorab bestätigt werden, sonst steht er mitten im Bild.
- Theme und `activeLine` liegen im Zustand-Store `dendrite-settings`
  (Version 8), nicht in eigenen Keys.
- Die Einblend-Animationen brauchen Zeit: Home und Library etwa 5 s, der Arbor
  rund 12 s. Zu früh ausgelöst, sind die Karten halb transparent oder die
  Visualisierung ist noch schwarz.
- JPEG statt PNG — bei zweifacher Auflösung ist PNG wegen der Cover-Fotos
  vier- bis fünfmal so groß.

---

## Lizenz

MIT
