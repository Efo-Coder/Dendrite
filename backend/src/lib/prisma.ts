import { PrismaClient } from '@prisma/client';

// Single shared client — importing from here keeps controllers decoupled
// from the server bootstrap in index.ts.
export const prisma = new PrismaClient();
