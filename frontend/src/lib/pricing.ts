import type { Ingredient, IngredientCategory, Size } from '@/types/menu';

export interface PricingSelection {
  ingredient: Ingredient;
  count: number;
}

export interface PricingLine {
  ingredient: Ingredient;
  count: number;
  freeUnits: number;
  paidUnits: number;
  lineExtra: number;
}

export interface PricingResult {
  basePrice: number;
  extrasPrice: number;
  unitPrice: number; // por tigela (base + extras)
  lines: PricingLine[];
  countByCategory: Record<IngredientCategory, number>;
}

/**
 * Cálculo PURO de preço de uma tigela montada.
 *
 * Espelha 1:1 o que o backend faz: itera as seleções na ordem dada e usa as N
 * primeiras unidades de cada categoria como grátis (N = size.includedXxx),
 * cobrando o resto. Premium SEMPRE cobra (não usa inclusão).
 *
 * A ordem importa — se o usuário adicionou Banana antes de Morango, Banana
 * consome os slots grátis primeiro.
 */
export function calculateBowlPrice(
  size: Size,
  selections: PricingSelection[],
): PricingResult {
  let extrasPrice = 0;
  const usedFruits = { value: 0 };
  const usedToppings = { value: 0 };
  const usedSauces = { value: 0 };

  const counts: Record<IngredientCategory, number> = {
    FRUIT: 0,
    TOPPING: 0,
    SAUCE: 0,
    PREMIUM: 0,
  };

  const lines: PricingLine[] = [];

  for (const sel of selections) {
    if (sel.count <= 0) continue;
    counts[sel.ingredient.category] += sel.count;

    let freeUnits = 0;
    let paidUnits = 0;

    if (sel.ingredient.isPremium) {
      paidUnits = sel.count;
    } else {
      let used: { value: number };
      let included: number;
      switch (sel.ingredient.category) {
        case 'FRUIT':
          used = usedFruits;
          included = size.includedFruits;
          break;
        case 'TOPPING':
          used = usedToppings;
          included = size.includedToppings;
          break;
        case 'SAUCE':
          used = usedSauces;
          included = size.includedSauces;
          break;
        case 'PREMIUM':
        default:
          // categoria PREMIUM sem flag premium — cobra cheio (defensivo)
          paidUnits = sel.count;
          used = { value: 0 };
          included = 0;
          break;
      }

      if (sel.ingredient.category !== 'PREMIUM') {
        for (let i = 0; i < sel.count; i++) {
          used.value++;
          if (used.value <= included) freeUnits++;
          else paidUnits++;
        }
      }
    }

    const lineExtra = paidUnits * sel.ingredient.price;
    extrasPrice += lineExtra;
    lines.push({
      ingredient: sel.ingredient,
      count: sel.count,
      freeUnits,
      paidUnits,
      lineExtra,
    });
  }

  return {
    basePrice: size.price,
    extrasPrice: round2(extrasPrice),
    unitPrice: round2(size.price + extrasPrice),
    lines,
    countByCategory: counts,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
