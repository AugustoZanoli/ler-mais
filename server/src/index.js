// Ponto de entrada do backend Fastify.
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import routes from './routes.js';
import { prisma } from './lib/prisma.js';

const PORT = Number(process.env.PORT ?? 3333);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  }
});

await fastify.register(cors, {
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST']
});

await fastify.register(routes);

// Encerra o Prisma junto com o servidor.
fastify.addHook('onClose', async () => {
  await prisma.$disconnect();
});

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
