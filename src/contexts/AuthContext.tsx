import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';

export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'directeur'
  | 'vendeur'
  | 'caissier';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  shopName: string;
  cabinet_id: number | null;
  lang: 'fr' | 'en';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  lang: 'fr' | 'en';
  setLang: (l: 'fr' | 'en') => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
console.log('DEBUG API_URL =', API_URL, '| VITE_API_URL brute =', import.meta.env.VITE_API_URL);

export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');

    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  const login = async (
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();
      console.log("RÉPONSE LOGIN :", data);
      console.log("CABINET ID REÇU :", data.user?.cabinet_id);

      if (!res.ok) {
        console.error('Erreur login :', data.error);
        return false;
      }

      const loggedUser: User = {
        id: String(data.user.id),
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        shopName: data.user.shopName || '',
        cabinet_id:
          data.user.cabinet_id !== null &&
          data.user.cabinet_id !== undefined
            ? Number(data.user.cabinet_id)
            : null,
        lang,
      };

      // JWT
      localStorage.setItem('token', data.token);

      // Utilisateur connecté
      localStorage.setItem(
        'user',
        JSON.stringify(loggedUser)
      );

      setUser(loggedUser);

      return true;
    } catch (err) {
      console.error(
        'Erreur de connexion :',
        err
      );

      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        lang,
        setLang,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};