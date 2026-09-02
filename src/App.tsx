import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import PermissionGuard from "@/components/PermissionGuard";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import SalesPage from "./pages/SalesPage";
import StockPage from "./pages/StockPage";
import PaymentsPage from "./pages/PaymentsPage";
import OrdersPage from "./pages/OrdersPage";
import PrescriptionsPage from "./pages/PrescriptionsPage";
import InvoicesPage from "./pages/InvoicesPage";
import ReportsPage from "./pages/ReportsPage";
import StatisticsPage from "./pages/StatisticsPage";
import SettingsPage from "./pages/SettingsPage";
import NotificationsPage from "./pages/NotificationsPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";
import ResetPasswordPage from "./pages/Resetpasswordpage";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user } = useAuth();

  // =========================================================
  // UTILISATEUR NON CONNECTÉ
  //
  // IMPORTANT : on ne peut pas se contenter de "return <LoginPage />"
  // ici, sinon TOUTE URL (y compris /reset-password?token=...) affiche
  // systématiquement le login sans jamais regarder l'adresse demandée.
  // C'est ce qui empêchait la page de réinitialisation de s'ouvrir :
  // un visiteur qui clique sur son lien de reset n'est justement PAS
  // connecté, donc il tombait toujours ici.
  // =========================================================
  if (!user) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  if (user.role === 'superadmin') {
    return (
      <AppLayout>
        <Routes>
          <Route path="/" element={<SuperAdminPage />} />
          <Route path="*" element={<SuperAdminPage />} />
        </Routes>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<PermissionGuard module="dashboard"><DashboardPage /></PermissionGuard>} />
        <Route path="/clients" element={<PermissionGuard module="clients"><ClientsPage /></PermissionGuard>} />
        <Route path="/prescriptions" element={<PermissionGuard module="prescriptions"><PrescriptionsPage /></PermissionGuard>} />
        <Route path="/sales" element={<PermissionGuard module="sales"><SalesPage /></PermissionGuard>} />
        <Route path="/stock" element={<PermissionGuard module="stock"><StockPage /></PermissionGuard>} />
        <Route path="/payments" element={<PermissionGuard module="payments"><PaymentsPage /></PermissionGuard>} />
        <Route path="/orders" element={<PermissionGuard module="orders"><OrdersPage /></PermissionGuard>} />
        <Route path="/invoices" element={<PermissionGuard module="invoices"><InvoicesPage /></PermissionGuard>} />
        <Route path="/reports" element={<PermissionGuard module="reports"><ReportsPage /></PermissionGuard>} />
        <Route path="/statistics" element={<PermissionGuard module="statistics"><StatisticsPage /></PermissionGuard>} />
        <Route path="/notifications" element={<PermissionGuard module="notifications"><NotificationsPage /></PermissionGuard>} />
        <Route path="/settings" element={<PermissionGuard module="settings"><SettingsPage /></PermissionGuard>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <PermissionsProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </PermissionsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;