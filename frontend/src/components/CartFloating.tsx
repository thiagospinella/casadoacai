import { useEffect, useRef, useState } from 'react';
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

  const [pulse, setPulse] = useState(false);
  const prevCountRef = useRef(count);

  // Pulsa brevemente quando count aumenta (item adicionado)
  useEffect(() => {
    if (count > prevCountRef.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 250);
      prevCountRef.current = count;
      return () => clearTimeout(t);
    }
    prevCountRef.current = count;
    return undefined;
  }, [count]);

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1, scale: pulse ? 1.08 : 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          onClick={onClick}
          aria-label="Abrir sacola"
          className="fixed bottom-4 right-4 z-40 bg-casa-purple text-white rounded-2xl pl-4 pr-4 py-3 shadow-lg shadow-casa-purple/30 flex items-center gap-3 hover:bg-casa-purple-dark transition active:scale-95 min-h-[48px]"
        >
          <div className="relative">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -top-2 -right-2 bg-casa-green text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
              {count}
            </span>
          </div>
          <div className="text-left leading-tight">
            <div className="text-[10px] font-medium opacity-75 uppercase tracking-wide">
              Sacola
            </div>
            <div className="font-bold tabular-nums text-sm">
              {formatBRL(subtotal)}
            </div>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
