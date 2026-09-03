import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n/translations';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import {
  Download,
  TrendingUp,
  CreditCard,
  ShoppingCart,
  Calendar,
  RefreshCw,
} from 'lucide-react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

import { generateReportPdf } from '@/lib/generatePdf';
import { toast } from 'sonner';

import { useEffect, useState } from 'react';


/* =========================================================
   TYPES
========================================================= */

interface CashierSummary {
  totalCollected: number;
  cash: number;
  momo: number;
  transactions: number;
  remaining: number;
}

interface CashierDaily {
  day: string;
  cash: number;
  momo: number;
  total: number;
}

interface SellerSummary {
  sales: number;
  revenue: number;
  averageBasket: number;
  newClients: number;
}

interface SellerDaily {
  day: string;
  sales: number;
  revenue: number;
}

interface DirectorSummary {
  revenue: number;
  collected: number;
  unpaid: number;
  sales: number;
}

interface MonthlyTrend {
  month: string;
  revenue: number;
}

interface ReportsData {
  period: string;

  cashier: {
    summary: CashierSummary;
    daily: CashierDaily[];
  };

  seller: {
    summary: SellerSummary;
    daily: SellerDaily[];
  };

  director: {
    summary: DirectorSummary;
    monthlyTrend: MonthlyTrend[];
  };
}


/* =========================================================
   API URL
========================================================= */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';


/* =========================================================
   UTILITAIRE FORMAT FCFA
========================================================= */

const formatFCFA = (value: number) => {
  return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
};


/* =========================================================
   COMPONENT
========================================================= */

