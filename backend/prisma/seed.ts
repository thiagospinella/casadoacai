/**
 * Seed inicial da Casa do Açaí.
 *
 * Roda com: `npm run seed` (configurado em package.json -> prisma.seed).
 *
 * Idempotência:
 * - Users: upsert por email
 * - Settings: upsert por id fixo ("default")
 * - OpeningHours: upsert por dayOfWeek
 * - Sizes / Ingredients / Combos: limpa em ordem reversa de FK e recria
 *   (não há chave única natural — rodar de novo redefine o cardápio do zero)
 */

import { PrismaClient, IngredientCategory, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SETTINGS_ID = 'default';
const BCRYPT_ROUNDS = 10;

async function seedUsers() {
  const adminHash = await bcrypt.hash('casadoacai123', BCRYPT_ROUNDS);
  const deliveryHash = await bcrypt.hash('motoboy2026', BCRYPT_ROUNDS);

  await prisma.user.upsert({
    where: { email: 'admin@casadoacai.com.br' },
    update: { password: adminHash, name: 'Administrador', role: Role.ADMIN },
    create: {
      email: 'admin@casadoacai.com.br',
      password: adminHash,
      name: 'Administrador',
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'motoboy@casadoacai.com.br' },
    update: { password: deliveryHash, name: 'Motoboy', role: Role.DELIVERY },
    create: {
      email: 'motoboy@casadoacai.com.br',
      password: deliveryHash,
      name: 'Motoboy',
      role: Role.DELIVERY,
    },
  });

  console.log('  ✓ Users (admin + motoboy)');
}

async function seedSettings() {
  await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: {
      storeName: 'Casa do Açaí',
      slogan: 'O melhor que você vai provar 😋',
      whatsapp: '13999999999',
      instagram: '@casadoacai013_',
      address: 'Santos/SP',
      deliveryFee: 5.0,
      minOrderValue: 15.0,
      preparationTime: 30,
      isOpen: true,
    },
    create: {
      id: SETTINGS_ID,
      storeName: 'Casa do Açaí',
      slogan: 'O melhor que você vai provar 😋',
      whatsapp: '13999999999',
      instagram: '@casadoacai013_',
      address: 'Santos/SP',
      deliveryFee: 5.0,
      minOrderValue: 15.0,
      preparationTime: 30,
      isOpen: true,
    },
  });

  console.log('  ✓ Settings');
}

async function seedOpeningHours() {
  // Todos os dias 14:00 às 02:00 (fecha de madrugada — closeTime < openTime indica
  // que cruza meia-noite, lógica fica no service que consulta horário).
  for (let day = 0; day < 7; day++) {
    await prisma.openingHours.upsert({
      where: { dayOfWeek: day },
      update: { openTime: '14:00', closeTime: '02:00', isOpen: true },
      create: {
        dayOfWeek: day,
        openTime: '14:00',
        closeTime: '02:00',
        isOpen: true,
      },
    });
  }

  console.log('  ✓ OpeningHours (7 dias, 14:00→02:00)');
}

