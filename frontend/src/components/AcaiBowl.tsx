import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';

interface ToppingDot {
  id: string;
  emoji: string;
}

interface AcaiBowlProps {
  toppings: ToppingDot[];
  className?: string;
}

// Posições "tipo confete" pré-definidas dentro da boca da tigela
const POSITIONS: Array<{ x: number; y: number; rot: number }> = [
  { x: 32, y: 18, rot: -8 },
  { x: 60, y: 12, rot: 6 },
  { x: 88, y: 22, rot: -3 },
  { x: 116, y: 14, rot: 10 },
  { x: 144, y: 24, rot: -12 },
  { x: 46, y: 36, rot: 4 },
  { x: 76, y: 32, rot: -7 },
  { x: 102, y: 36, rot: 9 },
  { x: 130, y: 32, rot: -2 },
  { x: 56, y: 50, rot: 11 },
  { x: 86, y: 48, rot: -5 },
  { x: 116, y: 50, rot: 7 },
];

/**
 * Tigela de açaí estilizada (SVG inline). Cada topping recebe uma posição
 * fixa por índice — adicionar/remover ingredientes anima entrada/saída.
 */
export function AcaiBowl({ toppings, className }: AcaiBowlProps) {
  // Cap em 12 — depois disso, o último "fica trocando"
  const visible = useMemo(() => toppings.slice(0, POSITIONS.length), [toppings]);

  return (
    <div className={className}>
      <div className="relative w-full max-w-[260px] mx-auto aspect-[5/4]">
        <svg
          viewBox="0 0 200 160"
          className="w-full h-full drop-shadow-md"
          aria-hidden="true"
        >
          {/* Folhinhas decorativas */}
          <g opacity="0.6">
            <ellipse cx="20" cy="115" rx="14" ry="6" fill="#5DB849" transform="rotate(-25 20 115)" />
            <ellipse cx="180" cy="115" rx="14" ry="6" fill="#5DB849" transform="rotate(25 180 115)" />
          </g>

          {/* Tigela — corpo */}
          <defs>
            <linearGradient id="bowlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F2EBD8" />
            </linearGradient>
            <linearGradient id="acaiGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5D1A78" />
              <stop offset="100%" stopColor="#3D0F52" />
            </linearGradient>
          </defs>

          {/* Açaí dentro */}
          <ellipse cx="100" cy="68" rx="76" ry="14" fill="url(#acaiGrad)" />
          {/* Corpo da tigela */}
          <path
            d="M 18 70 Q 18 140 100 145 Q 182 140 182 70 Z"
            fill="url(#bowlGrad)"
            stroke="#3D0F52"
            strokeOpacity="0.15"
            strokeWidth="2"
          />
          {/* Borda superior */}
          <ellipse cx="100" cy="70" rx="82" ry="9" fill="none" stroke="#3D0F52" strokeOpacity="0.2" strokeWidth="2" />
          {/* Brilho */}
          <path
            d="M 30 90 Q 50 120 75 130"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.5"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        {/* Toppings sobrepostos com animação */}
        <div className="absolute inset-0 pointer-events-none">
          <AnimatePresence>
            {visible.map((t, i) => {
              const pos = POSITIONS[i] ?? POSITIONS[0]!;
              return (
                <motion.div
                  key={t.id}
                  initial={{ y: -40, opacity: 0, rotate: 0, scale: 0.6 }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    rotate: pos.rot,
                    scale: 1,
                  }}
                  exit={{ y: 30, opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 18 }}
                  className="absolute text-2xl select-none"
                  style={{
                    left: `${(pos.x / 200) * 100}%`,
                    top: `${((pos.y + 40) / 160) * 100}%`,
                  }}
                >
                  {t.emoji}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
