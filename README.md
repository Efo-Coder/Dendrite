# Dendrite

Moderne Notizen-App mit Rich-Text-Editor, Echtzeit-Kollaboration und sicherer Authentifizierung.

Live: [dendrite-notes.com](https://www.dendrite-notes.com)

---

## Features

- Rich-Text-Editor (Lexical) mit Toolbar, Bilder, Checklisten, Tabellen
- Ordner- und Tag-System
- Echtzeit-Kollaboration via WebSocket
- Notizen teilen (Share-Links)
- Anhänge / Datei-Upload
- Suchfunktion
- Dark Mode
- Authentifizierung: JWT, Email-Verifikation, Passwort-Reset, 2FA (TOTP), OAuth
- Abonnement-System (Stripe)

---

## Tech Stack

**Frontend**
- React 18, TypeScript, Vite
- Tailwind CSS v4
- Zustand (State Management)
- React Router v6
- Lexical (Editor)

**Backend**
- Node.js, Express, TypeScript
- Prisma ORM
- WebSocket (ws)
- Brevo (E-Mail)
- Stripe (Payments)

**Infrastruktur**
- PostgreSQL 16
- Docker & Docker Compose
- Hetzner Cloud CPX22

---

## Lokale Entwicklung

### Voraussetzungen

- Docker & Docker Compose
- Node.js 20+
- Git

### Setup

```bash
git clone https://github.com/Efo-Coder/Dendrite.git
cd Dendrite
cp .env.example .env   # Umgebungsvariablen anpassen
docker-compose up --build
```

| Dienst       | URL                      |
|--------------|--------------------------|
| Frontend     | http://localhost:5173    |
| Backend API  | http://localhost:3000    |
| PostgreSQL   | localhost:5432           |

### Nützliche Befehle

```bash
# Neu bauen und im Hintergrund starten
docker compose up -d --build

# Nur Backend
docker compose up backend

# Nur Frontend
docker compose up frontend

# Container stoppen
docker compose down

# Container + Volumes löschen
docker compose down -v
```

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
│       ├── pages/             # Seitenkomponenten (Route-Level)
│       ├── services/          # API-Aufrufe
│       ├── store/             # Zustand Stores
│       ├── hooks/             # Custom Hooks
│       ├── types/             # TypeScript-Typen
│       └── lib/               # Hilfsfunktionen
├── backend/
│   └── src/
│       ├── controllers/       # Request Handler
│       ├── routes/            # Express Router
│       ├── middleware/        # Auth-Middleware
│       ├── services/          # Business Logic (Email etc.)
│       ├── config/            # Konfiguration (Multer etc.)
│       └── utils/             # Hilfsfunktionen
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
├── docker-compose.yml
└── docker-compose.prod.yml
```

---

## Deployment (Produktion)

Server: Hetzner CPX22, Ubuntu — Repo unter `/opt/dendrite`

```bash
ssh root@178.105.243.68
deploy   # Alias für Pull + docker-compose.prod.yml rebuild
```

Env-Datei: `/opt/dendrite/.env.prod`

---

## Lizenz

MIT
