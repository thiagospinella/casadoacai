import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Estado do wizard de montagem da tigela.
// Persistido em localStorage pra não perder progresso se o usuário recarregar.

interface WizardState {
  step: number; // 0..4
  sizeId: string | null;
  ingredients: Record<string, number>; // ingredientId -> qty (>0)
  quantity: number;
  notes: string;

  setStep: (step: number) => void;
  setSize: (id: string) => void;
  setIngredient: (id: string, qty: number) => void;
  setQuantity: (qty: number) => void;
  setNotes: (notes: string) => void;
  reset: () => void;
}

const STEP_MAX = 4;

const initial = {
  step: 0,
  sizeId: null,
  ingredients: {},
  quantity: 1,
  notes: '',
};

export const useWizard = create<WizardState>()(
  persist(
    (set) => ({
      ...initial,
      setStep: (step) => set({ step: Math.max(0, Math.min(STEP_MAX, step)) }),
      setSize: (sizeId) => set({ sizeId }),
      setIngredient: (id, qty) =>
        set((s) => {
          const next = { ...s.ingredients };
          if (qty <= 0) {
            delete next[id];
          } else {
            next[id] = Math.min(10, Math.floor(qty));
          }
          return { ingredients: next };
        }),
      setQuantity: (n) => set({ quantity: Math.max(1, Math.min(10, Math.floor(n))) }),
      setNotes: (notes) => set({ notes: notes.slice(0, 200) }),
      reset: () => set({ ...initial }),
    }),
    {
      name: 'casaacai.wizard',
      version: 1,
    },
  ),
);
