import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  IngredientCategory,
  type Ingredient,
  type Size,
  PaymentMethod,
  OrderItemType,
  OrderStatus,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import {
  getNextOpeningLabel,
  isStoreOpen,
} from '../lib/opening-hours.js';
import {
  buildWhatsAppMessage,
  generateWhatsAppLink,
  type OrderForMessage,
} from '../lib/whatsapp.js';

// ============================================================
// Helpers
// ============================================================

// Arredonda valores monetários pra 2 casas (evita ruído de float)
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Carrega settings (cria default se não existir — só pra evitar 500 em ambiente novo)
async function loadOrCreateSettings() {
  const existing = await prisma.settings.findFirst();
  if (existing) return existing;
  return prisma.settings.create({
    data: {
      storeName: 'Casa do Açaí',
      slogan: 'O melhor que você vai provar 😋',
      instagram: '@casadoacai013_',
      deliveryFee: 0,
      minOrderValue: 0,
      preparationTime: 30,
      isOpen: true,
    },
  });
}

// ============================================================
// Schemas zod do POST /orders
// ============================================================

const orderItemInputSchema = z
  .object({
    type: z.nativeEnum(OrderItemType),
    sizeId: z.string().min(1).optional(),
    comboId: z.string().min(1).optional(),
    quantity: z.number().int().min(1).max(10),
    ingredients: z
      .array(z.object({ ingredientId: z.string().min(1) }))
      .optional(),
    notes: z.string().max(300).optional(),
  })
  .refine(
    (item) =>
      item.type === OrderItemType.CUSTOM_BOWL ? !!item.sizeId : !!item.comboId,
    {
      message:
        'CUSTOM_BOWL exige sizeId; COMBO exige comboId',
    },
  );

const createOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z
    .string()
    .transform((s) => s.replace(/\D/g, ''))
    .pipe(z.string().min(10, 'Telefone deve ter ao menos 10 dígitos').max(13)),
  address: z.string().trim().min(5).max(200),
  reference: z.string().trim().max(120).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  changeFor: z.number().nonnegative().optional(),
  notes: z.string().trim().max(300).optional(),
  items: z.array(orderItemInputSchema).min(1, 'Pedido sem itens'),
});

// ============================================================
// Cálculo de preço
// ============================================================

interface CalculatedIngredient {
  ingredientId: string;
  ingredientName: string;
  ingredientCategory: IngredientCategory;
  isPaidExtra: boolean;
  extraPrice: number;
}

interface CalculatedItem {
  type: OrderItemType;
  sizeId: string | null;
  sizeName: string;
  sizeVolumeMl: number;
  comboId: string | null;
  comboName: string | null;
  quantity: number;
  basePrice: number;
  extrasPrice: number;
  subtotal: number;
  notes: string | null;
  ingredients: CalculatedIngredient[];
}

/**
 * Aplica regra de inclusos por tamanho:
 * - Premium: SEMPRE cobra (independente de incluso)
 * - FRUIT/TOPPING/SAUCE: as N primeiras (N = size.includedXxx) são grátis,
 *   o restante cobra ingredient.price por unidade.
 */
function calculateBowl(
  size: Size,
  ingredients: Ingredient[],
): { basePrice: number; extrasPrice: number; ingredients: CalculatedIngredient[] } {
  const basePrice = size.price;
  let extrasPrice = 0;
  let fruitsUsed = 0;
  let toppingsUsed = 0;
  let saucesUsed = 0;
  const result: CalculatedIngredient[] = [];

  for (const ing of ingredients) {
    let isPaidExtra = false;
    let extraPrice = 0;

    if (ing.isPremium) {
      isPaidExtra = true;
      extraPrice = ing.price;
    } else {
      switch (ing.category) {
        case IngredientCategory.FRUIT:
          fruitsUsed++;
          if (fruitsUsed > size.includedFruits) {
            isPaidExtra = true;
            extraPrice = ing.price;
          }
          break;
        case IngredientCategory.TOPPING:
          toppingsUsed++;
          if (toppingsUsed > size.includedToppings) {
            isPaidExtra = true;
            extraPrice = ing.price;
          }
          break;
        case IngredientCategory.SAUCE:
          saucesUsed++;
          if (saucesUsed > size.includedSauces) {
            isPaidExtra = true;
            extraPrice = ing.price;
          }
          break;
        case IngredientCategory.PREMIUM:
          // Premium não-flagged — defensivo: trata como cobrança fixa
          isPaidExtra = true;
          extraPrice = ing.price;
          break;
      }
    }

    if (isPaidExtra) extrasPrice += extraPrice;

    result.push({
      ingredientId: ing.id,
      ingredientName: ing.name,
      ingredientCategory: ing.category,
      isPaidExtra,
      extraPrice: round2(extraPrice),
    });
  }

  return {
    basePrice: round2(basePrice),
    extrasPrice: round2(extrasPrice),
    ingredients: result,
  };
}

