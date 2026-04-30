import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { ZodError } from 'zod';
import { env } from './lib/env.js';
import { prisma } from './lib/prisma.js';
import { AppError } from './lib/errors.js';
import { authRoutes } from './routes/auth.js';
import { publicRoutes } from './routes/public.js';

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

  // Error handler global — converte zod/AppError em respostas HTTP coerentes
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: 'Validação falhou',
        issues: err.flatten(),
      });
    }
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({ error: err.message });
    }
    // Erro genérico — loga e devolve 500 sem vazar detalhes
    app.log.error(err);
    const statusCode = err.statusCode ?? 500;
    return reply.code(statusCode).send({
      error: statusCode >= 500 ? 'Erro interno do servidor' : err.message,
    });
  });

  // Healthcheck
  app.get('/health', async () => ({
    status: 'ok',
    service: 'casadoacai-api',
    timestamp: new Date().toISOString(),
  }));

  // Rotas
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(publicRoutes, { prefix: '/api' });

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
