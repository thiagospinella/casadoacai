import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cancelOrder, fetchOrder } from '@/lib/menu-api';
import type { OrderApi, OrderResponse } from '@/types/menu';
import { formatBRL, formatPhone } from '@/lib/format';
import { Button } from '@/components/Button';
import { StatusTracker } from '@/components/StatusTracker';

const POLL_INTERVAL_MS = 5000;
const PAYMENT_LABEL: Record<string, string> = {
  PIX: 'Pix',
  CARTAO: 'Cartão na entrega',
  DINHEIRO: 'Dinheiro',
};

export function Pedido() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const lastStatusRef = useRef<string | null>(null);

  // Carga inicial + polling
  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;

    async function load() {
      try {
        if (!id) return;
        const res = await fetchOrder(id);
        if (cancelled) return;
        setData(res);
        // Detecta transição -> DELIVERED pra mostrar confete
        if (lastStatusRef.current && lastStatusRef.current !== 'DELIVERED' && res.order.status === 'DELIVERED') {
          setShowCelebration(true);
        }
        lastStatusRef.current = res.order.status;
      } catch {
        if (cancelled) return;
        toast.error('Não foi possível carregar o pedido');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  const handleCancel = async () => {
    if (!id || !data) return;
    if (!confirm('Tem certeza que quer cancelar o pedido?')) return;
    setCancelling(true);
    try {
      const res = await cancelOrder(id);
      setData((prev) => (prev ? { ...prev, order: res.order } : prev));
      toast.success('Pedido cancelado');
    } catch (err) {
      const errorAny = err as { response?: { data?: { error?: string } } };
      toast.error(errorAny.response?.data?.error ?? 'Erro ao cancelar');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-casa-cream flex items-center justify-center">
        <div className="text-5xl animate-bounce">🍇</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-casa-cream flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-casa-purple-dark font-semibold">Pedido não encontrado.</p>
          <Link to="/" className="block mt-3 text-casa-purple underline">
            Voltar pro cardápio
          </Link>
        </div>
      </div>
    );
  }

  const { order, whatsappLink, preparationTime } = data;
  const canCancel = order.status === 'PENDING' || order.status === 'PREPARING';
  const showWhatsAppCta = order.status === 'PENDING' && whatsappLink;

  return (
    <div className="min-h-screen bg-casa-cream pb-12 relative">
      {showCelebration && <Confetti onDone={() => setShowCelebration(false)} />}

      <header className="bg-casa-purple text-white sticky top-0 z-30 shadow-md">
        <div className="container max-w-2xl py-3 flex items-center gap-3">
          <Link
            to="/"
            className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <div className="text-xs text-white/70">Pedido</div>
            <div className="font-display text-lg font-bold">
              #{order.orderNumber}
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-4 space-y-4">
        {order.status === 'DELIVERED' && (
          <DeliveredCard />
        )}

        {order.status !== 'DELIVERED' && (
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <div className="text-xs text-casa-purple-dark/60">
              Tempo estimado de preparo
            </div>
            <div className="font-display text-3xl font-bold text-casa-purple mt-1">
              ~{preparationTime} min
            </div>
          </div>
        )}

        <StatusTracker status={order.status} />

        {/* CTA WhatsApp */}
        {showWhatsAppCta && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="bg-casa-green text-white rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:brightness-95 transition"
          >
            <MessageCircle className="h-6 w-6 shrink-0" />
            <div className="flex-1 leading-tight">
              <div className="font-bold text-sm">Confirmar pelo WhatsApp</div>
              <div className="text-xs text-white/80">
                Abra o WhatsApp e envie a mensagem pra confirmar o pedido
              </div>
            </div>
            <span className="text-lg">→</span>
          </a>
        )}

        {/* Resumo */}
        <section className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="font-display font-bold text-casa-purple-dark">
            Itens do pedido
          </h2>
          <div className="space-y-2">
            {order.items.map((item) => (
              <OrderItemSummary key={item.id} item={item} />
            ))}
          </div>
          <div className="border-t border-casa-purple/10 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-casa-purple-dark/70">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatBRL(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-casa-purple-dark/70">
              <span>Taxa de entrega</span>
              <span className="tabular-nums">{formatBRL(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-casa-purple-dark border-t border-casa-purple/10 pt-2">
              <span>Total</span>
              <span className="tabular-nums text-casa-purple">
                {formatBRL(order.total)}
              </span>
            </div>
          </div>
        </section>

        {/* Cliente / endereço / pagamento */}
        <section className="bg-white rounded-2xl p-5 shadow-sm space-y-3 text-sm">
          <h2 className="font-display font-bold text-casa-purple-dark">
            Entrega
          </h2>
          <Field label="Nome" value={order.customerName} />
          <Field label="WhatsApp" value={formatPhone(order.customerPhone)} />
          <Field label="Endereço" value={order.address} />
          {order.reference && <Field label="Referência" value={order.reference} />}
          <Field
            label="Pagamento"
            value={`${PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}${
              order.changeFor != null
                ? ` · troco para ${formatBRL(order.changeFor)}`
                : ''
            }`}
          />
          {order.notes && <Field label="Observações" value={order.notes} />}
        </section>

        {/* Cancelar */}
        {canCancel && (
          <Button
            variant="danger"
            fullWidth
            loading={cancelling}
            onClick={handleCancel}
          >
            Cancelar pedido
          </Button>
        )}

        {order.status === 'DELIVERED' && (
          <Link to="/">
            <Button variant="primary" size="lg" fullWidth>
              Voltar pro cardápio
            </Button>
          </Link>
        )}
      </main>
    </div>
  );
}

// ============================================================
// Sub-componentes
// ============================================================

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-casa-purple-dark/60">{label}</span>
      <span className="text-casa-purple-dark">{value}</span>
    </div>
  );
}

function OrderItemSummary({ item }: { item: OrderApi['items'][number] }) {
  const title =
    item.type === 'COMBO'
      ? `${item.quantity}x Combo ${item.comboName ?? ''}`
      : `${item.quantity}x Tigela ${item.sizeName}`;

  // Agrupa ingredientes pelo nome (a API manda 1 row por ocorrência pra bowls)
  const grouped = new Map<string, number>();
  for (const ing of item.ingredients) {
    grouped.set(ing.ingredientName, (grouped.get(ing.ingredientName) ?? 0) + 1);
  }
  const ingsLabel = Array.from(grouped.entries())
    .map(([name, count]) => (count > 1 ? `${name} x${count}` : name))
    .join(', ');

  return (
    <div className="flex justify-between gap-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-casa-purple-dark">{title}</div>
        {ingsLabel && (
          <div className="text-xs text-casa-purple-dark/60 line-clamp-2">
            {ingsLabel}
          </div>
        )}
        {item.notes && (
          <div className="text-xs italic text-casa-purple-dark/50">
            Obs: {item.notes}
          </div>
        )}
      </div>
      <div className="font-semibold text-casa-purple-dark tabular-nums shrink-0">
        {formatBRL(item.subtotal)}
      </div>
    </div>
  );
}

function DeliveredCard() {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-gradient-to-br from-casa-green to-emerald-600 text-white rounded-2xl p-6 text-center shadow-lg"
    >
      <div className="text-5xl mb-2">🎉</div>
      <h2 className="font-display text-2xl font-bold">Pedido entregue!</h2>
      <p className="text-white/90 text-sm mt-1">
        Esperamos que você curta. Volte sempre 💜
      </p>
    </motion.div>
  );
}

interface ConfettiProps {
  onDone: () => void;
}

function Confetti({ onDone }: ConfettiProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  const pieces = Array.from({ length: 28 });

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const duration = 2 + Math.random() * 1.5;
        const emoji = ['🍇', '💜', '🎉', '✨', '🌟'][i % 5];
        return (
          <motion.div
            key={i}
            initial={{ y: -40, opacity: 0, rotate: 0 }}
            animate={{
              y: window.innerHeight + 60,
              opacity: [0, 1, 1, 0],
              rotate: 360,
            }}
            transition={{ duration, delay, ease: 'linear' }}
            className="absolute text-2xl"
            style={{ left: `${left}%` }}
          >
            {emoji}
          </motion.div>
        );
      })}
    </div>
  );
}

export default Pedido;
