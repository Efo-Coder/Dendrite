import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function initDatabase() {
  try {
    console.log('🔄 Prüfe Datenbankverbindung...');
    await prisma.$connect();
    console.log('✅ Datenbankverbindung erfolgreich');

    // Führe Migrations aus (wenn nötig)
    // In Produktion sollte dies separat gehandhabt werden
  } catch (error) {
    console.error('❌ Datenbankverbindung fehlgeschlagen:', error);
    process.exit(1);
  }
}
