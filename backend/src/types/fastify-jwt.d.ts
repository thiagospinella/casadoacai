import '@fastify/jwt';

// Augmentation pra @fastify/jwt — define o shape do payload e do req.user
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: string;
      email: string;
      role: 'ADMIN' | 'DELIVERY';
    };
    user: {
      id: string;
      email: string;
      role: 'ADMIN' | 'DELIVERY';
    };
  }
}
