import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountSelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function CountSelector({
  value,
  onChange,
  min = 0,
  max = 10,
  size = 'sm',
  disabled = false,
}: CountSelectorProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  const btnSize = size === 'md' ? 'h-10 w-10' : 'h-8 w-8';
  const textSize = size === 'md' ? 'text-base w-8' : 'text-sm w-6';

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        aria-label="Diminuir"
        className={cn(
          btnSize,
          'rounded-full flex items-center justify-center bg-casa-purple/10 text-casa-purple-dark hover:bg-casa-purple/20 transition disabled:opacity-30 disabled:cursor-not-allowed',
        )}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span
        className={cn(
          textSize,
          'text-center font-semibold tabular-nums text-casa-purple-dark',
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        aria-label="Aumentar"
        className={cn(
          btnSize,
          'rounded-full flex items-center justify-center bg-casa-purple text-white hover:bg-casa-purple-dark transition disabled:opacity-30 disabled:cursor-not-allowed',
        )}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
