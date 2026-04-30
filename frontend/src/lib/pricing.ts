import type { IngredientCategory } from '@/types/menu';

// ============================================================
// Tipos
// ============================================================

export interface PricingIngredient {
  id: string;
  qty: number;
  category: IngredientCategory;
  price: number;
  isPremium: boolean;
  name?: string;
}

export interface PricingInput {
  size: {
    price: number;
    includedFruits: number;
    includedToppings: number;
    includedSauces: number;
  };
  ingredients: PricingIngredient[];
  quantity: number;
}

export interface CategoryBreakdown {
  totalQty: number;
  freeQty: number;
  paidQty: number;
  paidPrice: number;
}

export interface PremiumBreakdown {
  count: number;
  price: number;
}

export interface PricingLine {
  ingredient: PricingIngredient;
  freeUnits: number;
  paidUnits: number;
  lineExtra: number;
}

export interface PricingResult {
  basePrice: number;
  extrasPrice: number;
  premiumPrice: number;
  totalPerUnit: number;
  total: number;
  breakdown: {
    fruits: CategoryBreakdown;
    toppings: CategoryBreakdown;
    sauces: CategoryBreakdown;
    premium: PremiumBreakdown;
  };
  /** Por-ingrediente: quantas grátis, quantas pagas, valor cobrado. */
  lines: PricingLine[];
}

// ============================================================
// Lógica
// ============================================================

/**
 * REGRA:
 * - Premium SEMPRE cobra (qty * price).
 * - Não-premium: dentro de cada categoria, ordena por qty DESC e as
 *   `included` primeiras unidades (somando entre ingredientes) são grátis.
 *   O excedente cobra `price` por unidade.
 *
 * Como (no nosso modelo de dados) todos os ingredientes da mesma categoria
 * têm o mesmo preço, o TOTAL de extras independe de qual ingrediente foi
 * marcado como pago. A ordenação só afeta o BREAKDOWN por linha.
 */
export function calculateBowlPrice(input: PricingInput): PricingResult {
  const lines: PricingLine[] = [];

  const computeCategory = (
    category: 'FRUIT' | 'TOPPING' | 'SAUCE',
    included: number,
  ): CategoryBreakdown => {
    const items = input.ingredients
      .filter((i) => i.category === category && !i.isPremium)
      .slice()
      .sort((a, b) => b.qty - a.qty);

    let remainingFree = included;
    let totalQty = 0;
    let paidQty = 0;
    let paidPrice = 0;

    for (const item of items) {
      const free = Math.min(remainingFree, item.qty);
      const paid = item.qty - free;
      const lineExtra = paid * item.price;

      lines.push({
        ingredient: item,
        freeUnits: free,
        paidUnits: paid,
        lineExtra: round2(lineExtra),
      });

      totalQty += item.qty;
      paidQty += paid;
      paidPrice += lineExtra;
      remainingFree -= free;
    }

    return {
      totalQty,
      freeQty: Math.min(totalQty, included),
      paidQty,
      paidPrice: round2(paidPrice),
    };
  };

  const fruits = computeCategory('FRUIT', input.size.includedFruits);
  const toppings = computeCategory('TOPPING', input.size.includedToppings);
  const sauces = computeCategory('SAUCE', input.size.includedSauces);

  // Premium: sempre cobra cheio
  const premiumItems = input.ingredients.filter((i) => i.isPremium);
  let premiumCount = 0;
  let premiumPrice = 0;
  for (const item of premiumItems) {
    premiumCount += item.qty;
    const lineExtra = item.qty * item.price;
    premiumPrice += lineExtra;
    lines.push({
      ingredient: item,
      freeUnits: 0,
      paidUnits: item.qty,
      lineExtra: round2(lineExtra),
    });
  }

  const basePrice = round2(input.size.price);
  const extrasPrice = round2(
    fruits.paidPrice + toppings.paidPrice + sauces.paidPrice + premiumPrice,
  );
  const totalPerUnit = round2(basePrice + extrasPrice);
  const total = round2(totalPerUnit * input.quantity);

  return {
    basePrice,
    extrasPrice,
    premiumPrice: round2(premiumPrice),
    totalPerUnit,
    total,
    breakdown: {
      fruits,
      toppings,
      sauces,
      premium: { count: premiumCount, price: round2(premiumPrice) },
    },
    lines,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
