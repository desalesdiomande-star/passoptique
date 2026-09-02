import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n/translations';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Switch } from '@/components/ui/switch';

import {
  Building2,
  Users,
  Plus,
  Search,
  Power,
  PowerOff,
  Eye,
  Trash2,
  Activity,
  Server,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Settings,
  FileText,
  ShieldCheck,
  Globe,
  DollarSign,
  Package,
  CreditCard,
  UserCheck,
  XCircle,
  Download,
} from 'lucide-react';

import { toast } from 'sonner';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

import {
  IVORY_COAST_CITIES,
  HEALTH_DISTRICTS,
} from '@/data/ivoryCoastCities';


/* =========================================================
   TYPES
========================================================= */

interface Cabinet {
  id: string;
  name: string;
  owner: string;

  ownerExerciseNumber: string;
  clinicExerciseNumber: string;
  authorizationNumber: string;

  email: string;
  phone: string;

  city: string;
  district: string;
  address: string;

  subscription:
    | 'active'
    | 'expired'
    | 'trial'
    | 'suspended'
    | 'pending';

  usersCount: number;

  createdAt: string;
  lastLogin: string;

  monthlyRevenue: number;
  totalSales: number;
  totalClients: number;
  totalPrescriptions: number;
  stockValue: number;

  validated: boolean;
}

interface PermissionRow {
  module: string;
  admin: boolean;
  directeur: boolean;
  vendeur: boolean;
  caissier: boolean;
}

interface MonthlyGrowth {
  month: string;
  cabinets: number;
  revenue: number;
}

interface SystemLog {
  id: number;
  user_id: number | null;
  action: string;
  message: string;

  status:
    | 'info'
    | 'success'
    | 'warning'
    | 'error';

  filename?: string | null;
  file_path?: string | null;
  file_size?: number | null;

  created_at: string;
}

interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  trialDurationDays: number;
  monthlySubscriptionPrice: number;
  maxUsersPerCabinet: number;
  platformVersion: string;
}

type ActiveSection =
  | 'cabinets'
  | 'validation'
  | 'global-data'
  | 'stats'
  | 'maintenance'
  | 'permissions'
  | 'settings';


/* =========================================================
   CONFIGURATION
========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000';


const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--info))',
  'hsl(var(--destructive))',
];


/* =========================================================
   COMPONENT
========================================================= */

