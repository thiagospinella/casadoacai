import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Banknote, CreditCard, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { fetchMenu, createOrder } from '@/lib/menu-api';
import type {
  MenuResponse,
  PaymentMethod,
  CreateOrderItemPayload,
} from '@/types/menu';
import { formatBRL, formatPhone, onlyDigits } from '@/lib/format';
import { Button } from '@/components/Button';
import {
  selectCartCount,
  selectCartSubtotal,
  useCart,
  type CartItem,
} from '@/store/cart';
import { cn } from '@/lib/utils';

// ============================================================
// Schema do form
// ============================================================

const checkoutSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(2, 'Nome muito curto')
      .max(80, 'Nome muito longo'),
    customerPhone: z
      .string()
      .min(1, 'Telefone obrigatório')
      .refine(
        (v) => onlyDigits(v).length >= 10,
        'Telefone deve ter ao menos 10 dígitos',
      ),
    address: z.string().trim().min(5, 'Endereço muito curto').max(200),
    reference: z.string().trim().max(120).optional().or(z.literal('')),
    paymentMethod: z.enum(['PIX', 'CARTAO', 'DINHEIRO']),
    changeFor: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? Number(v.replace(',', '.')) : undefined)),
    notes: z.string().trim().max(300).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (
      data.paymentMethod === 'DINHEIRO' &&
      data.changeFor != null &&
      Number.isNaN(data.changeFor)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['changeFor'],
        message: 'Valor inválido',
      });
    }
  });

type CheckoutForm = z.input<typeof checkoutSchema>;
type CheckoutFormParsed = z.output<typeof checkoutSchema>;

// ============================================================
// Page
// ============================================================

