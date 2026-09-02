import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n/translations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Result } from 'postcss';

const COLORS = [
  'hsl(49, 100%, 51%)',
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
];

type StatisticsData = {
  cabinetId: number | null;

  summary: {
    totalSales: number;
    totalRevenue: number;
    totalClients: number;
  };

  monthlyRevenue: {
    month: string;
    year: number;
    monthNumber: number;
    revenue: number;
  }[];

  salesByGender: {
    sex: string;
    count: number;
  }[];

  salesByAge: {
    age: string;
    count: number;
  }[];

  salesByCity: {
    city: string;
    count: number;
  }[];

  salesByDistrict: {
    district: string;
    count: number;
  }[];

  topProducts: {
    name: string;
    sold: number;
  }[];
};

const StatisticsPage = () => {
  const { user, lang } = useAuth();

  const tr = t(lang);

  const isFr = lang === 'fr';

  const [data, setData] = useState<StatisticsData | null>(null);

  const [loading, setLoading] = useState(true);

  const API_URL = 'http://localhost:4000/api';

  /*
  |--------------------------------------------------------------------------
  | CHARGEMENT DES STATISTIQUES
  |--------------------------------------------------------------------------
  */

  const fetchStatistics = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Token absent. Veuillez vous reconnecter.');
      }

      const url =
        `${API_URL}/statistics` +
        `?userId=${user?.id || ''}` +
        `&role=${user?.role || ''}`;

      console.log('URL statistiques :', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          `Erreur HTTP ${response.status}: ${JSON.stringify(result)}`
        );
      }

      console.log('Statistiques reçues :', result);
      setData(result);

    // Ici ton setStatistics(...)
    // setStatistics(data);

    } catch (error) {
      console.error('Erreur chargement statistiques :', error);
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CHARGER AU DÉMARRAGE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (user?.id) {
      fetchStatistics();
    }
  }, [
    user?.id,
    user?.role,
  ]);

  /*
  |--------------------------------------------------------------------------
  | CHARGEMENT
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          {isFr
            ? 'Chargement des statistiques...'
            : 'Loading statistics...'}
        </p>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PAS DE DONNÉES
  |--------------------------------------------------------------------------
  */

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          {isFr
            ? 'Aucune donnée disponible'
            : 'No data available'}
        </p>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | TRADUCTION SEXE
  |--------------------------------------------------------------------------
  */

  const salesByGender =
    data.salesByGender.map(
      (item) => ({
        name:
          item.sex === 'male'
            ? tr.male
            : item.sex === 'female'
              ? tr.female
              : isFr
                ? 'Non renseigné'
                : 'Unknown',

        value: item.count,
      })
    );

  /*
  |--------------------------------------------------------------------------
  | FORMAT MONTANT
  |--------------------------------------------------------------------------
  */

  const formatMoney = (
    value: number
  ) => {
    return `${value.toLocaleString(
      'fr-FR'
    )} FCFA`;
  };

  /*
  |--------------------------------------------------------------------------
  | AFFICHAGE
  |--------------------------------------------------------------------------
  */

  return (
    <div className="space-y-6 animate-fade-in">

      <h1 className="text-2xl font-bold">
        {tr.statistics}
      </h1>

      {/* ============================================================
          SUMMARY
          ============================================================ */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {isFr
                ? 'Ventes totales'
                : 'Total sales'}
            </p>

            <p className="text-2xl font-bold mt-1">
              {data.summary.totalSales}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {isFr
                ? "Chiffre d'affaires"
                : 'Revenue'}
            </p>

            <p className="text-2xl font-bold mt-1">
              {formatMoney(
                data.summary.totalRevenue
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {isFr
                ? 'Clients'
                : 'Customers'}
            </p>

            <p className="text-2xl font-bold mt-1">
              {data.summary.totalClients}
            </p>
          </CardContent>
        </Card>

      </div>

      {/* ============================================================
          CA MENSUEL
          ============================================================ */}

      <Card className="border-0 shadow-sm">

        <CardHeader className="pb-2">

          <CardTitle className="text-base">
            {tr.monthlyRevenue} (FCFA)
          </CardTitle>

        </CardHeader>

        <CardContent>

          <ResponsiveContainer
            width="100%"
            height={280}
          >

            <LineChart
              data={data.monthlyRevenue}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(220,13%,91%)"
              />

              <XAxis
                dataKey="month"
              />

              <YAxis
                tickFormatter={(
                  value: number
                ) =>
                  `${(
                    value / 1000000
                  ).toFixed(1)}M`
                }
              />

              <Tooltip
                formatter={(
                  value: number
                ) =>
                  formatMoney(value)
                }
              />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(49, 100%, 51%)"
                strokeWidth={3}
                dot={{ r: 5 }}
              />

            </LineChart>

          </ResponsiveContainer>

        </CardContent>

      </Card>

      {/* ============================================================
          GRAPHIQUES
          ============================================================ */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ========================================================
            SEXE
            ======================================================== */}

        <Card className="border-0 shadow-sm">

          <CardHeader className="pb-2">

            <CardTitle className="text-base">
              {tr.salesByGender}
            </CardTitle>

          </CardHeader>

          <CardContent>

            <ResponsiveContainer
              width="100%"
              height={220}
            >

              <PieChart>

                <Pie
                  data={salesByGender}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({
                    name,
                    percent,
                  }) =>
                    `${name} ${(
                      percent * 100
                    ).toFixed(0)}%`
                  }
                >

                  {salesByGender.map(
                    (_, index) => (
                      <Cell
                        key={index}
                        fill={
                          COLORS[
                            index %
                              COLORS.length
                          ]
                        }
                      />
                    )
                  )}

                </Pie>

                <Tooltip />

              </PieChart>

            </ResponsiveContainer>

          </CardContent>

        </Card>

        {/* ========================================================
            ÂGE
            ======================================================== */}

        <Card className="border-0 shadow-sm">

          <CardHeader className="pb-2">

            <CardTitle className="text-base">
              {tr.salesByAge}
            </CardTitle>

          </CardHeader>

          <CardContent>

            <ResponsiveContainer
              width="100%"
              height={220}
            >

              <BarChart
                data={data.salesByAge}
              >

                <XAxis
                  dataKey="age"
                />

                <YAxis />

                <Tooltip />

                <Bar
                  dataKey="count"
                  fill="hsl(49, 100%, 51%)"
                  radius={[
                    4,
                    4,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </CardContent>

        </Card>

        {/* ========================================================
            VILLE
            ======================================================== */}

        <Card className="border-0 shadow-sm">

          <CardHeader className="pb-2">

            <CardTitle className="text-base">
              {tr.salesByCity}
            </CardTitle>

          </CardHeader>

          <CardContent>

            <ResponsiveContainer
              width="100%"
              height={220}
            >

              <BarChart
                data={data.salesByCity}
                layout="vertical"
              >

                <XAxis
                  type="number"
                />

                <YAxis
                  dataKey="city"
                  type="category"
                  width={100}
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  fill="hsl(217, 91%, 60%)"
                  radius={[
                    0,
                    4,
                    4,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </CardContent>

        </Card>

        {/* ========================================================
            DISTRICT
            ======================================================== */}

        <Card className="border-0 shadow-sm">

          <CardHeader className="pb-2">

            <CardTitle className="text-base">
              {tr.salesByDistrict}
            </CardTitle>

          </CardHeader>

          <CardContent>

            <ResponsiveContainer
              width="100%"
              height={220}
            >

              <BarChart
                data={data.salesByDistrict}
                layout="vertical"
              >

                <XAxis
                  type="number"
                />

                <YAxis
                  dataKey="district"
                  type="category"
                  width={120}
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  fill="hsl(142, 71%, 45%)"
                  radius={[
                    0,
                    4,
                    4,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          </CardContent>

        </Card>

      </div>

      {/* ============================================================
          PRODUITS
          ============================================================ */}

      <Card className="border-0 shadow-sm">

        <CardHeader className="pb-2">

          <CardTitle className="text-base">
            {tr.productsSold}
          </CardTitle>

        </CardHeader>

        <CardContent>

          {data.topProducts.length > 0 ? (

            <ResponsiveContainer
              width="100%"
              height={220}
            >

              <BarChart
                data={data.topProducts}
              >

                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 11,
                  }}
                />

                <YAxis />

                <Tooltip />

                <Bar
                  dataKey="sold"
                  fill="hsl(38, 92%, 50%)"
                  radius={[
                    4,
                    4,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          ) : (

            <div className="h-[220px] flex items-center justify-center">

              <p className="text-sm text-muted-foreground text-center max-w-md">
                {isFr
                  ? 'Les produits vendus ne peuvent pas encore être calculés avec la structure actuelle de la table SALE.'
                  : 'Sold products cannot yet be calculated with the current SALE table structure.'}
              </p>

            </div>

          )}

        </CardContent>

      </Card>

    </div>
  );
};

export default StatisticsPage;