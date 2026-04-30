import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { fetchMenu } from '@/lib/menu-api';
import type {
  Ingredient,
  IngredientCategory,
  MenuResponse,
  Size,
} from '@/types/menu';
import { calculateBowlPrice } from '@/lib/pricing';
import { ingredientEmoji } from '@/lib/emoji';
import { formatBRL } from '@/lib/format';
import { useWizard } from '@/store/wizard';
import {
  newCartItemId,
  useCart,
  type CartItemBowl,
} from '@/store/cart';
import { Button } from '@/components/Button';
import { CountSelector } from '@/components/CountSelector';
import { AcaiBowl } from '@/components/AcaiBowl';
import { cn } from '@/lib/utils';

const STEPS = ['tamanho', 'frutas', 'complementos', 'caldas', 'revisao'] as const;
type StepName = (typeof STEPS)[number];

export function Montar() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<number>(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const wizard = useWizard();
  const addItem = useCart((s) => s.addItem);

  useEffect(() => {
    fetchMenu()
      .then(setMenu)
      .catch(() => toast.error('Não conseguimos carregar o cardápio'))
      .finally(() => setLoading(false));
  }, []);

  // Auto-advance da etapa 0 (tamanho) após 800ms
  useEffect(() => {
    if (step === 0 && wizard.sizeId) {
      const t = setTimeout(() => {
        setDirection(1);
        setStep(1);
      }, 800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [step, wizard.sizeId]);

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goBack = () => {
    if (step === 0) {
      navigate('/');
      return;
    }
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-casa-cream flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-2 animate-bounce">🍇</div>
          <p className="text-casa-purple-dark/70">Carregando...</p>
        </div>
      </div>
    );
  }
  if (!menu) {
    return (
      <div className="min-h-screen bg-casa-cream flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-casa-purple-dark font-semibold">
            Erro ao carregar cardápio.
          </p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Tentar de novo
          </Button>
        </div>
      </div>
    );
  }

  const size = menu.sizes.find((s) => s.id === wizard.sizeId) ?? null;

  const canAdvance = (() => {
    if (step === 0) return !!wizard.sizeId;
    return true; // demais etapas são opcionais (pode pular sem escolher nada)
  })();

  const handleConfirmAdd = () => {
    if (!size) return;
    const item = buildCartItem(size, wizard, menu);
    addItem(item);
    toast.success('Tigela adicionada à sacola!');
    wizard.reset();
    navigate('/');
  };

  const stepName: StepName = STEPS[step] ?? 'tamanho';

  return (
    <div className="min-h-screen bg-casa-cream flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-casa-cream/95 backdrop-blur border-b border-casa-purple/10">
        <div className="container max-w-2xl flex items-center gap-3 py-3">
          <button
            onClick={goBack}
            className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center text-casa-purple-dark hover:bg-white/80"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <ProgressBar step={step} total={STEPS.length} />
        </div>
      </header>

      {/* Content area */}
      <main className="flex-1 overflow-hidden">
        <div className="container max-w-2xl py-4 pb-40">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={stepName}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {stepName === 'tamanho' && (
                <StepSize
                  sizes={menu.sizes}
                  selected={wizard.sizeId}
                  onSelect={(id) => wizard.setSize(id)}
                />
              )}
              {stepName === 'frutas' && size && (
                <StepIngredients
                  title="Escolha suas frutas 🍓"
                  category="fruits"
                  size={size}
                  menu={menu}
                  ingredients={menu.ingredients.fruits}
                  included={size.includedFruits}
                  unitCost={menu.ingredients.fruits[0]?.price ?? 2}
                />
              )}
              {stepName === 'complementos' && size && (
                <StepIngredients
                  title="Escolha seus complementos 🌾"
                  category="toppings"
                  size={size}
                  menu={menu}
                  ingredients={menu.ingredients.toppings}
                  included={size.includedToppings}
                  unitCost={menu.ingredients.toppings[0]?.price ?? 1.5}
                />
              )}
              {stepName === 'caldas' && size && (
                <StepCaldas
                  size={size}
                  menu={menu}
                  sauces={menu.ingredients.sauces}
                  premium={menu.ingredients.premium}
                />
              )}
              {stepName === 'revisao' && size && (
                <StepReview
                  size={size}
                  menu={menu}
                  onConfirm={handleConfirmAdd}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer fixo com Avançar */}
      {stepName !== 'revisao' && (
        <FooterBar size={size} menu={menu} onNext={goNext} disabled={!canAdvance} />
      )}
    </div>
  );
}

// ============================================================
// Animação de slide
// ============================================================

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
};

// ============================================================
// Sub-componentes
// ============================================================

interface ProgressBarProps {
  step: number;
  total: number;
}

function ProgressBar({ step, total }: ProgressBarProps) {
  return (
    <div className="flex-1 flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 rounded-full flex-1 transition-colors',
            i <= step ? 'bg-casa-purple' : 'bg-casa-purple/15',
          )}
        />
      ))}
    </div>
  );
}

