import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n/translations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchJson, postJson } from '@/lib/api';

// Même valeur que dans AuthContext.tsx / ClientsPage.tsx.
// ⚠️ Sans ce préfixe, les chemins relatifs partent vers le serveur frontend
// (Vite) au lieu du backend Express -> réponse HTML (index.html) au lieu de
// JSON -> "Unexpected token '<'" à l'appel de .json().


interface Prescription {
  id: number;
  client_id: number;
  firstName: string;
  lastName: string;
  prescriber: string | null;
  date: string | null;
  expiryDate: string | null;
  odSph: string | null; odCyl: string | null; odAxis: string | null; odAdd: string | null;
  ogSph: string | null; ogCyl: string | null; ogAxis: string | null; ogAdd: string | null;
  pd: string | null;
}

// ⚠️ Hypothèse sur la forme de GET /api/clients : [{ id, firstName, lastName, ... }]
// Ajustez si votre endpoint clients renvoie un format différent (pagination, wrapper {data: []}, etc.)
interface ClientOption {
  id: number;
  firstName: string;
  lastName: string;
}

const emptyEye = { sph: '', cyl: '', axis: '', add: '' };

const PrescriptionsPage = () => {
  const { lang } = useAuth();
  const tr = t(lang);

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    client_id: '', prescriber: '', date: '', expiryDate: '',
    od: { ...emptyEye }, og: { ...emptyEye }, pd: '',
  });

  const resetForm = () => setForm({
    client_id: '', prescriber: '', date: '', expiryDate: '',
    od: { ...emptyEye }, og: { ...emptyEye }, pd: '',
  });

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rx, cl] = await Promise.all([
        fetchJson<Prescription[]>('/api/prescriptions'),
        fetchJson<ClientOption[]>('/api/clients'),
      ]);
      setPrescriptions(rx);
      setClients(cl);
    } catch (err) {
      console.error(err);
      setError(lang === 'fr'
        ? 'Impossible de charger les prescriptions.'
        : 'Failed to load prescriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [lang]);

  const handleSave = async () => {
    if (!form.client_id || !form.date) {
      toast.error(lang === 'fr' ? 'Client et date obligatoires' : 'Client and date required');
      return;
    }

    setSaving(true);
    try {
      await postJson('/api/prescriptions', {
        client_id: Number(form.client_id),
        prescriber: form.prescriber,
        date: form.date,
        expiryDate: form.expiryDate || null,
        odSph: form.od.sph, odCyl: form.od.cyl, odAxis: form.od.axis, odAdd: form.od.add,
        ogSph: form.og.sph, ogCyl: form.og.cyl, ogAxis: form.og.axis, ogAdd: form.og.add,
        pd: form.pd,
      });
      await loadAll();
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

  const EyeFields = ({ eye, label, onChange }: { eye: typeof emptyEye; label: string; onChange: (field: string, val: string) => void }) => (
    <div className="p-3 rounded-lg bg-muted space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="grid grid-cols-4 gap-2">
        {[
          { key: 'sph', label: tr.sphere, ph: '-2.50' },
          { key: 'cyl', label: tr.cylinder, ph: '-0.75' },
          { key: 'axis', label: tr.axis, ph: '90' },
          { key: 'add', label: tr.addition, ph: '+2.00' },
        ].map(f => (
          <div key={f.key}>
            <Label className="text-xs">{f.label}</Label>
            <Input className="h-8 text-sm" value={(eye as any)[f.key]} onChange={e => onChange(f.key, e.target.value)} placeholder={f.ph} />
          </div>
        ))}
      </div>
    </div>
  );

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
        <h1 className="text-2xl font-bold">{tr.prescriptions}</h1>
        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              {tr.addPrescription}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{tr.addPrescription}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tr.clients} *</Label>
                  <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
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
                </div>
                <div className="space-y-2">
                  <Label>{tr.prescriber}</Label>
                  <Input value={form.prescriber} onChange={e => setForm(f => ({ ...f, prescriber: e.target.value }))} placeholder="Dr. Koffi" />
                </div>
                <div className="space-y-2">
                  <Label>{tr.prescriptionDate} *</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{tr.expiryDate}</Label>
                  <Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
                </div>
              </div>

              <EyeFields eye={form.od} label={tr.rightEye} onChange={(field, val) => setForm(f => ({ ...f, od: { ...f.od, [field]: val } }))} />
              <EyeFields eye={form.og} label={tr.leftEye} onChange={(field, val) => setForm(f => ({ ...f, og: { ...f.og, [field]: val } }))} />

              <div className="space-y-2 max-w-[200px]">
                <Label>{tr.pupilDistance} (mm)</Label>
                <Input value={form.pd} onChange={e => setForm(f => ({ ...f, pd: e.target.value }))} placeholder="63" />
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

      <div className="space-y-4">
        {prescriptions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {lang === 'fr' ? 'Aucune prescription enregistrée' : 'No prescriptions yet'}
          </p>
        )}
        {prescriptions.map(rx => (
          <Card key={rx.id} className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                #RX-{String(rx.id).padStart(3, '0')} — {rx.firstName} {rx.lastName}
                {rx.prescriber && <span className="text-xs text-muted-foreground font-normal">({rx.prescriber})</span>}
                <span className="text-xs text-muted-foreground font-normal ml-auto">{rx.date}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{tr.rightEye}</p>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div><span className="text-xs text-muted-foreground">{tr.sphere}</span><p className="font-medium">{rx.odSph ?? '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">{tr.cylinder}</span><p className="font-medium">{rx.odCyl ?? '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">{tr.axis}</span><p className="font-medium">{rx.odAxis ? `${rx.odAxis}°` : '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">{tr.addition}</span><p className="font-medium">{rx.odAdd || '—'}</p></div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{tr.leftEye}</p>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div><span className="text-xs text-muted-foreground">{tr.sphere}</span><p className="font-medium">{rx.ogSph ?? '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">{tr.cylinder}</span><p className="font-medium">{rx.ogCyl ?? '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">{tr.axis}</span><p className="font-medium">{rx.ogAxis ? `${rx.ogAxis}°` : '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">{tr.addition}</span><p className="font-medium">{rx.ogAdd || '—'}</p></div>
                  </div>
                </div>
              </div>
              <p className="text-sm mt-3"><span className="text-muted-foreground">{tr.pupilDistance} :</span> <span className="font-medium">{rx.pd ?? '—'} mm</span></p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PrescriptionsPage;
