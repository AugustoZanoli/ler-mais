// Instância única do Prisma Client, reutilizada por toda a aplicação.
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
