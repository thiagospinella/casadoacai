import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { fetchMenu } from '@/lib/menu-api';
import type { Ingredient, MenuResponse, Size } from '@/types/menu';
import { useWizard } from '@/store/wizard';
import {
  newCartItemId,
  useCart,
  type CartItemBowl,
} from '@/store/cart';
import {
  calculateBowlPrice,
  type PricingIngredient,
  type PricingResult,
} from '@/lib/pricing';
import { Button } from '@/components/Button';
import { CountSelector } from '@/components/CountSelector';
import { AcaiBowl, type BowlSelection } from '@/components/AcaiBowl';
import { ingredientEmoji } from '@/lib/emoji';
import { formatBRL } from '@/lib/format';
import { cn } from '@/lib/utils';

const STEP_COUNT = 5;

// ============================================================
// Page principal
// ============================================================

export function Montar() {
  const navigate = useNavigate();
  const wizard = useWizard();
  const addCartItem = useCart((s) => s.addItem);

  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadMenu = () => {
    setLoading(true);
    setError(false);
    fetchMenu()
      .then(setMenu)
      .catch(() => {
        setError(true);
        toast.error('Não foi possível carregar o cardápio');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMenu();
  }, []);

  // Mapas derivados
  const allIngredients: Ingredient[] = useMemo(() => {
    if (!menu) return [];
    return [
      ...menu.ingredients.fruits,
      ...menu.ingredients.toppings,
      ...menu.ingredients.sauces,
      ...menu.ingredients.premium,
    ];
  }, [menu]);

  const ingById = useMemo(
    () => new Map(allIngredients.map((i) => [i.id, i])),
    [allIngredients],
  );

  const size: Size | null = useMemo(() => {
    if (!menu || !wizard.sizeId) return null;
    return menu.sizes.find((s) => s.id === wizard.sizeId) ?? null;
  }, [menu, wizard.sizeId]);

  const bowlSelections: BowlSelection[] = useMemo(() => {
    const result: BowlSelection[] = [];
    for (const [id, qty] of Object.entries(wizard.ingredients)) {
      const ing = ingById.get(id);
      if (!ing || qty <= 0) continue;
      result.push({ id, name: ing.name, qty, category: ing.category });
    }
    return result;
  }, [wizard.ingredients, ingById]);

  const pricing: PricingResult | null = useMemo(() => {
    if (!size) return null;
    const pIngs: PricingIngredient[] = bowlSelections.flatMap((sel) => {
      const ing = ingById.get(sel.id);
      if (!ing) return [];
      return [
        {
          id: sel.id,
          qty: sel.qty,
          category: sel.category,
          price: ing.price,
          isPremium: ing.isPremium,
          name: sel.name,
        },
      ];
    });
    return calculateBowlPrice({
      size,
      ingredients: pIngs,
      quantity: wizard.quantity,
    });
  }, [size, bowlSelections, ingById, wizard.quantity]);

  // Loading / erro
  if (loading) return <Skeleton />;
  if (error || !menu) return <ErrorState onRetry={loadMenu} />;

  // Handlers ---------------------------------------------

  const onBack = () => {
    if (wizard.step === 0) {
      navigate('/');
    } else {
      wizard.setStep(wizard.step - 1);
    }
  };

  const onCancel = () => {
    if (
      window.confirm(
        'Cancelar a montagem? Suas escolhas serão descartadas.',
      )
    ) {
      wizard.reset();
      navigate('/');
    }
  };

  const onAdvance = () => {
    if (wizard.step < STEP_COUNT - 1) {
      wizard.setStep(wizard.step + 1);
    }
  };

  const canAdvance = wizard.step === 0 ? !!size : true;

  const onConfirm = () => {
    if (!size || !pricing) return;

    // Constrói linhas com free/paid por ingrediente a partir do pricing.lines
    const linesById = new Map(pricing.lines.map((l) => [l.ingredient.id, l]));

    const ingredientLines: CartItemBowl['ingredients'] = bowlSelections.map(
      (sel) => {
        const line = linesById.get(sel.id);
        return {
          ingredientId: sel.id,
          ingredientName: sel.name,
          category: sel.category,
          count: sel.qty,
          freeUnits: line?.freeUnits ?? 0,
          paidUnits: line?.paidUnits ?? 0,
          lineExtra: line?.lineExtra ?? 0,
        };
      },
    );

    const item: CartItemBowl = {
      id: newCartItemId(),
      type: 'CUSTOM_BOWL',
      sizeId: size.id,
      sizeName: size.name,
      sizeVolumeMl: size.volumeMl,
      basePrice: pricing.basePrice,
      extrasPrice: pricing.extrasPrice,
      unitPrice: pricing.totalPerUnit,
      quantity: wizard.quantity,
      notes: wizard.notes || undefined,
      ingredients: ingredientLines,
    };

    addCartItem(item);
    toast.success('Tigela adicionada à sacola 🎉');
    wizard.reset();
    navigate('/');
  };

  // Render -----------------------------------------------

  const showStickyBowl = wizard.step !== 4;
  const showFooter = wizard.step !== 4;

  return (
    <PageFrame>
      {/* Header + progress bar (sticky) */}
      <div className="sticky top-0 z-40 bg-casa-purple-dark text-white shadow-sm shadow-casa-purple/30">
        <Header
          step={wizard.step}
          onBack={onBack}
          onCancel={onCancel}
        />
        {showStickyBowl && size && (
          <BowlPreviewMini
            selections={bowlSelections}
            sizeName={size.name}
          />
        )}
      </div>

      {/* Conteúdo da etapa */}
      <main className="px-5 pt-6 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={wizard.step}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {wizard.step === 0 && (
              <StepSize
                sizes={menu.sizes}
                selectedId={wizard.sizeId}
                onPick={(id) => wizard.setSize(id)}
              />
            )}
            {wizard.step === 1 && size && pricing && (
              <StepIngredientGrid
                title="Escolha suas frutas 🍓"
                ingredients={menu.ingredients.fruits}
                included={size.includedFruits}
                unitCost={menu.ingredients.fruits[0]?.price ?? 2}
                pricing={pricing}
              />
            )}
            {wizard.step === 2 && size && pricing && (
              <StepIngredientGrid
                title="Adicione complementos 🥜"
                ingredients={menu.ingredients.toppings}
                included={size.includedToppings}
                unitCost={menu.ingredients.toppings[0]?.price ?? 1.5}
                pricing={pricing}
              />
            )}
            {wizard.step === 3 && size && pricing && (
              <StepCaldas
                size={size}
                sauces={menu.ingredients.sauces}
                premium={menu.ingredients.premium}
                pricing={pricing}
              />
            )}
            {wizard.step === 4 && size && pricing && (
              <StepReview
                size={size}
                pricing={pricing}
                bowlSelections={bowlSelections}
                ingById={ingById}
                onConfirm={onConfirm}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer fixo (escondido na revisão) */}
      {showFooter && (
        <FooterBar
          unitPrice={pricing?.totalPerUnit ?? size?.price ?? 0}
          canAdvance={canAdvance}
          onAdvance={onAdvance}
          isLastBeforeReview={wizard.step === 3}
        />
      )}
    </PageFrame>
  );
}

