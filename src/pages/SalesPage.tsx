import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n/translations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ShoppingCart, User, Eye, Package, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchJson, postJson } from '@/lib/api';

interface Sale {
  id: number;
  reference: string;
  date: string;
  total: number;
  status: 'quote' | 'unpaid' | 'partial' | 'paid' | string;
  orderStatus: string | null;
  firstName: string;
  lastName: string;
  items: string | null;
}

interface ClientOption {
  id: number;
  firstName: string;
  lastName: string;
}

interface ProductOption {
  id: number;
  name: string;
  price: number;
  type: 'frame' | 'lens';
}

const SalesPage = () => {
  const { lang } = useAuth();
  const tr = t(lang);

  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);

  const [clientId, setClientId] = useState('');
  const [selectedFrameId, setSelectedFrameId] = useState<number | null>(null);
  const [selectedLensId, setSelectedLensId] = useState<number | null>(null);

  const frames = products.filter(p => p.type === 'frame');
  const lenses = products.filter(p => p.type === 'lens');

  const selectedFrame = frames.find(f => f.id === selectedFrameId) ?? null;
  const selectedLens = lenses.find(l => l.id === selectedLensId) ?? null;

  const totalPrice = (selectedFrame?.price ?? 0) + (selectedLens?.price ?? 0);

  const resetWizard = () => {
    setStep(1);
    setClientId('');
    setSelectedFrameId(null);
    setSelectedLensId(null);
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesData, clientsData, productsData] = await Promise.all([
        fetchJson<Sale[]>('/api/sales'),
        fetchJson<ClientOption[]>('/api/clients'),
        fetchJson<ProductOption[]>('/api/products'),
      ]);
      setSales(salesData);
      setClients(clientsData);
      setProducts(productsData);
    } catch (err) {
      console.error(err);
      setError(lang === 'fr' ? 'Impossible de charger les ventes.' : 'Failed to load sales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [lang]);

  const handleValidate = async () => {
    if (!clientId) {
      toast.error(lang === 'fr' ? 'Client obligatoire' : 'Client required');
      return;
    }
    if (!selectedFrameId && !selectedLensId) {
      toast.error(lang === 'fr' ? 'Sélectionnez au moins un article' : 'Select at least one item');
      return;
    }

    setSaving(true);
    try {
      const newSale = await postJson<Sale>('/api/sales', {
        client_id: Number(clientId),
        frame_id: selectedFrameId,
        lens_id: selectedLensId,
      });
      setSales(prev => [newSale, ...prev]);
      resetWizard();
      setIsOpen(false);
      toast.success(
        lang === 'fr'
          ? 'Devis créé — à confirmer dans Commandes'
          : 'Quote created — confirm it in Orders'
      );
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : (lang === 'fr' ? 'Échec de la création' : 'Creation failed'));
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (s: string) => {
    const labels = lang === 'fr'
      ? { quote: 'Devis', unpaid: 'Non payé', partial: 'Partiel', paid: 'Payé' }
      : { quote: 'Quote', unpaid: 'Unpaid', partial: 'Partial', paid: 'Paid' };
    return (labels as Record<string, string>)[s] ?? s;
  };
  const statusColor = (s: string) =>
    ({
      quote: 'bg-muted text-muted-foreground',
      unpaid: 'bg-destructive/10 text-destructive',
      partial: 'bg-warning/10 text-warning',
      paid: 'bg-success/10 text-success',
    } as Record<string, string>)[s] ?? 'bg-muted text-muted-foreground';

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
        <h1 className="text-2xl font-bold">{tr.sales}</h1>
        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetWizard(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              {tr.newSale}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{tr.newSale} — {tr.step} {step} {tr.of} 3</DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-2 my-4">
              {[
                { icon: User, label: tr.selectClient },
                { icon: Package, label: tr.chooseFrame },
                { icon: Eye, label: tr.chooseLenses },
              ].map((s, i) => (
                <div key={i} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${step > i + 1 ? 'bg-success/10 text-success' : step === i + 1 ? 'bg-primary/10 text-primary font-semibold' : 'bg-muted text-muted-foreground'}`}>
                  {step > i + 1 ? <Check className="h-3 w-3" /> : <s.icon className="h-3 w-3" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <Label>{tr.selectClient} *</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder={lang === 'fr' ? 'Choisir un client' : 'Select a client'} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex justify-end">
                  <Button disabled={!clientId} onClick={() => setStep(2)} className="bg-primary text-primary-foreground">{tr.next}</Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <Label>{tr.chooseFrame}</Label>
                {frames.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {lang === 'fr' ? 'Aucune monture en stock' : 'No frames in stock'}
                  </p>
                )}
                {frames.map(f => (
                  <div key={f.id} onClick={() => setSelectedFrameId(f.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition ${selectedFrameId === f.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <div className="flex justify-between">
                      <span className="font-medium">{f.name}</span>
                      <span className="font-semibold">{Number(f.price).toLocaleString()} {tr.currency}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>{tr.previous}</Button>
                  <Button onClick={() => setStep(3)} className="bg-primary text-primary-foreground">{tr.next}</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Label>{tr.chooseLenses}</Label>
                {lenses.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {lang === 'fr' ? 'Aucun verre en stock' : 'No lenses in stock'}
                  </p>
                )}
                {lenses.map(l => (
                  <div key={l.id} onClick={() => setSelectedLensId(l.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition ${selectedLensId === l.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <div className="flex justify-between">
                      <span className="font-medium">{l.name}</span>
                      <span className="font-semibold">{Number(l.price).toLocaleString()} {tr.currency}</span>
                    </div>
                  </div>
                ))}

                <Card className="border-0 bg-muted">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Client:</span>{' '}
                      <span className="font-medium">
                        {clients.find(c => String(c.id) === clientId)?.firstName}{' '}
                        {clients.find(c => String(c.id) === clientId)?.lastName}
                      </span>
                    </p>
                    <p className="text-lg font-bold pt-1">{tr.totalPrice}: {totalPrice.toLocaleString()} {tr.currency}</p>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>{tr.previous}</Button>
                  <Button onClick={handleValidate} disabled={saving} className="bg-primary text-primary-foreground">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === 'fr' ? 'Créer le devis' : 'Create quote')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {sales.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {lang === 'fr' ? 'Aucune vente enregistrée' : 'No sales yet'}
          </p>
        )}
        {sales.map(sale => (
          <Card key={sale.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">#{sale.reference ?? sale.id} — {sale.firstName} {sale.lastName}</p>
                  <p className="text-sm text-muted-foreground">{sale.items ?? '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(sale.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold">{Number(sale.total).toLocaleString()} {tr.currency}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor(sale.status)}`}>
                  {statusLabel(sale.status)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SalesPage;
