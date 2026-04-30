import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { IngredientCategory } from '@/types/menu';

// ============================================================
// Tipos
// ============================================================

export interface BowlSelection {
  id: string;
  name: string;
  qty: number;
  category: IngredientCategory;
}

interface AcaiBowlProps {
  selections: BowlSelection[];
  sizeName: string | null;
  className?: string;
}

// ============================================================
// Layout do SVG
// ============================================================

const VIEW_W = 240;
const VIEW_H = 200;
const BOWL_TOP = 70;
const BOWL_BOTTOM = 175;
const BOWL_TOP_RX = 90;

// Fração de preenchimento do açaí por tamanho
const FILL_BY_SIZE: Record<string, number> = {
  '250ml': 0.45,
  '500ml': 0.75,
  '750ml': 0.95,
};

function fillForSize(sizeName: string | null): number | null {
  if (!sizeName) return null;
  return FILL_BY_SIZE[sizeName] ?? 0.5;
}

// rx aproximado da elipse na altura `y` (bowl é mais largo no topo)
function rxAtY(y: number): number {
  const t = (y - BOWL_TOP) / (BOWL_BOTTOM - BOWL_TOP); // 0 no topo, 1 no fundo
  // Curva côncava: rx diminui mais devagar no topo
  return BOWL_TOP_RX * Math.sqrt(Math.max(0, 1 - t));
}

// ============================================================
// Cores por ingrediente
// ============================================================

const FRUIT_COLOR: Record<string, string> = {
  Banana: '#F8D44C',
  Morango: '#E94D5F',
  Abacaxi: '#FFE680',
  Kiwi: '#8FBE3D',
  Uva: '#7B3FA8',
  Manga: '#FF8C42',
};

const TOPPING_COLOR: Record<string, string> = {
  Granola: '#A0743E',
  Amendoim: '#D4A574',
  Confete: '#FF6B9D',
  Bis: '#5C3617',
  Chocopoll: '#3F1E0D',
  Ovomaltine: '#B07A50',
  'Leite em pó': '#FFFCF0',
  Sucrilhos: '#E89B40',
  Paçoca: '#C49A6C',
  'Canudo wafer': '#DAB880',
};

const SAUCE_COLOR: Record<string, string> = {
  Caramelo: '#D89540',
  'Leite Condensado': '#FFFCF0',
  Morango: '#E94D5F',
  Mel: '#F4B942',
  Chocolate: '#5C3617',
};

const PREMIUM_COLOR: Record<string, string> = {
  Nutella: '#3B1E12',
  'Creme de Ovomaltine': '#B07A50',
};

function colorFor(name: string, category: IngredientCategory): string {
  if (category === 'FRUIT') return FRUIT_COLOR[name] ?? '#999';
  if (category === 'TOPPING') return TOPPING_COLOR[name] ?? '#888';
  if (category === 'SAUCE') return SAUCE_COLOR[name] ?? '#666';
  return PREMIUM_COLOR[name] ?? '#5C3617';
}

// ============================================================
// Posições determinísticas (offsets normalizados em [-0.85, 0.85])
// ============================================================

const FRUIT_POS_NORM: Array<{ xn: number; dy: number }> = [
  { xn: -0.7, dy: -3 }, { xn: -0.4, dy: -2 }, { xn: -0.1, dy: -4 },
  { xn: 0.2, dy: -2 }, { xn: 0.5, dy: -3 }, { xn: 0.75, dy: -1 },
  { xn: -0.55, dy: 4 }, { xn: -0.25, dy: 5 }, { xn: 0.05, dy: 4 },
  { xn: 0.35, dy: 5 }, { xn: 0.65, dy: 4 }, { xn: -0.85, dy: 1 },
];

const TOPPING_POS_NORM: Array<{ xn: number; dy: number }> = [
  { xn: -0.78, dy: -1 }, { xn: -0.62, dy: 2 }, { xn: -0.48, dy: -2 },
  { xn: -0.32, dy: 1 }, { xn: -0.18, dy: -3 }, { xn: -0.04, dy: 2 },
  { xn: 0.1, dy: -1 }, { xn: 0.24, dy: 3 }, { xn: 0.38, dy: -2 },
  { xn: 0.52, dy: 1 }, { xn: 0.66, dy: -3 }, { xn: 0.8, dy: 2 },
  { xn: -0.7, dy: 6 }, { xn: -0.45, dy: 7 }, { xn: -0.15, dy: 6 },
  { xn: 0.15, dy: 7 }, { xn: 0.45, dy: 6 }, { xn: 0.7, dy: 7 },
  { xn: -0.55, dy: -5 }, { xn: 0.0, dy: -5 }, { xn: 0.55, dy: -5 },
];

// ============================================================
// Componente
// ============================================================

