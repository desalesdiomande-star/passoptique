import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n/translations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateInvoicePdf, ShopInfo } from '@/lib/generatePdf';
import { fetchJson, postJson } from '@/lib/api';


interface InvoiceItem {
  description: string;
  qty: number;
  unitPrice: number;
}

interface Invoice {
  id: string;
  type: 'invoice' | 'quote';
  client: string;
  date: string;
  dueDate: string | null;
  items: InvoiceItem[];
  status: 'paid' | 'unpaid' | 'partial' | 'draft' | string;
  paymentMethod: string | null;
}

const InvoicesPage = () => {
  const { lang } = useAuth();
  const tr = t(lang);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [invoicesData, shopData] = await Promise.all([
          fetchJson<Invoice[]>('/api/invoices'),
          fetchJson<ShopInfo>('/api/shop/me'),
        ]);
        setInvoices(invoicesData);
        setShopInfo(shopData);
      } catch (err) {
        console.error(err);
        setError(lang === 'fr' ? 'Impossible de charger les factures.' : 'Failed to load invoices.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [lang]);

  const handleDownloadPdf = (inv: Invoice) => {
    try {
      generateInvoicePdf(
        { ...inv, dueDate: inv.dueDate ?? '', paymentMethod: inv.paymentMethod ?? '' },
        lang,
        shopInfo ?? undefined
      );
      toast.success(lang === 'fr' ? 'PDF téléchargé' : 'PDF downloaded');
    } catch (err) {
      console.error(err);
      toast.error(lang === 'fr' ? 'Erreur lors de la génération du PDF' : 'Error generating PDF');
    }
  };

  const getTotal = (inv: Invoice) => inv.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      paid: { label: tr.paid, cls: 'bg-success/10 text-success' },
      unpaid: { label: tr.unpaid, cls: 'bg-destructive/10 text-destructive' },
      partial: { label: lang === 'fr' ? 'Partiel' : 'Partial', cls: 'bg-warning/10 text-warning' },
      draft: { label: tr.draft, cls: 'bg-muted text-muted-foreground' },
    };
    return map[s] ?? { label: s, cls: 'bg-muted text-muted-foreground' };
  };

  const renderList = (type: 'invoice' | 'quote') => {
    const items = invoices.filter(inv => inv.type === type);

    if (items.length === 0) {
      return <p className="text-muted-foreground text-center py-8">{tr.noData}</p>;
    }

    return (
      <div className="space-y-3 mt-4">
        {items.map(inv => {
          const badge = statusBadge(inv.status);
          return (
            <Card key={inv.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewInvoice(inv)}>
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">#{inv.id} — {inv.client}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(inv.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">{getTotal(inv).toLocaleString()} {tr.currency}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDownloadPdf(inv); }}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
      <div>
        <h1 className="text-2xl font-bold">{tr.invoices}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === 'fr'
            ? 'Le devis apparaît dès sa création dans Ventes ; la facture est générée automatiquement à la confirmation (Devis → Commandé).'
            : 'The quote appears as soon as it is created in Sales; the invoice is generated automatically on order confirmation (Quote → Ordered).'}
        </p>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">{lang === 'fr' ? 'Factures' : 'Invoices'}</TabsTrigger>
          <TabsTrigger value="quotes">{lang === 'fr' ? 'Devis' : 'Quotes'}</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices">{renderList('invoice')}</TabsContent>
        <TabsContent value="quotes">{renderList('quote')}</TabsContent>
      </Tabs>

      {/* Invoice Preview Modal */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>#{viewInvoice.id}</span>
                  <Button size="sm" variant="outline" onClick={() => handleDownloadPdf(viewInvoice)}>
                    <Download className="h-4 w-4 mr-1" />{tr.downloadPdf}
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4 text-sm">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-bold text-base">{shopInfo?.name || '—'}</p>
                  <p className="text-muted-foreground">{shopInfo?.address || '—'}</p>
                  <p className="text-muted-foreground">{shopInfo?.phone || '—'}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <p>N° Autorisation: <span className="font-medium">{shopInfo?.authorization || '—'}</span></p>
                    <p>N° Exercice: <span className="font-medium">{shopInfo?.exerciseNumber || '—'}</span></p>
                  </div>
                  <p className="mt-2 text-xs">Opticien: <span className="font-medium">{shopInfo?.optician || '—'}</span></p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Client</p>
                    <p className="font-medium">{viewInvoice.client}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">{tr.invoiceDate}: {new Date(viewInvoice.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}</p>
                    {viewInvoice.dueDate && <p className="text-muted-foreground">{tr.dueDate}: {viewInvoice.dueDate}</p>}
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">{tr.description}</th>
                      <th className="text-right py-2">{tr.quantity}</th>
                      <th className="text-right py-2">{tr.unitPrice}</th>
                      <th className="text-right py-2">{tr.amount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewInvoice.items.map((it, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2">{it.description}</td>
                        <td className="text-right py-2">{it.qty}</td>
                        <td className="text-right py-2">{it.unitPrice.toLocaleString()}</td>
                        <td className="text-right py-2 font-medium">{(it.qty * it.unitPrice).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="text-right space-y-1">
                  <p className="text-lg font-bold">{tr.total}: {getTotal(viewInvoice).toLocaleString()} {tr.currency}</p>
                  {viewInvoice.paymentMethod && <p className="text-xs text-muted-foreground">{tr.paymentMethod}: {viewInvoice.paymentMethod}</p>}
                </div>

                <div className="border-t pt-4 mt-4 grid grid-cols-2 gap-8">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-8">{lang === 'fr' ? 'Signature client' : 'Client Signature'}</p>
                    <div className="border-b border-dashed" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-8">{lang === 'fr' ? "Signature opticien" : "Optician Signature"}</p>
                    <div className="border-b border-dashed" />
                  </div>
                </div>

                <p className="text-xs text-center text-muted-foreground mt-4">© Pass Santé Mousso — PASS OPTIQUE by MTN</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesPage;