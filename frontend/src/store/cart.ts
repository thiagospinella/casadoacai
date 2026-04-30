import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IngredientCategory } from '@/types/menu';

// ----- Tipos do carrinho (já calculados — não recalcula no checkout) -----

interface CartIngredientLine {
  ingredientId: string;
  ingredientName: string;
  category: IngredientCategory;
  count: number; // quantas unidades desse ingrediente
  freeUnits: number;
  paidUnits: number;
  lineExtra: number;
}

interface CartItemBase {
  id: string; // uuid local
  quantity: number;
  unitPrice: number; // preço por unidade da tigela/combo (já com extras se for bowl)
  notes?: string;
}

export interface CartItemBowl extends CartItemBase {
  type: 'CUSTOM_BOWL';
  sizeId: string;
  sizeName: string;
  sizeVolumeMl: number;
  basePrice: number;
  extrasPrice: number;
  ingredients: CartIngredientLine[];
}

export interface CartItemCombo extends CartItemBase {
  type: 'COMBO';
  comboId: string;
  comboName: string;
  sizeName: string;
  sizeVolumeMl: number;
  ingredients: Array<{
    ingredientId: string;
    ingredientName: string;
    category: IngredientCategory;
  }>;
}

export type CartItem = CartItemBowl | CartItemCombo;

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  // Derivados (calculados via seletores nas páginas)
}

function genId(): string {
  // crypto.randomUUID disponível em browsers modernos; fallback simples se não
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const newCartItemId = genId;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((s) => ({ items: [...s.items, item] })),
      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      updateQty: (id, qty) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(1, Math.min(10, qty)) } : i,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'casaacai.cart',
      version: 1,
    },
  ),
);

// ----- Selectors -----
export function selectCartCount(items: CartItem[]): number {
  return items.reduce((acc, i) => acc + i.quantity, 0);
}

export function selectCartSubtotal(items: CartItem[]): number {
  return items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
}
