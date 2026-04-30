import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, MapPin, MessageCircle, Plus, Sparkles } from 'lucide-react';
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
      <div className="min-h-screen bg-casa-cream flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-3 animate-bounce">🍇</div>
          <p className="text-casa-purple-dark/70 font-medium">Carregando cardápio…</p>
        </div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="min-h-screen bg-casa-cream flex items-center justify-center p-6 text-center">
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
    );
  }

  const { store, isOpen, nextOpeningTime, combos } = menu;

  return (
    <div className="min-h-screen bg-casa-cream pb-32">
      <StoreHeader
        slogan={store.slogan}
        isOpen={isOpen}
        nextOpening={nextOpeningTime}
      />

      {/* Banner de fechado */}
      {!isOpen && (
        <div className="bg-amber-100 border-b border-amber-200 text-amber-900 px-4 py-3 text-center text-sm font-medium">
          ⚠️ Estamos fechados agora.
          {nextOpeningTime ? <> {nextOpeningTime}.</> : null}
        </div>
      )}

      {/* HERO */}
      <section className="container max-w-3xl pt-6 pb-2">
        <div className="text-center px-2">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-casa-purple-dark leading-tight">
            Sua tigela, do seu jeito 🍇
          </h1>
          <p className="mt-3 text-casa-purple-dark/70 text-sm sm:text-base font-medium max-w-md mx-auto">
            Monte do zero ou escolha um combo pronto. Tudo cremoso, fresquinho e
            entregue rapidinho.
          </p>
        </div>
      </section>

      {/* CTA principal */}
      <section className="container max-w-3xl pt-4 pb-6">
        <Link to="/montar" className="block">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-casa-purple to-casa-purple-dark rounded-3xl p-6 sm:p-8 shadow-lg text-white relative overflow-hidden"
          >
            <div className="absolute -top-8 -right-6 text-9xl opacity-15 select-none">
              🍇
            </div>
            <div className="relative">
              <div className="text-xs font-bold uppercase tracking-wider text-white/80">
                ⭐ Mais pedido
              </div>
              <div className="font-display text-3xl sm:text-4xl font-bold mt-1">
                Monte sua tigela
              </div>
              <div className="text-white/80 text-sm mt-2 max-w-md">
                Tamanho, frutas, complementos e caldas. Você escolhe tudo.
              </div>
              <div className="mt-5 inline-flex items-center gap-2 bg-white text-casa-purple px-5 py-2.5 rounded-full font-bold text-sm shadow">
                Começar agora →
              </div>
            </div>
          </motion.div>
        </Link>
      </section>

      {/* Combos do dia */}
      <section className="pt-4 pb-6">
        <div className="container max-w-3xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl font-bold text-casa-purple-dark">
              Combos do dia
            </h2>
            <span className="text-xs text-casa-purple-dark/60">
              Deslize →
            </span>
          </div>
        </div>
        <div className="overflow-x-auto snap-x snap-mandatory scroll-pl-4 px-4 sm:px-6 pb-2 hide-scrollbar">
          <div className="flex gap-3 min-w-min">
            {combos.map((combo) => (
              <ComboCard
                key={combo.id}
                combo={combo}
                disabled={!isOpen}
                onAdd={() => handleAddCombo(combo)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Monte a sua (segunda CTA) */}
      <section className="container max-w-3xl py-4">
        <Link to="/montar">
          <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-casa-purple/10 flex items-center gap-4 hover:border-casa-purple/30 transition">
            <div className="bg-casa-green/15 rounded-2xl p-3 text-3xl">
              <Sparkles className="h-8 w-8 text-casa-green" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-casa-purple-dark">
                Prefere fazer do zero?
              </div>
              <div className="text-sm text-casa-purple-dark/60 mt-0.5">
                Escolha tamanho, frutas, complementos e caldas.
              </div>
            </div>
            <div className="text-casa-purple text-2xl">→</div>
          </div>
        </Link>
      </section>

      {/* Footer */}
      <footer className="container max-w-3xl pt-8 pb-6 mt-4">
        <div className="bg-white rounded-2xl p-5 space-y-3 text-sm text-casa-purple-dark/80">
          {store.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-casa-purple flex-shrink-0 mt-0.5" />
              <span>{store.address}</span>
            </div>
          )}
          {store.whatsapp && (
            <a
              href={`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 hover:text-casa-purple"
            >
              <MessageCircle className="h-4 w-4 text-casa-purple flex-shrink-0" />
              {formatPhone(store.whatsapp)}
            </a>
          )}
          {store.instagram && (
            <a
              href={`https://instagram.com/${store.instagram.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 hover:text-casa-purple"
            >
              <Instagram className="h-4 w-4 text-casa-purple flex-shrink-0" />
              {store.instagram}
            </a>
          )}
          <div className="text-xs text-casa-purple-dark/60 pt-2 border-t border-casa-purple/10">
            Aberto todos os dias 14h às 02h
          </div>
        </div>
        <p className="text-center text-xs text-casa-purple-dark/40 mt-4">
          Feito com 💜 pela Wave Creations
        </p>
      </footer>

      <CartFloating onClick={() => setCartOpen(true)} />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        isStoreOpen={isOpen}
        deliveryFee={store.deliveryFee}
        minOrderValue={store.minOrderValue}
      />

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// ----- Card de combo -----

interface ComboCardProps {
  combo: Combo;
  disabled: boolean;
  onAdd: () => void;
}

function ComboCard({ combo, disabled, onAdd }: ComboCardProps) {
  const visibleIngredients = useMemo(
    () => combo.ingredients.slice(0, 3).map((i) => i.name),
    [combo.ingredients],
  );
  const extraCount = combo.ingredients.length - visibleIngredients.length;

  return (
    <article className="snap-start shrink-0 w-[230px] bg-white rounded-2xl shadow-md p-4 flex flex-col">
      <div className="bg-gradient-to-br from-casa-cream to-white rounded-2xl h-28 flex items-center justify-center text-6xl">
        {comboEmoji(combo.name)}
      </div>
      <h3 className="font-display font-bold text-lg text-casa-purple-dark mt-3 leading-tight">
        {combo.name}
      </h3>
      <div className="text-xs text-casa-purple-dark/60 mt-0.5">
        {combo.size.name}
      </div>
      <p className="text-xs text-casa-purple-dark/70 mt-2 flex-1 line-clamp-2">
        {visibleIngredients.join(', ')}
        {extraCount > 0 ? ` + ${extraCount} mais` : ''}
      </p>
      <div className="flex items-center justify-between mt-3">
        <div className="font-display text-xl font-bold text-casa-purple">
          {formatBRL(combo.price)}
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          aria-label={`Adicionar ${combo.name}`}
          className="h-9 w-9 rounded-full bg-casa-purple text-white hover:bg-casa-purple-dark transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </article>
  );
}

export default Home;
