import {
  LayoutDashboard, Users, Eye, ShoppingCart, Package,
  CreditCard, Truck, FileText, BarChart3, Settings,
  Bell, LogOut, Glasses, ClipboardList, Building2, Server, Shield,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { t } from '@/i18n/translations';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const AppSidebar = () => {
  const { user, logout, lang } = useAuth();
  const { can, loading: permissionsLoading } = usePermissions();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const tr = t(lang);
  const isFr = lang === 'fr';

  const isSuperAdmin = user?.role === 'superadmin';

  const superAdminNav = [
    { title: tr.platformManagement, url: '/', icon: Shield },
  ];

  // "module" correspond exactement aux clés utilisées côté serveur (role_permission.module)
  const mainNav = [
    { title: tr.dashboard, url: '/', icon: LayoutDashboard, module: 'dashboard' },
    { title: tr.clients, url: '/clients', icon: Users, module: 'clients' },
    { title: tr.prescriptions, url: '/prescriptions', icon: Eye, module: 'prescriptions' },
    { title: tr.sales, url: '/sales', icon: ShoppingCart, module: 'sales' },
    { title: tr.stock, url: '/stock', icon: Package, module: 'stock' },
    { title: tr.payments, url: '/payments', icon: CreditCard, module: 'payments' },
    { title: tr.orders, url: '/orders', icon: Truck, module: 'orders' },
    { title: tr.invoices, url: '/invoices', icon: FileText, module: 'invoices' },
    { title: isFr ? 'Rapports' : 'Reports', url: '/reports', icon: ClipboardList, module: 'reports' },
    { title: tr.statistics, url: '/statistics', icon: BarChart3, module: 'statistics' },
    { title: tr.notifications, url: '/notifications', icon: Bell, module: 'notifications' },
    { title: tr.settings, url: '/settings', icon: Settings, module: 'settings' },
  ];

  // Tant que les permissions ne sont pas chargées, on n'affiche rien pour éviter un flash
  // d'éléments qui disparaissent juste après.
  const navItems = isSuperAdmin
    ? superAdminNav
    : permissionsLoading
      ? []
      : mainNav.filter(item => can(item.module));

  const roleLabel = user?.role === 'superadmin' ? 'Super Admin'
    : user?.role === 'directeur' ? (isFr ? 'Directeur' : 'Director')
    : user?.role;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="p-4 flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary shrink-0">
          {isSuperAdmin ? <Shield className="h-5 w-5 text-primary-foreground" /> : <Glasses className="h-5 w-5 text-primary-foreground" />}
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-sidebar-foreground truncate">PASS OPTIQUE</p>
            <p className="text-xs text-sidebar-foreground/50">{isSuperAdmin ? 'Platform Admin' : 'by MTN'}</p>
          </div>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent text-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4 mr-3 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-3">
          {!collapsed && user && (
            <div className="mb-3 px-2">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/50 capitalize">{roleLabel}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-sidebar-foreground/50 hover:text-destructive transition-colors w-full px-2 py-1.5"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && tr.logout}
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;