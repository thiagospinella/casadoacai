import { Check, ChefHat, Clock, Package, Bike, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types/menu';

interface StatusTrackerProps {
  status: OrderStatus;
}

const STEPS: Array<{ key: OrderStatus; label: string; Icon: typeof Clock }> = [
  { key: 'PENDING', label: 'Recebido', Icon: Clock },
  { key: 'PREPARING', label: 'Preparando', Icon: ChefHat },
  { key: 'READY', label: 'Pronto', Icon: Package },
  { key: 'OUT_FOR_DELIVERY', label: 'Saiu pra entrega', Icon: Bike },
  { key: 'DELIVERED', label: 'Entregue', Icon: PartyPopper },
];

const STATUS_INDEX: Record<OrderStatus, number> = {
  PENDING: 0,
  PREPARING: 1,
  READY: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
  CANCELLED: -1,
};

export function StatusTracker({ status }: StatusTrackerProps) {
  if (status === 'CANCELLED') {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-center">
        <div className="text-4xl mb-2">😞</div>
        <div className="font-bold text-red-700">Pedido cancelado</div>
      </div>
    );
  }

  const currentIdx = STATUS_INDEX[status];

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <ol className="flex flex-col gap-1">
        {STEPS.map((step, i) => {
          const reached = i <= currentIdx;
          const isCurrent = i === currentIdx;
          const Icon = step.Icon;
          return (
            <li key={step.key} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center transition-colors',
                    reached
                      ? 'bg-casa-purple text-white'
                      : 'bg-casa-purple/10 text-casa-purple/40',
                  )}
                >
                  {reached && i < currentIdx ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-0.5 h-6 my-1',
                      i < currentIdx ? 'bg-casa-purple' : 'bg-casa-purple/15',
                    )}
                  />
                )}
              </div>
              <div
                className={cn(
                  'text-sm font-semibold transition-colors',
                  reached ? 'text-casa-purple-dark' : 'text-casa-purple-dark/40',
                  isCurrent && 'text-casa-purple',
                )}
              >
                {step.label}
                {isCurrent && (
                  <span className="ml-2 inline-block h-2 w-2 rounded-full bg-casa-green animate-pulse align-middle" />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
