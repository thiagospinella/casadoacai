// Tipos da API pública (espelham o que /api/public/menu devolve)

export type IngredientCategory = 'FRUIT' | 'TOPPING' | 'SAUCE' | 'PREMIUM';

export type PaymentMethod = 'PIX' | 'CARTAO' | 'DINHEIRO';

export type OrderStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type OrderItemType = 'CUSTOM_BOWL' | 'COMBO';

export interface Size {
  id: string;
  name: string;
  volumeMl: number;
  price: number;
  includedFruits: number;
  includedToppings: number;
  includedSauces: number;
}

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  price: number;
  isPremium: boolean;
  available: boolean;
}

export interface Combo {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  size: { id: string; name: string; volumeMl: number };
  ingredients: Ingredient[];
}

export interface StoreInfo {
  name: string;
  slogan: string | null;
  whatsapp: string | null;
  instagram: string | null;
  address: string | null;
  deliveryFee: number;
  minOrderValue: number;
  preparationTime: number;
}

export interface MenuResponse {
  store: StoreInfo;
  isOpen: boolean;
  nextOpeningTime: string | null;
  sizes: Size[];
  ingredients: {
    fruits: Ingredient[];
    toppings: Ingredient[];
    sauces: Ingredient[];
    premium: Ingredient[];
  };
  combos: Combo[];
}

// ----- Pedido (resposta de GET /orders/:id) -----

export interface OrderItemIngredientApi {
  id: string;
  ingredientId: string;
  ingredientName: string;
  ingredientCategory: string;
  isPaidExtra: boolean;
  extraPrice: number;
}

export interface OrderItemApi {
  id: string;
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
  ingredients: OrderItemIngredientApi[];
}

export interface OrderApi {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  address: string;
  reference: string | null;
  paymentMethod: PaymentMethod;
  changeFor: number | null;
  notes: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: OrderItemApi[];
}

export interface OrderResponse {
  order: OrderApi;
  whatsappLink: string | null;
  preparationTime: number;
}

// ----- POST /orders -----

export interface CreateOrderItemPayload {
  type: OrderItemType;
  sizeId?: string;
  comboId?: string;
  quantity: number;
  ingredients?: { ingredientId: string }[];
  notes?: string;
}

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  address: string;
  reference?: string;
  paymentMethod: PaymentMethod;
  changeFor?: number;
  notes?: string;
  items: CreateOrderItemPayload[];
}

export interface CreateOrderResponse {
  orderId: string;
  orderNumber: number;
  total: number;
  whatsappLink: string | null;
  whatsappMessage: string;
  preparationTime: number;
}