const SuperAdminPage = () => {
  const { lang } = useAuth();

  const tr = t(lang);

  const isFr = lang === 'fr';


  /* =======================================================
     TOKEN
  ======================================================= */

  const getToken = () => {
    return localStorage.getItem('token');
  };


  /* =======================================================
     STATES
  ======================================================= */

  const [cabinets, setCabinets] =
    useState<Cabinet[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [searchQuery, setSearchQuery] =
    useState('');

  const [showAddDialog, setShowAddDialog] =
    useState(false);

  const [activeSection, setActiveSection] =
    useState<ActiveSection>('cabinets');

  const [viewCabinet, setViewCabinet] =
    useState<Cabinet | null>(null);


  /* =======================================================
     NEW CABINET
  ======================================================= */

  const [newCabinet, setNewCabinet] =
    useState({
      name: '',
      owner: '',
      ownerExerciseNumber: '',
      clinicExerciseNumber: '',
      authorizationNumber: '',
      email: '',
      phone: '',
      city: '',
      district: '',
      address: '',
    });


  /* =======================================================
     PERMISSIONS
  ======================================================= */

  const [permissions, setPermissions] =
    useState<PermissionRow[]>([]);

  const [permissionsLoading, setPermissionsLoading] =
    useState(false);

  const [permissionsDirty, setPermissionsDirty] =
    useState(false);


  /* =======================================================
     STATISTICS
  ======================================================= */

  const [monthlyGrowth, setMonthlyGrowth] =
    useState<MonthlyGrowth[]>([]);


  /* =======================================================
     MAINTENANCE
  ======================================================= */

  const [systemLogs, setSystemLogs] =
    useState<SystemLog[]>([]);

  const [maintenanceLoading, setMaintenanceLoading] =
    useState(false);

  const [maintenanceAction, setMaintenanceAction] =
    useState<'backup' | 'cache' | null>(null);


  /* =======================================================
     PLATFORM SETTINGS
  ======================================================= */

  const [platformSettings, setPlatformSettings] =
    useState<PlatformSettings>({
      platformName: 'PASS OPTIQUE by MTN',
      supportEmail: 'support@passoptique.ci',
      trialDurationDays: 14,
      monthlySubscriptionPrice: 50000,
      maxUsersPerCabinet: 10,
      platformVersion: '1.0.0',
    });

  const [settingsLoading, setSettingsLoading] =
    useState(false);

  const [settingsSaving, setSettingsSaving] =
    useState(false);

  const [settingsDirty, setSettingsDirty] =
    useState(false);


  /* =======================================================
     MODULE LABELS
  ======================================================= */

  const MODULE_LABELS: Record<string, string> = {
    dashboard: tr.dashboard,
    clients: tr.clients,
    prescriptions: tr.prescriptions,
    sales: tr.sales,
    stock: tr.stock,
    payments: tr.payments,
    orders: tr.orders,
    invoices: tr.invoices,
    reports: tr.reports,
    statistics: tr.statistics,
    settings: tr.settings,
    notifications: tr.notifications,
  };


  /* =======================================================
     ERROR RESPONSE
  ======================================================= */

  const getErrorMessage = async (
    res: Response,
    fallback: string
  ) => {
    try {
      const data = await res.json();

      return (
        data?.message ||
        data?.error ||
        fallback
      );
    } catch {
      return fallback;
    }
  };


  /* =======================================================
     AUTH HEADERS
  ======================================================= */

  const getAuthHeaders = () => {
    const currentToken = getToken();

    return {
      Authorization:
        `Bearer ${currentToken || ''}`,
    };
  };


  /* =======================================================
     FETCH CABINETS
  ======================================================= */

  const fetchCabinets = async () => {
    const currentToken = getToken();

    if (!currentToken) {
      setLoading(false);

      toast.error(
        isFr
          ? 'Session expirée'
          : 'Session expired'
      );

      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/cabinet`,
        {
          method: 'GET',

          headers: {
            Authorization:
              `Bearer ${currentToken}`,
          },

          cache: 'no-store',
        }
      );

      if (!res.ok) {
        throw new Error(
          await getErrorMessage(
            res,
            isFr
              ? 'Erreur lors du chargement des cabinets'
              : 'Error loading cabinets'
          )
        );
      }

      const data = await res.json();

      setCabinets(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error: any) {
      console.error(
        '[SUPERADMIN] Cabinets:',
        error
      );

      toast.error(
        error?.message ||
          (
            isFr
              ? 'Erreur lors du chargement des cabinets'
              : 'Error loading cabinets'
          )
      );
    } finally {
      setLoading(false);
    }
  };


  /* =======================================================
     FETCH MONTHLY GROWTH
  ======================================================= */

  const fetchMonthlyGrowth = async () => {
    const currentToken = getToken();

    if (!currentToken) {
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/cabinet/stats/monthly-growth`,
        {
          method: 'GET',

          headers: {
            Authorization:
              `Bearer ${currentToken}`,
          },

          cache: 'no-store',
        }
      );

      if (!res.ok) {
        throw new Error(
          await getErrorMessage(
            res,
            isFr
              ? 'Erreur lors du chargement de la croissance'
              : 'Error loading growth data'
          )
        );
      }

      const data =
        await res.json();

      setMonthlyGrowth(
        Array.isArray(data)
          ? data.map((d: any) => ({
              month:
                d.month || '',

              cabinets:
                Number(
                  d.cabinets || 0
                ),

              revenue:
                Number(
                  d.revenue || 0
                ),
            }))
          : []
      );
    } catch (error) {
      console.error(
        '[SUPERADMIN] Growth:',
        error
      );
    }
  };


  /* =======================================================
     FETCH SYSTEM LOGS
  ======================================================= */

  const fetchSystemLogs = async () => {
    const currentToken = getToken();

    if (!currentToken) {
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/maintenance`,
        {
          method: 'GET',

          headers: {
            Authorization:
              `Bearer ${currentToken}`,
          },

          cache: 'no-store',
        }
      );

      if (!res.ok) {
        throw new Error(
          await getErrorMessage(
            res,
            isFr
              ? 'Erreur lors du chargement des logs'
              : 'Error loading logs'
          )
        );
      }

      const data =
        await res.json();

      setSystemLogs(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error: any) {
      console.error(
        '[SUPERADMIN] Maintenance logs:',
        error
      );

      toast.error(
        error?.message ||
          (
            isFr
              ? 'Erreur lors du chargement des logs'
              : 'Error loading logs'
          )
      );
    }
  };


  /* =======================================================
     FETCH PERMISSIONS
  ======================================================= */

  const fetchPermissions = async () => {
    const currentToken = getToken();

    if (!currentToken) {
      return;
    }

    setPermissionsLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/api/permissions`,
        {
          method: 'GET',

          headers: {
            Authorization:
              `Bearer ${currentToken}`,
          },

          cache: 'no-store',
        }
      );

      if (!res.ok) {
        throw new Error(
          await getErrorMessage(
            res,
            isFr
              ? 'Erreur lors du chargement des permissions'
              : 'Error loading permissions'
          )
        );
      }

      const data =
        await res.json();

      setPermissions(
        Array.isArray(data)
          ? data
          : []
      );

      setPermissionsDirty(false);
    } catch (error: any) {
      console.error(
        '[SUPERADMIN] Permissions:',
        error
      );

      toast.error(
        error?.message ||
          (
            isFr
              ? 'Erreur lors du chargement des permissions'
              : 'Error loading permissions'
          )
      );
    } finally {
      setPermissionsLoading(false);
    }
  };


  /* =======================================================
     FETCH PLATFORM SETTINGS
  ======================================================= */

  const fetchPlatformSettings = async () => {
    const currentToken = getToken();

    if (!currentToken) {
      return;
    }

    setSettingsLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/api/cabinet/settings`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
          cache: 'no-store',
        }
      );

      if (!res.ok) {
        throw new Error(
          await getErrorMessage(
            res,
            isFr
              ? 'Erreur lors du chargement des paramètres'
              : 'Error loading settings'
          )
        );
      }

      const data = await res.json();

      if (data?.success && data?.settings) {
        setPlatformSettings({
          platformName: data.settings.platformName || 'PASS OPTIQUE by MTN',
          supportEmail: data.settings.supportEmail || 'support@passoptique.ci',
          trialDurationDays: Number(data.settings.trialDurationDays) || 14,
          monthlySubscriptionPrice: Number(data.settings.monthlySubscriptionPrice) || 50000,
          maxUsersPerCabinet: Number(data.settings.maxUsersPerCabinet) || 10,
          platformVersion: data.settings.platformVersion || '1.0.0',
        });
        setSettingsDirty(false);
      }
    } catch (error: any) {
      console.error('[SUPERADMIN] Platform settings:', error);
      toast.error(
        error?.message ||
          (isFr
            ? 'Erreur lors du chargement des paramètres'
            : 'Error loading settings')
      );
    } finally {
      setSettingsLoading(false);
    }
  };


  /* =======================================================
     UPDATE PLATFORM SETTING
  ======================================================= */

  const updatePlatformSetting = <K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K]
  ) => {
    setPlatformSettings(previous => ({
      ...previous,
      [key]: value,
    }));
    setSettingsDirty(true);
  };


  /* =======================================================
     SAVE PLATFORM SETTINGS
  ======================================================= */

  const savePlatformSettings = async () => {
    const currentToken = getToken();

    if (!currentToken) {
      toast.error(isFr ? 'Session expirée' : 'Session expired');
      return;
    }

    if (!platformSettings.platformName.trim()) {
      toast.error(
        isFr
          ? 'Le nom de la plateforme est obligatoire'
          : 'Platform name is required'
      );
      return;
    }

    if (platformSettings.trialDurationDays < 1) {
      toast.error(
        isFr
          ? "La durée d'essai doit être supérieure à 0"
          : 'Trial duration must be greater than 0'
      );
      return;
    }

    if (platformSettings.monthlySubscriptionPrice < 0) {
      toast.error(
        isFr ? "Prix d'abonnement invalide" : 'Invalid subscription price'
      );
      return;
    }

    if (platformSettings.maxUsersPerCabinet < 1) {
      toast.error(
        isFr
          ? "Le nombre maximal d'utilisateurs doit être supérieur à 0"
          : 'Maximum users must be greater than 0'
      );
      return;
    }

    setSettingsSaving(true);

    try {
      const res = await fetch(
        `${API_URL}/api/cabinet/settings`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          body: JSON.stringify({
            platformName: platformSettings.platformName.trim(),
            supportEmail: platformSettings.supportEmail.trim(),
            trialDurationDays: Number(platformSettings.trialDurationDays),
            monthlySubscriptionPrice: Number(platformSettings.monthlySubscriptionPrice),
            maxUsersPerCabinet: Number(platformSettings.maxUsersPerCabinet),
            platformVersion: platformSettings.platformVersion,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(
          await getErrorMessage(
            res,
            isFr
              ? 'Erreur lors de la sauvegarde des paramètres'
              : 'Error saving settings'
          )
        );
      }

      const data = await res.json();

      if (!data?.success) {
        throw new Error(
          data?.message ||
            (isFr
              ? 'Impossible de sauvegarder les paramètres'
              : 'Unable to save settings')
        );
      }

      if (data.settings) {
        setPlatformSettings({
          platformName: data.settings.platformName || platformSettings.platformName,
          supportEmail: data.settings.supportEmail || platformSettings.supportEmail,
          trialDurationDays: Number(data.settings.trialDurationDays) || platformSettings.trialDurationDays,
          monthlySubscriptionPrice: Number(data.settings.monthlySubscriptionPrice) || platformSettings.monthlySubscriptionPrice,
          maxUsersPerCabinet: Number(data.settings.maxUsersPerCabinet) || platformSettings.maxUsersPerCabinet,
          platformVersion: data.settings.platformVersion || platformSettings.platformVersion,
        });
      }

      setSettingsDirty(false);
      toast.success(tr.savedSuccess);
    } catch (error: any) {
      console.error('[SUPERADMIN] Save platform settings:', error);
      toast.error(
        error?.message ||
          (isFr ? 'Erreur lors de la sauvegarde' : 'Error saving settings')
      );
    } finally {
      setSettingsSaving(false);
    }
  };


  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    fetchCabinets();
    fetchMonthlyGrowth();
    fetchSystemLogs();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  /* =======================================================
     LOAD PERMISSIONS WHEN SECTION IS OPENED
  ======================================================= */

  useEffect(() => {
    if (activeSection === 'permissions') {
      fetchPermissions();
    }

    if (activeSection === 'settings') {
      fetchPlatformSettings();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);


  /* =======================================================
     GLOBAL KPIs
  ======================================================= */

  const activeCabinets =
    cabinets.filter(
      c =>
        c.subscription === 'active'
    ).length;

  const pendingCabinets =
    cabinets.filter(
      c =>
        c.subscription === 'pending'
    ).length;

  const totalUsers =
    cabinets.reduce(
      (sum, c) =>
        sum +
        Number(
          c.usersCount || 0
        ),
      0
    );

  const totalRevenue =
    cabinets.reduce(
      (sum, c) =>
        sum +
        Number(
          c.monthlyRevenue || 0
        ),
      0
    );

  const totalSalesAll =
    cabinets.reduce(
      (sum, c) =>
        sum +
        Number(
          c.totalSales || 0
        ),
      0
    );

  const totalClientsAll =
    cabinets.reduce(
      (sum, c) =>
        sum +
        Number(
          c.totalClients || 0
        ),
      0
    );

  const totalPrescriptionsAll =
    cabinets.reduce(
      (sum, c) =>
        sum +
        Number(
          c.totalPrescriptions || 0
        ),
      0
    );

  const totalStockValue =
    cabinets.reduce(
      (sum, c) =>
        sum +
        Number(
          c.stockValue || 0
        ),
      0
    );


  /* =======================================================
     SEARCH
  ======================================================= */

  const filtered =
    useMemo(() => {
      const normalized =
        searchQuery
          .trim()
          .toLowerCase();

      if (!normalized) {
        return cabinets;
      }

      return cabinets.filter(
        cabinet => {
          const name =
            String(
              cabinet.name || ''
            ).toLowerCase();

          const owner =
            String(
              cabinet.owner || ''
            ).toLowerCase();

          const city =
            String(
              cabinet.city || ''
            ).toLowerCase();

          const email =
            String(
              cabinet.email || ''
            ).toLowerCase();

          return (
            name.includes(
              normalized
            ) ||
            owner.includes(
              normalized
            ) ||
            city.includes(
              normalized
            ) ||
            email.includes(
              normalized
            )
          );
        }
      );
    }, [
      cabinets,
      searchQuery,
    ]);


  /* =======================================================
     ADD CABINET
  ======================================================= */

  const handleAddCabinet =
    async () => {
      const currentToken =
        getToken();

      if (!currentToken) {
        toast.error(
          isFr
            ? 'Session expirée'
            : 'Session expired'
        );

        return;
      }

      if (
        !newCabinet.name ||
        !newCabinet.owner ||
        !newCabinet.email ||
        !newCabinet.ownerExerciseNumber ||
        !newCabinet.authorizationNumber
      ) {
        toast.error(
          isFr
            ? 'Veuillez remplir tous les champs obligatoires'
            : 'Please fill all required fields'
        );

        return;
      }

      try {
        const res =
          await fetch(
            `${API_URL}/api/cabinet`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${currentToken}`,
              },

              body: JSON.stringify(
                newCabinet
              ),
            }
          );

        if (!res.ok) {
          throw new Error(
            await getErrorMessage(
              res,
              isFr
                ? "Erreur lors de l'ajout"
                : 'Error adding cabinet'
            )
          );
        }

        await fetchCabinets();

        setNewCabinet({
          name: '',
          owner: '',
          ownerExerciseNumber: '',
          clinicExerciseNumber: '',
          authorizationNumber: '',
          email: '',
          phone: '',
          city: '',
          district: '',
          address: '',
        });

        setShowAddDialog(false);

        toast.success(
          isFr
            ? 'Cabinet ajouté (en attente de validation)'
            : 'Cabinet added (pending validation)'
        );
      } catch (error: any) {
        console.error(
          '[SUPERADMIN] Add cabinet:',
          error
        );

        toast.error(
          error?.message ||
            (
              isFr
                ? "Erreur lors de l'ajout"
                : 'Error adding cabinet'
            )
        );
      }
    };


  /* =======================================================
     VALIDATE CABINET
  ======================================================= */

  const validateCabinet =
    async (id: string) => {
      const currentToken =
        getToken();

      if (!currentToken) {
        toast.error(
          isFr
            ? 'Session expirée'
            : 'Session expired'
        );

        return;
      }

      try {
        const res =
          await fetch(
            `${API_URL}/api/cabinet/${id}/validate`,
            {
              method: 'PATCH',

              headers: {
                Authorization:
                  `Bearer ${currentToken}`,
              },
            }
          );

        if (!res.ok) {
          throw new Error(
            await getErrorMessage(
              res,
              isFr
                ? 'Erreur lors de la validation'
                : 'Error validating cabinet'
            )
          );
        }

        await fetchCabinets();

        toast.success(
          isFr
            ? "Cabinet validé et activé en période d'essai"
            : 'Cabinet validated and trial activated'
        );
      } catch (error: any) {
        console.error(
          '[SUPERADMIN] Validate:',
          error
        );

        toast.error(
          error?.message ||
            (
              isFr
                ? 'Erreur lors de la validation'
                : 'Error validating cabinet'
            )
        );
      }
    };


  /* =======================================================
     REJECT CABINET
  ======================================================= */

  const rejectCabinet =
    async (id: string) => {
      const currentToken =
        getToken();

      if (!currentToken) {
        toast.error(
          isFr
            ? 'Session expirée'
            : 'Session expired'
        );

        return;
      }

      try {
        const res =
          await fetch(
            `${API_URL}/api/cabinet/${id}`,
            {
              method: 'DELETE',

              headers: {
                Authorization:
                  `Bearer ${currentToken}`,
              },
            }
          );

        if (!res.ok) {
          throw new Error(
            await getErrorMessage(
              res,
              isFr
                ? 'Erreur lors du rejet'
                : 'Error rejecting cabinet'
            )
          );
        }

        await fetchCabinets();

        toast.success(
          isFr
            ? 'Cabinet rejeté'
            : 'Cabinet rejected'
        );
      } catch (error: any) {
        console.error(
          '[SUPERADMIN] Reject:',
          error
        );

        toast.error(
          error?.message ||
            (
              isFr
                ? 'Erreur lors du rejet'
                : 'Error rejecting cabinet'
            )
        );
      }
    };


  /* =======================================================
     TOGGLE SUBSCRIPTION
  ======================================================= */

  const toggleSubscription =
    async (id: string) => {
      const currentToken =
        getToken();

      if (!currentToken) {
        toast.error(
          isFr
            ? 'Session expirée'
            : 'Session expired'
        );

        return;
      }

      try {
        const res =
          await fetch(
            `${API_URL}/api/cabinet/${id}/toggle-subscription`,
            {
              method: 'PATCH',

              headers: {
                Authorization:
                  `Bearer ${currentToken}`,
              },
            }
          );

        if (!res.ok) {
          throw new Error(
            await getErrorMessage(
              res,
              isFr
                ? 'Erreur lors de la modification'
                : 'Error updating subscription'
            )
          );
        }

        const data =
          await res.json();

        await fetchCabinets();

        toast.success(
          data?.subscription ===
            'active'
            ? (
                isFr
                  ? 'Cabinet activé'
                  : 'Cabinet activated'
              )
            : (
                isFr
                  ? 'Cabinet suspendu'
                  : 'Cabinet suspended'
              )
        );
      } catch (error: any) {
        console.error(
          '[SUPERADMIN] Subscription:',
          error
        );

        toast.error(
          error?.message ||
            (
              isFr
                ? 'Erreur'
                : 'Error'
            )
        );
      }
    };


  /* =======================================================
     DELETE CABINET
  ======================================================= */

  const deleteCabinet =
    async (id: string) => {
      const currentToken =
        getToken();

      if (!currentToken) {
        toast.error(
          isFr
            ? 'Session expirée'
            : 'Session expired'
        );

        return;
      }

      const confirmed =
        window.confirm(
          isFr
            ? 'Voulez-vous vraiment supprimer ce cabinet ?'
            : 'Do you really want to delete this cabinet?'
        );

      if (!confirmed) {
        return;
      }

      try {
        const res =
          await fetch(
            `${API_URL}/api/cabinet/${id}`,
            {
              method: 'DELETE',

              headers: {
                Authorization:
                  `Bearer ${currentToken}`,
              },
            }
          );

        if (!res.ok) {
          throw new Error(
            await getErrorMessage(
              res,
              isFr
                ? 'Erreur lors de la suppression'
                : 'Error deleting cabinet'
            )
          );
        }

        await fetchCabinets();

        toast.success(
          isFr
            ? 'Cabinet supprimé'
            : 'Cabinet deleted'
        );
      } catch (error: any) {
        console.error(
          '[SUPERADMIN] Delete:',
          error
        );

        toast.error(
          error?.message ||
            (
              isFr
                ? 'Erreur lors de la suppression'
                : 'Error deleting cabinet'
            )
        );
      }
    };


  /* =======================================================
     SUBSCRIPTION BADGE
  ======================================================= */

  const subscriptionBadge = (
    subscription: Cabinet['subscription']
  ) => {
    const map: Record<
      string,
      {
        label: string;
        variant:
          | 'default'
          | 'destructive'
          | 'secondary'
          | 'outline';
      }
    > = {
      active: {
        label:
          tr.subscriptionActive,
        variant: 'default',
      },

      expired: {
        label:
          tr.subscriptionExpired,
        variant: 'destructive',
      },

      trial: {
        label:
          tr.subscriptionTrial,
        variant: 'secondary',
      },

      suspended: {
        label:
          tr.suspend,
        variant: 'outline',
      },

      pending: {
        label:
          isFr
            ? 'En attente'
            : 'Pending',
        variant: 'outline',
      },
    };

    const item =
      map[subscription];

    return (
      <Badge
        variant={
          item?.variant ||
          'outline'
        }
      >
        {item?.label ||
          subscription}
      </Badge>
    );
  };


  /* =======================================================
     PERMISSION TOGGLE
  ======================================================= */

  const togglePermission = (
    module: string,
    role:
      | 'admin'
      | 'directeur'
      | 'vendeur'
      | 'caissier'
  ) => {
    setPermissions(
      previous =>
        previous.map(
          row =>
            row.module === module
              ? {
                  ...row,
                  [role]:
                    !row[role],
                }
              : row
        )
    );

    setPermissionsDirty(
      true
    );
  };


  /* =======================================================
     SAVE PERMISSIONS
  ======================================================= */

  const savePermissions =
    async () => {
      const currentToken =
        getToken();

      if (!currentToken) {
        toast.error(
          isFr
            ? 'Session expirée'
            : 'Session expired'
        );

        return;
      }

      try {
        const res =
          await fetch(
            `${API_URL}/api/permissions`,
            {
              method: 'PUT',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${currentToken}`,
              },

              body: JSON.stringify({
                permissions,
              }),
            }
          );

        if (!res.ok) {
          throw new Error(
            await getErrorMessage(
              res,
              isFr
                ? 'Erreur lors de la sauvegarde'
                : 'Error saving permissions'
            )
          );
        }

        setPermissionsDirty(
          false
        );

        toast.success(
          tr.savedSuccess
        );
      } catch (error: any) {
        console.error(
          '[SUPERADMIN] Save permissions:',
          error
        );

        toast.error(
          error?.message ||
            (
              isFr
                ? 'Erreur lors de la sauvegarde'
                : 'Error saving permissions'
            )
        );
      }
    };


  /* =======================================================
     BACKUP
  ======================================================= */

  const runBackup =
    async () => {
      if (maintenanceLoading) {
        return;
      }

      const currentToken =
        getToken();

      if (!currentToken) {
        toast.error(
          isFr
            ? 'Session expirée'
            : 'Session expired'
        );

        return;
      }

      setMaintenanceLoading(
        true
      );

      setMaintenanceAction(
        'backup'
      );

      try {
        const res =
          await fetch(
            `${API_URL}/api/maintenance/backup`,
            {
              method: 'POST',

              headers: {
                Authorization:
                  `Bearer ${currentToken}`,

                'Content-Type':
                  'application/json',
              },

              cache: 'no-store',

              body: JSON.stringify({}),
            }
          );

        if (!res.ok) {
          throw new Error(
            await getErrorMessage(
              res,
              isFr
                ? 'Erreur lors de la sauvegarde'
                : 'Backup failed'
            )
          );
        }

        const data =
          await res.json();

        if (!data?.success) {
          throw new Error(
            data?.message ||
              (
                isFr
                  ? 'La sauvegarde a échoué'
                  : 'Backup failed'
              )
          );
        }

        toast.success(
          data?.filename
            ? (
                isFr
                  ? `Sauvegarde créée : ${data.filename}`
                  : `Backup created: ${data.filename}`
              )
            : (
                isFr
                  ? 'Sauvegarde créée avec succès'
                  : 'Backup created successfully'
              )
        );

        await fetchSystemLogs();
      } catch (error: any) {
        console.error(
          '[SUPERADMIN] Backup:',
          error
        );

        toast.error(
          error?.message ||
            (
              isFr
                ? 'Impossible de lancer la sauvegarde'
                : 'Unable to start backup'
            )
        );
      } finally {
        setMaintenanceLoading(
          false
        );

        setMaintenanceAction(
          null
        );
      }
    };


  /* =======================================================
     CLEAR CACHE
  ======================================================= */

  const clearCache =
    async () => {
      if (maintenanceLoading) {
        return;
      }

      const currentToken =
        getToken();

      if (!currentToken) {
        toast.error(
          isFr
            ? 'Session expirée'
            : 'Session expired'
        );

        return;
      }

      setMaintenanceLoading(
        true
      );

      setMaintenanceAction(
        'cache'
      );

      try {
        /*
         * Informer le serveur
         */
        const res =
          await fetch(
            `${API_URL}/api/maintenance/cache/clear`,
            {
              method: 'POST',

              headers: {
                Authorization:
                  `Bearer ${currentToken}`,

                'Content-Type':
                  'application/json',
              },

              cache: 'no-store',

              body: JSON.stringify({}),
            }
          );

        if (!res.ok) {
          throw new Error(
            await getErrorMessage(
              res,
              isFr
                ? 'Erreur lors du vidage du cache'
                : 'Cache clear failed'
            )
          );
        }

        /*
         * Vider Cache Storage
         */
        if (
          typeof window !==
            'undefined' &&
          'caches' in window
        ) {
          const names =
            await window.caches.keys();

          await Promise.all(
            names.map(
              name =>
                window.caches.delete(
                  name
                )
            )
          );
        }

        /*
         * Supprimer uniquement
         * les caches applicatifs.
         *
         * Le token n'est PAS supprimé.
         */
        const cacheKeys = [
          'cabinet_cache',
          'dashboard_cache',
          'products_cache',
          'clients_cache',
          'sales_cache',
          'stats_cache',
          'reports_cache',
          'invoices_cache',
        ];

        cacheKeys.forEach(
          key =>
            localStorage.removeItem(
              key
            )
        );

        cacheKeys.forEach(
          key =>
            sessionStorage.removeItem(
              key
            )
        );

        toast.success(
          isFr
            ? 'Cache vidé avec succès'
            : 'Cache cleared successfully'
        );

        await fetchSystemLogs();
      } catch (error: any) {
        console.error(
          '[SUPERADMIN] Cache:',
          error
        );

        toast.error(
          error?.message ||
            (
              isFr
                ? 'Impossible de vider le cache'
                : 'Unable to clear cache'
            )
        );
      } finally {
        setMaintenanceLoading(
          false
        );

        setMaintenanceAction(
          null
        );
      }
    };


  /* =======================================================
     DOWNLOAD BACKUP
  ======================================================= */

  const downloadBackup = async (
    filename: string
  ) => {
    const currentToken =
      getToken();

    if (!currentToken) {
      toast.error(
        isFr
          ? 'Session expirée'
          : 'Session expired'
      );

      return;
    }

    try {
      const url =
        `${API_URL}/api/maintenance/download/` +
        encodeURIComponent(
          filename
        );

      const res =
        await fetch(
          url,
          {
            method: 'GET',

            headers: {
              Authorization:
                `Bearer ${currentToken}`,
            },

            cache: 'no-store',
          }
        );

      if (!res.ok) {
        throw new Error(
          await getErrorMessage(
            res,
            isFr
              ? 'Erreur lors du téléchargement'
              : 'Download error'
          )
        );
      }

      const blob =
        await res.blob();

      const blobUrl =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          'a'
        );

      link.href = blobUrl;

      link.download =
        filename;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        blobUrl
      );
    } catch (error: any) {
      console.error(
        '[SUPERADMIN] Download backup:',
        error
      );

      toast.error(
        error?.message ||
          (
            isFr
              ? 'Erreur lors du téléchargement'
              : 'Download error'
          )
      );
    }
  };


  /* =======================================================
     CHARTS
  ======================================================= */

  const cabinetsByCity =
    useMemo(() => {
      const result: Record<
        string,
        number
      > = {};

      cabinets.forEach(
        cabinet => {
          const city =
            cabinet.city ||
            'N/A';

          result[city] =
            (result[city] ||
              0) + 1;
        }
      );

      return Object.entries(
        result
      ).map(
        ([city, count]) => ({
          city,
          count,
        })
      );
    }, [cabinets]);


  const cabinetsByDistrict =
    useMemo(() => {
      const result: Record<
        string,
        number
      > = {};

      cabinets.forEach(
        cabinet => {
          const district =
            cabinet.district ||
            'N/A';

          result[district] =
            (result[district] ||
              0) + 1;
        }
      );

      return Object.entries(
        result
      ).map(
        ([district, count]) => ({
          district:
            district.length > 20
              ? district.substring(
                  0,
                  20
                ) + '...'
              : district,

          count,
        })
      );
    }, [cabinets]);


  const subscriptionPie =
    useMemo(
      () =>
        [
          {
            name:
              tr.subscriptionActive,
            value:
              cabinets.filter(
                c =>
                  c.subscription ===
                  'active'
              ).length,
          },

          {
            name:
              tr.subscriptionTrial,
            value:
              cabinets.filter(
                c =>
                  c.subscription ===
                  'trial'
              ).length,
          },

          {
            name:
              tr.subscriptionExpired,
            value:
              cabinets.filter(
                c =>
                  c.subscription ===
                  'expired'
              ).length,
          },

          {
            name: isFr
              ? 'Suspendu'
              : 'Suspended',

            value:
              cabinets.filter(
                c =>
                  c.subscription ===
                  'suspended'
              ).length,
          },

          {
            name: isFr
              ? 'En attente'
              : 'Pending',

            value:
              cabinets.filter(
                c =>
                  c.subscription ===
                  'pending'
              ).length,
          },
        ].filter(
          item =>
            item.value > 0
        ),
      [
        cabinets,
        tr,
        isFr,
      ]
    );


  /* =======================================================
     LAST SUCCESSFUL BACKUP
  ======================================================= */

  const lastBackup =
    useMemo(() => {
      return systemLogs.find(
        log =>
          log.action ===
            'backup' &&
          log.status ===
            'success'
      );
    }, [systemLogs]);


  /* =======================================================
     SIDEBAR
  ======================================================= */

  const sidebarItems: {
    key: ActiveSection;
    icon: React.ElementType;
    label: string;
    badge?: number;
  }[] = [
    {
      key: 'cabinets',
      icon: Building2,
      label: isFr
        ? 'Cabinets optiques'
        : 'Optical Cabinets',
    },

    {
      key: 'validation',
      icon: ShieldCheck,
      label: isFr
        ? 'Validation'
        : 'Validation',
      badge:
        pendingCabinets,
    },

    {
      key: 'global-data',
      icon: Globe,
      label: isFr
        ? 'Données globales'
        : 'Global Data',
    },

    {
      key: 'stats',
      icon: BarChart3,
      label: isFr
        ? 'Statistiques'
        : 'Statistics',
    },

    {
      key: 'maintenance',
      icon: Server,
      label: isFr
        ? 'Maintenance'
        : 'Maintenance',
    },

    {
      key: 'permissions',
      icon: Shield,
      label: isFr
        ? 'Permissions'
        : 'Permissions',
    },

    {
      key: 'settings',
      icon: Settings,
      label: isFr
        ? 'Paramètres'
        : 'Settings',
    },
  ];


  /* =======================================================
     ADD CABINET DIALOG
  ======================================================= */

  const renderAddDialog =
    () => (
      <Dialog
        open={
          showAddDialog
        }
        onOpenChange={
          setShowAddDialog
        }
      >
        <DialogTrigger
          asChild
        >
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {tr.addCabinet}
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {tr.addCabinet}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="space-y-2">
              <Label>
                {tr.cabinetName} *
              </Label>

              <Input
                value={
                  newCabinet.name
                }
                onChange={e =>
                  setNewCabinet({
                    ...newCabinet,
                    name:
                      e.target.value,
                  })
                }
                placeholder="Optique Vision"
              />
            </div>


            <div className="space-y-2">
              <Label>
                {tr.cabinetOwner} *
              </Label>

              <Input
                value={
                  newCabinet.owner
                }
                onChange={e =>
                  setNewCabinet({
                    ...newCabinet,
                    owner:
                      e.target.value,
                  })
                }
                placeholder="Dr. Kouamé"
              />
            </div>


            <div className="space-y-2">
              <Label>
                {isFr
                  ? "N° d'exercice propriétaire"
                  : 'Owner Exercise Number'} *
              </Label>

              <Input
                value={
                  newCabinet.ownerExerciseNumber
                }
                onChange={e =>
                  setNewCabinet({
                    ...newCabinet,
                    ownerExerciseNumber:
                      e.target.value,
                  })
                }
                placeholder="EX-2025-0001"
              />
            </div>


            <div className="space-y-2">
              <Label>
                {isFr
                  ? "N° d'exercice clinique"
                  : 'Clinic Exercise Number'}
              </Label>

              <Input
                value={
                  newCabinet.clinicExerciseNumber
                }
                onChange={e =>
                  setNewCabinet({
                    ...newCabinet,
                    clinicExerciseNumber:
                      e.target.value,
                  })
                }
                placeholder="CL-2025-0001"
              />
            </div>


            <div className="space-y-2">
              <Label>
                {tr.authorizationNumber} *
              </Label>

              <Input
                value={
                  newCabinet.authorizationNumber
                }
                onChange={e =>
                  setNewCabinet({
                    ...newCabinet,
                    authorizationNumber:
                      e.target.value,
                  })
                }
                placeholder="AUT-2025-0001"
              />
            </div>


            <div className="space-y-2">
              <Label>
                {tr.cabinetEmail} *
              </Label>

              <Input
                type="email"
                value={
                  newCabinet.email
                }
                onChange={e =>
                  setNewCabinet({
                    ...newCabinet,
                    email:
                      e.target.value,
                  })
                }
                placeholder="contact@optique.ci"
              />
            </div>


            <div className="space-y-2">
              <Label>
                {tr.cabinetPhone}
              </Label>

              <Input
                value={
                  newCabinet.phone
                }
                onChange={e =>
                  setNewCabinet({
                    ...newCabinet,
                    phone:
                      e.target.value,
                  })
                }
                placeholder="+225 07 00 00 00"
              />
            </div>


            <div className="space-y-2">
              <Label>
                {tr.cabinetCity}
              </Label>

              <Select
                value={
                  newCabinet.city
                }
                onValueChange={value =>
                  setNewCabinet({
                    ...newCabinet,
                    city: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isFr
                        ? 'Sélectionner une ville'
                        : 'Select a city'
                    }
                  />
                </SelectTrigger>

                <SelectContent className="max-h-60">
                  {IVORY_COAST_CITIES.map(
                    city => (
                      <SelectItem
                        key={city}
                        value={city}
                      >
                        {city}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>


            <div className="space-y-2">
              <Label>
                {isFr
                  ? 'District sanitaire'
                  : 'Health District'}
              </Label>

              <Select
                value={
                  newCabinet.district
                }
                onValueChange={value =>
                  setNewCabinet({
                    ...newCabinet,
                    district:
                      value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isFr
                        ? 'Sélectionner un district'
                        : 'Select a district'
                    }
                  />
                </SelectTrigger>

                <SelectContent className="max-h-60">
                  {HEALTH_DISTRICTS.map(
                    district => (
                      <SelectItem
                        key={district}
                        value={
                          district
                        }
                      >
                        {district}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>


            <div className="space-y-2 md:col-span-2">
              <Label>
                {isFr
                  ? 'Adresse'
                  : 'Address'}
              </Label>

              <Input
                value={
                  newCabinet.address
                }
                onChange={e =>
                  setNewCabinet({
                    ...newCabinet,
                    address:
                      e.target.value,
                  })
                }
                placeholder="Cocody, Rue..."
              />
            </div>
          </div>


          <Button
            onClick={
              handleAddCabinet
            }
            className="w-full mt-2"
          >
            {tr.save}
          </Button>
        </DialogContent>
      </Dialog>
    );


  /* =======================================================
     VIEW CABINET DIALOG
  ======================================================= */

  const renderViewDialog =
    () =>
      viewCabinet && (
        <Dialog
          open={
            !!viewCabinet
          }
          onOpenChange={() =>
            setViewCabinet(
              null
            )
          }
        >
          <DialogContent className="sm:max-w-2xl">

            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />

                {viewCabinet.name}
              </DialogTitle>
            </DialogHeader>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">

              <div>
                <span className="text-muted-foreground">
                  {tr.cabinetOwner}:
                </span>{' '}
                <strong>
                  {viewCabinet.owner}
                </strong>
              </div>


              <div>
                <span className="text-muted-foreground">
                  {isFr
                    ? 'N° exercice propriétaire'
                    : 'Owner Exercise #'}:
                </span>{' '}
                <strong>
                  {
                    viewCabinet.ownerExerciseNumber
                  }
                </strong>
              </div>


              <div>
                <span className="text-muted-foreground">
                  {isFr
                    ? 'N° exercice clinique'
                    : 'Clinic Exercise #'}:
                </span>{' '}
                <strong>
                  {
                    viewCabinet.clinicExerciseNumber
                  }
                </strong>
              </div>


              <div>
                <span className="text-muted-foreground">
                  {tr.authorizationNumber}:
                </span>{' '}
                <strong>
                  {
                    viewCabinet.authorizationNumber
                  }
                </strong>
              </div>


              <div>
                <span className="text-muted-foreground">
                  {tr.cabinetEmail}:
                </span>{' '}
                <strong>
                  {viewCabinet.email}
                </strong>
              </div>


              <div>
                <span className="text-muted-foreground">
                  {tr.cabinetPhone}:
                </span>{' '}
                <strong>
                  {viewCabinet.phone}
                </strong>
              </div>


              <div>
                <span className="text-muted-foreground">
                  {tr.cabinetCity}:
                </span>{' '}
                <strong>
                  {viewCabinet.city}
                </strong>
              </div>


              <div>
                <span className="text-muted-foreground">
                  District:
                </span>{' '}
                <strong>
                  {viewCabinet.district}
                </strong>
              </div>


              <div>
                <span className="text-muted-foreground">
                  {tr.subscription}:
                </span>{' '}
                {subscriptionBadge(
                  viewCabinet.subscription
                )}
              </div>


              <div>
                <span className="text-muted-foreground">
                  {isFr
                    ? 'Validé'
                    : 'Validated'}:
                </span>{' '}

                {viewCabinet.validated ? (
                  <Badge variant="default">
                    {tr.yes}
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    {tr.no}
                  </Badge>
                )}
              </div>

            </div>


            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">

              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">
                    {
                      viewCabinet.totalSales ||
                      0
                    }
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {tr.sales}
                  </p>
                </CardContent>
              </Card>


              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">
                    {
                      viewCabinet.totalClients ||
                      0
                    }
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {tr.clients}
                  </p>
                </CardContent>
              </Card>


              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">
                    {
                      viewCabinet.totalPrescriptions ||
                      0
                    }
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {tr.prescriptions}
                  </p>
                </CardContent>
              </Card>


              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">
                    {(
                      Number(
                        viewCabinet.monthlyRevenue ||
                          0
                      ) / 1000
                    ).toFixed(0)}
                    k
                  </p>

                  <p className="text-xs text-muted-foreground">
                    CA/mois
                  </p>
                </CardContent>
              </Card>

            </div>

          </DialogContent>
        </Dialog>
      );


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        {isFr
          ? 'Chargement...'
          : 'Loading...'}
      </div>
    );
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="flex h-full min-h-0 animate-fade-in">

      {/* ===================================================
          SUB SIDEBAR
      =================================================== */}

      <aside className="w-64 border-r bg-card shrink-0 flex flex-col">

        <div className="p-4 border-b">
          <h2 className="text-sm font-bold text-primary flex items-center gap-2">
            <Shield className="h-4 w-4" />

            {tr.platformManagement}
          </h2>

          <p className="text-xs text-muted-foreground mt-1">
            PASS OPTIQUE Platform
          </p>
        </div>


        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">

          {sidebarItems.map(
            item => (
              <button
                key={
                  item.key
                }
                type="button"
                onClick={() =>
                  setActiveSection(
                    item.key
                  )
                }
                className={`
                  w-full
                  flex
                  items-center
                  gap-3
                  px-3
                  py-2.5
                  rounded-lg
                  text-sm
                  transition-colors
                  ${
                    activeSection ===
                    item.key
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <item.icon className="h-4 w-4 shrink-0" />

                <span className="flex-1 text-left">
                  {item.label}
                </span>

                {item.badge !==
                  undefined &&
                  item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-xs h-5 w-5 p-0 flex items-center justify-center"
                    >
                      {item.badge}
                    </Badge>
                  )}
              </button>
            )
          )}

        </nav>
      </aside>


      {/* ===================================================
          MAIN
      =================================================== */}

      <main className="flex-1 p-6 overflow-y-auto space-y-6">


        {/* =================================================
            KPI BAR
        ================================================= */}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  {tr.totalCabinets}
                </p>

                <p className="text-lg font-bold">
                  {cabinets.length}
                </p>
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  {tr.activeCabinets}
                </p>

                <p className="text-lg font-bold">
                  {activeCabinets}
                </p>
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Users className="h-4 w-4 text-info" />
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  {tr.totalPlatformUsers}
                </p>

                <p className="text-lg font-bold">
                  {totalUsers}
                </p>
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <TrendingUp className="h-4 w-4 text-warning" />
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  {isFr
                    ? 'CA global'
                    : 'Global Revenue'}
                </p>

                <p className="text-lg font-bold">
                  {(
                    totalRevenue /
                    1000000
                  ).toFixed(1)}
                  M
                </p>
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Clock className="h-4 w-4 text-destructive" />
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  {isFr
                    ? 'En attente'
                    : 'Pending'}
                </p>

                <p className="text-lg font-bold">
                  {pendingCabinets}
                </p>
              </div>
            </CardContent>
          </Card>

        </div>


        {/* =================================================
            CABINETS
        ================================================= */}

        {activeSection ===
          'cabinets' && (
          <div className="space-y-4">

            <div className="flex items-center gap-3">

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                <Input
                  placeholder={
                    tr.search
                  }
                  value={
                    searchQuery
                  }
                  onChange={e =>
                    setSearchQuery(
                      e.target.value
                    )
                  }
                  className="pl-10"
                />
              </div>

              {renderAddDialog()}

            </div>


            <Card>
              <CardContent className="p-0 overflow-x-auto">

                <Table>

                  <TableHeader>
                    <TableRow>

                      <TableHead>
                        {tr.cabinetName}
                      </TableHead>

                      <TableHead>
                        {tr.cabinetOwner}
                      </TableHead>

                      <TableHead>
                        {isFr
                          ? 'N° Exercice'
                          : 'Exercise #'}
                      </TableHead>

                      <TableHead>
                        {
                          tr.authorizationNumber
                        }
                      </TableHead>

                      <TableHead>
                        {tr.cabinetCity}
                      </TableHead>

                      <TableHead>
                        {tr.subscription}
                      </TableHead>

                      <TableHead>
                        {isFr
                          ? 'Validé'
                          : 'Valid.'}
                      </TableHead>

                      <TableHead className="text-right">
                        {tr.actions}
                      </TableHead>

                    </TableRow>
                  </TableHeader>


                  <TableBody>

                    {filtered.length ===
                    0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={
                            8
                          }
                          className="text-center py-8 text-muted-foreground"
                        >
                          {isFr
                            ? 'Aucun cabinet trouvé'
                            : 'No cabinet found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map(
                        cabinet => (
                          <TableRow
                            key={
                              cabinet.id
                            }
                          >

                            <TableCell className="font-medium">
                              {
                                cabinet.name
                              }
                            </TableCell>

                            <TableCell>
                              {
                                cabinet.owner
                              }
                            </TableCell>

                            <TableCell className="text-xs font-mono">
                              {
                                cabinet.ownerExerciseNumber
                              }
                            </TableCell>

                            <TableCell className="text-xs font-mono">
                              {
                                cabinet.authorizationNumber
                              }
                            </TableCell>

                            <TableCell>
                              {
                                cabinet.city
                              }
                            </TableCell>

                            <TableCell>
                              {subscriptionBadge(
                                cabinet.subscription
                              )}
                            </TableCell>

                            <TableCell>

                              {cabinet.validated ? (
                                <CheckCircle className="h-4 w-4 text-success" />
                              ) : (
                                <Clock className="h-4 w-4 text-warning" />
                              )}

                            </TableCell>


                            <TableCell>

                              <div className="flex items-center justify-end gap-1">

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setViewCabinet(
                                      cabinet
                                    )
                                  }
                                  title={
                                    tr.manageCabinet
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>


                                {cabinet.validated && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      toggleSubscription(
                                        cabinet.id
                                      )
                                    }
                                    title={
                                      cabinet.subscription ===
                                      'active'
                                        ? tr.suspend
                                        : tr.activate
                                    }
                                  >
                                    {cabinet.subscription ===
                                    'active' ? (
                                      <PowerOff className="h-4 w-4 text-warning" />
                                    ) : (
                                      <Power className="h-4 w-4 text-success" />
                                    )}
                                  </Button>
                                )}


                                {!cabinet.validated && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      validateCabinet(
                                        cabinet.id
                                      )
                                    }
                                    title={
                                      isFr
                                        ? 'Valider'
                                        : 'Validate'
                                    }
                                  >
                                    <ShieldCheck className="h-4 w-4 text-success" />
                                  </Button>
                                )}


                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    deleteCabinet(
                                      cabinet.id
                                    )
                                  }
                                  title={
                                    tr.delete
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>

                              </div>

                            </TableCell>

                          </TableRow>
                        )
                      )
                    )}

                  </TableBody>

                </Table>

              </CardContent>
            </Card>

          </div>
        )}


        {/* =================================================
            VALIDATION
        ================================================= */}

        {activeSection ===
          'validation' && (
          <div className="space-y-4">

            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />

              {isFr
                ? 'Validation des cabinets'
                : 'Cabinet Validation'}
            </h2>


            <p className="text-sm text-muted-foreground">
              {isFr
                ? 'Vérifiez les informations et validez les cabinets en attente.'
                : 'Review information and validate pending cabinets.'}
            </p>


            {cabinets.filter(
              cabinet =>
                !cabinet.validated
            ).length === 0 ? (

              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {isFr
                    ? 'Aucun cabinet en attente de validation'
                    : 'No cabinets pending validation'}
                </CardContent>
              </Card>

            ) : (

              cabinets
                .filter(
                  cabinet =>
                    !cabinet.validated
                )
                .map(
                  cabinet => (
                    <Card
                      key={
                        cabinet.id
                      }
                    >
                      <CardContent className="p-4">

                        <div className="flex flex-col lg:flex-row items-start justify-between gap-4">

                          <div className="space-y-2">

                            <h3 className="font-bold text-lg">
                              {
                                cabinet.name
                              }
                            </h3>


                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm">

                              <p>
                                <span className="text-muted-foreground">
                                  {
                                    tr.cabinetOwner
                                  }:
                                </span>{' '}
                                {
                                  cabinet.owner
                                }
                              </p>


                              <p>
                                <span className="text-muted-foreground">
                                  {isFr
                                    ? "N° exercice propriétaire"
                                    : 'Owner Exercise #'}:
                                </span>{' '}

                                <span className="font-mono">
                                  {
                                    cabinet.ownerExerciseNumber
                                  }
                                </span>
                              </p>


                              <p>
                                <span className="text-muted-foreground">
                                  {isFr
                                    ? "N° exercice clinique"
                                    : 'Clinic Exercise #'}:
                                </span>{' '}

                                <span className="font-mono">
                                  {
                                    cabinet.clinicExerciseNumber
                                  }
                                </span>
                              </p>


                              <p>
                                <span className="text-muted-foreground">
                                  {
                                    tr.authorizationNumber
                                  }:
                                </span>{' '}

                                <span className="font-mono">
                                  {
                                    cabinet.authorizationNumber
                                  }
                                </span>
                              </p>


                              <p>
                                <span className="text-muted-foreground">
                                  {
                                    tr.cabinetCity
                                  }:
                                </span>{' '}
                                {
                                  cabinet.city
                                }
                              </p>


                              <p>
                                <span className="text-muted-foreground">
                                  District:
                                </span>{' '}
                                {
                                  cabinet.district ||
                                  'N/A'
                                }
                              </p>


                              <p>
                                <span className="text-muted-foreground">
                                  {
                                    tr.cabinetEmail
                                  }:
                                </span>{' '}
                                {
                                  cabinet.email
                                }
                              </p>


                              <p>
                                <span className="text-muted-foreground">
                                  {
                                    tr.cabinetPhone
                                  }:
                                </span>{' '}
                                {
                                  cabinet.phone ||
                                  'N/A'
                                }
                              </p>

                            </div>

                          </div>


                          <div className="flex gap-2 shrink-0">

                            <Button
                              onClick={() =>
                                validateCabinet(
                                  cabinet.id
                                )
                              }
                              className="gap-2"
                            >
                              <UserCheck className="h-4 w-4" />

                              {isFr
                                ? 'Valider'
                                : 'Validate'}
                            </Button>


                            <Button
                              variant="destructive"
                              onClick={() =>
                                rejectCabinet(
                                  cabinet.id
                                )
                              }
                              className="gap-2"
                            >
                              <XCircle className="h-4 w-4" />

                              {isFr
                                ? 'Rejeter'
                                : 'Reject'}
                            </Button>

                          </div>

                        </div>

                      </CardContent>
                    </Card>
                  )
                )
            )}

          </div>
        )}


        {/* =================================================
            GLOBAL DATA
        ================================================= */}

        {activeSection ===
          'global-data' && (
          <div className="space-y-4">

            <h2 className="text-lg font-bold flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />

              {isFr
                ? 'Données globales consolidées'
                : 'Consolidated Global Data'}
            </h2>


            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

              {[
                {
                  icon: DollarSign,
                  label: isFr
                    ? 'CA global mensuel'
                    : 'Monthly Global Revenue',
                  value:
                    `${(
                      totalRevenue /
                      1000000
                    ).toFixed(1)}M FCFA`,
                },

                {
                  icon: Package,
                  label: isFr
                    ? 'Valeur stock totale'
                    : 'Total Stock Value',
                  value:
                    `${(
                      totalStockValue /
                      1000000
                    ).toFixed(1)}M FCFA`,
                },

                {
                  icon: Users,
                  label: isFr
                    ? 'Total clients'
                    : 'Total Clients',
                  value:
                    totalClientsAll,
                },

                {
                  icon: FileText,
                  label: isFr
                    ? 'Total prescriptions'
                    : 'Total Prescriptions',
                  value:
                    totalPrescriptionsAll,
                },

                {
                  icon: CreditCard,
                  label: isFr
                    ? 'Total ventes'
                    : 'Total Sales',
                  value:
                    totalSalesAll,
                },

                {
                  icon: Building2,
                  label: isFr
                    ? 'Total cabinets'
                    : 'Total Cabinets',
                  value:
                    cabinets.length,
                },

                {
                  icon: Users,
                  label: isFr
                    ? 'Total utilisateurs'
                    : 'Total Users',
                  value:
                    totalUsers,
                },

                {
                  icon: CheckCircle,
                  label: isFr
                    ? 'Cabinets actifs'
                    : 'Active Cabinets',
                  value:
                    activeCabinets,
                },
              ].map(
                (
                  item,
                  index
                ) => {
                  const Icon =
                    item.icon;

                  return (
                    <Card
                      key={
                        index
                      }
                    >
                      <CardContent className="p-4 flex items-center gap-3">

                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">
                            {
                              item.label
                            }
                          </p>

                          <p className="text-xl font-bold">
                            {
                              item.value
                            }
                          </p>
                        </div>

                      </CardContent>
                    </Card>
                  );
                }
              )}

            </div>


            <Card>

              <CardHeader>
                <CardTitle className="text-base">
                  {isFr
                    ? 'Détail par cabinet'
                    : 'Detail by Cabinet'}
                </CardTitle>
              </CardHeader>


              <CardContent className="p-0 overflow-x-auto">

                <Table>

                  <TableHeader>
                    <TableRow>

                      <TableHead>
                        {tr.cabinetName}
                      </TableHead>

                      <TableHead>
                        {tr.cabinetCity}
                      </TableHead>

                      <TableHead className="text-right">
                        {tr.clients}
                      </TableHead>

                      <TableHead className="text-right">
                        {tr.sales}
                      </TableHead>

                      <TableHead className="text-right">
                        {tr.prescriptions}
                      </TableHead>

                      <TableHead className="text-right">
                        CA/mois
                      </TableHead>

                      <TableHead className="text-right">
                        {isFr
                          ? 'Valeur stock'
                          : 'Stock Value'}
                      </TableHead>

                    </TableRow>
                  </TableHeader>


                  <TableBody>

                    {[
                      ...cabinets,
                    ]
                      .sort(
                        (a, b) =>
                          Number(
                            b.monthlyRevenue ||
                              0
                          ) -
                          Number(
                            a.monthlyRevenue ||
                              0
                          )
                      )
                      .map(
                        cabinet => (
                          <TableRow
                            key={
                              cabinet.id
                            }
                          >

                            <TableCell className="font-medium">
                              {
                                cabinet.name
                              }
                            </TableCell>

                            <TableCell>
                              {
                                cabinet.city
                              }
                            </TableCell>

                            <TableCell className="text-right">
                              {
                                cabinet.totalClients ||
                                0
                              }
                            </TableCell>

                            <TableCell className="text-right">
                              {
                                cabinet.totalSales ||
                                0
                              }
                            </TableCell>

                            <TableCell className="text-right">
                              {
                                cabinet.totalPrescriptions ||
                                0
                              }
                            </TableCell>

                            <TableCell className="text-right font-medium">
                              {Number(
                                cabinet.monthlyRevenue ||
                                  0
                              ).toLocaleString(
                                'fr-FR'
                              )}{' '}
                              FCFA
                            </TableCell>

                            <TableCell className="text-right">
                              {Number(
                                cabinet.stockValue ||
                                  0
                              ).toLocaleString(
                                'fr-FR'
                              )}{' '}
                              FCFA
                            </TableCell>

                          </TableRow>
                        )
                      )}


                    <TableRow className="bg-muted/50 font-bold">

                      <TableCell>
                        TOTAL
                      </TableCell>

                      <TableCell />

                      <TableCell className="text-right">
                        {
                          totalClientsAll
                        }
                      </TableCell>

                      <TableCell className="text-right">
                        {
                          totalSalesAll
                        }
                      </TableCell>

                      <TableCell className="text-right">
                        {
                          totalPrescriptionsAll
                        }
                      </TableCell>

                      <TableCell className="text-right">
                        {totalRevenue.toLocaleString(
                          'fr-FR'
                        )}{' '}
                        FCFA
                      </TableCell>

                      <TableCell className="text-right">
                        {totalStockValue.toLocaleString(
                          'fr-FR'
                        )}{' '}
                        FCFA
                      </TableCell>

                    </TableRow>

                  </TableBody>

                </Table>

              </CardContent>
            </Card>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              <Card>

                <CardHeader>
                  <CardTitle className="text-base">
                    {isFr
                      ? 'Évolution du CA global'
                      : 'Global Revenue Growth'}
                  </CardTitle>
                </CardHeader>


                <CardContent>

                  <ResponsiveContainer
                    width="100%"
                    height={250}
                  >

                    <AreaChart
                      data={
                        monthlyGrowth
                      }
                    >

                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis dataKey="month" />

                      <YAxis
                        tickFormatter={
                          value =>
                            `${(
                              value /
                              1000000
                            ).toFixed(
                              1
                            )}M`
                        }
                      />

                      <Tooltip
                        formatter={(
                          value
                        ) =>
                          `${Number(
                            value
                          ).toLocaleString(
                            'fr-FR'
                          )} FCFA`
                        }
                      />

                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={
                          0.15
                        }
                      />

                    </AreaChart>

                  </ResponsiveContainer>

                </CardContent>
              </Card>


              <Card>

                <CardHeader>
                  <CardTitle className="text-base">
                    {isFr
                      ? 'Top cabinets par CA'
                      : 'Top Cabinets by Revenue'}
                  </CardTitle>
                </CardHeader>


                <CardContent>

                  <ResponsiveContainer
                    width="100%"
                    height={250}
                  >

                    <BarChart
                      data={
                        cabinets
                          .filter(
                            cabinet =>
                              Number(
                                cabinet.monthlyRevenue ||
                                  0
                              ) > 0
                          )
                          .sort(
                            (a, b) =>
                              Number(
                                b.monthlyRevenue ||
                                  0
                              ) -
                              Number(
                                a.monthlyRevenue ||
                                  0
                              )
                          )
                          .map(
                            cabinet => ({
                              ...cabinet,
                              monthlyRevenue:
                                Number(
                                  cabinet.monthlyRevenue ||
                                    0
                                ),
                            })
                          )
                      }
                      layout="vertical"
                    >

                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis
                        type="number"
                        tickFormatter={
                          value =>
                            `${(
                              value /
                              1000000
                            ).toFixed(
                              1
                            )}M`
                        }
                      />

                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        tick={{
                          fontSize: 11,
                        }}
                      />

                      <Tooltip
                        formatter={(
                          value
                        ) =>
                          `${Number(
                            value
                          ).toLocaleString(
                            'fr-FR'
                          )} FCFA`
                        }
                      />

                      <Bar
                        dataKey="monthlyRevenue"
                        fill="hsl(var(--primary))"
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

          </div>
        )}


        {/* =================================================
            STATISTICS
        ================================================= */}

        {activeSection ===
          'stats' && (
          <div className="space-y-4">

            <h2 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />

              {tr.platformStats}
            </h2>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">


              {/* CITY */}

              <Card>

                <CardHeader>
                  <CardTitle className="text-base">
                    {isFr
                      ? 'Cabinets par ville'
                      : 'Cabinets by City'}
                  </CardTitle>
                </CardHeader>

                <CardContent>

                  <ResponsiveContainer
                    width="100%"
                    height={250}
                  >

                    <BarChart
                      data={
                        cabinetsByCity
                      }
                    >

                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis dataKey="city" />

                      <YAxis allowDecimals={false} />

                      <Tooltip />

                      <Bar
                        dataKey="count"
                        fill="hsl(var(--primary))"
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


              {/* MONTHLY GROWTH */}

              <Card>

                <CardHeader>
                  <CardTitle className="text-base">
                    {isFr
                      ? 'Croissance mensuelle'
                      : 'Monthly Growth'}
                  </CardTitle>
                </CardHeader>

                <CardContent>

                  <ResponsiveContainer
                    width="100%"
                    height={250}
                  >

                    <LineChart
                      data={
                        monthlyGrowth
                      }
                    >

                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis dataKey="month" />

                      <YAxis allowDecimals={false} />

                      <Tooltip />

                      <Line
                        type="monotone"
                        dataKey="cabinets"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{
                          r: 4,
                        }}
                      />

                    </LineChart>

                  </ResponsiveContainer>

                </CardContent>

              </Card>


              {/* SUBSCRIPTIONS */}

              <Card>

                <CardHeader>
                  <CardTitle className="text-base">
                    {isFr
                      ? 'Répartition abonnements'
                      : 'Subscription Distribution'}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex justify-center">

                  <ResponsiveContainer
                    width="100%"
                    height={250}
                  >

                    <PieChart>

                      <Pie
                        data={
                          subscriptionPie
                        }
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        label={({
                          name,
                          value,
                        }) =>
                          `${name} (${value})`
                        }
                      >

                        {subscriptionPie.map(
                          (
                            _,
                            index
                          ) => (
                            <Cell
                              key={
                                index
                              }
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


              {/* DISTRICT */}

              <Card>

                <CardHeader>
                  <CardTitle className="text-base">
                    {isFr
                      ? 'Cabinets par district sanitaire'
                      : 'Cabinets by Health District'}
                  </CardTitle>
                </CardHeader>

                <CardContent>

                  <ResponsiveContainer
                    width="100%"
                    height={250}
                  >

                    <BarChart
                      data={
                        cabinetsByDistrict
                      }
                    >

                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis
                        dataKey="district"
                        tick={{
                          fontSize: 10,
                        }}
                      />

                      <YAxis allowDecimals={false} />

                      <Tooltip />

                      <Bar
                        dataKey="count"
                        fill="hsl(var(--success))"
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

            </div>

          </div>
        )}


        {/* =================================================
            MAINTENANCE
        ================================================= */}

        {activeSection ===
          'maintenance' && (
          <div className="space-y-4">


            <h2 className="text-lg font-bold flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />

              {tr.maintenance}
            </h2>


            {/* STATUS */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">


              <Card>
                <CardContent className="p-4 flex items-center gap-4">

                  <div className="p-3 rounded-xl bg-success/10">
                    <Server className="h-5 w-5 text-success" />
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isFr
                        ? 'État serveur'
                        : 'Server Status'}
                    </p>

                    <p className="font-bold text-success">
                      {isFr
                        ? 'En ligne'
                        : 'Online'}
                    </p>
                  </div>

                </CardContent>
              </Card>


              <Card>
                <CardContent className="p-4 flex items-center gap-4">

                  <div className="p-3 rounded-xl bg-info/10">
                    <Activity className="h-5 w-5 text-info" />
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      {isFr
                        ? 'Disponibilité'
                        : 'Uptime'}
                    </p>

                    <p className="font-bold">
                      99.8%
                    </p>
                  </div>

                </CardContent>
              </Card>


              <Card>
                <CardContent className="p-4 flex items-center gap-4">

                  <div className="p-3 rounded-xl bg-warning/10">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>

                  <div>

                    <p className="text-sm text-muted-foreground">
                      {isFr
                        ? 'Dernière sauvegarde'
                        : 'Last Backup'}
                    </p>

                    <p className="font-bold">

                      {lastBackup
                        ? new Date(
                            lastBackup.created_at
                          ).toLocaleString(
                            isFr
                              ? 'fr-FR'
                              : 'en-US'
                          )
                        : (
                            isFr
                              ? 'Aucune sauvegarde'
                              : 'No backup'
                          )}

                    </p>

                  </div>

                </CardContent>
              </Card>

            </div>


            {/* ACTIONS */}

            <Card>

              <CardHeader>
                <CardTitle className="text-base">
                  {isFr
                    ? 'Actions de maintenance'
                    : 'Maintenance Actions'}
                </CardTitle>
              </CardHeader>


              <CardContent>

                <div className="flex flex-wrap gap-3">


                  {/* BACKUP */}

                  <Button
                    variant="outline"
                    onClick={
                      runBackup
                    }
                    disabled={
                      maintenanceLoading
                    }
                    className="gap-2"
                  >

                    <Server
                      className={
                        maintenanceAction ===
                        'backup'
                          ? 'h-4 w-4 animate-pulse'
                          : 'h-4 w-4'
                      }
                    />

                    {maintenanceAction ===
                    'backup'
                      ? (
                          isFr
                            ? 'Sauvegarde en cours...'
                            : 'Backup in progress...'
                        )
                      : (
                          isFr
                            ? 'Lancer une sauvegarde'
                            : 'Run Backup'
                        )}

                  </Button>


                  {/* CACHE */}

                  <Button
                    variant="outline"
                    onClick={
                      clearCache
                    }
                    disabled={
                      maintenanceLoading
                    }
                    className="gap-2"
                  >

                    <Activity
                      className={
                        maintenanceAction ===
                        'cache'
                          ? 'h-4 w-4 animate-pulse'
                          : 'h-4 w-4'
                      }
                    />

                    {maintenanceAction ===
                    'cache'
                      ? (
                          isFr
                            ? 'Vidage en cours...'
                            : 'Clearing...'
                        )
                      : (
                          isFr
                            ? 'Vider le cache'
                            : 'Clear Cache'
                        )}

                  </Button>

                </div>

              </CardContent>

            </Card>


            {/* LOGS */}

            <Card>

              <CardHeader>

                <CardTitle className="text-base flex items-center gap-2">

                  <Activity className="h-4 w-4" />

                  {tr.systemLogs}

                </CardTitle>

              </CardHeader>


              <CardContent>

                {systemLogs.length ===
                0 ? (

                  <div className="p-8 text-center text-muted-foreground">

                    {isFr
                      ? 'Aucune opération de maintenance'
                      : 'No maintenance operations'}

                  </div>

                ) : (

                  <div className="space-y-3">

                    {systemLogs.map(
                      log => (
                        <div
                          key={
                            log.id
                          }
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                        >

                          <div className="mt-0.5">

                            {log.status ===
                              'success' && (
                              <CheckCircle className="h-4 w-4 text-success" />
                            )}

                            {log.status ===
                              'warning' && (
                              <AlertTriangle className="h-4 w-4 text-warning" />
                            )}

                            {log.status ===
                              'error' && (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}

                            {log.status ===
                              'info' && (
                              <Activity className="h-4 w-4 text-info" />
                            )}

                          </div>


                          <div className="flex-1 min-w-0">

                            <p className="text-sm font-medium break-words">
                              {
                                log.message ||
                                log.action ||
                                'Maintenance'
                              }
                            </p>


                            {log.filename && (
                              <div className="mt-2">

                                <p className="text-xs text-muted-foreground font-mono break-all">
                                  {
                                    log.filename
                                  }
                                </p>


                                {log.file_size !=
                                  null && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {(
                                      Number(
                                        log.file_size
                                      ) /
                                      1024
                                    ).toFixed(
                                      2
                                    )}{' '}
                                    KB
                                  </p>
                                )}


                                {log.action ===
                                  'backup' &&
                                  log.status ===
                                    'success' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2 gap-2"
                                      onClick={() =>
                                        downloadBackup(
                                          log.filename!
                                        )
                                      }
                                    >
                                      <Download className="h-3.5 w-3.5" />

                                      {isFr
                                        ? 'Télécharger'
                                        : 'Download'}
                                    </Button>
                                  )}

                              </div>
                            )}


                            <p className="text-xs text-muted-foreground mt-1">

                              {new Date(
                                log.created_at
                              ).toLocaleString(
                                isFr
                                  ? 'fr-FR'
                                  : 'en-US'
                              )}

                            </p>

                          </div>

                        </div>
                      )
                    )}

                  </div>

                )}

              </CardContent>

            </Card>

          </div>
        )}


        {/* =================================================
            PERMISSIONS
        ================================================= */}

        {activeSection ===
          'permissions' && (
          <div className="space-y-4">

            <h2 className="text-lg font-bold flex items-center gap-2">

              <Shield className="h-5 w-5 text-primary" />

              {isFr
                ? 'Gestion des permissions'
                : 'Permissions Management'}

            </h2>


            <p className="text-sm text-muted-foreground">
              {isFr
                ? "Définissez les droits d'accès pour chaque rôle de la plateforme."
                : 'Define access rights for each platform role.'}
            </p>


            <Card>

              <CardContent className="p-0 overflow-x-auto">

                {permissionsLoading ? (

                  <div className="p-8 text-center text-muted-foreground">
                    {isFr
                      ? 'Chargement...'
                      : 'Loading...'}
                  </div>

                ) : permissions.length ===
                  0 ? (

                  <div className="p-8 text-center text-muted-foreground">
                    {isFr
                      ? 'Aucune permission disponible'
                      : 'No permissions available'}
                  </div>

                ) : (

                  <Table>

                    <TableHeader>

                      <TableRow>

                        <TableHead>
                          Module
                        </TableHead>

                        <TableHead className="text-center">
                          Admin
                        </TableHead>

                        <TableHead className="text-center">
                          {isFr
                            ? 'Directeur'
                            : 'Director'}
                        </TableHead>

                        <TableHead className="text-center">
                          {isFr
                            ? 'Vendeur'
                            : 'Seller'}
                        </TableHead>

                        <TableHead className="text-center">
                          {isFr
                            ? 'Caissier'
                            : 'Cashier'}
                        </TableHead>

                      </TableRow>

                    </TableHeader>


                    <TableBody>

                      {permissions.map(
                        row => (
                          <TableRow
                            key={
                              row.module
                            }
                          >

                            <TableCell className="font-medium">
                              {
                                MODULE_LABELS[
                                  row.module
                                ] ||
                                row.module
                              }
                            </TableCell>


                            {(
                              [
                                'admin',
                                'directeur',
                                'vendeur',
                                'caissier',
                              ] as const
                            ).map(
                              role => (
                                <TableCell
                                  key={
                                    role
                                  }
                                  className="text-center"
                                >

                                  <Switch
                                    checked={
                                      Boolean(
                                        row[
                                          role
                                        ]
                                      )
                                    }
                                    onCheckedChange={() =>
                                      togglePermission(
                                        row.module,
                                        role
                                      )
                                    }
                                  />

                                </TableCell>
                              )
                            )}

                          </TableRow>
                        )
                      )}

                    </TableBody>

                  </Table>

                )}

              </CardContent>

            </Card>


            <Button
              onClick={
                savePermissions
              }
              disabled={
                !permissionsDirty ||
                permissionsLoading
              }
            >
              {tr.save}
            </Button>

          </div>
        )}


        {/* =================================================
            SETTINGS
        ================================================= */}

        {activeSection === 'settings' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                {tr.platformSettings}
              </h2>

              <p className="text-sm text-muted-foreground mt-1">
                {isFr
                  ? 'Gérez les paramètres globaux de la plateforme.'
                  : 'Manage the global platform settings.'}
              </p>
            </div>

            <Card>
              <CardContent className="p-6 space-y-4">
                {settingsLoading ? (
                  <div className="py-10 text-center text-muted-foreground">
                    {isFr ? 'Chargement des paramètres...' : 'Loading settings...'}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>
                          {isFr ? 'Nom de la plateforme' : 'Platform Name'}
                        </Label>
                        <Input
                          value={platformSettings.platformName}
                          onChange={e =>
                            updatePlatformSetting('platformName', e.target.value)
                          }
                          placeholder="PASS OPTIQUE by MTN"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>
                          {isFr ? 'Email support' : 'Support Email'}
                        </Label>
                        <Input
                          type="email"
                          value={platformSettings.supportEmail}
                          onChange={e =>
                            updatePlatformSetting('supportEmail', e.target.value)
                          }
                          placeholder="support@passoptique.ci"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>
                          {isFr ? 'Durée essai (jours)' : 'Trial Duration (days)'}
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={platformSettings.trialDurationDays}
                          onChange={e =>
                            updatePlatformSetting(
                              'trialDurationDays',
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>
                          {isFr
                            ? 'Prix abonnement mensuel (FCFA)'
                            : 'Monthly Subscription Price (FCFA)'}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={platformSettings.monthlySubscriptionPrice}
                          onChange={e =>
                            updatePlatformSetting(
                              'monthlySubscriptionPrice',
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>
                          {isFr
                            ? 'Max utilisateurs par cabinet'
                            : 'Max Users per Cabinet'}
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={platformSettings.maxUsersPerCabinet}
                          onChange={e =>
                            updatePlatformSetting(
                              'maxUsersPerCabinet',
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>
                          {isFr ? 'Version plateforme' : 'Platform Version'}
                        </Label>
                        <Input
                          value={platformSettings.platformVersion}
                          disabled
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={savePlatformSettings}
                        disabled={
                          !settingsDirty ||
                          settingsSaving ||
                          settingsLoading
                        }
                        className="gap-2"
                      >
                        {settingsSaving ? (
                          <>
                            <Activity className="h-4 w-4 animate-pulse" />
                            {isFr ? 'Enregistrement...' : 'Saving...'}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            {tr.save}
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}


        {/* =================================================
            VIEW CABINET DIALOG
        ================================================= */}

        {renderViewDialog()}

      </main>

    </div>
  );
};


export default SuperAdminPage;