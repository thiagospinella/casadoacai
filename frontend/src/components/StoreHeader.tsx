import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface StoreHeaderProps {
  slogan?: string | null;
  isOpen?: boolean;
  nextOpening?: string | null;
}

const LOGO_SRC = '/casa-acai-logo.png.jpg';

export function StoreHeader({
  slogan,
  isOpen = true,
  nextOpening,
}: StoreHeaderProps) {
  return (
    <header className="bg-casa-purple-dark text-white shadow-sm shadow-casa-purple/20 sticky top-0 z-40">
      <div className="px-5 py-4 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3 min-w-0 flex-1">
          <img
            src={LOGO_SRC}
            alt="Casa do Açaí"
            className="h-10 w-10 rounded-full ring-2 ring-white/15 object-cover shrink-0"
          />
          <div className="leading-tight min-w-0">
            <div className="font-bold text-base truncate">Casa do Açaí</div>
            {slogan && (
              <div className="italic text-[11px] text-white/55 truncate">
                {slogan}
              </div>
            )}
          </div>
        </Link>

        <StatusPill isOpen={isOpen} nextOpening={nextOpening ?? null} />
      </div>
    </header>
  );
}

interface StatusPillProps {
  isOpen: boolean;
  nextOpening: string | null;
}

function StatusPill({ isOpen, nextOpening }: StatusPillProps) {
  return (
    <div
      className={cn(
        'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold',
        isOpen ? 'bg-casa-green/20 text-casa-green' : 'bg-red-500/20 text-red-300',
      )}
      title={isOpen ? 'Loja aberta' : (nextOpening ?? 'Loja fechada')}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
            isOpen ? 'bg-casa-green' : 'bg-red-400',
          )}
        />
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            isOpen ? 'bg-casa-green' : 'bg-red-400',
          )}
        />
      </span>
      <span>{isOpen ? 'Aberto' : 'Fechado'}</span>
    </div>
  );
}