export function Checkout() {
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      address: '',
      reference: '',
      paymentMethod: 'PIX',
      changeFor: '',
      notes: '',
    },
    mode: 'onBlur',
  });

  const paymentMethod = watch('paymentMethod') as PaymentMethod;

  useEffect(() => {
    fetchMenu()
      .then(setMenu)
      .catch(() => toast.error('Não conseguimos carregar a loja'))
      .finally(() => setLoading(false));
  }, []);

  // Se não tem item, manda de volta pra home
  useEffect(() => {
    if (!loading && selectCartCount(items) === 0) {
      toast.info('Sua sacola está vazia');
      navigate('/', { replace: true });
    }
  }, [items, loading, navigate]);

  const subtotal = selectCartSubtotal(items);
  const deliveryFee = menu?.store.deliveryFee ?? 0;
  const minOrderValue = menu?.store.minOrderValue ?? 0;
  const total = subtotal + deliveryFee;
  const belowMin = subtotal < minOrderValue;

  const onSubmit = async (raw: CheckoutForm) => {
    if (!menu) return;
    if (!menu.isOpen) {
      toast.error('Loja fechada no momento');
      return;
    }
    if (belowMin) {
      toast.error(`Pedido mínimo: ${formatBRL(minOrderValue)}`);
      return;
    }

    // RHF + zodResolver passa os dados JÁ TRANSFORMADOS pro onSubmit, mas o tipo TS
    // continua sendo z.input. Cast pra usar o tipo correto.
    const parsed = raw as unknown as CheckoutFormParsed;

    if (parsed.paymentMethod === 'DINHEIRO' && parsed.changeFor != null) {
      if (parsed.changeFor < total) {
        toast.error(
          `Valor do troco deve ser >= ${formatBRL(total)}`,
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        customerName: parsed.customerName,
        customerPhone: onlyDigits(parsed.customerPhone),
        address: parsed.address,
        reference: parsed.reference || undefined,
        paymentMethod: parsed.paymentMethod,
        changeFor:
          parsed.paymentMethod === 'DINHEIRO' && parsed.changeFor != null
            ? parsed.changeFor
            : undefined,
        notes: parsed.notes || undefined,
        items: items.map(toPayloadItem),
      };

      const res = await createOrder(payload);
      clear();
      localStorage.setItem('casaacai.activeOrder', res.orderId);

      // Abre WhatsApp em nova aba se tiver link
      if (res.whatsappLink) {
        window.open(res.whatsappLink, '_blank', 'noopener');
      }

      toast.success(`Pedido #${res.orderNumber} enviado!`);
      navigate(`/pedido/${res.orderId}`, { replace: true });
    } catch (err) {
      const errorAny = err as { response?: { data?: { error?: string } } };
      const msg = errorAny.response?.data?.error ?? 'Erro ao enviar pedido';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !menu) {
    return (
      <div className="min-h-screen bg-casa-cream flex items-center justify-center">
        <div className="text-5xl animate-bounce">🍇</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-casa-cream pb-32">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-casa-cream/95 backdrop-blur border-b border-casa-purple/10">
        <div className="container max-w-2xl flex items-center gap-3 py-3">
          <Link
            to="/"
            className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center text-casa-purple-dark hover:bg-white/80"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-xl font-bold text-casa-purple-dark">
            Finalizar pedido
          </h1>
        </div>
      </header>

      <main className="container max-w-2xl py-4 space-y-4">
        {!menu.isOpen && (
          <div className="bg-amber-100 border border-amber-200 text-amber-900 rounded-xl p-3 text-sm">
            ⚠️ Loja fechada — você não vai conseguir finalizar agora.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Dados pessoais */}
          <section className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-display font-bold text-casa-purple-dark">
              Seus dados
            </h2>
            <FieldGroup label="Nome completo" error={errors.customerName?.message}>
              <input
                {...register('customerName')}
                placeholder="Como podemos te chamar?"
                className={inputClass}
              />
            </FieldGroup>
            <FieldGroup label="WhatsApp" error={errors.customerPhone?.message}>
              <input
                {...register('customerPhone')}
                inputMode="tel"
                placeholder="(13) 99999-9999"
                className={inputClass}
                onChange={(e) => {
                  const v = formatPhone(e.target.value);
                  setValue('customerPhone', v, { shouldValidate: false });
                }}
              />
            </FieldGroup>
          </section>

          {/* Endereço */}
          <section className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-display font-bold text-casa-purple-dark">
              Onde entregar
            </h2>
            <FieldGroup label="Endereço" error={errors.address?.message}>
              <input
                {...register('address')}
                placeholder="Rua, número, bairro"
                className={inputClass}
              />
            </FieldGroup>
            <FieldGroup
              label="Ponto de referência (opcional)"
              error={errors.reference?.message}
            >
              <input
                {...register('reference')}
                placeholder="ex: perto do mercado"
                className={inputClass}
              />
            </FieldGroup>
          </section>

          {/* Pagamento */}
          <section className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-display font-bold text-casa-purple-dark">
              Pagamento
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <PaymentCard
                value="PIX"
                label="Pix"
                Icon={QrCode}
                selected={paymentMethod === 'PIX'}
                onSelect={() => setValue('paymentMethod', 'PIX')}
              />
              <PaymentCard
                value="CARTAO"
                label="Cartão"
                Icon={CreditCard}
                selected={paymentMethod === 'CARTAO'}
                onSelect={() => setValue('paymentMethod', 'CARTAO')}
              />
              <PaymentCard
                value="DINHEIRO"
                label="Dinheiro"
                Icon={Banknote}
                selected={paymentMethod === 'DINHEIRO'}
                onSelect={() => setValue('paymentMethod', 'DINHEIRO')}
              />
            </div>
            {paymentMethod === 'DINHEIRO' && (
              <FieldGroup
                label="Troco para?"
                error={errors.changeFor?.message}
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-casa-purple-dark/60 text-sm font-semibold">
                    R$
                  </span>
                  <input
                    {...register('changeFor')}
                    inputMode="decimal"
                    placeholder="0,00"
                    className={cn(inputClass, 'pl-9')}
                  />
                </div>
              </FieldGroup>
            )}
          </section>

          {/* Observação */}
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <FieldGroup
              label="Observação geral (opcional)"
              error={errors.notes?.message}
            >
              <textarea
                {...register('notes')}
                rows={2}
                placeholder="ex: tocar a campainha"
                className={cn(inputClass, 'resize-none')}
              />
            </FieldGroup>
          </section>

          {/* Resumo */}
          <section className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-display font-bold text-casa-purple-dark">
              Resumo do pedido
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {items.map((item) => (
                <SummaryItem key={item.id} item={item} />
              ))}
            </div>
            <div className="border-t border-casa-purple/10 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-casa-purple-dark/70">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between text-casa-purple-dark/70">
                <span>Taxa de entrega</span>
                <span className="tabular-nums">{formatBRL(deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-casa-purple-dark border-t border-casa-purple/10 pt-2">
                <span>Total</span>
                <span className="tabular-nums text-casa-purple">
                  {formatBRL(total)}
                </span>
              </div>
              {belowMin && (
                <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 text-center">
                  Pedido mínimo: {formatBRL(minOrderValue)}
                </div>
              )}
            </div>
          </section>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={submitting || belowMin || !menu.isOpen}
          >
            {submitting ? 'Enviando...' : `Finalizar — ${formatBRL(total)}`}
          </Button>
        </form>
      </main>
    </div>
  );
}

// ============================================================
// Sub-componentes
// ============================================================

const inputClass =
  'w-full bg-casa-cream/50 rounded-xl px-3 py-2.5 text-sm border border-casa-purple/10 focus:outline-none focus:ring-2 focus:ring-casa-purple/30 placeholder:text-casa-purple-dark/30';

interface FieldGroupProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function FieldGroup({ label, error, children }: FieldGroupProps) {
  return (
    <div>
      <label className="text-xs font-semibold text-casa-purple-dark mb-1 block">
        {label}
      </label>
      {children}
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  );
}

interface PaymentCardProps {
  value: PaymentMethod;
  label: string;
  Icon: typeof QrCode;
  selected: boolean;
  onSelect: () => void;
}

function PaymentCard({ label, Icon, selected, onSelect }: PaymentCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'border-2 rounded-2xl p-3 flex flex-col items-center gap-1 transition-all',
        selected
          ? 'border-casa-purple bg-casa-purple/5'
          : 'border-casa-purple/10 bg-white hover:border-casa-purple/30',
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5',
          selected ? 'text-casa-purple' : 'text-casa-purple/60',
        )}
      />
      <span
        className={cn(
          'text-xs font-semibold',
          selected ? 'text-casa-purple-dark' : 'text-casa-purple-dark/60',
        )}
      >
        {label}
      </span>
    </button>
  );
}

function SummaryItem({ item }: { item: CartItem }) {
  const title =
    item.type === 'COMBO'
      ? `${item.quantity}x Combo ${item.comboName}`
      : `${item.quantity}x Tigela ${item.sizeName}`;
  const subtitle =
    item.type === 'COMBO'
      ? item.ingredients.map((i) => i.ingredientName).join(', ')
      : item.ingredients
          .map((i) => (i.count > 1 ? `${i.ingredientName} x${i.count}` : i.ingredientName))
          .join(', ');
  return (
    <div className="flex justify-between gap-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-casa-purple-dark truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-casa-purple-dark/60 truncate">
            {subtitle}
          </div>
        )}
      </div>
      <div className="font-semibold text-casa-purple-dark tabular-nums shrink-0">
        {formatBRL(item.unitPrice * item.quantity)}
      </div>
    </div>
  );
}

// ============================================================
// Mapper: cart -> payload
// ============================================================

function toPayloadItem(item: CartItem): CreateOrderItemPayload {
  if (item.type === 'COMBO') {
    return {
      type: 'COMBO',
      comboId: item.comboId,
      quantity: item.quantity,
      ...(item.notes ? { notes: item.notes } : {}),
    };
  }
  // CUSTOM_BOWL — flatten ingredients (count copies de cada)
  const ingredients: { ingredientId: string }[] = [];
  for (const line of item.ingredients) {
    for (let i = 0; i < line.count; i++) {
      ingredients.push({ ingredientId: line.ingredientId });
    }
  }
  return {
    type: 'CUSTOM_BOWL',
    sizeId: item.sizeId,
    quantity: item.quantity,
    ingredients,
    ...(item.notes ? { notes: item.notes } : {}),
  };
}

export default Checkout;
