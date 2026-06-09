FROM node:22-slim

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true

# Installiere OpenSSL, Chromium und benötigte Abhängigkeiten
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    chromium \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libxshmfence1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

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
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run dev"]
