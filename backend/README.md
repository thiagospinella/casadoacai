# Casa do Açaí — Backend

API REST do sistema de delivery da Casa do Açaí.

## Stack
- Node 22 + Fastify 4
- Prisma 5 + PostgreSQL (Neon, sa-east-1)
- TypeScript (strict)
- Auth via JWT, validação com Zod

## Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Copiar e preencher variáveis de ambiente
cp .env.example .env
# Editar .env com a DATABASE_URL real (Neon) e JWT_SECRET

# 3. Gerar client do Prisma
npm run prisma:generate

# 4. Subir o servidor em modo dev (hot reload com tsx)
npm run dev
```

Servidor sobe em `http://localhost:3001`. Healthcheck: `GET /health`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Dev server com hot reload (tsx watch) |
| `npm run build` | Compila TS → JS em `dist/` |
| `npm start` | Roda `dist/index.js` (produção) |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate` | Cria/aplica migrations no banco |
| `npm run prisma:studio` | Abre o Prisma Studio (GUI do banco) |

## Estrutura

```
src/
├─ index.ts            # Bootstrap do Fastify
├─ lib/
│  ├─ env.ts           # Validação de env vars (zod)
│  └─ prisma.ts        # Singleton do Prisma Client
├─ routes/             # Rotas da API (criar conforme features)
└─ middlewares/        # Hooks/middlewares custom

prisma/
└─ schema.prisma       # Modelo de dados
```

## Porta
Roda em **3001** para coexistir com o KIPASTEL (que usa 3000).
