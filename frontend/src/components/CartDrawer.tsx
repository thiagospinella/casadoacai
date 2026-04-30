import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart, selectCartSubtotal, type CartItem } from '@/store/cart';
import { Button } from './Button';
import { CountSelector } from './CountSelector';
import { formatBRL } from '@/lib/format';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  isStoreOpen: boolean;
  deliveryFee: number;
  minOrderValue: number;
}

export function CartDrawer({
  open,
  onClose,
  isStoreOpen,
  deliveryFee,
  minOrderValue,
}: CartDrawerProps) {
  const items = useCart((s) => s.items);
  const updateQty = useCart((s) => s.updateQty);
  const removeItem = useCart((s) => s.removeItem);
  const navigate = useNavigate();

  const subtotal = selectCartSubtotal(items);
  const total = subtotal + deliveryFee;
  const belowMin = subtotal < minOrderValue;

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-casa-cream rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-casa-purple/10">
              <h2 className="font-display text-2xl font-bold text-casa-purple-dark">
                Sua sacola
              </h2>
              <button
                onClick={onClose}
                className="h-9 w-9 rounded-full bg-white flex items-center justify-center text-casa-purple-dark hover:bg-white/80"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-12 text-casa-purple-dark/60">
                  <div className="text-6xl mb-3">🍇</div>
                  <p className="font-medium">Sua sacola está vazia</p>
                </div>
              ) : (
                items.map((item) => (
                  <CartItemCard
                    key={item.id}
                    item={item}
                    onQtyChange={(qty) => updateQty(item.id, qty)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-casa-purple/10 p-4 space-y-3 bg-white/50">
                <div className="flex justify-between text-sm text-casa-purple-dark/70">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatBRL(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-casa-purple-dark/70">
                  <span>Taxa de entrega</span>
                  <span className="tabular-nums">{formatBRL(deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-casa-purple-dark border-t border-casa-purple/10 pt-2">
                  <span>Total</span>
                  <span className="tabular-nums text-casa-purple">
                    {formatBRL(total)}
                  </span>
                </div>

                {belowMin && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 text-center">
                    Pedido mínimo: {formatBRL(minOrderValue)} — faltam{' '}
                    {formatBRL(minOrderValue - subtotal)}
                  </p>
                )}

                {!isStoreOpen && (
                  <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2 text-center">
                    Loja fechada — não é possível finalizar agora
                  </p>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={belowMin || !isStoreOpen}
                  onClick={handleCheckout}
                >
                  Finalizar pedido →
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ----- Sub-componente: card de item do carrinho -----

interface CartItemCardProps {
  item: CartItem;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}

function CartItemCard({ item, onQtyChange, onRemove }: CartItemCardProps) {
  const title =
    item.type === 'COMBO'
      ? `Combo ${item.comboName}`
      : `Tigela ${item.sizeName}`;

  const subtitle =
    item.type === 'COMBO'
      ? item.ingredients.map((i) => i.ingredientName).join(', ')
      : describeBowlIngredients(item.ingredients);

  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-casa-purple-dark">
            {title}
          </div>
          <div className="text-xs text-casa-purple-dark/60 mt-0.5 line-clamp-2">
            {subtitle || 'Sem extras'}
          </div>
          {item.notes && (
            <div className="text-xs italic text-casa-purple-dark/50 mt-1">
              Obs: {item.notes}
            </div>
          )}
        </div>
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 p-1"
          aria-label="Remover"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex justify-between items-center mt-3">
        <CountSelector value={item.quantity} onChange={onQtyChange} min={1} max={10} />
        <div className="font-bold text-casa-purple tabular-nums">
          {formatBRL(item.unitPrice * item.quantity)}
        </div>
      </div>
    </div>
  );
}

function describeBowlIngredients(
  ingredients: Array<{ ingredientName: string; count: number }>,
): string {
  return ingredients
    .map((i) => (i.count > 1 ? `${i.ingredientName} x${i.count}` : i.ingredientName))
    .join(', ');
}