const ReportsPage = () => {

  const { user, lang } = useAuth();

  const tr = t(lang);

  const isFr = lang === 'fr';

  const role = user?.role || 'vendeur';


  /* =======================================================
     STATES
  ======================================================= */

  const [period, setPeriod] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [report, setReport] = useState<ReportsData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);


  /* =======================================================
     CHARGEMENT DES RAPPORTS
  ======================================================= */

  const fetchReports = async () => {

    if (!user) {
      return;
    }

    try {

      setLoading(true);

      setError(null);


      const params = new URLSearchParams();

      params.append('period', period);

      params.append('role', role);

      if (user.id) {
        params.append('userId', user.id);
      }


      // -----------------------------------------------------
      // BUG CORRIGÉ : le token n'était jamais envoyé, ce qui
      // provoquait un 401 (Token manquant) côté backend, car
      // la route /api/reports est protégée par requireAuth.
      // -----------------------------------------------------
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${API_URL}/api/reports?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token || ''}`,
          },
        }
      );


      if (!response.ok) {

        throw new Error(
          `Erreur HTTP ${response.status}`
        );

      }


      const data: ReportsData = await response.json();


      setReport(data);

    } catch (err) {

      console.error(
        'Erreur chargement rapports :',
        err
      );

      setError(
        isFr
          ? 'Impossible de charger les rapports.'
          : 'Unable to load reports.'
      );

      toast.error(
        isFr
          ? 'Erreur lors du chargement des rapports'
          : 'Error loading reports'
      );

    } finally {

      setLoading(false);

    }

  };


  /* =======================================================
     USE EFFECT
  ======================================================= */

  useEffect(() => {

    fetchReports();

  }, [period, user?.id, role]);


  /* =======================================================
     DONNEES CAISSIER
  ======================================================= */

  const cashierSummary = report
    ? [
        {
          label: isFr
            ? 'Total encaissé'
            : 'Total collected',

          value: formatFCFA(
            report.cashier.summary.totalCollected
          ),
        },

        {
          label: isFr
            ? 'Espèces'
            : 'Cash',

          value: formatFCFA(
            report.cashier.summary.cash
          ),
        },

        {
          label: 'Mobile Money',

          value: formatFCFA(
            report.cashier.summary.momo
          ),
        },

        {
          label: isFr
            ? 'Reste à encaisser'
            : 'Remaining to collect',

          value: formatFCFA(
            report.cashier.summary.remaining
          ),
        },

        {
          label: isFr
            ? 'Nombre de transactions'
            : 'Transactions count',

          value:
            report.cashier.summary.transactions.toLocaleString(
              'fr-FR'
            ),
        },
      ]
    : [];


  /* =======================================================
     DONNEES VENDEUR
  ======================================================= */

  const sellerSummary = report
    ? [
        {
          label: isFr
            ? 'Ventes réalisées'
            : 'Sales made',

          value:
            report.seller.summary.sales.toLocaleString(
              'fr-FR'
            ),
        },

        {
          label: isFr
            ? "Chiffre d'affaires"
            : 'Revenue',

          value: formatFCFA(
            report.seller.summary.revenue
          ),
        },

        {
          label: isFr
            ? 'Panier moyen'
            : 'Average basket',

          value: formatFCFA(
            report.seller.summary.averageBasket
          ),
        },

        {
          label: isFr
            ? 'Nouveaux clients'
            : 'New clients',

          value:
            report.seller.summary.newClients.toLocaleString(
              'fr-FR'
            ),
        },
      ]
    : [];


  /* =======================================================
     DONNEES DIRECTEUR
  ======================================================= */

  const directorSummary = report
    ? [
        {
          label: isFr
            ? 'CA total'
            : 'Total revenue',

          value: formatFCFA(
            report.director.summary.revenue
          ),
        },

        {
          label: isFr
            ? 'Total encaissé'
            : 'Total collected',

          value: formatFCFA(
            report.director.summary.collected
          ),
        },

        {
          label: isFr
            ? 'Impayés'
            : 'Unpaid',

          value: formatFCFA(
            report.director.summary.unpaid
          ),
        },

        {
          label: isFr
            ? 'Ventes totales'
            : 'Total sales',

          value:
            report.director.summary.sales.toLocaleString(
              'fr-FR'
            ),
        },
      ]
    : [];


  /* =======================================================
     PDF
  ======================================================= */

  const handleDownloadReport = (
    title: string,
    data: {
      label: string;
      value: string;
    }[]
  ) => {

    generateReportPdf(
      title,
      lang,
      data,
      user?.name || '',
      role,
      period
    );

    toast.success(
      isFr
        ? 'Rapport PDF téléchargé'
        : 'PDF report downloaded'
    );
  };


  /* =======================================================
     RAPPORT CAISSIER
  ======================================================= */

  const renderCashierReport = () => {

    if (!report) {
      return null;
    }


    return (

      <div className="space-y-6">

        {/* HEADER */}

        <div className="flex items-center justify-between flex-wrap gap-3">

          <h2 className="text-lg font-semibold flex items-center gap-2">

            <CreditCard className="h-5 w-5 text-primary" />

            {isFr
              ? 'Rapport Caisse'
              : 'Cash Report'}

          </h2>


          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              handleDownloadReport(
                isFr
                  ? 'Rapport_Caisse'
                  : 'Cash_Report',
                cashierSummary
              )
            }
          >

            <Download className="h-4 w-4 mr-1" />

            {tr.downloadPdf}

          </Button>

        </div>


        {/* CARDS */}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

          {cashierSummary.map((item) => (

            <Card
              key={item.label}
              className="border-0 shadow-sm"
            >

              <CardContent className="p-4">

                <p className="text-xs text-muted-foreground">
                  {item.label}
                </p>

                <p className="text-lg font-bold mt-1">
                  {item.value}
                </p>

              </CardContent>

            </Card>

          ))}

        </div>


        {/* GRAPHIQUE */}

        <Card className="border-0 shadow-sm">

          <CardHeader className="pb-2">

            <CardTitle className="text-base">

              {isFr
                ? 'Encaissements par jour'
                : 'Daily Collections'}

            </CardTitle>

          </CardHeader>


          <CardContent>

            {report.cashier.daily.length === 0 ? (

              <div className="h-[260px] flex items-center justify-center text-muted-foreground">

                {isFr
                  ? 'Aucune donnée pour cette période'
                  : 'No data for this period'}

              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height={260}
              >

                <BarChart
                  data={report.cashier.daily}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="day"
                  />

                  <YAxis
                    tickFormatter={(value: number) =>
                      `${(value / 1000).toFixed(0)}k`
                    }
                  />

                  <Tooltip
                    formatter={(value: number) =>
                      `${Number(value).toLocaleString(
                        'fr-FR'
                      )} FCFA`
                    }
                  />

                  <Bar
                    dataKey="cash"
                    name={
                      isFr
                        ? 'Espèces'
                        : 'Cash'
                    }
                    fill="hsl(142, 71%, 45%)"
                    radius={[4, 4, 0, 0]}
                  />

                  <Bar
                    dataKey="momo"
                    name="MoMo"
                    fill="hsl(49, 100%, 51%)"
                    radius={[4, 4, 0, 0]}
                  />

                </BarChart>

              </ResponsiveContainer>

            )}

          </CardContent>

        </Card>

      </div>

    );
  };


  /* =======================================================
     RAPPORT VENDEUR
  ======================================================= */

  const renderSellerReport = () => {

    if (!report) {
      return null;
    }


    return (

      <div className="space-y-6">

        {/* HEADER */}

        <div className="flex items-center justify-between flex-wrap gap-3">

          <h2 className="text-lg font-semibold flex items-center gap-2">

            <ShoppingCart className="h-5 w-5 text-primary" />

            {isFr
              ? 'Rapport Vendeur'
              : 'Seller Report'}

          </h2>


          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              handleDownloadReport(
                isFr
                  ? 'Rapport_Vendeur'
                  : 'Seller_Report',
                sellerSummary
              )
            }
          >

            <Download className="h-4 w-4 mr-1" />

            {tr.downloadPdf}

          </Button>

        </div>


        {/* CARDS */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

          {sellerSummary.map((item) => (

            <Card
              key={item.label}
              className="border-0 shadow-sm"
            >

              <CardContent className="p-4">

                <p className="text-xs text-muted-foreground">
                  {item.label}
                </p>

                <p className="text-lg font-bold mt-1">
                  {item.value}
                </p>

              </CardContent>

            </Card>

          ))}

        </div>


        {/* GRAPHIQUE */}

        <Card className="border-0 shadow-sm">

          <CardHeader className="pb-2">

            <CardTitle className="text-base">

              {isFr
                ? 'Performance des ventes'
                : 'Sales Performance'}

            </CardTitle>

          </CardHeader>


          <CardContent>

            {report.seller.daily.length === 0 ? (

              <div className="h-[260px] flex items-center justify-center text-muted-foreground">

                {isFr
                  ? 'Aucune vente pour cette période'
                  : 'No sales for this period'}

              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height={260}
              >

                <BarChart
                  data={report.seller.daily}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="day"
                  />

                  <YAxis
                    yAxisId="left"
                    tickFormatter={(value: number) =>
                      `${(value / 1000).toFixed(0)}k`
                    }
                  />

                  <YAxis
                    yAxisId="right"
                    orientation="right"
                  />

                  <Tooltip
                    formatter={(
                      value: number,
                      name: string
                    ) => {

                      if (
                        name === 'CA' ||
                        name === 'Revenue'
                      ) {

                        return `${Number(
                          value
                        ).toLocaleString(
                          'fr-FR'
                        )} FCFA`;

                      }

                      return value;

                    }}
                  />

                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    name={
                      isFr
                        ? 'CA'
                        : 'Revenue'
                    }
                    fill="hsl(49, 100%, 51%)"
                    radius={[4, 4, 0, 0]}
                  />

                  <Bar
                    yAxisId="right"
                    dataKey="sales"
                    name={
                      isFr
                        ? 'Ventes'
                        : 'Sales'
                    }
                    fill="hsl(217, 91%, 60%)"
                    radius={[4, 4, 0, 0]}
                  />

                </BarChart>

              </ResponsiveContainer>

            )}

          </CardContent>

        </Card>

      </div>

    );
  };


  /* =======================================================
     RAPPORT DIRECTEUR
  ======================================================= */

  const renderDirectorReport = () => {

    if (!report) {
      return null;
    }


    return (

      <div className="space-y-6">

        {/* HEADER */}

        <div className="flex items-center justify-between flex-wrap gap-3">

          <h2 className="text-lg font-semibold flex items-center gap-2">

            <TrendingUp className="h-5 w-5 text-primary" />

            {isFr
              ? 'Rapport Direction'
              : 'Director Report'}

          </h2>


          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              handleDownloadReport(
                isFr
                  ? 'Rapport_Direction'
                  : 'Director_Report',
                directorSummary
              )
            }
          >

            <Download className="h-4 w-4 mr-1" />

            {tr.downloadPdf}

          </Button>

        </div>


        {/* CARDS */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

          {directorSummary.map((item) => (

            <Card
              key={item.label}
              className="border-0 shadow-sm"
            >

              <CardContent className="p-4">

                <p className="text-xs text-muted-foreground">
                  {item.label}
                </p>

                <p className="text-lg font-bold mt-1">
                  {item.value}
                </p>

              </CardContent>

            </Card>

          ))}

        </div>


        {/* TENDANCE */}

        <Card className="border-0 shadow-sm">

          <CardHeader className="pb-2">

            <CardTitle className="text-base">

              {isFr
                ? 'Tendance CA mensuel'
                : 'Monthly Revenue Trend'}

            </CardTitle>

          </CardHeader>


          <CardContent>

            {report.director.monthlyTrend.length === 0 ? (

              <div className="h-[280px] flex items-center justify-center text-muted-foreground">

                {isFr
                  ? 'Aucune donnée pour cette période'
                  : 'No data for this period'}

              </div>

            ) : (

              <ResponsiveContainer
                width="100%"
                height={280}
              >

                <LineChart
                  data={report.director.monthlyTrend}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="month"
                  />

                  <YAxis
                    tickFormatter={(value: number) =>
                      `${(
                        value / 1000000
                      ).toFixed(1)}M`
                    }
                  />

                  <Tooltip
                    formatter={(value: number) =>
                      `${Number(
                        value
                      ).toLocaleString(
                        'fr-FR'
                      )} FCFA`
                    }
                  />

                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name={
                      isFr
                        ? 'CA'
                        : 'Revenue'
                    }
                    stroke="hsl(49, 100%, 51%)"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                  />

                </LineChart>

              </ResponsiveContainer>

            )}

          </CardContent>

        </Card>

      </div>

    );
  };


  /* =======================================================
     GESTION DES ROLES
  ======================================================= */

  const showCashier =
    role === 'caissier' ||
    role === 'directeur' ||
    role === 'admin';


  const showSeller =
    role === 'vendeur' ||
    role === 'directeur' ||
    role === 'admin';


  const showDirector =
    role === 'directeur' ||
    role === 'admin';


  /* =======================================================
     ONGLET PAR DEFAUT
  ======================================================= */

  const defaultTab =
    role === 'caissier'
      ? 'cashier'
      : role === 'vendeur'
      ? 'seller'
      : 'director';


  /* =======================================================
     CHARGEMENT
  ======================================================= */

  if (loading) {

    return (

      <div className="space-y-6 animate-fade-in">

        <div className="flex items-center justify-between">

          <h1 className="text-2xl font-bold">

            {isFr
              ? 'Rapports'
              : 'Reports'}

          </h1>

        </div>


        <div className="flex flex-col items-center justify-center h-64 gap-3">

          <RefreshCw className="h-8 w-8 animate-spin text-primary" />

          <p className="text-muted-foreground">

            {isFr
              ? 'Chargement des rapports...'
              : 'Loading reports...'}

          </p>

        </div>

      </div>

    );

  }


  /* =======================================================
     ERREUR
  ======================================================= */

  if (error) {

    return (

      <div className="space-y-6 animate-fade-in">

        <div className="flex items-center justify-between flex-wrap gap-4">

          <h1 className="text-2xl font-bold">

            {isFr
              ? 'Rapports'
              : 'Reports'}

          </h1>


          <Button
            variant="outline"
            onClick={fetchReports}
          >

            <RefreshCw className="h-4 w-4 mr-2" />

            {isFr
              ? 'Réessayer'
              : 'Retry'}

          </Button>

        </div>


        <Card>

          <CardContent className="p-8 text-center">

            <p className="text-red-500 mb-4">
              {error}
            </p>

            <Button
              onClick={fetchReports}
            >

              {isFr
                ? 'Réessayer'
                : 'Retry'}

            </Button>

          </CardContent>

        </Card>

      </div>

    );

  }


  /* =======================================================
     RETURN
  ======================================================= */

  return (

    <div className="space-y-6 animate-fade-in">


      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="flex items-center justify-between flex-wrap gap-4">

        <h1 className="text-2xl font-bold">

          {isFr
            ? 'Rapports'
            : 'Reports'}

        </h1>


        <div className="flex items-center gap-2">

          <Calendar className="h-4 w-4 text-muted-foreground" />


          <input
            type="month"
            value={period}
            onChange={(e) =>
              setPeriod(e.target.value)
            }
            className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          />


          <Button
            size="icon"
            variant="outline"
            onClick={fetchReports}
            title={
              isFr
                ? 'Actualiser'
                : 'Refresh'
            }
          >

            <RefreshCw className="h-4 w-4" />

          </Button>

        </div>

      </div>


      {/* ===================================================
          TABS
      =================================================== */}

      <Tabs
        defaultValue={defaultTab}
        key={defaultTab}
      >

        <TabsList>

          {showDirector && (

            <TabsTrigger value="director">

              {isFr
                ? 'Direction'
                : 'Director'}

            </TabsTrigger>

          )}


          {showSeller && (

            <TabsTrigger value="seller">

              {isFr
                ? 'Vendeur'
                : 'Seller'}

            </TabsTrigger>

          )}


          {showCashier && (

            <TabsTrigger value="cashier">

              {isFr
                ? 'Caisse'
                : 'Cash'}

            </TabsTrigger>

          )}

        </TabsList>


        {/* =================================================
            DIRECTEUR
        ================================================= */}

        {showDirector && (

          <TabsContent value="director">

            {renderDirectorReport()}

          </TabsContent>

        )}


        {/* =================================================
            VENDEUR
        ================================================= */}

        {showSeller && (

          <TabsContent value="seller">

            {renderSellerReport()}

          </TabsContent>

        )}


        {/* =================================================
            CAISSIER
        ================================================= */}

        {showCashier && (

          <TabsContent value="cashier">

            {renderCashierReport()}

          </TabsContent>

        )}

      </Tabs>

    </div>

  );
};


export default ReportsPage;