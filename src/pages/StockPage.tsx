import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n/translations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, AlertTriangle, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchJson, postJson } from '@/lib/api';

// Même URL que ClientsPage.tsx / PrescriptionsPage.tsx / DashboardPage.tsx


interface Product {
  id: number;
  name: string;
  brand: string;
  ref: string;
  price: number;
  qty: number;
  type: 'frame' | 'lens';
  cabinet_id: number;
}

const StockPage = () => {
  const { lang } = useAuth();
  const tr = t(lang);

  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: '', brand: '', ref: '', price: '', qty: '', type: 'frame' as 'frame' | 'lens' });

  const resetForm = () => setForm({ name: '', brand: '', ref: '', price: '', qty: '', type: 'frame' });

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<Product[]>('/api/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
      setError(lang === 'fr' ? 'Impossible de charger le stock.' : 'Failed to load stock.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, [lang]);

  const handleSave = async () => {
    if (!form.name || !form.brand) {
      toast.error(lang === 'fr' ? 'Nom et marque obligatoires' : 'Name and brand required');
      return;
    }

    setSaving(true);
    try {
      const newProduct = await postJson<Product>('/api/products', {
        name: form.name,
        brand: form.brand,
        ref: form.ref,
        price: parseInt(form.price) || 0,
        qty: parseInt(form.qty) || 0,
        type: form.type,
      });
      setProducts(prev => [newProduct, ...prev]);
      resetForm();
      setIsOpen(false);
      toast.success(tr.addedSuccess);
    } catch (err) {
      console.error(err);
      toast.error(lang === 'fr' ? "Échec de l'enregistrement" : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const renderList = (type: 'frame' | 'lens') => {
    const items = products.filter(p => p.type === type && p.name.toLowerCase().includes(search.toLowerCase()));

    if (items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-8">
          {lang === 'fr' ? 'Aucun produit' : 'No products'}
        </p>
      );
    }

    return (
      <div className="space-y-3 mt-4">
        {items.map(p => (
          <Card key={p.id} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.brand} — {p.ref}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold">{Number(p.price).toLocaleString()} {tr.currency}</span>
                <span className={`text-sm font-bold flex items-center gap-1 ${p.qty <= 3 ? 'text-destructive' : 'text-foreground'}`}>
                  {p.qty <= 3 && <AlertTriangle className="h-3 w-3" />}
                  {p.qty}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-destructive text-sm">{error}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">{tr.stock}</h1>
        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              {tr.addProduct}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{tr.addProduct}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>{tr.productName} *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Aviator Classic" />
              </div>
              <div className="space-y-2">
                <Label>{tr.brand} *</Label>
                <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Ray-Ban" />
              </div>
              <div className="space-y-2">
                <Label>{tr.reference}</Label>
                <Input value={form.ref} onChange={e => setForm(f => ({ ...f, ref: e.target.value }))} placeholder="RB3025" />
              </div>
              <div className="space-y-2">
                <Label>{tr.productType}</Label>
                <select className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'frame' | 'lens' }))}>
                  <option value="frame">{tr.frames}</option>
                  <option value="lens">{tr.lenses}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{tr.price} ({tr.currency})</Label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="85000" />
              </div>
              <div className="space-y-2">
                <Label>{tr.quantity}</Label>
                <Input type="number" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} placeholder="10" />
              </div>
              <div className="col-span-2 flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>{tr.cancel}</Button>
                <Button className="bg-primary text-primary-foreground" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : tr.save}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={tr.search} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Tabs defaultValue="frames">
        <TabsList>
          <TabsTrigger value="frames">{tr.frames}</TabsTrigger>
          <TabsTrigger value="lenses">{tr.lenses}</TabsTrigger>
        </TabsList>
        <TabsContent value="frames">{renderList('frame')}</TabsContent>
        <TabsContent value="lenses">{renderList('lens')}</TabsContent>
      </Tabs>
    </div>
  );
};

export default StockPage;