// ============================================================
// PageFrame com decoração desktop (mesma vibe da Home)
// ============================================================

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-casa-cream casa-side-decoration">
      <div className="max-w-md mx-auto bg-casa-cream min-h-screen relative lg:shadow-2xl lg:shadow-casa-purple/10">
        {children}
      </div>
      <style>{`
        @media (min-width: 1024px) {
          .casa-side-decoration {
            background-color: #F2EBD8;
            background-image: radial-gradient(circle, rgba(93,26,120,0.10) 1px, transparent 1px);
            background-size: 28px 28px;
            background-attachment: fixed;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Header — botão voltar + indicador + cancelar + barra de progresso
// ============================================================

interface HeaderProps {
  step: number;
  onBack: () => void;
  onCancel: () => void;
}

function Header({ step, onBack, onCancel }: HeaderProps) {
  return (
    <div className="px-5 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 text-center text-xs text-white/70 font-medium">
          Etapa {step + 1} de {STEP_COUNT}
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar"
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex gap-1.5 mt-3">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 rounded-full flex-1 transition-colors',
              i <= step ? 'bg-casa-green' : 'bg-white/20',
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Bowl preview mini (fica no topo, sticky, em todas etapas exceto 5)
// ============================================================

interface BowlPreviewMiniProps {
  selections: BowlSelection[];
  sizeName: string;
}

function BowlPreviewMini({ selections, sizeName }: BowlPreviewMiniProps) {
  return (
    <div className="bg-casa-cream py-3 border-t border-casa-purple-dark/10">
      <AcaiBowl
        selections={selections}
        sizeName={sizeName}
        className="h-32 sm:h-36"
      />
    </div>
  );
}

// ============================================================
// FooterBar fixo
// ============================================================

interface FooterBarProps {
  unitPrice: number;
  canAdvance: boolean;
  onAdvance: () => void;
  isLastBeforeReview: boolean;
}

function FooterBar({
  unitPrice,
  canAdvance,
  onAdvance,
  isLastBeforeReview,
}: FooterBarProps) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-white border-t border-casa-purple/10 shadow-[0_-8px_24px_rgba(93,26,120,0.08)]">
      <div className="px-5 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-casa-purple-dark/60 font-medium uppercase tracking-wide">
            Total parcial
          </div>
          <div className="font-display text-xl font-bold text-casa-purple tabular-nums">
            {formatBRL(unitPrice)}
          </div>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={onAdvance}
          disabled={!canAdvance}
          className="px-8"
        >
          {isLastBeforeReview ? 'Revisar' : 'Avançar'} →
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Etapa 1 — TAMANHO
// ============================================================

interface StepSizeProps {
  sizes: Size[];
  selectedId: string | null;
  onPick: (id: string) => void;
}

function StepSize({ sizes, selectedId, onPick }: StepSizeProps) {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold text-casa-purple-dark leading-tight">
        Comece pelo tamanho 🥄
      </h2>
      <p className="text-[13px] text-casa-purple-dark/65 mt-1">
        Cada tamanho inclui uma quantidade de itens grátis.
      </p>

      <div className="mt-5 space-y-3">
        {sizes.map((size) => {
          const isSelected = size.id === selectedId;
          return (
            <button
              key={size.id}
              type="button"
              onClick={() => onPick(size.id)}
              className={cn(
                'w-full text-left rounded-2xl p-5 border-2 transition-all relative active:scale-[0.99]',
                isSelected
                  ? 'border-casa-purple bg-casa-purple/5 shadow-sm shadow-casa-purple/15'
                  : 'border-transparent bg-white hover:border-casa-purple/30',
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 h-7 w-7 rounded-full bg-casa-purple text-white flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-display text-2xl font-bold text-casa-purple-dark">
                  {size.name}
                </div>
                <div className="font-display text-xl font-bold text-casa-purple tabular-nums">
                  {formatBRL(size.price)}
                </div>
              </div>
              <div className="text-[13px] text-casa-purple-dark/65 mt-1.5 leading-snug">
                Inclui <strong>{size.includedFruits}</strong> frutas +{' '}
                <strong>{size.includedToppings}</strong> complementos +{' '}
                <strong>{size.includedSauces}</strong> caldas grátis
              </div>
              {/* Mini barra ilustrativa */}
              <div className="mt-3 flex gap-3 text-[11px] text-casa-purple-dark/60">
                <Hint emoji="🍓" qty={size.includedFruits} />
                <Hint emoji="🥜" qty={size.includedToppings} />
                <Hint emoji="🍯" qty={size.includedSauces} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Hint({ emoji, qty }: { emoji: string; qty: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span aria-hidden>{emoji}</span>
      <span className="tabular-nums">×{qty}</span>
    </span>
  );
}

// ============================================================
// Etapas 2 e 3 — Grid de ingredientes (FRUIT / TOPPING)
// ============================================================

interface StepIngredientGridProps {
  title: string;
  ingredients: Ingredient[];
  included: number;
  unitCost: number;
  pricing: PricingResult;
}

function StepIngredientGrid({
  title,
  ingredients,
  included,
  unitCost,
  pricing,
}: StepIngredientGridProps) {
  const wizardIngredients = useWizard((s) => s.ingredients);
  const setIngredient = useWizard((s) => s.setIngredient);

  const totalQty = ingredients.reduce(
    (acc, i) => acc + (wizardIngredients[i.id] ?? 0),
    0,
  );
  const overflow = totalQty > included;

  // Mapa de paidUnits por id (usando pricing.lines)
  const paidById = new Map(
    pricing.lines.map((l) => [l.ingredient.id, l.paidUnits]),
  );

  return (
    <section>
      <h2 className="font-display text-2xl font-bold text-casa-purple-dark leading-tight">
        {title}
      </h2>
      <div
        className={cn(
          'mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold',
          overflow
            ? 'bg-casa-purple/10 text-casa-purple-dark'
            : 'bg-casa-green/15 text-casa-green',
        )}
      >
        <span>
          {Math.min(totalQty, included)}/{included} grátis
        </span>
        <span className="opacity-60">·</span>
        <span>próximas {formatBRL(unitCost)} cada</span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {ingredients.map((ing) => {
          const qty = wizardIngredients[ing.id] ?? 0;
          const paidUnits = paidById.get(ing.id) ?? 0;
          const showPaidIndicator = qty > 0 && paidUnits > 0;
          return (
            <div
              key={ing.id}
              className={cn(
                'rounded-2xl p-3 text-center transition-all border flex flex-col items-center',
                qty > 0
                  ? 'bg-casa-purple/5 border-casa-purple/30'
                  : 'bg-white border-transparent',
              )}
            >
              <div className="text-[34px] leading-none select-none" aria-hidden>
                {ingredientEmoji(ing.name)}
              </div>
              <div className="text-[12px] font-medium text-casa-purple-dark mt-1.5 leading-tight min-h-[2.4em]">
                {ing.name}
              </div>
              {showPaidIndicator ? (
                <div className="text-[10px] font-bold text-amber-700 mt-0.5">
                  +{formatBRL(paidUnits * ing.price)}
                </div>
              ) : (
                <div className="text-[10px] mt-0.5 opacity-0 select-none">
                  &nbsp;
                </div>
              )}
              <div className="mt-2">
                <CountSelector
                  value={qty}
                  onChange={(n) => {
                    if (!ing.available) {
                      toast.error('Ingrediente indisponível');
                      return;
                    }
                    setIngredient(ing.id, n);
                  }}
                  min={0}
                  max={5}
                  size="sm"
                  disabled={!ing.available}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-casa-purple-dark/45 text-center mt-4">
        A regra de inclusos prioriza as <strong>maiores quantidades</strong> como grátis.
      </p>
    </section>
  );
}

// ============================================================
// Etapa 4 — CALDAS + PREMIUM
// ============================================================

interface StepCaldasProps {
  size: Size;
  sauces: Ingredient[];
  premium: Ingredient[];
  pricing: PricingResult;
}

function StepCaldas({ size, sauces, premium, pricing }: StepCaldasProps) {
  const wizardIngredients = useWizard((s) => s.ingredients);
  const setIngredient = useWizard((s) => s.setIngredient);

  const sauceQty = sauces.reduce(
    (acc, i) => acc + (wizardIngredients[i.id] ?? 0),
    0,
  );
  const sauceUnitCost = sauces[0]?.price ?? 1;
  const overflow = sauceQty > size.includedSauces;
  const paidById = new Map(
    pricing.lines.map((l) => [l.ingredient.id, l.paidUnits]),
  );

  return (
    <section>
      {/* Caldas */}
      <h2 className="font-display text-2xl font-bold text-casa-purple-dark leading-tight">
        Caldas pra finalizar 🍯
      </h2>
      <div
        className={cn(
          'mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold',
          overflow
            ? 'bg-casa-purple/10 text-casa-purple-dark'
            : 'bg-casa-green/15 text-casa-green',
        )}
      >
        <span>
          {Math.min(sauceQty, size.includedSauces)}/{size.includedSauces} grátis
        </span>
        <span className="opacity-60">·</span>
        <span>próximas {formatBRL(sauceUnitCost)} cada</span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {sauces.map((ing) => {
          const qty = wizardIngredients[ing.id] ?? 0;
          const paidUnits = paidById.get(ing.id) ?? 0;
          const showPaid = qty > 0 && paidUnits > 0;
          return (
            <div
              key={ing.id}
              className={cn(
                'rounded-2xl p-3 text-center transition-all border flex flex-col items-center',
                qty > 0
                  ? 'bg-casa-purple/5 border-casa-purple/30'
                  : 'bg-white border-transparent',
              )}
            >
              <div className="text-[34px] leading-none select-none" aria-hidden>
                {ingredientEmoji(ing.name)}
              </div>
              <div className="text-[12px] font-medium text-casa-purple-dark mt-1.5 leading-tight min-h-[2.4em]">
                {ing.name}
              </div>
              {showPaid ? (
                <div className="text-[10px] font-bold text-amber-700 mt-0.5">
                  +{formatBRL(paidUnits * ing.price)}
                </div>
              ) : (
                <div className="text-[10px] mt-0.5 opacity-0 select-none">
                  &nbsp;
                </div>
              )}
              <div className="mt-2">
                <CountSelector
                  value={qty}
                  onChange={(n) => setIngredient(ing.id, n)}
                  min={0}
                  max={5}
                  size="sm"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Premium */}
      <div className="mt-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-amber-300/40" />
          <h3 className="font-display text-base font-bold text-amber-700 inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            Quer turbinar?
          </h3>
          <div className="flex-1 h-px bg-amber-300/40" />
        </div>
        <p className="text-[12px] text-casa-purple-dark/55 text-center mb-4">
          Premium <strong>sempre</strong> cobra preço cheio (não tem inclusão).
        </p>

        <div className="space-y-3">
          {premium.map((ing) => {
            const qty = wizardIngredients[ing.id] ?? 0;
            const description =
              ing.name === 'Nutella'
                ? 'Pra deixar irresistível'
                : ing.name === 'Creme de Ovomaltine'
                  ? 'Crocante e marcante'
                  : 'Toque especial';
            return (
              <div
                key={ing.id}
                className={cn(
                  'rounded-2xl p-4 border-2 transition-all bg-gradient-to-r from-yellow-50 to-amber-50',
                  qty > 0 ? 'border-amber-400' : 'border-amber-300',
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-14 w-14 rounded-xl bg-white/60 flex items-center justify-center text-3xl shrink-0"
                    aria-hidden
                  >
                    {ingredientEmoji(ing.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-casa-purple-dark text-base leading-tight">
                      {ing.name}
                    </div>
                    <div className="text-[11px] text-casa-purple-dark/60">
                      {description}
                    </div>
                    <div className="text-sm font-bold text-amber-700 mt-0.5 tabular-nums">
                      {formatBRL(ing.price)} cada
                    </div>
                  </div>
                  <CountSelector
                    value={qty}
                    onChange={(n) => setIngredient(ing.id, n)}
                    min={0}
                    max={3}
                    size="sm"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Etapa 5 — REVISÃO
// ============================================================

interface StepReviewProps {
  size: Size;
  pricing: PricingResult;
  bowlSelections: BowlSelection[];
  ingById: Map<string, Ingredient>;
  onConfirm: () => void;
}

function StepReview({
  size,
  pricing,
  bowlSelections,
  ingById,
  onConfirm,
}: StepReviewProps) {
  const wizard = useWizard();
  const fruits = bowlSelections.filter((s) => s.category === 'FRUIT');
  const toppings = bowlSelections.filter((s) => s.category === 'TOPPING');
  const sauces = bowlSelections.filter((s) => s.category === 'SAUCE');
  const premium = bowlSelections.filter((s) => s.category === 'PREMIUM');

  return (
    <section>
      <h2 className="font-display text-2xl font-bold text-casa-purple-dark leading-tight">
        Tudo certo? 🎉
      </h2>
      <p className="text-[13px] text-casa-purple-dark/65 mt-1">
        Revise sua tigela antes de adicionar.
      </p>

      <div className="mt-5 bg-white rounded-2xl p-5 shadow-sm shadow-casa-purple/10">
        {/* Tigela em destaque */}
        <div className="bg-casa-cream/60 rounded-2xl py-2">
          <AcaiBowl
            selections={bowlSelections}
            sizeName={size.name}
            className="h-44"
          />
        </div>

        {/* Sumário */}
        <div className="mt-4 space-y-3">
          <SummaryRow
            label={`Tamanho ${size.name}`}
            value={formatBRL(pricing.basePrice)}
            bold
          />

          {fruits.length > 0 && (
            <SummaryGroup
              title="Frutas"
              items={fruits}
              ingById={ingById}
            />
          )}
          {toppings.length > 0 && (
            <SummaryGroup
              title="Complementos"
              items={toppings}
              ingById={ingById}
            />
          )}
          {sauces.length > 0 && (
            <SummaryGroup
              title="Caldas"
              items={sauces}
              ingById={ingById}
            />
          )}
          {premium.length > 0 && (
            <SummaryGroup
              title="Premium"
              items={premium}
              ingById={ingById}
              accent
            />
          )}
        </div>

        {/* Cálculos */}
        <div className="mt-4 pt-4 border-t border-casa-purple/10 space-y-1.5 text-[14px]">
          <div className="flex justify-between text-casa-purple-dark/70">
            <span>Base ({size.name})</span>
            <span className="tabular-nums">{formatBRL(pricing.basePrice)}</span>
          </div>
          {pricing.extrasPrice - pricing.premiumPrice > 0 && (
            <div className="flex justify-between text-casa-purple-dark/70">
              <span>Extras</span>
              <span className="tabular-nums">
                +{formatBRL(pricing.extrasPrice - pricing.premiumPrice)}
              </span>
            </div>
          )}
          {pricing.premiumPrice > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>Premium</span>
              <span className="tabular-nums">
                +{formatBRL(pricing.premiumPrice)}
              </span>
            </div>
          )}
          <div className="flex justify-between font-display font-bold text-casa-purple text-lg pt-2 border-t border-casa-purple/10">
            <span>Total da tigela</span>
            <span className="tabular-nums">
              {formatBRL(pricing.totalPerUnit)}
            </span>
          </div>
        </div>
      </div>

      {/* Quantidade */}
      <div className="bg-white rounded-2xl p-4 mt-4 shadow-sm shadow-casa-purple/10">
        <label className="text-[13px] font-semibold text-casa-purple-dark">
          Quantas tigelas iguais a esta?
        </label>
        <div className="mt-2 flex items-center justify-between">
          <CountSelector
            value={wizard.quantity}
            onChange={wizard.setQuantity}
            min={1}
            max={10}
            size="md"
          />
          <div className="font-display text-2xl font-bold text-casa-purple tabular-nums">
            {formatBRL(pricing.total)}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl p-4 mt-4 shadow-sm shadow-casa-purple/10">
        <label
          htmlFor="bowl-notes"
          className="text-[13px] font-semibold text-casa-purple-dark"
        >
          Alguma observação?{' '}
          <span className="text-casa-purple-dark/40 font-normal">
            (opcional)
          </span>
        </label>
        <textarea
          id="bowl-notes"
          value={wizard.notes}
          onChange={(e) => wizard.setNotes(e.target.value)}
          placeholder="ex: sem amendoim, por favor"
          rows={2}
          maxLength={200}
          className="mt-2 w-full bg-casa-cream/50 rounded-xl p-3 text-[14px] border border-casa-purple/10 focus:outline-none focus:ring-2 focus:ring-casa-purple/30 resize-none"
        />
        <div className="text-right text-[11px] text-casa-purple-dark/40 mt-1">
          {wizard.notes.length}/200
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        className="mt-6"
        onClick={onConfirm}
      >
        Adicionar à sacola — {formatBRL(pricing.total)}
      </Button>
    </section>
  );
}

// ============================================================
// SummaryRow / SummaryGroup
// ============================================================

interface SummaryRowProps {
  label: string;
  value: string;
  bold?: boolean;
}

function SummaryRow({ label, value, bold }: SummaryRowProps) {
  return (
    <div
      className={cn(
        'flex justify-between text-[14px]',
        bold
          ? 'text-casa-purple-dark font-semibold'
          : 'text-casa-purple-dark/75',
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

interface SummaryGroupProps {
  title: string;
  items: BowlSelection[];
  ingById: Map<string, Ingredient>;
  accent?: boolean;
}

function SummaryGroup({ title, items, ingById, accent }: SummaryGroupProps) {
  return (
    <div>
      <div
        className={cn(
          'text-[10px] font-bold uppercase tracking-wider mb-1',
          accent ? 'text-amber-700' : 'text-casa-purple-dark/50',
        )}
      >
        {title}
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const ing = ingById.get(item.id);
          return (
            <li
              key={item.id}
              className="text-[13px] text-casa-purple-dark/80 flex items-center gap-2"
            >
              <span aria-hidden>{ingredientEmoji(item.name)}</span>
              <span className="flex-1 truncate">{item.name}</span>
              {item.qty > 1 && (
                <span className="text-casa-purple-dark/50 tabular-nums">
                  ×{item.qty}
                </span>
              )}
              {ing?.isPremium && (
                <span className="text-amber-700 tabular-nums text-xs">
                  +{formatBRL(ing.price * item.qty)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ============================================================
// Loading / erro
// ============================================================

function Skeleton() {
  return (
    <PageFrame>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-bounce">🍇</div>
          <p className="text-sm text-casa-purple-dark/70 font-medium">
            Carregando ingredientes…
          </p>
        </div>
      </div>
    </PageFrame>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <PageFrame>
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <div className="text-5xl mb-3">😕</div>
          <p className="text-casa-purple-dark font-semibold">
            Não foi possível carregar o cardápio.
          </p>
          <Button className="mt-4" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      </div>
    </PageFrame>
  );
}

export default Montar;
