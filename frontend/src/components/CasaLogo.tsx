import { cn } from '@/lib/utils';

interface CasaLogoProps {
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: { img: 'h-9', name: 'text-base', slogan: 'text-[10px]' },
  md: { img: 'h-12', name: 'text-lg', slogan: 'text-xs' },
  lg: { img: 'h-20', name: 'text-3xl', slogan: 'text-sm' },
};

// Note: o arquivo no /public é "casa-acai-logo.png.jpg" (extensão dupla por
// como foi salvo). Mantemos referência exata pra evitar 404.
const LOGO_SRC = '/casa-acai-logo.png.jpg';

export function CasaLogo({
  showName = true,
  size = 'md',
  className,
}: CasaLogoProps) {
  const cls = sizeMap[size];
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src={LOGO_SRC}
        alt="Casa do Açaí"
        className={cn(cls.img, 'rounded-full ring-2 ring-white/40 object-cover')}
      />
      {showName && (
        <div className="leading-tight">
          <div className={cn('font-display font-bold text-white', cls.name)}>
            Casa do Açaí
          </div>
        </div>
      )}
    </div>
  );
}
