import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n/translations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Store, Users, Plus, Shield, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserRole } from '@/contexts/AuthContext';

const API_URL = 'http://localhost:4000';

interface ShopProfile {
  name: string;
  address: string;
  phone: string;
  authorization: string;
  optician: string;
  exerciseNumber: string;
}

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
};

const SettingsPage = () => {
  const { user, lang } = useAuth();
  const tr = t(lang);
  const isFr = lang === 'fr';

  const [shop, setShop] = useState<ShopProfile>({
    name: '', address: '', phone: '', authorization: '', optician: '', exerciseNumber: '',
  });
  const [shopLoading, setShopLoading] = useState(true);
  const [shopSaving, setShopSaving] = useState(false);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'vendeur' as UserRole });
  const [userSaving, setUserSaving] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'directeur';

  // ---- charger le cabinet ----
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/api/shop/me');
        setShop({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          authorization: data.authorization || '',
          optician: data.optician || '',
          exerciseNumber: data.exerciseNumber || '',
        });
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setShopLoading(false);
      }
    })();
  }, []);

  // ---- charger les utilisateurs ----
  useEffect(() => {
    if (!canManage) { setUsersLoading(false); return; }
    (async () => {
      try {
        const data = await apiFetch('/api/users');
        setUsers(data);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setUsersLoading(false);
      }
    })();
  }, [canManage]);

  const handleSaveShop = async () => {
    setShopSaving(true);
    try {
      await apiFetch('/api/shop/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: shop.name,
          address: shop.address,
          phone: shop.phone,
          authorization: shop.authorization,
          exerciseNumber: shop.exerciseNumber,
        }),
      });
      toast.success(tr.savedSuccess);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setShopSaving(false);
    }
  };

  const handleAddUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.password) {
      toast.error(isFr ? 'Nom, email et mot de passe obligatoires' : 'Name, email and password required');
      return;
    }
    setUserSaving(true);
    try {
      const newUser = await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(userForm),
      });
      setUsers(prev => [...prev, newUser]);
      setUserForm({ name: '', email: '', password: '', role: 'vendeur' });
      setIsUserDialogOpen(false);
      toast.success(tr.addedSuccess);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUserSaving(false);
    }
  };

  const toggleUser = async (id: string) => {
    const prev = users;
    setUsers(u => u.map(x => x.id === id ? { ...x, active: !x.active } : x));
    try {
      await apiFetch(`/api/users/${id}/toggle`, { method: 'PATCH' });
    } catch (err: any) {
      setUsers(prev);
      toast.error(err.message);
    }
  };

  const deleteUser = async (id: string) => {
    if (id === user?.id) return;
    const prev = users;
    setUsers(u => u.filter(x => x.id !== id));
    try {
      await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      toast.success(isFr ? 'Utilisateur supprimé' : 'User deleted');
    } catch (err: any) {
      setUsers(prev);
      toast.error(err.message);
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-primary/10 text-primary';
      case 'directeur': return 'bg-info/10 text-info';
      case 'vendeur': return 'bg-success/10 text-success';
      case 'caissier': return 'bg-warning/10 text-warning';
      default: return '';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'directeur': return isFr ? 'Directeur' : 'Director';
      case 'vendeur': return tr.vendeur;
      case 'caissier': return tr.caissier;
      default: return role;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">{tr.settings}</h1>

      <Tabs defaultValue="shop">
        <TabsList>
          <TabsTrigger value="shop" className="flex items-center gap-1.5"><Store className="h-4 w-4" />{tr.shopProfile}</TabsTrigger>
          {canManage && <TabsTrigger value="users" className="flex items-center gap-1.5"><Users className="h-4 w-4" />{tr.userManagement}</TabsTrigger>}
        </TabsList>

        <TabsContent value="shop">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              {shopLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{tr.shopName}</Label>
                    <Input value={shop.name} onChange={e => setShop(s => ({ ...s, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{tr.shopPhone}</Label>
                    <Input value={shop.phone} onChange={e => setShop(s => ({ ...s, phone: e.target.value }))} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>{tr.shopAddress}</Label>
                    <Input value={shop.address} onChange={e => setShop(s => ({ ...s, address: e.target.value }))} />
                  </div>

                  <div className="col-span-2 border-t pt-4 mt-2">
                    <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />{isFr ? 'Informations réglementaires' : 'Regulatory Information'}</p>
                  </div>
                  <div className="space-y-2"><Label>{tr.authorizationNumber}</Label><Input value={shop.authorization} onChange={e => setShop(s => ({ ...s, authorization: e.target.value }))} /></div>

                  <div className="col-span-2 border-t pt-4 mt-2">
                    <p className="text-sm font-semibold mb-3">{isFr ? 'Professionnel' : 'Professional'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>{tr.opticianName}</Label>
                    <Input value={shop.optician} disabled />
                  </div>
                  <div className="space-y-2"><Label>{tr.exerciseNumber}</Label><Input value={shop.exerciseNumber} onChange={e => setShop(s => ({ ...s, exerciseNumber: e.target.value }))} /></div>

                  <div className="col-span-2 flex justify-end mt-4">
                    <Button className="bg-primary text-primary-foreground" onClick={handleSaveShop} disabled={shopSaving}>
                      {shopSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {tr.save}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canManage && (
          <TabsContent value="users">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">{tr.userManagement}</CardTitle>
                <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" />{tr.addUser}</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{tr.addUser}</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2"><Label>{tr.lastName}</Label><Input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} /></div>
                      <div className="space-y-2"><Label>{tr.email}</Label><Input value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} /></div>
                      <div className="space-y-2"><Label>{tr.password}</Label><Input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} /></div>
                      <div className="space-y-2">
                        <Label>{tr.role}</Label>
                        <select className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm" value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value as UserRole }))}>
                          {user?.role === 'admin' && <option value="admin">Admin</option>}
                          <option value="directeur">{isFr ? 'Directeur' : 'Director'}</option>
                          <option value="vendeur">{tr.vendeur}</option>
                          <option value="caissier">{tr.caissier}</option>
                        </select>
                      </div>
                      <div className="col-span-2 flex justify-end gap-2 mt-2">
                        <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>{tr.cancel}</Button>
                        <Button className="bg-primary text-primary-foreground" onClick={handleAddUser} disabled={userSaving}>
                          {userSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {tr.save}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="space-y-3">
                    {users.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">{u.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeClass(u.role)}`}>
                            {getRoleLabel(u.role)}
                          </span>
                          <button onClick={() => toggleUser(u.id)} className={`text-xs px-2 py-0.5 rounded-full ${u.active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                            {u.active ? tr.active : tr.inactive}
                          </button>
                          {u.id !== user?.id && (
                            <button onClick={() => deleteUser(u.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SettingsPage;