import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Verifica e decodifica o JWT. Em sucesso, popula req.user com o payload
 * (typed via src/types/fastify-jwt.d.ts).
 *
 * Retorna `true` se autenticado, `false` se não (e já enviou 401 na reply).
 */
async function verifyJwt(req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  try {
    await req.jwtVerify();
    return true;
  } catch {
    await reply.code(401).send({ error: 'Token inválido ou ausente' });
    return false;
  }
}

/** Aceita qualquer usuário autenticado (ADMIN ou DELIVERY). */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await verifyJwt(req, reply);
}

/** Apenas ADMIN. */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!(await verifyJwt(req, reply))) return;
  if (req.user.role !== 'ADMIN') {
    await reply.code(403).send({ error: 'Acesso restrito a administradores' });
  }
}

/** Apenas DELIVERY (motoboy). */
export async function requireDelivery(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!(await verifyJwt(req, reply))) return;
  if (req.user.role !== 'DELIVERY') {
    await reply.code(403).send({ error: 'Acesso restrito ao motoboy' });
  }
}
