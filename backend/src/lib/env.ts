import 'dotenv/config';
import { z } from 'zod';

// Validação de variáveis de ambiente — em dev usa defaults pra deixar `npm run dev`
// rodar sem .env (claro, sem DB nenhuma rota que use Prisma vai funcionar).
// Em produção (NODE_ENV=production) DATABASE_URL e JWT_SECRET viram obrigatórios.
const isProd = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  DATABASE_URL: isProd
    ? z.string().url('DATABASE_URL inválida em produção')
    : z.string().optional().default(''),
  JWT_SECRET: isProd
    ? z.string().min(16, 'JWT_SECRET precisa ter ao menos 16 caracteres em produção')
    : z.string().min(1).default('dev-only-secret-troque-em-producao-min-32chars'),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TZ: z.string().default('America/Sao_Paulo'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
  VAPID_SUBJECT: z.string().optional().default('mailto:contato@casadoacai.com'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
