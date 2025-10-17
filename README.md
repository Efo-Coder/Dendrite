# Dendrite - Moderne Notizen-App

Eine leistungsstarke Notizen-Anwendung mit elegantem dunklen Design, die alles kann was Apple Notes kann - und mehr.

## Features

- 📝 Rich-Text Notizen
- 🎨 Elegantes dunkles Design (Dunkelgrau mit grünen Akzenten)
- 🔍 Schnelle Suche
- 📁 Ordner und Tags
- 🔒 Sichere Authentifizierung
- ☁️ Cloud-Synchronisation
- 📱 Responsive Design

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Datenbank**: PostgreSQL 16
- **Container**: Docker & Docker Compose

## Schnellstart

### Voraussetzungen

- Docker & Docker Compose installiert
- Git

### Installation

1. Repository klonen:
```bash
git clone <repository-url>
cd Dendrite
```

2. Alle Container starten:
```bash
docker-compose up --build
```

Die Anwendung läuft nun auf:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432

### Entwicklung

#### Backend separat starten
```bash
docker-compose up backend
```

#### Frontend separat starten
```bash
docker-compose up frontend
```

#### Container stoppen
```bash
docker-compose down
```

#### Container mit Daten löschen
```bash
docker-compose down -v
```

## Projektstruktur

```
Dendrite/
├── backend/           # Express Backend API
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── utils/
│   ├── prisma/
│   └── package.json
├── frontend/          # React Frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
└── docker-compose.yml
```

## Lizenz

MIT
