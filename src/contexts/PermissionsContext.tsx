import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from "@/contexts/AuthContext";

interface PermissionRow {
  module: string;
  admin: boolean;
  directeur: boolean;
  vendeur: boolean;
  caissier: boolean;
}

interface PermissionsContextType {
  can: (module: string) => boolean;
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({ can: () => true, loading: true });

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const PermissionsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!user || user.role === 'superadmin') {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API_URL}/api/permissions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setPermissions(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const can = (module: string) => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    const row = permissions.find(p => p.module === module);
    if (!row) return true; // module non répertorié -> passe. Mets `false` si tu préfères un accès refusé par défaut.
    return !!row[user.role as keyof Omit<PermissionRow, 'module'>];
  };

  return (
    <PermissionsContext.Provider value={{ can, loading }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);