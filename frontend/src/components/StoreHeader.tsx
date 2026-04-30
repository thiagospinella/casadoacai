import { Link } from 'react-router-dom';
import { CasaLogo } from './CasaLogo';
import { cn } from '@/lib/utils';

interface StoreHeaderProps {
  slogan?: string | null;
  isOpen?: boolean;
  nextOpening?: string | null;
  sticky?: boolean;
}

export function StoreHeader({
  slogan,
  isOpen = true,
  nextOpening,
  sticky = true,
}: StoreHeaderProps) {
  return (
    <header
      className={cn(
        'bg-casa-purple text-white shadow-md',
        sticky && 'sticky top-0 z-30',
      )}
    >
      <div className="container max-w-3xl py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <CasaLogo size="md" showName={false} />
          <div className="leading-tight min-w-0">
            <div className="font-display font-bold text-lg sm:text-xl truncate">
              Casa do Açaí
            </div>
            {slogan && (
              <div className="text-[11px] sm:text-xs text-white/75 truncate">
                {slogan}
              </div>
            )}
          </div>
        </Link>

        <div
          className={cn(
            'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
            isOpen
              ? 'bg-casa-green/90 text-white'
              : 'bg-white/15 text-white/90',
          )}
          title={isOpen ? 'Loja aberta' : (nextOpening ?? 'Loja fechada')}
        >
          <span>{isOpen ? '🟢' : '🔴'}</span>
          <span>{isOpen ? 'Aberto' : 'Fechado'}</span>
        </div>
      </div>
    </header>
  );
}
