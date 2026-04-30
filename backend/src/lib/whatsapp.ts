import type {
  Order,
  OrderItem,
  OrderItemIngredient,
  PaymentMethod,
} from '@prisma/client';

// Order com items aninhados (do jeito que o create devolve com include)
export interface OrderForMessage extends Order {
  items: Array<
    OrderItem & {
      ingredients: OrderItemIngredient[];
    }
  >;
}

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  PIX: 'Pix',
  CARTAO: 'Cartão na entrega',
  DINHEIRO: 'Dinheiro',
};

const CATEGORY_LABEL: Record<string, string> = {
  FRUIT: 'Frutas',
  TOPPING: 'Complementos',
  SAUCE: 'Caldas',
  PREMIUM: 'Premium',
};

const CATEGORY_ORDER = ['FRUIT', 'TOPPING', 'SAUCE', 'PREMIUM'] as const;

function fmtBRL(n: number): string {
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

function fmtPhone(digits: string): string {
  // Formata "13999999999" -> "(13) 99999-9999"
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

function groupIngredients(
  ingredients: OrderItemIngredient[],
): Map<string, OrderItemIngredient[]> {
  const map = new Map<string, OrderItemIngredient[]>();
  for (const ing of ingredients) {
    const arr = map.get(ing.ingredientCategory) ?? [];
    arr.push(ing);
    map.set(ing.ingredientCategory, arr);
  }
  return map;
}

/**
 * Monta a mensagem do WhatsApp a partir de um pedido completo.
 * Texto cru (não-HTML), com markdown leve do WhatsApp (*bold*, _italic_).
 */
export function buildWhatsAppMessage(order: OrderForMessage): string {
  const lines: string[] = [];

  lines.push(`🍇 *Casa do Açaí — Pedido #${order.orderNumber}*`);
  lines.push('');
  lines.push(`👤 *Cliente:* ${order.customerName}`);
  lines.push(`📱 *Telefone:* ${fmtPhone(order.customerPhone)}`);
  lines.push(`📍 *Endereço:* ${order.address}`);
  if (order.reference) {
    lines.push(`🧭 *Referência:* ${order.reference}`);
  }
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  for (const item of order.items) {
    if (item.type === 'COMBO') {
      lines.push(
        `🥣 *${item.quantity}x Combo ${item.comboName ?? ''} (${item.sizeName})*`,
      );
      // Lista ingredientes "como vem"
      const ingNames = item.ingredients.map((i) => i.ingredientName).join(', ');
      if (ingNames) lines.push(`   • ${ingNames}`);
    } else {
      lines.push(`🍨 *${item.quantity}x Tigela ${item.sizeName}*`);
      const grouped = groupIngredients(item.ingredients);
      for (const cat of CATEGORY_ORDER) {
        const ings = grouped.get(cat);
        if (!ings || ings.length === 0) continue;
        const formatted = ings
          .map((i) =>
            i.isPaidExtra
              ? `${i.ingredientName} (+${fmtBRL(i.extraPrice)})`
              : i.ingredientName,
          )
          .join(', ');
        lines.push(`   • ${CATEGORY_LABEL[cat] ?? cat}: ${formatted}`);
      }
    }
    if (item.notes) {
      lines.push(`   _Obs: ${item.notes}_`);
    }
    lines.push(`   _Subtotal: ${fmtBRL(item.subtotal)}_`);
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push(`💰 *Subtotal:* ${fmtBRL(order.subtotal)}`);
  lines.push(`🛵 *Taxa de entrega:* ${fmtBRL(order.deliveryFee)}`);
  lines.push(`*TOTAL: ${fmtBRL(order.total)}*`);
  lines.push('');
  lines.push(`💳 *Pagamento:* ${PAYMENT_LABEL[order.paymentMethod]}`);

  if (order.paymentMethod === 'DINHEIRO' && order.changeFor != null) {
    const troco = order.changeFor - order.total;
    lines.push(
      `💵 *Troco para:* ${fmtBRL(order.changeFor)} (troco: ${fmtBRL(Math.max(0, troco))})`,
    );
  }

  if (order.notes) {
    lines.push('');
    lines.push(`📌 *Observações:* ${order.notes}`);
  }

  return lines.join('\n');
}

/**
 * Gera link wa.me a partir do telefone (apenas dígitos) e da mensagem.
 * Assume DDI 55 (Brasil) — se o número já vier com 55, não duplica.
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const withDDI = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withDDI}?text=${encodeURIComponent(message)}`;
}