export function AcaiBowl({ selections, sizeName, className }: AcaiBowlProps) {
  const fill = fillForSize(sizeName);
  const surfaceY =
    fill === null
      ? null
      : Math.round(BOWL_TOP + (BOWL_BOTTOM - BOWL_TOP) * (1 - fill));
  const surfaceRx = surfaceY === null ? 0 : rxAtY(surfaceY);

  // Expande seleções em "unidades" individuais com keys estáveis
  const fruitUnits = useMemo(
    () => expandUnits(selections.filter((s) => s.category === 'FRUIT')),
    [selections],
  );
  const toppingUnits = useMemo(
    () => expandUnits(selections.filter((s) => s.category === 'TOPPING')),
    [selections],
  );
  const sauceItems = useMemo(
    () => selections.filter((s) => s.category === 'SAUCE'),
    [selections],
  );
  const premiumItems = useMemo(
    () => selections.filter((s) => s.category === 'PREMIUM'),
    [selections],
  );

  const hasContent = surfaceY !== null;

  return (
    <div className={cn('relative w-full flex justify-center', className)}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-full w-auto max-w-full drop-shadow-md"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="acaiGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C2A9D" />
            <stop offset="60%" stopColor="#5D1A78" />
            <stop offset="100%" stopColor="#3D0F52" />
          </linearGradient>
          <linearGradient id="bowlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E8E0D0" />
          </linearGradient>
          <clipPath id="bowlClip">
            <path
              d={`M ${VIEW_W / 2 - BOWL_TOP_RX} ${BOWL_TOP}
                  L ${VIEW_W / 2 + BOWL_TOP_RX} ${BOWL_TOP}
                  Q ${VIEW_W / 2 + BOWL_TOP_RX} ${BOWL_BOTTOM} ${VIEW_W / 2} ${BOWL_BOTTOM}
                  Q ${VIEW_W / 2 - BOWL_TOP_RX} ${BOWL_BOTTOM} ${VIEW_W / 2 - BOWL_TOP_RX} ${BOWL_TOP} Z`}
            />
          </clipPath>
        </defs>

        {/* Folhinhas decorativas atrás */}
        <g opacity="0.6">
          <ellipse
            cx={28}
            cy={BOWL_BOTTOM - 18}
            rx={16}
            ry={6}
            fill="#5DB849"
            transform={`rotate(-25 28 ${BOWL_BOTTOM - 18})`}
          />
          <ellipse
            cx={VIEW_W - 28}
            cy={BOWL_BOTTOM - 18}
            rx={16}
            ry={6}
            fill="#5DB849"
            transform={`rotate(25 ${VIEW_W - 28} ${BOWL_BOTTOM - 18})`}
          />
        </g>

        {/* Sombra da tigela */}
        <ellipse
          cx={VIEW_W / 2}
          cy={BOWL_BOTTOM + 8}
          rx={BOWL_TOP_RX - 5}
          ry={5}
          fill="rgba(0,0,0,0.12)"
        />

        {/* Corpo da tigela */}
        <path
          d={`M ${VIEW_W / 2 - BOWL_TOP_RX} ${BOWL_TOP}
              L ${VIEW_W / 2 + BOWL_TOP_RX} ${BOWL_TOP}
              Q ${VIEW_W / 2 + BOWL_TOP_RX} ${BOWL_BOTTOM} ${VIEW_W / 2} ${BOWL_BOTTOM}
              Q ${VIEW_W / 2 - BOWL_TOP_RX} ${BOWL_BOTTOM} ${VIEW_W / 2 - BOWL_TOP_RX} ${BOWL_TOP} Z`}
          fill="url(#bowlGrad)"
          stroke="#3D0F52"
          strokeOpacity="0.18"
          strokeWidth="2"
        />

        {/* Borda superior da tigela */}
        <ellipse
          cx={VIEW_W / 2}
          cy={BOWL_TOP}
          rx={BOWL_TOP_RX}
          ry={9}
          fill="none"
          stroke="#3D0F52"
          strokeOpacity="0.22"
          strokeWidth="2"
        />

        {/* Açaí dentro */}
        {hasContent && surfaceY !== null && (
          <g clipPath="url(#bowlClip)">
            {/* Camada interna */}
            <rect
              x={VIEW_W / 2 - BOWL_TOP_RX}
              y={surfaceY}
              width={BOWL_TOP_RX * 2}
              height={BOWL_BOTTOM - surfaceY + 6}
              fill="url(#acaiGrad)"
            />
            {/* Superfície (elipse) */}
            <motion.ellipse
              key={`surface-${sizeName ?? 'none'}`}
              cx={VIEW_W / 2}
              cy={surfaceY}
              rx={surfaceRx}
              ry={Math.max(3, surfaceRx * 0.09)}
              fill="url(#acaiGrad)"
              initial={{ opacity: 0, scaleY: 0.6 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.35 }}
            />
            {/* Brilho sutil na superfície */}
            <ellipse
              cx={VIEW_W / 2 - surfaceRx * 0.4}
              cy={surfaceY - 1}
              rx={surfaceRx * 0.3}
              ry={2}
              fill="rgba(255,255,255,0.25)"
            />
          </g>
        )}

        {/* Caldas (drizzle) - desenhadas ANTES das frutas pra ficarem por baixo */}
        {hasContent && surfaceY !== null && (
          <AnimatePresence>
            {sauceItems.map((sauce, i) => (
              <motion.path
                key={`sauce-${sauce.id}`}
                d={drizzlePath(surfaceY, surfaceRx, i, sauceItems.length)}
                stroke={colorFor(sauce.name, 'SAUCE')}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.95 }}
                exit={{ pathLength: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                clipPath="url(#bowlClip)"
              />
            ))}
          </AnimatePresence>
        )}

        {/* Premium central blob */}
        {hasContent && surfaceY !== null && premiumItems.length > 0 && (
          <AnimatePresence>
            {premiumItems.map((p) => (
              <motion.g
                key={`premium-${p.id}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 14 }}
              >
                <ellipse
                  cx={VIEW_W / 2}
                  cy={surfaceY + 2}
                  rx={Math.min(34, surfaceRx * 0.55)}
                  ry={9}
                  fill={colorFor(p.name, 'PREMIUM')}
                  clipPath="url(#bowlClip)"
                />
                <ellipse
                  cx={VIEW_W / 2 - 6}
                  cy={surfaceY - 1}
                  rx={6}
                  ry={2.5}
                  fill="rgba(255,255,255,0.35)"
                />
              </motion.g>
            ))}
          </AnimatePresence>
        )}

        {/* Toppings (pontinhos pequenos) */}
        {hasContent && surfaceY !== null && (
          <AnimatePresence>
            {toppingUnits.map((unit, i) => {
              const pos = TOPPING_POS_NORM[i % TOPPING_POS_NORM.length]!;
              return (
                <motion.circle
                  key={unit.key}
                  cx={VIEW_W / 2 + pos.xn * surfaceRx * 0.95}
                  cy={surfaceY + pos.dy}
                  r={2.2}
                  fill={colorFor(unit.name, 'TOPPING')}
                  stroke="rgba(0,0,0,0.15)"
                  strokeWidth={0.4}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 18,
                    delay: i * 0.015,
                  }}
                />
              );
            })}
          </AnimatePresence>
        )}

        {/* Frutas (círculos coloridos maiores) */}
        {hasContent && surfaceY !== null && (
          <AnimatePresence>
            {fruitUnits.map((unit, i) => {
              const pos = FRUIT_POS_NORM[i % FRUIT_POS_NORM.length]!;
              return (
                <motion.g
                  key={unit.key}
                  initial={{
                    y: -50,
                    opacity: 0,
                    scale: 0.4,
                  }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 30, opacity: 0, scale: 0.5 }}
                  transition={{
                    type: 'spring',
                    stiffness: 240,
                    damping: 16,
                  }}
                >
                  <circle
                    cx={VIEW_W / 2 + pos.xn * surfaceRx * 0.85}
                    cy={surfaceY + pos.dy}
                    r={5.5}
                    fill={colorFor(unit.name, 'FRUIT')}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth={0.6}
                  />
                  {/* Brilho */}
                  <circle
                    cx={VIEW_W / 2 + pos.xn * surfaceRx * 0.85 - 1.8}
                    cy={surfaceY + pos.dy - 1.8}
                    r={1.6}
                    fill="rgba(255,255,255,0.45)"
                  />
                </motion.g>
              );
            })}
          </AnimatePresence>
        )}

        {/* Estado vazio */}
        {!hasContent && (
          <text
            x={VIEW_W / 2}
            y={(BOWL_TOP + BOWL_BOTTOM) / 2 + 4}
            textAnchor="middle"
            fontSize="11"
            fill="#5D1A78"
            opacity="0.45"
            style={{ fontFamily: 'Quicksand, system-ui, sans-serif' }}
          >
            Sua tigela aparecerá aqui
          </text>
        )}
      </svg>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function expandUnits(
  selections: BowlSelection[],
): Array<{ key: string; name: string }> {
  const result: Array<{ key: string; name: string }> = [];
  for (const sel of selections) {
    for (let i = 0; i < sel.qty; i++) {
      result.push({ key: `${sel.id}-${i}`, name: sel.name });
    }
  }
  return result;
}

/**
 * Calda em forma de "S" curvado escorrendo da superfície pra baixo.
 * Cada calda tem offset horizontal diferente pra não sobrepor.
 */
function drizzlePath(
  surfaceY: number,
  surfaceRx: number,
  idx: number,
  total: number,
): string {
  const span = surfaceRx * 1.3;
  const startXn = total === 1 ? 0 : (idx / (total - 1)) * 2 - 1; // -1..1
  const startX = VIEW_W / 2 + startXn * span * 0.45;
  const y0 = surfaceY - 2;
  const y1 = surfaceY + 14;
  const y2 = surfaceY + 26;
  return `M ${startX - 6} ${y0}
          Q ${startX + 4} ${y0 + 6} ${startX} ${y1}
          T ${startX + 8} ${y2}`;
}