async function seedMenu() {
  // Limpa cardápio em ordem reversa de FK pra rodar limpo
  await prisma.comboIngredient.deleteMany();
  await prisma.combo.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.size.deleteMany();

  // ---------- SIZES ----------
  const size250 = await prisma.size.create({
    data: {
      name: '250ml',
      volumeMl: 250,
      price: 15.0,
      includedFruits: 2,
      includedToppings: 2,
      includedSauces: 2,
      order: 1,
    },
  });

  const size500 = await prisma.size.create({
    data: {
      name: '500ml',
      volumeMl: 500,
      price: 30.0,
      includedFruits: 3,
      includedToppings: 4,
      includedSauces: 3,
      order: 2,
    },
  });

  const size750 = await prisma.size.create({
    data: {
      name: '750ml',
      volumeMl: 750,
      price: 40.0,
      includedFruits: 4,
      includedToppings: 5,
      includedSauces: 4,
      order: 3,
    },
  });

  console.log('  ✓ Sizes (250 / 500 / 750)');

  // ---------- INGREDIENTS ----------
  const fruits = ['Banana', 'Abacaxi', 'Morango', 'Kiwi', 'Uva', 'Manga'];
  const toppings = [
    'Amendoim',
    'Canudo wafer',
    'Confete',
    'Granola',
    'Ovomaltine',
    'Leite em pó',
    'Chocopoll',
    'Paçoca',
    'Sucrilhos',
    'Bis',
  ];
  const sauces = [
    'Caramelo',
    'Leite Condensado',
    'Morango',
    'Mel',
    'Chocolate',
  ];

  // Mapa nome -> id pra usar nos combos
  const ingredientByName: Record<string, string> = {};

  for (let i = 0; i < fruits.length; i++) {
    const ing = await prisma.ingredient.create({
      data: {
        name: fruits[i],
        category: IngredientCategory.FRUIT,
        price: 2.0,
        isPremium: false,
        order: i + 1,
      },
    });
    ingredientByName[fruits[i]] = ing.id;
  }

  for (let i = 0; i < toppings.length; i++) {
    const ing = await prisma.ingredient.create({
      data: {
        name: toppings[i],
        category: IngredientCategory.TOPPING,
        price: 1.5,
        isPremium: false,
        order: i + 1,
      },
    });
    ingredientByName[toppings[i]] = ing.id;
  }

  for (let i = 0; i < sauces.length; i++) {
    const ing = await prisma.ingredient.create({
      data: {
        name: sauces[i],
        category: IngredientCategory.SAUCE,
        price: 1.0,
        isPremium: false,
        order: i + 1,
      },
    });
    ingredientByName[sauces[i]] = ing.id;
  }

  // Premium — preço fixo, isPremium true (sempre cobra)
  const nutella = await prisma.ingredient.create({
    data: {
      name: 'Nutella',
      category: IngredientCategory.PREMIUM,
      price: 4.0,
      isPremium: true,
      order: 1,
    },
  });
  ingredientByName['Nutella'] = nutella.id;

  const cremeOvo = await prisma.ingredient.create({
    data: {
      name: 'Creme de Ovomaltine',
      category: IngredientCategory.PREMIUM,
      price: 5.0,
      isPremium: true,
      order: 2,
    },
  });
  ingredientByName['Creme de Ovomaltine'] = cremeOvo.id;

  console.log(
    `  ✓ Ingredients (${fruits.length} frutas + ${toppings.length} complementos + ${sauces.length} caldas + 2 premium)`,
  );

  // ---------- COMBOS ----------
  type ComboSeed = {
    name: string;
    description?: string;
    price: number;
    sizeId: string;
    order: number;
    ingredients: string[];
  };

  const combos: ComboSeed[] = [
    {
      name: 'Casa Especial',
      description: 'O combo da casa — equilibrado e cremoso',
      price: 32.0,
      sizeId: size500.id,
      order: 1,
      ingredients: [
        'Banana',
        'Morango',
        'Granola',
        'Leite em pó',
        'Leite Condensado',
      ],
    },
    {
      name: 'Pré-Treino',
      description: 'Energia pura pra antes do treino',
      price: 32.0,
      sizeId: size500.id,
      order: 2,
      ingredients: ['Banana', 'Granola', 'Amendoim', 'Mel'],
    },
    {
      name: 'Chocolovers',
      description: 'Pros viciados em chocolate',
      price: 38.0,
      sizeId: size500.id,
      order: 3,
      ingredients: [
        'Banana',
        'Paçoca',
        'Ovomaltine',
        'Nutella',
        'Chocolate',
      ],
    },
    {
      name: 'Frutado',
      description: 'Refrescante, cheio de fruta',
      price: 33.0,
      sizeId: size500.id,
      order: 4,
      ingredients: ['Morango', 'Abacaxi', 'Kiwi', 'Leite Condensado'],
    },
    {
      name: 'Tradicional',
      description: 'Combinação clássica no tamanho menor',
      price: 17.0,
      sizeId: size250.id,
      order: 5,
      ingredients: ['Banana', 'Granola', 'Leite Condensado'],
    },
  ];

  for (const c of combos) {
    await prisma.combo.create({
      data: {
        name: c.name,
        description: c.description,
        price: c.price,
        sizeId: c.sizeId,
        order: c.order,
        ingredients: {
          create: c.ingredients.map((ingName) => {
            const ingId = ingredientByName[ingName];
            if (!ingId) {
              throw new Error(
                `Ingrediente "${ingName}" não encontrado ao criar combo "${c.name}"`,
              );
            }
            return { ingredientId: ingId };
          }),
        },
      },
    });
  }

  console.log(`  ✓ Combos (${combos.length})`);

  // size750 não é usado em nenhum combo padrão, mas existe pra montagem custom
  void size750;
}

async function main() {
  console.log('🌱 Seed Casa do Açaí — iniciando...');
  await seedUsers();
  await seedSettings();
  await seedOpeningHours();
  await seedMenu();
  console.log('✅ Seed concluído.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error('❌ Seed falhou:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
