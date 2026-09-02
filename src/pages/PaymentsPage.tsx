import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n/translations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Smartphone, Banknote, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { fetchJson, postJson } from '@/lib/api';


interface Payment {
  id: number;
  paid: number;
  method: string | null;
  date: string;
  sale_id: number;
  reference: string | null;
  total: number;
  firstName: string;
  lastName: string;
}

interface PaymentsData {
  summary: { totalAmount: number; amountPaid: number; remaining: number };
  payments: Payment[];
}

interface UnpaidSale {
  id: number;
  reference: string;
  firstName: string;
  lastName: string;
  total: number;
  alreadyPaid: number;
  remaining: number;
}

const PaymentsPage = () => {
  const { lang } = useAuth();
  const tr = t(lang);

  const [data, setData] = useState<PaymentsData | null>(null);
  const [unpaidSales, setUnpaidSales] = useState<UnpaidSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [saleId, setSaleId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'momo'>('cash');

  const selectedSale = unpaidSales.find(s => String(s.id) === saleId) ?? null;

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [paymentsData, unpaid] = await Promise.all([
        fetchJson<PaymentsData>('/api/payments'),
        fetchJson<UnpaidSale[]>('/api/payments/unpaid-sales'),
      ]);
      setData(paymentsData);
      setUnpaidSales(unpaid);
    } catch (err) {
      console.error(err);
      setError(lang === 'fr' ? 'Impossible de charger les paiements.' : 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [lang]);

  const resetForm = () => {
    setSaleId('');
    setAmount('');
    setMethod('cash');
  };

  // Pré-remplit le montant avec le solde restant dès qu'une vente est choisie
  const handleSelectSale = (id: string) => {
    setSaleId(id);
    const sale = unpaidSales.find(s => String(s.id) === id);
    setAmount(sale ? String(sale.remaining) : '');
  };

  const handleSave = async () => {
    if (!saleId || !amount || Number(amount) <= 0) {
      toast.error(lang === 'fr' ? 'Vente et montant obligatoires' : 'Sale and amount required');
      return;
    }

    setSaving(true);
    try {
      await postJson('/api/payments', {
        sale_id: Number(saleId),
        paid: Number(amount),
        method,
      });
      await loadAll();
      resetForm();
      setIsOpen(false);
      toast.success(lang === 'fr' ? 'Paiement enregistré' : 'Payment recorded');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : (lang === 'fr' ? "Échec de l'enregistrement" : 'Failed to save'));
    } finally {
      setSaving(false);
    }
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

  const summary = data?.summary ?? { totalAmount: 0, amountPaid: 0, remaining: 0 };
  const payments = data?.payments ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">{tr.payments}</h1>

        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              {lang === 'fr' ? 'Nouveau paiement' : 'New payment'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{lang === 'fr' ? 'Nouveau paiement' : 'New payment'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{lang === 'fr' ? 'Vente' : 'Sale'} *</Label>
                <Select value={saleId} onValueChange={handleSelectSale}>
                  <SelectTrigger>
                    <SelectValue placeholder={lang === 'fr' ? 'Choisir une vente non soldée' : 'Select an unpaid sale'} />
                  </SelectTrigger>
                  <SelectContent>
                    {unpaidSales.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {lang === 'fr' ? 'Aucune vente en attente de paiement' : 'No sale awaiting payment'}
                      </div>
                    )}
                    {unpaidSales.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        #{s.reference} — {s.firstName} {s.lastName} ({lang === 'fr' ? 'reste' : 'remaining'}: {s.remaining.toLocaleString()} {tr.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSale && (
                <p className="text-xs text-muted-foreground">
                  {lang === 'fr' ? 'Total' : 'Total'}: {selectedSale.total.toLocaleString()} {tr.currency} — {lang === 'fr' ? 'déjà payé' : 'already paid'}: {selectedSale.alreadyPaid.toLocaleString()} {tr.currency}
                </p>
              )}

              <div className="space-y-2">
                <Label>{lang === 'fr' ? 'Montant à payer' : 'Amount to pay'} ({tr.currency}) *</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="50000" />
              </div>

              <div className="space-y-2">
                <Label>{tr.paymentMethod}</Label>
                <div className="flex gap-3">
                  <button onClick={() => setMethod('cash')} className={`flex-1 p-3 rounded-lg border text-sm font-medium ${method === 'cash' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    💵 {tr.cash}
                  </button>
                  <button onClick={() => setMethod('momo')} className={`flex-1 p-3 rounded-lg border text-sm font-medium ${method === 'momo' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    📱 {tr.mobileMoney}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>{tr.cancel}</Button>
                <Button className="bg-primary text-primary-foreground" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : tr.save}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-success/10"><Banknote className="h-5 w-5 text-success" /></div>
            <div>
              <p className="text-sm text-muted-foreground">{tr.totalAmount}</p>
              <p className="text-xl font-bold">{summary.totalAmount.toLocaleString()} {tr.currency}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/10"><CreditCard className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">{tr.amountPaid}</p>
              <p className="text-xl font-bold">{summary.amountPaid.toLocaleString()} {tr.currency}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-destructive/10"><Smartphone className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-sm text-muted-foreground">{tr.remaining}</p>
              <p className="text-xl font-bold">{summary.remaining.toLocaleString()} {tr.currency}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment List */}
      <div className="space-y-3">
        {payments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {lang === 'fr' ? 'Aucun paiement enregistré' : 'No payments yet'}
          </p>
        )}
        {payments.map(p => (
          <Card key={p.id} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {p.method === 'momo' ? (
                  <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Banknote className="h-5 w-5 text-success" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{p.firstName} {p.lastName}</p>
                  <p className="text-sm text-muted-foreground">
                    #{p.reference ?? p.sale_id} — {new Date(p.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{Number(p.paid).toLocaleString()} / {Number(p.total).toLocaleString()} {tr.currency}</p>
                <p className={`text-xs font-medium ${Number(p.paid) >= Number(p.total) ? 'text-success' : 'text-warning'}`}>
                  {Number(p.paid) >= Number(p.total)
                    ? (lang === 'fr' ? 'Soldé' : 'Paid')
                    : `${tr.remaining}: ${(Number(p.total) - Number(p.paid)).toLocaleString()} ${tr.currency}`}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PaymentsPage;