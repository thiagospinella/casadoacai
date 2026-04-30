import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Instagram, MapPin, MessageCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { fetchMenu } from '@/lib/menu-api';
import type { Combo, MenuResponse } from '@/types/menu';
import { formatBRL, formatPhone } from '@/lib/format';
import { comboEmoji } from '@/lib/emoji';
import { StoreHeader } from '@/components/StoreHeader';
import { Button } from '@/components/Button';
import { CartFloating } from '@/components/CartFloating';
import { CartDrawer } from '@/components/CartDrawer';
import { useCart, newCartItemId, type CartItemCombo } from '@/store/cart';

export function Home() {
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const addItem = useCart((s) => s.addItem);

  useEffect(() => {
    fetchMenu()
      .then(setMenu)
      .catch(() => toast.error('Não conseguimos carregar o cardápio'))
      .finally(() => setLoading(false));
  }, []);

  const handleAddCombo = (combo: Combo) => {
    if (menu && !menu.isOpen) {
      toast.error('Loja fechada no momento');
      return;
    }
    const item: CartItemCombo = {
      id: newCartItemId(),
      type: 'COMBO',
      comboId: combo.id,
      comboName: combo.name,
      sizeName: combo.size.name,
      sizeVolumeMl: combo.size.volumeMl,
      unitPrice: combo.price,
      quantity: 1,
      ingredients: combo.ingredients.map((i) => ({
        ingredientId: i.id,
        ingredientName: i.name,
        category: i.category,
      })),
    };
    addItem(item);
    toast.success(`${combo.name} adicionado!`);
  };

  if (loading) {
    return (
      <PageFrame>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-3 animate-bounce">🍇</div>
            <p className="text-sm text-casa-purple-dark/70 font-medium">
              Carregando cardápio…
            </p>
          </div>
        </div>
      </PageFrame>
    );
  }

  if (!menu) {
    return (
      <PageFrame>
        <div className="min-h-[60vh] flex items-center justify-center px-5 text-center">
          <div>
            <div className="text-5xl mb-3">😕</div>
            <p className="text-casa-purple-dark font-semibold">
              Não foi possível carregar o cardápio.
            </p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Tentar de novo
            </Button>
          </div>
        </div>
      </PageFrame>
    );
  }

  const { store, isOpen, nextOpeningTime, combos } = menu;

  return (
    <PageFrame>
      <StoreHeader
        slogan={store.slogan}
        isOpen={isOpen}
        nextOpening={nextOpeningTime}
      />

      {/* Banner de fechado */}
      {!isOpen && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-5 py-3 text-[13px] leading-relaxed">
          <span className="font-semibold">Estamos fechados agora.</span>
          {nextOpeningTime ? <> {nextOpeningTime}.</> : null}
        </div>
      )}

      <main className="pb-32">
        {/* HERO */}
        <section className="px-5 pt-10 pb-2">
          <div className="flex items-start gap-3">
            <h1 className="font-display font-bold text-[34px] leading-[1.05] text-casa-purple-dark flex-1 tracking-tight">
              Sua tigela,
              <br />
              do seu jeito
            </h1>
            <span className="text-4xl mt-1 select-none -rotate-6" aria-hidden>
              🍇
            </span>
          </div>
          <p className="text-[15px] text-casa-purple-dark/65 mt-4 leading-relaxed max-w-[26ch]">
            Monte do zero ou escolha um combo. Tudo cremoso, fresquinho e
            entregue rapidinho.
          </p>
        </section>

        {/* CTA principal: Monte sua tigela */}
        <section className="px-5 pt-6">
          <Link to="/montar" className="block">
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg shadow-casa-purple/25 bg-gradient-to-br from-casa-purple to-casa-purple-dark"
            >
              {/* Decoração */}
              <span
                className="absolute -right-3 -top-3 text-7xl opacity-15 select-none rotate-12"
                aria-hidden
              >
                🍇
              </span>
              <span
                className="absolute right-12 -bottom-2 text-5xl opacity-15 select-none -rotate-12"
                aria-hidden
              >
                🍓
              </span>

              <div className="relative">
                <span className="inline-flex items-center bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded-full px-3 py-1 tracking-wider">
                  🌟 MAIS PEDIDO
                </span>
                <h2 className="font-display text-[28px] font-bold mt-3 leading-tight">
                  Monte sua tigela
                </h2>
                <p className="text-white/75 text-[13px] mt-2 leading-relaxed max-w-[28ch]">
                  Tamanho, frutas, complementos e caldas. Você escolhe tudo.
                </p>
                <div className="mt-5 bg-white text-casa-purple py-3 rounded-2xl font-semibold text-[15px] text-center w-full">
                  Começar agora →
                </div>
              </div>
            </motion.div>
          </Link>
        </section>

        {/* COMBOS — lista vertical */}
        <section className="px-5 pt-12">
          <h2 className="font-display text-[22px] font-bold text-casa-purple-dark leading-tight">
            Combos do dia
          </h2>
          <p className="text-[13px] text-casa-purple-dark/60 mt-0.5 mb-4">
            Já prontinhos pra você 😋
          </p>
          <div>
            {combos.map((combo) => (
              <ComboCard
                key={combo.id}
                combo={combo}
                disabled={!isOpen}
                onAdd={() => handleAddCombo(combo)}
              />
            ))}
          </div>
        </section>

        {/* INFO DA LOJA */}
        <section className="px-5 pt-12">
          <div className="bg-casa-purple-dark text-casa-cream rounded-2xl p-6 space-y-3.5 text-[14px]">
            <h3 className="font-display text-lg font-bold text-white mb-1">
              Casa do Açaí
            </h3>
            {store.address && (
              <InfoLine icon={<MapPin className="h-4 w-4" />} text={store.address} />
            )}
            {store.whatsapp && (
              <InfoLine
                icon={<MessageCircle className="h-4 w-4" />}
                text={formatPhone(store.whatsapp)}
                href={`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}`}
              />
            )}
            {store.instagram && (
              <InfoLine
                icon={<Instagram className="h-4 w-4" />}
                text={store.instagram}
                href={`https://instagram.com/${store.instagram.replace('@', '')}`}
              />
            )}
            <div className="pt-2 mt-2 border-t border-casa-cream/10">
              <InfoLine
                icon={<Clock className="h-4 w-4" />}
                text="Todos os dias 14h às 02h"
              />
            </div>
          </div>
        </section>

        {/* MICRO FOOTER */}
        <p className="text-center text-[11px] text-casa-purple-dark/40 py-6">
          Feito com 💜 pela{' '}
          <a
            href="https://wave-creations.pages.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:text-casa-purple transition-colors"
          >
            Wave Creations
          </a>
        </p>
      </main>

      <CartFloating onClick={() => setCartOpen(true)} />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        isStoreOpen={isOpen}
        deliveryFee={store.deliveryFee}
        minOrderValue={store.minOrderValue}
      />
    </PageFrame>
  );
}

