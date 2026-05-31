# Dendrite Setup Guide

## Voraussetzungen

1. Docker Desktop muss laufen, bevor du die App startest

```

## Aktualisierung

Nach npm package downloads muss das docker image neu gebaut werden
1. Container stoppen: docker compose down
2. Container bauen:   docker compose -d --build


## Nach dem Start

Die Anwendung ist erreichbar unter:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Datenbank**: localhost:5432


### Container neu starten
```bash
docker-compose restart
```

### Container stoppen und Daten löschen
```bash
docker-compose down -v
```

### Logs anzeigen
```bash
# Alle Container
docker-compose logs -f

# Nur Backend
docker-compose logs -f backend

# Nur Frontend
docker-compose logs -f frontend
```

## Entwicklung

### Backend neu starten
```bash
docker-compose restart backend
```

### Frontend neu starten
```bash
docker-compose restart frontend
```

### Prisma Migrationen ausführen
```bash
docker-compose exec backend npx prisma migrate dev
```

### Prisma Studio öffnen
```bash
docker-compose exec backend npx prisma studio
```

## Problembehebung

### Port bereits in Verwendung
Wenn Port 3000 oder 5173 bereits verwendet wird:
1. Andere Anwendung stoppen
2. Oder in `docker-compose.yml` die Ports ändern

### Container startet nicht
```bash
docker-compose down -v
docker-compose up --build
```

### Datenbank-Verbindungsfehler
Warte 10-20 Sekunden nach dem Start - die Datenbank braucht etwas Zeit zum Starten.

### Frontend zeigt keine Daten
Überprüfe die Browser-Konsole (F12) auf Fehler und stelle sicher, dass das Backend läuft.

## Produktions-Deployment

Für Produktion:
1. Ändere alle Passwörter und Secrets in den `.env` Dateien
2. Setze `NODE_ENV=production`
3. Verwende HTTPS
4. Konfiguriere einen Reverse Proxy (nginx/Caddy)
5. Aktiviere automatische Backups für die Datenbank

## Features

- Notizen erstellen, bearbeiten, löschen
- Notizen anheften und favorisieren
- Ordner für Organisation
- Tags für Kategorisierung
- Schnelle Suche
- Auto-Save
- Responsive Design
- Elegantes dunkles Design mit grünen Akzenten

## Nächste Schritte

- Rich-Text Editor integrieren (z.B. TipTap)
- Dateianhänge hochladen
- Notizen teilen
- Collaborative Editing
- Mobile App
- Offline-Support
