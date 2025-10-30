"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function initDatabase() {
    try {
        console.log('🔄 Prüfe Datenbankverbindung...');
        await prisma.$connect();
        console.log('✅ Datenbankverbindung erfolgreich');
        // Führe Migrations aus (wenn nötig)
        // In Produktion sollte dies separat gehandhabt werden
    }
    catch (error) {
        console.error('❌ Datenbankverbindung fehlgeschlagen:', error);
        process.exit(1);
    }
}
//# sourceMappingURL=initDatabase.js.map