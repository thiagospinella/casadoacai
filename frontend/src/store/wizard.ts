import { create } from 'zustand';

// Estado do wizard de montagem da tigela.
// Ordem importa pra cálculo de inclusos — usamos array (não Map) pra preservar ordem.
// Cada entrada: { ingredientId, count }.

export interface WizardSelection {
  ingredientId: string;
  count: number;
}

interface WizardState {
  sizeId: string | null;
  fruits: WizardSelection[];
  toppings: WizardSelection[];
  sauces: WizardSelection[];
  premium: WizardSelection[];
  quantity: number;
  notes: string;

  setSize: (sizeId: string) => void;
  setIngredientCount: (
    category: 'fruits' | 'toppings' | 'sauces' | 'premium',
    ingredientId: string,
    count: number,
  ) => void;
  setQuantity: (n: number) => void;
  setNotes: (notes: string) => void;
  reset: () => void;
}

const initial = {
  sizeId: null,
  fruits: [],
  toppings: [],
  sauces: [],
  premium: [],
  quantity: 1,
  notes: '',
};

function setCount(
  list: WizardSelection[],
  ingredientId: string,
  count: number,
): WizardSelection[] {
  if (count <= 0) {
    return list.filter((s) => s.ingredientId !== ingredientId);
  }
  const idx = list.findIndex((s) => s.ingredientId === ingredientId);
  if (idx === -1) {
    return [...list, { ingredientId, count }];
  }
  const next = [...list];
  next[idx] = { ingredientId, count };
  return next;
}

export const useWizard = create<WizardState>()((set) => ({
  ...initial,
  setSize: (sizeId) => set({ sizeId }),
  setIngredientCount: (category, ingredientId, count) =>
    set((s) => ({
      [category]: setCount(s[category], ingredientId, count),
    })),
  setQuantity: (n) => set({ quantity: Math.max(1, Math.min(10, n)) }),
  setNotes: (notes) => set({ notes: notes.slice(0, 200) }),
  reset: () => set({ ...initial }),
}));