// ============================================================
// Routes
// ============================================================

export const publicRoutes: FastifyPluginAsync = async (app) => {
  // ----------------------------------------------------------
  // GET /public/menu
  // ----------------------------------------------------------
  app.get('/public/menu', async () => {
    const [settings, hours, sizes, ingredients, combos] = await Promise.all([
      loadOrCreateSettings(),
      prisma.openingHours.findMany({ orderBy: { dayOfWeek: 'asc' } }),
      prisma.size.findMany({
        where: { active: true },
        orderBy: { order: 'asc' },
      }),
      prisma.ingredient.findMany({
        where: { available: true },
        orderBy: [{ category: 'asc' }, { order: 'asc' }],
      }),
      prisma.combo.findMany({
        where: { active: true },
        orderBy: { order: 'asc' },
        include: {
          size: true,
          ingredients: { include: { ingredient: true } },
        },
      }),
    ]);

    const open = isStoreOpen(settings, hours);
    const nextOpening = open ? null : getNextOpeningLabel(hours);

    // Agrupa ingredientes por categoria
    const grouped: Record<'fruits' | 'toppings' | 'sauces' | 'premium', Ingredient[]> = {
      fruits: [],
      toppings: [],
      sauces: [],
      premium: [],
    };
    for (const ing of ingredients) {
      switch (ing.category) {
        case IngredientCategory.FRUIT:
          grouped.fruits.push(ing);
          break;
        case IngredientCategory.TOPPING:
          grouped.toppings.push(ing);
          break;
        case IngredientCategory.SAUCE:
          grouped.sauces.push(ing);
          break;
        case IngredientCategory.PREMIUM:
          grouped.premium.push(ing);
          break;
      }
    }

    return {
      store: {
        name: settings.storeName,
        slogan: settings.slogan,
        whatsapp: settings.whatsapp,
        instagram: settings.instagram,
        address: settings.address,
        deliveryFee: Number(settings.deliveryFee),
        minOrderValue: Number(settings.minOrderValue),
        preparationTime: settings.preparationTime,
      },
      isOpen: open,
      nextOpeningTime: nextOpening,
      sizes: sizes.map((s) => ({
        id: s.id,
        name: s.name,
        volumeMl: s.volumeMl,
        price: s.price,
        includedFruits: s.includedFruits,
        includedToppings: s.includedToppings,
        includedSauces: s.includedSauces,
      })),
      ingredients: {
        fruits: grouped.fruits.map(serializeIngredient),
        toppings: grouped.toppings.map(serializeIngredient),
        sauces: grouped.sauces.map(serializeIngredient),
        premium: grouped.premium.map(serializeIngredient),
      },
      combos: combos.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        price: c.price,
        imageUrl: c.imageUrl,
        size: {
          id: c.size.id,
          name: c.size.name,
          volumeMl: c.size.volumeMl,
        },
        ingredients: c.ingredients.map((ci) => serializeIngredient(ci.ingredient)),
      })),
    };
  });

  // ----------------------------------------------------------
  // POST /public/orders
  // ----------------------------------------------------------
  app.post('/public/orders', async (req, reply) => {
    const body = createOrderSchema.parse(req.body);

    // 1) Loja aberta?
    const settings = await loadOrCreateSettings();
    const hours = await prisma.openingHours.findMany();
    if (!isStoreOpen(settings, hours)) {
      throw new AppError(400, 'Loja fechada no momento');
    }

    const deliveryFee = Number(settings.deliveryFee);
    const minOrderValue = Number(settings.minOrderValue);

    // 2) Pre-fetch de TODAS as referências em batch (evita N+1)
    const sizeIds = new Set<string>();
    const comboIds = new Set<string>();
    const ingredientIds = new Set<string>();
    for (const item of body.items) {
      if (item.type === OrderItemType.CUSTOM_BOWL && item.sizeId) {
        sizeIds.add(item.sizeId);
        for (const ing of item.ingredients ?? []) {
          ingredientIds.add(ing.ingredientId);
        }
      } else if (item.type === OrderItemType.COMBO && item.comboId) {
        comboIds.add(item.comboId);
      }
    }

    const [sizesArr, combosArr, ingredientsArr] = await Promise.all([
      sizeIds.size
        ? prisma.size.findMany({ where: { id: { in: [...sizeIds] }, active: true } })
        : Promise.resolve([]),
      comboIds.size
        ? prisma.combo.findMany({
            where: { id: { in: [...comboIds] }, active: true },
            include: { size: true, ingredients: { include: { ingredient: true } } },
          })
        : Promise.resolve([]),
      ingredientIds.size
        ? prisma.ingredient.findMany({ where: { id: { in: [...ingredientIds] } } })
        : Promise.resolve([]),
    ]);

    const sizeMap = new Map(sizesArr.map((s) => [s.id, s]));
    const comboMap = new Map(combosArr.map((c) => [c.id, c]));
    const ingredientMap = new Map(ingredientsArr.map((i) => [i.id, i]));

    // 3) Calcula cada item
    const calculated: CalculatedItem[] = [];
    for (const item of body.items) {
      if (item.type === OrderItemType.CUSTOM_BOWL) {
        const size = item.sizeId ? sizeMap.get(item.sizeId) : undefined;
        if (!size) {
          throw new AppError(400, `Tamanho não encontrado ou inativo`);
        }

        // Resolve ingredientes na ordem em que vieram do cliente
        const chosenIngs: Ingredient[] = [];
        for (const sel of item.ingredients ?? []) {
          const ing = ingredientMap.get(sel.ingredientId);
          if (!ing) {
            throw new AppError(400, `Ingrediente não encontrado`);
          }
          if (!ing.available) {
            throw new AppError(400, `Ingrediente "${ing.name}" indisponível`);
          }
          chosenIngs.push(ing);
        }

        const calc = calculateBowl(size, chosenIngs);
        const subtotal = round2((calc.basePrice + calc.extrasPrice) * item.quantity);

        calculated.push({
          type: OrderItemType.CUSTOM_BOWL,
          sizeId: size.id,
          sizeName: size.name,
          sizeVolumeMl: size.volumeMl,
          comboId: null,
          comboName: null,
          quantity: item.quantity,
          basePrice: calc.basePrice,
          extrasPrice: calc.extrasPrice,
          subtotal,
          notes: item.notes ?? null,
          ingredients: calc.ingredients,
        });
      } else {
        // COMBO
        const combo = item.comboId ? comboMap.get(item.comboId) : undefined;
        if (!combo) {
          throw new AppError(400, `Combo não encontrado ou inativo`);
        }

        const subtotal = round2(combo.price * item.quantity);

        calculated.push({
          type: OrderItemType.COMBO,
          sizeId: combo.size.id,
          sizeName: combo.size.name,
          sizeVolumeMl: combo.size.volumeMl,
          comboId: combo.id,
          comboName: combo.name,
          quantity: item.quantity,
          basePrice: round2(combo.price),
          extrasPrice: 0,
          subtotal,
          notes: item.notes ?? null,
          // Snapshot dos ingredientes do combo (todos como NÃO cobrados extra)
          ingredients: combo.ingredients.map((ci) => ({
            ingredientId: ci.ingredient.id,
            ingredientName: ci.ingredient.name,
            ingredientCategory: ci.ingredient.category,
            isPaidExtra: false,
            extraPrice: 0,
          })),
        });
      }
    }

    // 4) Totais e validações de valor
    const subtotal = round2(calculated.reduce((acc, c) => acc + c.subtotal, 0));
    if (subtotal < minOrderValue) {
      throw new AppError(
        400,
        `Pedido mínimo é R$ ${minOrderValue.toFixed(2).replace('.', ',')}`,
      );
    }
    const total = round2(subtotal + deliveryFee);

    // 5) changeFor só faz sentido em DINHEIRO
    let changeFor: number | null = null;
    if (body.paymentMethod === PaymentMethod.DINHEIRO && body.changeFor != null) {
      if (body.changeFor < total) {
        throw new AppError(
          400,
          `Valor pra troco (${body.changeFor.toFixed(2)}) deve ser >= total (${total.toFixed(2)})`,
        );
      }
      changeFor = body.changeFor;
    }

    // 6) Cria order com items + ingredients aninhados (atomic via Prisma)
    const created = await prisma.order.create({
      data: {
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        address: body.address,
        reference: body.reference ?? null,
        paymentMethod: body.paymentMethod,
        changeFor,
        notes: body.notes ?? null,
        subtotal,
        deliveryFee,
        total,
        status: OrderStatus.PENDING,
        items: {
          create: calculated.map((c) => ({
            type: c.type,
            sizeId: c.sizeId,
            sizeName: c.sizeName,
            sizeVolumeMl: c.sizeVolumeMl,
            comboId: c.comboId,
            comboName: c.comboName,
            quantity: c.quantity,
            basePrice: c.basePrice,
            extrasPrice: c.extrasPrice,
            subtotal: c.subtotal,
            notes: c.notes,
            ingredients: {
              create: c.ingredients.map((ing) => ({
                ingredientId: ing.ingredientId,
                ingredientName: ing.ingredientName,
                ingredientCategory: ing.ingredientCategory,
                isPaidExtra: ing.isPaidExtra,
                extraPrice: ing.extraPrice,
              })),
            },
          })),
        },
      },
      include: {
        items: { include: { ingredients: true } },
      },
    });

    // 7) Mensagem WhatsApp + link (telefone da loja)
    const message = buildWhatsAppMessage(created as OrderForMessage);
    const whatsappLink = settings.whatsapp
      ? generateWhatsAppLink(settings.whatsapp, message)
      : null;

    return reply.code(201).send({
      orderId: created.id,
      orderNumber: created.orderNumber,
      total: created.total,
      whatsappLink,
      whatsappMessage: message,
      preparationTime: settings.preparationTime,
    });
  });

  // ----------------------------------------------------------
  // GET /public/orders/:id
  // ----------------------------------------------------------
  app.get<{ Params: { id: string } }>('/public/orders/:id', async (req) => {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { ingredients: true } } },
    });
    if (!order) {
      throw new AppError(404, 'Pedido não encontrado');
    }

    const settings = await loadOrCreateSettings();
    const message = buildWhatsAppMessage(order as OrderForMessage);
    const whatsappLink = settings.whatsapp
      ? generateWhatsAppLink(settings.whatsapp, message)
      : null;

    return {
      order,
      whatsappLink,
      preparationTime: settings.preparationTime,
    };
  });

  // ----------------------------------------------------------
  // POST /public/orders/:id/cancel
  // ----------------------------------------------------------
  app.post<{ Params: { id: string } }>(
    '/public/orders/:id/cancel',
    async (req) => {
      const { id } = req.params;
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) {
        throw new AppError(404, 'Pedido não encontrado');
      }

      if (
        order.status !== OrderStatus.PENDING &&
        order.status !== OrderStatus.PREPARING
      ) {
        throw new AppError(
          400,
          `Não é possível cancelar pedido no status ${order.status}`,
        );
      }

      const updated = await prisma.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: { items: { include: { ingredients: true } } },
      });

      return { order: updated };
    },
  );
};

// ============================================================
// Serializers
// ============================================================

function serializeIngredient(ing: Ingredient) {
  return {
    id: ing.id,
    name: ing.name,
    category: ing.category,
    price: ing.price,
    isPremium: ing.isPremium,
    available: ing.available,
  };
}
