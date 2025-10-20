FROM node:20-slim@sha256:f679d7699517426eb148a5698c717477fd3f8a48f6c1eaf771e390a9bb8268c8

WORKDIR /app

# Installiere OpenSSL und andere Abhängigkeiten
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Installiere Abhängigkeiten
COPY package*.json ./
RUN npm install

# Kopiere Prisma Schema
COPY prisma ./prisma/

# Generiere Prisma Client
RUN npx prisma generate

# Kopiere Source Code
COPY . .

EXPOSE 3000

# Start-Script inline
CMD ["sh", "-c", "npx prisma db push && npm run dev"]
