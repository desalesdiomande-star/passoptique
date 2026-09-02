import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Globe } from 'lucide-react';

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, lang, setLang } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground">{user?.shopName}</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <Globe className="h-4 w-4" />
                {lang === 'fr' ? 'EN' : 'FR'}
              </button>
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                {user?.name?.charAt(0)}
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
