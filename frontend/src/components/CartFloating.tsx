import { ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart, selectCartCount, selectCartSubtotal } from '@/store/cart';
import { formatBRL } from '@/lib/format';

interface CartFloatingProps {
  onClick: () => void;
}

export function CartFloating({ onClick }: CartFloatingProps) {
  const items = useCart((s) => s.items);
  const count = selectCartCount(items);
  const subtotal = selectCartSubtotal(items);

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          onClick={onClick}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-casa-purple text-white rounded-full pl-5 pr-3 py-3 shadow-2xl flex items-center gap-3 hover:bg-casa-purple-dark transition active:scale-95"
        >
          <div className="relative">
            <ShoppingBag className="h-6 w-6" />
            <span className="absolute -top-2 -right-2 bg-casa-green text-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
              {count}
            </span>
          </div>
          <div className="text-left leading-tight">
            <div className="text-[11px] font-medium opacity-80">Sacola</div>
            <div className="font-bold tabular-nums">{formatBRL(subtotal)}</div>
          </div>
          <div className="bg-white text-casa-purple text-xs font-bold px-3 py-2 rounded-full ml-1">
            Ver →
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
