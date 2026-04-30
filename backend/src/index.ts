import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './lib/env.js';
import { prisma } from './lib/prisma.js';

// Bootstrap do servidor Fastify da Casa do Açaí
async function bootstrap() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
          : undefined,
    },
  });

  // CORS
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // JWT
  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  // Healthcheck
  app.get('/health', async () => ({
    status: 'ok',
    service: 'casadoacai-api',
    timestamp: new Date().toISOString(),
  }));

  // Rotas reais entram aqui (ex: app.register(produtosRoutes, { prefix: '/api' }))

  // Encerramento limpo do Prisma
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`🍇 Casa do Açaí API rodando em http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
