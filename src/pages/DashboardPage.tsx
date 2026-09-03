import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n/translations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  ShoppingCart,
  Truck,
  Glasses,
  AlertTriangle,
  Package,
} from 'lucide-react';

// NOUVEAU — même pattern que ClientsPage.tsx / PrescriptionsPage.tsx / StockPage.tsx
function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// NOUVEAU — même pattern que AuthContext.tsx / PermissionsContext.tsx / lib/api.ts
// Lit VITE_API_URL (configurée sur Vercel), avec fallback local pour le dev.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type DashboardData = {
  revenue: number;
  sales: number;
  pendingOrders: number;
  readyGlasses: number;

  lowStock: {
    id: number;
    name: string;
    qty: number;
    brand: string;
    ref: string;
    price: number;
  }[];

  topProducts: {
    id: number;
    name: string;
    brand: string;
    qty: number;
  }[];

  recentSales: {
    id: number;
    reference: string;
    total: number;
    status: string;
    orderStatus: string | null;
    date: string;
    firstName: string | null;
    lastName: string | null;
  }[];
};

const DashboardPage = () => {
  const { user, lang } = useAuth();
  const tr = t(lang);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // =====================================================
  // CHARGEMENT DES DONNÉES DU DASHBOARD
  // =====================================================
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `${API_URL}/api/dashboard/stats`,
          {
            headers: authHeaders(), // NOUVEAU — sans ça, 401 systématique
          }
        );

        if (!response.ok) {
          throw new Error(
            `Erreur HTTP : ${response.status}`
          );
        }

        const data: DashboardData = await response.json();

        setDashboard(data);
      } catch (error) {
        console.error(
          'Erreur chargement dashboard :',
          error
        );

        setError(
          'Impossible de charger les statistiques du dashboard.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  // =====================================================
  // CHARGEMENT
  // =====================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          Chargement du dashboard...
        </p>
      </div>
    );
  }

  // =====================================================
  // ERREUR
  // =====================================================
  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">
            {tr.welcome}, {user?.name} 👋
          </h1>

          <p className="text-muted-foreground text-sm">
            {user?.shopName}
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">
              {error}
            </p>

            <p className="text-sm text-muted-foreground mt-2">
              Vérifie que ton serveur Node.js est démarré
              sur le port 4000.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =====================================================
  // KPI
  // =====================================================
  const stats = [
    {
      label: tr.todayRevenue,
      value: dashboard?.revenue ?? 0,
      suffix: tr.currency,
      icon: TrendingUp,
      color: 'text-success',
    },
    {
      label: tr.todaySales,
      value: dashboard?.sales ?? 0,
      icon: ShoppingCart,
      color: 'text-info',
    },
    {
      label: tr.pendingOrders,
      value: dashboard?.pendingOrders ?? 0,
      icon: Truck,
      color: 'text-warning',
    },
    {
      label: tr.readyGlasses,
      value: dashboard?.readyGlasses ?? 0,
      icon: Glasses,
      color: 'text-primary',
    },
  ];

  // =====================================================
  // AFFICHAGE
  // =====================================================
  return (
    <div className="space-y-6 animate-fade-in">

      {/* =================================================
          HEADER
      ================================================= */}
      <div>
        <h1 className="text-2xl font-bold">
          {tr.welcome}, {user?.name} 👋
        </h1>

        <p className="text-muted-foreground text-sm">
          {user?.shopName}
        </p>
      </div>

      {/* =================================================
          KPI CARDS
      ================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {stats.map((s) => {
          const Icon = s.icon;

          return (
            <Card
              key={s.label}
              className="border-0 shadow-sm"
            >
              <CardContent className="p-5">

                <div className="flex items-start justify-between">

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {s.label}
                    </p>

                    <p className="text-2xl font-bold">

                      {typeof s.value === 'number'
                        ? s.value.toLocaleString('fr-FR')
                        : s.value}

                      {s.suffix && (
                        <span className="text-sm font-normal text-muted-foreground">
                          {' '}
                          {s.suffix}
                        </span>
                      )}

                    </p>
                  </div>

                  <div
                    className={`p-2 rounded-lg bg-muted ${s.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                </div>

              </CardContent>
            </Card>
          );
        })}

      </div>

      {/* =================================================
          STOCK + TOP PRODUCTS
      ================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* =================================================
            STOCK FAIBLE
        ================================================= */}
        <Card className="border-0 shadow-sm">

          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">

              <AlertTriangle className="h-4 w-4 text-warning" />

              {tr.lowStock}

            </CardTitle>
          </CardHeader>

          <CardContent>

            <div className="space-y-3">

              {dashboard?.lowStock &&
              dashboard.lowStock.length > 0 ? (

                dashboard.lowStock.map((item) => (

                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted"
                  >

                    <div className="flex items-center gap-3">

                      <Package className="h-4 w-4 text-muted-foreground" />

                      <div>
                        <span className="text-sm font-medium">
                          {item.name}
                        </span>

                        <p className="text-xs text-muted-foreground">
                          {item.brand} · {item.ref}
                        </p>
                      </div>

                    </div>

                    <span className="text-sm font-bold text-destructive">
                      {item.qty}
                    </span>

                  </div>

                ))

              ) : (

                <p className="text-sm text-muted-foreground">
                  Aucun produit en stock faible.
                </p>

              )}

            </div>

          </CardContent>

        </Card>

        {/* =================================================
            TOP PRODUITS
        ================================================= */}
        <Card className="border-0 shadow-sm">

          <CardHeader className="pb-3">

            <CardTitle className="text-base">
              {tr.topProducts}
            </CardTitle>

          </CardHeader>

          <CardContent>

            <div className="space-y-3">

              {dashboard?.topProducts &&
              dashboard.topProducts.length > 0 ? (

                dashboard.topProducts.map((p, i) => (

                  <div
                    key={p.id}
                    className="flex items-center justify-between"
                  >

                    <div className="flex items-center gap-3">

                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>

                      <div>

                        <span className="text-sm">
                          {p.name}
                        </span>

                        <p className="text-xs text-muted-foreground">
                          {p.brand}
                        </p>

                      </div>

                    </div>

                    <span className="text-sm font-semibold">
                      {p.qty}
                    </span>

                  </div>

                ))

              ) : (

                <p className="text-sm text-muted-foreground">
                  Aucun produit vendu pour le moment.
                </p>

              )}

            </div>

          </CardContent>

        </Card>

      </div>

      {/* =================================================
          ACTIVITÉ RÉCENTE
      ================================================= */}
      <Card className="border-0 shadow-sm">

        <CardHeader className="pb-3">

          <CardTitle className="text-base">
            {tr.recentActivity}
          </CardTitle>

        </CardHeader>

        <CardContent>

          <div className="space-y-3">

            {dashboard?.recentSales &&
            dashboard.recentSales.length > 0 ? (

              dashboard.recentSales.map((sale) => (

                <div
                  key={sale.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >

                  <div>

                    <span className="text-sm">

                      {lang === 'fr'
                        ? `Vente #${sale.reference} validée`
                        : `Sale #${sale.reference} validated`}

                    </span>

                    {sale.firstName && (
                      <p className="text-xs text-muted-foreground">
                        {sale.firstName} {sale.lastName}
                      </p>
                    )}

                  </div>

                  <div className="text-right">

                    <span className="text-xs text-muted-foreground block">
                      {new Date(
                        sale.date
                      ).toLocaleDateString('fr-FR')}
                    </span>

                    <span className="text-xs font-medium">
                      {Number(sale.total).toLocaleString('fr-FR')} FCFA
                    </span>

                  </div>

                </div>

              ))

            ) : (

              <p className="text-sm text-muted-foreground">
                Aucune activité récente.
              </p>

            )}

          </div>

        </CardContent>

      </Card>

    </div>
  );
};

export default DashboardPage;