// ============================================================
// PageFrame — wrapper mobile-first com decoração desktop
// ============================================================

interface PageFrameProps {
  children: React.ReactNode;
}

function PageFrame({ children }: PageFrameProps) {
  return (
    <div className="min-h-screen bg-casa-cream casa-side-decoration">
      <div className="max-w-md mx-auto bg-casa-cream min-h-screen relative lg:shadow-2xl lg:shadow-casa-purple/10">
        {children}
      </div>

      {/* Estilos locais — pattern só em lg+ pra dar moldura ao app */}
      <style>{`
        @media (min-width: 1024px) {
          .casa-side-decoration {
            background-color: #F2EBD8;
            background-image:
              radial-gradient(circle, rgba(93,26,120,0.10) 1px, transparent 1px);
            background-size: 28px 28px;
            background-attachment: fixed;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// InfoLine — linha do card de info da loja
// ============================================================

interface InfoLineProps {
  icon: React.ReactNode;
  text: string;
  href?: string;
}

function InfoLine({ icon, text, href }: InfoLineProps) {
  const inner = (
    <div className="flex items-center gap-3">
      <span className="text-casa-cream/55 shrink-0">{icon}</span>
      <span className="leading-snug">{text}</span>
    </div>
  );
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="block hover:text-white transition"
      >
        {inner}
      </a>
    );
  }
  return inner;
}

// ============================================================
// ComboCard — card no carrossel
// ============================================================

interface ComboCardProps {
  combo: Combo;
  disabled: boolean;
  onAdd: () => void;
}

function ComboCard({ combo, disabled, onAdd }: ComboCardProps) {
  const visible = useMemo(
    () => combo.ingredients.slice(0, 3).map((i) => i.name),
    [combo.ingredients],
  );
  const extra = combo.ingredients.length - visible.length;

  return (
    <article className="bg-white rounded-2xl shadow-sm shadow-casa-purple/10 border border-casa-purple/5 p-4 mb-3 flex items-center gap-4">
      {/* Esquerda: emoji em quadrado com gradiente */}
      <div
        className="h-20 w-20 rounded-2xl bg-gradient-to-br from-casa-cream to-casa-purple/5 flex items-center justify-center shrink-0"
        aria-hidden
      >
        <span className="text-5xl leading-none select-none">
          {comboEmoji(combo.name)}
        </span>
      </div>

      {/* Direita: info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-lg font-bold text-casa-purple-dark leading-tight">
          {combo.name}
        </h3>
        <div className="text-[10px] uppercase tracking-[0.12em] text-casa-purple-dark/50 font-bold mt-0.5">
          {combo.size.name}
        </div>
        <p className="text-[12px] text-casa-purple-dark/70 mt-1 leading-snug line-clamp-2">
          {visible.join(', ')}
          {extra > 0 ? ` + ${extra} mais` : ''}
        </p>

        <div className="mt-2 flex justify-between items-center">
          <div className="font-display text-xl font-bold text-casa-purple tabular-nums">
            {formatBRL(combo.price)}
          </div>
          <button
            type="button"
            onClick={onAdd}
            disabled={disabled}
            aria-label={`Adicionar ${combo.name}`}
            className="h-10 w-10 rounded-full bg-casa-purple text-white flex items-center justify-center hover:bg-casa-purple-dark transition active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-casa-purple/30"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default Home;
