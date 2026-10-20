// Ponto de entrada do backend Fastify.
import Fastify from 'fastify';
import cors from '@fastify/cors';
import routes from './routes.js';
import { prisma } from './lib/prisma.js';

const PORT = Number(process.env.PORT ?? 3333);
// Aceita várias origens separadas por vírgula (ex: produção + localhost).
const CORS_ORIGIN = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const IS_PROD = process.env.NODE_ENV === 'production';

// Em produção loga JSON puro (pino-pretty é só dependência de dev).
const fastify = Fastify({
  logger: IS_PROD
    ? true
    : {
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
