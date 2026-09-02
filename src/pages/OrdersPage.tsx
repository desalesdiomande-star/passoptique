import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n/translations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Truck,
  Clock,
  CheckCircle2,
  Package,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchJson } from '@/lib/api';

const STATUSES = [
  'quote',
  'ordered',
  'production',
  'ready',
  'delivered',
] as const;

type OrderStatus = typeof STATUSES[number];

interface Order {
  id: number;
  reference: string;
  date: string;
  orderStatus: OrderStatus | string | null;
  firstName: string;
  lastName: string;
  items: string | null;
}

const OrdersPage = () => {
  const { lang } = useAuth();
  const tr = t(lang);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const statusConfig: Record<
    string,
    {
      label: string;
      color: string;
      icon: typeof Truck;
    }
  > = {
    quote: {
      label: tr.quote,
      color: 'bg-muted text-muted-foreground',
      icon: Clock,
    },
    ordered: {
      label: tr.ordered,
      color: 'bg-info/10 text-info',
      icon: Package,
    },
    production: {
      label: tr.inProduction,
      color: 'bg-warning/10 text-warning',
      icon: Truck,
    },
    ready: {
      label: tr.ready,
      color: 'bg-success/10 text-success',
      icon: CheckCircle2,
    },
    delivered: {
      label: tr.delivered,
      color: 'bg-primary/10 text-primary',
      icon: CheckCircle2,
    },
  };

  const loadOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchJson<Order[]>('/api/sales');
      setOrders(data);
    } catch (err) {
      console.error('Erreur chargement commandes :', err);

      setError(
        lang === 'fr'
          ? 'Impossible de charger les commandes.'
          : 'Failed to load orders.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [lang]);

  const nextStatus = (current: string): OrderStatus | null => {
    const idx = STATUSES.indexOf(current as OrderStatus);

    if (idx === -1 || idx === STATUSES.length - 1) {
      return null;
    }

    return STATUSES[idx + 1];
  };

  const advanceStatus = async (order: Order) => {
    const current = order.orderStatus ?? 'quote';
    const next = nextStatus(current);

    if (!next) return;

    setUpdatingId(order.id);

    try {
      const result = await fetchJson<{
        invoiceCreated: string | null;
      }>(`/api/sales/${order.id}/order-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderStatus: next,
        }),
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                orderStatus: next,
              }
            : o
        )
      );

      if (result.invoiceCreated) {
        toast.success(
          lang === 'fr'
            ? `Statut mis à jour — facture ${result.invoiceCreated} générée`
            : `Status updated — invoice ${result.invoiceCreated} generated`
        );
      } else {
        toast.success(
          lang === 'fr'
            ? 'Statut mis à jour'
            : 'Status updated'
        );
      }
    } catch (err) {
      console.error('Erreur mise à jour commande :', err);

      toast.error(
        lang === 'fr'
          ? 'Échec de la mise à jour'
          : 'Update failed'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">
        {tr.orders}
      </h1>

      <div className="space-y-3">
        {orders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {lang === 'fr'
              ? 'Aucune commande'
              : 'No orders'}
          </p>
        )}

        {orders.map((o) => {
          const status = o.orderStatus ?? 'quote';

          const cfg =
            statusConfig[status] ??
            statusConfig.quote;

          const next = nextStatus(status);

          return (
            <Card
              key={o.id}
              className="border-0 shadow-sm"
            >
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">

                <div className="flex items-center gap-3">

                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.color}`}
                  >
                    <cfg.icon className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="font-medium">
                      #{o.reference ?? o.id} — {o.firstName} {o.lastName}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {o.items ?? '—'}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {new Date(o.date).toLocaleDateString(
                        lang === 'fr'
                          ? 'fr-FR'
                          : 'en-US'
                      )}
                    </p>
                  </div>

                </div>

                <div className="flex items-center gap-2">

                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${cfg.color}`}
                  >
                    {cfg.label}
                  </span>

                  {next && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingId === o.id}
                      onClick={() => advanceStatus(o)}
                    >
                      {updatingId === o.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          {statusConfig[next].label}

                          <ArrowRight className="h-3 w-3 ml-1" />
                        </>
                      )}
                    </Button>
                  )}

                </div>

              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersPage;