// -------- Etapa 1: Tamanho --------

interface StepSizeProps {
  sizes: Size[];
  selected: string | null;
  onSelect: (id: string) => void;
}

function StepSize({ sizes, selected, onSelect }: StepSizeProps) {
  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-casa-purple-dark text-center">
        Que tamanho você quer?
      </h2>
      <p className="text-center text-sm text-casa-purple-dark/60 mt-2">
        Cada tamanho já vem com itens grátis inclusos.
      </p>

      <div className="mt-6 space-y-3">
        {sizes.map((size) => {
          const isSelected = size.id === selected;
          return (
            <button
              key={size.id}
              type="button"
              onClick={() => onSelect(size.id)}
              className={cn(
                'w-full bg-white rounded-2xl p-5 text-left shadow-sm transition-all relative border-2',
                isSelected
                  ? 'border-casa-purple ring-2 ring-casa-purple/20'
                  : 'border-transparent hover:border-casa-purple/30',
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="font-display text-3xl font-bold text-casa-purple-dark">
                    {size.name}
                  </div>
                  <div className="text-xs text-casa-purple-dark/60 mt-1">
                    {size.includedFruits} frutas · {size.includedToppings}{' '}
                    complementos · {size.includedSauces} caldas inclusos
                  </div>
                </div>
                <div className="font-display text-xl font-bold text-casa-purple">
                  {formatBRL(size.price)}
                </div>
              </div>
              {isSelected && (
                <div className="absolute top-3 right-3 h-7 w-7 rounded-full bg-casa-purple text-white flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// -------- Etapas 2 e 3: Ingredientes simples (frutas/complementos) --------

interface StepIngredientsProps {
  title: string;
  category: 'fruits' | 'toppings' | 'sauces';
  size: Size;
  menu: MenuResponse;
  ingredients: Ingredient[];
  included: number;
  unitCost: number;
}

function StepIngredients({
  title,
  category,
  size,
  menu,
  ingredients,
  included,
  unitCost,
}: StepIngredientsProps) {
  const wizard = useWizard();
  const list = wizard[category];

  const totalSelected = list.reduce((acc, s) => acc + s.count, 0);
  const remainingFree = Math.max(0, included - totalSelected);

  const getCount = (id: string) =>
    list.find((s) => s.ingredientId === id)?.count ?? 0;

  // Posição "global" — quantos slots já foram consumidos antes desse ingrediente
  const consumedBefore = (id: string) => {
    let acc = 0;
    for (const sel of list) {
      if (sel.ingredientId === id) break;
      acc += sel.count;
    }
    return acc;
  };

  return (
    <div>
      <BowlPreview menu={menu} size={size} />
      <h2 className="font-display text-2xl font-bold text-casa-purple-dark text-center mt-2">
        {title}
      </h2>
      <p className="text-center text-sm text-casa-purple-dark/70 mt-1">
        Inclusas: <strong>{Math.min(totalSelected, included)}/{included}</strong>
        {remainingFree === 0 && totalSelected >= included && (
          <span className="text-amber-700 ml-1">
            · extras +{formatBRL(unitCost)} cada
          </span>
        )}
      </p>

      <div className="mt-5 grid grid-cols-3 sm:grid-cols-4 gap-3">
        {ingredients.map((ing) => {
          const count = getCount(ing.id);
          const before = consumedBefore(ing.id);
          // Quantos das count desse ingrediente vão pagar
          let paidUnits = 0;
          for (let i = 0; i < count; i++) {
            const slot = before + i + 1;
            if (slot > included) paidUnits++;
          }
          const isPaid = paidUnits > 0;
          return (
            <div
              key={ing.id}
              className={cn(
                'bg-white rounded-2xl p-3 text-center shadow-sm transition-all',
                count > 0 && 'ring-2 ring-casa-purple/30',
                isPaid && 'ring-amber-400/60',
              )}
            >
              <div className="text-3xl">{ingredientEmoji(ing.name)}</div>
              <div className="font-semibold text-xs text-casa-purple-dark mt-1 leading-tight min-h-[2rem] flex items-center justify-center">
                {ing.name}
              </div>
              {isPaid && (
                <div className="text-[10px] font-bold text-amber-700">
                  +{formatBRL(unitCost)} cada extra
                </div>
              )}
              <div className="mt-2 flex justify-center">
                <CountSelector
                  value={count}
                  onChange={(n) =>
                    wizard.setIngredientCount(category, ing.id, n)
                  }
                  min={0}
                  max={5}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------- Etapa 4: Caldas + Premium --------

interface StepCaldasProps {
  size: Size;
  menu: MenuResponse;
  sauces: Ingredient[];
  premium: Ingredient[];
}

function StepCaldas({ size, menu, sauces, premium }: StepCaldasProps) {
  const wizard = useWizard();

  const sauceCount = wizard.sauces.reduce((a, s) => a + s.count, 0);
  const sauceUnitCost = sauces[0]?.price ?? 1;

  const consumedBefore = (id: string) => {
    let acc = 0;
    for (const sel of wizard.sauces) {
      if (sel.ingredientId === id) break;
      acc += sel.count;
    }
    return acc;
  };

  return (
    <div>
      <BowlPreview menu={menu} size={size} />

      <h2 className="font-display text-2xl font-bold text-casa-purple-dark text-center mt-2">
        Escolha suas caldas
      </h2>
      <p className="text-center text-sm text-casa-purple-dark/70 mt-1">
        Inclusas: <strong>{Math.min(sauceCount, size.includedSauces)}/{size.includedSauces}</strong>
        {sauceCount >= size.includedSauces && (
          <span className="text-amber-700 ml-1">
            · extras +{formatBRL(sauceUnitCost)} cada
          </span>
        )}
      </p>

      <div className="mt-5 grid grid-cols-3 sm:grid-cols-4 gap-3">
        {sauces.map((ing) => {
          const count =
            wizard.sauces.find((s) => s.ingredientId === ing.id)?.count ?? 0;
          const before = consumedBefore(ing.id);
          let paidUnits = 0;
          for (let i = 0; i < count; i++) {
            if (before + i + 1 > size.includedSauces) paidUnits++;
          }
          const isPaid = paidUnits > 0;
          return (
            <div
              key={ing.id}
              className={cn(
                'bg-white rounded-2xl p-3 text-center shadow-sm transition-all',
                count > 0 && 'ring-2 ring-casa-purple/30',
                isPaid && 'ring-amber-400/60',
              )}
            >
              <div className="text-3xl">{ingredientEmoji(ing.name)}</div>
              <div className="font-semibold text-xs text-casa-purple-dark mt-1 min-h-[2rem] flex items-center justify-center">
                {ing.name}
              </div>
              <div className="mt-2 flex justify-center">
                <CountSelector
                  value={count}
                  onChange={(n) => wizard.setIngredientCount('sauces', ing.id, n)}
                  min={0}
                  max={5}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Premium */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-casa-purple/20" />
          <h3 className="font-display text-lg font-bold text-casa-purple-dark">
            Quer turbinar? ✨
          </h3>
          <div className="flex-1 h-px bg-casa-purple/20" />
        </div>
        <p className="text-center text-xs text-casa-purple-dark/60 mb-4">
          Premium sempre cobra preço fixo (não tem inclusão).
        </p>
        <div className="grid grid-cols-2 gap-3">
          {premium.map((ing) => {
            const count =
              wizard.premium.find((s) => s.ingredientId === ing.id)?.count ?? 0;
            return (
              <div
                key={ing.id}
                className={cn(
                  'bg-gradient-to-br from-white to-casa-cream rounded-2xl p-4 text-center shadow-sm transition-all',
                  count > 0 && 'ring-2 ring-casa-purple/40',
                )}
              >
                <div className="text-4xl">{ingredientEmoji(ing.name)}</div>
                <div className="font-display font-bold text-casa-purple-dark mt-1 text-sm">
                  {ing.name}
                </div>
                <div className="text-xs font-bold text-casa-purple mt-0.5">
                  {formatBRL(ing.price)}
                </div>
                <div className="mt-2 flex justify-center">
                  <CountSelector
                    value={count}
                    onChange={(n) =>
                      wizard.setIngredientCount('premium', ing.id, n)
                    }
                    min={0}
                    max={3}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -------- BowlPreview shared --------

interface BowlPreviewProps {
  menu: MenuResponse;
  size: Size;
}

function BowlPreview({ menu, size }: BowlPreviewProps) {
  const wizard = useWizard();

  const toppings = useMemo(() => {
    const allIngs: Ingredient[] = [
      ...menu.ingredients.fruits,
      ...menu.ingredients.toppings,
      ...menu.ingredients.sauces,
      ...menu.ingredients.premium,
    ];
    const byId = new Map(allIngs.map((i) => [i.id, i]));

    const result: Array<{ id: string; emoji: string }> = [];
    const cats: Array<'fruits' | 'toppings' | 'sauces' | 'premium'> = [
      'fruits',
      'toppings',
      'sauces',
      'premium',
    ];
    for (const cat of cats) {
      for (const sel of wizard[cat]) {
        const ing = byId.get(sel.ingredientId);
        if (!ing) continue;
        const emoji = ingredientEmoji(ing.name);
        for (let i = 0; i < sel.count; i++) {
          result.push({ id: `${sel.ingredientId}-${i}`, emoji });
        }
      }
    }
    return result;
  }, [wizard, menu]);

  return (
    <div className="mb-1">
      <AcaiBowl toppings={toppings} />
      <div className="text-center mt-1 text-xs text-casa-purple-dark/60">
        Tigela {size.name}
      </div>
    </div>
  );
}

// -------- Etapa 5: Revisão --------

interface StepReviewProps {
  size: Size;
  menu: MenuResponse;
  onConfirm: () => void;
}

function StepReview({ size, menu, onConfirm }: StepReviewProps) {
  const wizard = useWizard();

  const pricing = useMemo(() => {
    const all = collectSelections(wizard, menu);
    return calculateBowlPrice(size, all);
  }, [wizard, menu, size]);

  const totalQty = wizard.quantity;
  const total = pricing.unitPrice * totalQty;

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-casa-purple-dark text-center">
        Sua tigela está assim 🍇
      </h2>
      <p className="text-center text-sm text-casa-purple-dark/60 mt-1">
        Confira e adicione à sacola.
      </p>

      <div className="bg-white rounded-2xl p-5 mt-5 shadow-sm space-y-3">
        <div className="flex justify-between items-baseline">
          <div>
            <div className="font-display text-xl font-bold text-casa-purple-dark">
              Tigela {size.name}
            </div>
            <div className="text-xs text-casa-purple-dark/60">{size.volumeMl}ml</div>
          </div>
          <div className="font-bold text-casa-purple tabular-nums">
            {formatBRL(pricing.basePrice)}
          </div>
        </div>

        {pricing.lines.length > 0 && (
          <div className="border-t border-casa-purple/10 pt-3 space-y-1.5">
            {pricing.lines.map((line) => (
              <div
                key={line.ingredient.id}
                className="flex justify-between text-sm"
              >
                <div className="text-casa-purple-dark/80">
                  {ingredientEmoji(line.ingredient.name)} {line.ingredient.name}
                  {line.count > 1 && (
                    <span className="text-casa-purple-dark/50"> × {line.count}</span>
                  )}
                  {line.paidUnits > 0 && line.freeUnits > 0 && (
                    <span className="text-xs text-amber-700 ml-1">
                      ({line.paidUnits} extras)
                    </span>
                  )}
                </div>
                <div className="text-casa-purple-dark/70 tabular-nums">
                  {line.lineExtra > 0 ? `+${formatBRL(line.lineExtra)}` : 'incluso'}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-casa-purple/10 pt-3 flex justify-between font-bold text-casa-purple-dark">
          <span>Subtotal por tigela</span>
          <span className="tabular-nums">{formatBRL(pricing.unitPrice)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 mt-4 shadow-sm">
        <label className="text-sm font-semibold text-casa-purple-dark">
          Quantas tigelas?
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
            {formatBRL(total)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 mt-4 shadow-sm">
        <label
          htmlFor="bowl-notes"
          className="text-sm font-semibold text-casa-purple-dark"
        >
          Alguma observação? <span className="text-casa-purple-dark/40 font-normal">(opcional)</span>
        </label>
        <textarea
          id="bowl-notes"
          value={wizard.notes}
          onChange={(e) => wizard.setNotes(e.target.value)}
          placeholder="ex: sem amendoim, por favor"
          rows={2}
          maxLength={200}
          className="mt-2 w-full bg-casa-cream/50 rounded-xl p-3 text-sm border border-casa-purple/10 focus:outline-none focus:ring-2 focus:ring-casa-purple/30 resize-none"
        />
        <div className="text-right text-xs text-casa-purple-dark/40 mt-1">
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
        Adicionar à sacola →
      </Button>

      <Link
        to="/"
        className="block text-center mt-3 text-sm text-casa-purple-dark/60 hover:text-casa-purple-dark"
      >
        Cancelar e voltar
      </Link>
    </div>
  );
}

// -------- Footer com summary + Avançar --------

interface FooterBarProps {
  size: Size | null;
  menu: MenuResponse;
  onNext: () => void;
  disabled: boolean;
}

function FooterBar({ size, menu, onNext, disabled }: FooterBarProps) {
  const wizard = useWizard();
  const pricing = useMemo(() => {
    if (!size) return null;
    return calculateBowlPrice(size, collectSelections(wizard, menu));
  }, [size, wizard, menu]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-casa-purple/10 shadow-[0_-4px_12px_rgba(93,26,120,0.08)]">
      <div className="container max-w-2xl py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {size ? (
            <>
              <div className="text-xs text-casa-purple-dark/60">
                Tigela {size.name}
              </div>
              <div className="font-display text-xl font-bold text-casa-purple tabular-nums">
                {pricing ? formatBRL(pricing.unitPrice) : formatBRL(size.price)}
              </div>
            </>
          ) : (
            <div className="text-sm text-casa-purple-dark/60">
              Escolha o tamanho pra começar
            </div>
          )}
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={onNext}
          disabled={disabled}
        >
          Avançar →
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

interface CollectedSelection {
  ingredient: Ingredient;
  count: number;
}

function collectSelections(
  wizard: ReturnType<typeof useWizard.getState>,
  menu: MenuResponse,
): CollectedSelection[] {
  const result: CollectedSelection[] = [];
  const allIngs: Ingredient[] = [
    ...menu.ingredients.fruits,
    ...menu.ingredients.toppings,
    ...menu.ingredients.sauces,
    ...menu.ingredients.premium,
  ];
  const byId = new Map(allIngs.map((i) => [i.id, i]));

  const cats: Array<'fruits' | 'toppings' | 'sauces' | 'premium'> = [
    'fruits',
    'toppings',
    'sauces',
    'premium',
  ];
  for (const cat of cats) {
    for (const sel of wizard[cat]) {
      const ing = byId.get(sel.ingredientId);
      if (!ing) continue;
      result.push({ ingredient: ing, count: sel.count });
    }
  }
  return result;
}

function buildCartItem(
  size: Size,
  wizard: ReturnType<typeof useWizard.getState>,
  menu: MenuResponse,
): CartItemBowl {
  const selections = collectSelections(wizard, menu);
  const pricing = calculateBowlPrice(size, selections);

  const ingredientLines = pricing.lines.map((line) => ({
    ingredientId: line.ingredient.id,
    ingredientName: line.ingredient.name,
    category: line.ingredient.category as IngredientCategory,
    count: line.count,
    freeUnits: line.freeUnits,
    paidUnits: line.paidUnits,
    lineExtra: line.lineExtra,
  }));

  return {
    id: newCartItemId(),
    type: 'CUSTOM_BOWL',
    sizeId: size.id,
    sizeName: size.name,
    sizeVolumeMl: size.volumeMl,
    basePrice: pricing.basePrice,
    extrasPrice: pricing.extrasPrice,
    unitPrice: pricing.unitPrice,
    quantity: wizard.quantity,
    notes: wizard.notes || undefined,
    ingredients: ingredientLines,
  };
}

export default Montar;
