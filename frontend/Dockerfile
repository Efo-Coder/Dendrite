FROM node:20-slim

WORKDIR /app

# Installiere Abhängigkeiten
COPY package*.json ./
RUN npm install

# Kopiere Source Code
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
