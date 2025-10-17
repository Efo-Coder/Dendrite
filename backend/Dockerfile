FROM node:20-slim

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
