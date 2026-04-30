import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { requireAuth } from '../middlewares/auth.js';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /auth/login — autentica e devolve JWT (7d)
  app.post('/auth/login', async (req, reply) => {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      throw new AppError(401, 'Email ou senha inválidos');
    }

    const ok = await bcrypt.compare(body.password, user.password);
    if (!ok) {
      throw new AppError(401, 'Email ou senha inválidos');
    }

    const token = app.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: '7d' },
    );

    return reply.send({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  });

  // POST /auth/me — retorna o user a partir do token
  app.post('/auth/me', { preHandler: requireAuth }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      throw new AppError(404, 'Usuário não encontrado');
    }
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  });
};
