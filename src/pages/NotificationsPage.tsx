import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { t } from '@/i18n/translations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Glasses, Truck, Phone, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchJson ,postJson } from '@/lib/api';



type NotificationType = 'glasses_ready' | 'order_arrived' | 'contact_client' | 'stock_alert' | string;

interface ApiNotification {
  id: number;
  type: NotificationType;
  message: string;
  time: string; // datetime ISO renvoyé par le serveur
  read: boolean;
}

type Group = 'today' | 'yesterday' | 'earlier';

interface Notification extends ApiNotification {
  relativeTime: string;
  group: Group;
}

const getRelativeTime = (isoDate: string, lang: 'fr' | 'en'): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return lang === 'fr' ? "à l'instant" : 'just now';
  if (minutes < 60) return `${minutes} min`;
  if (hours < 24) return `${hours}h`;
  return lang === 'fr' ? `${days}j` : `${days}d`;
};

const getGroup = (isoDate: string): Group => {
  const date = new Date(isoDate);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (dayDiff <= 0) return 'today';
  if (dayDiff === 1) return 'yesterday';
  return 'earlier';
};

// Icône générique pour les types de notification qu'on ne reconnaît pas
const DEFAULT_ICON = { icon: AlertTriangle, color: 'bg-muted text-muted-foreground' };

const iconMap: Record<string, { icon: typeof Glasses; color: string }> = {
  glasses_ready: { icon: Glasses, color: 'bg-primary/10 text-primary' },
  order_arrived: { icon: Truck, color: 'bg-info/10 text-info' },
  contact_client: { icon: Phone, color: 'bg-warning/10 text-warning' },
  stock_alert: { icon: AlertTriangle, color: 'bg-destructive/10 text-destructive' },
};

const NotificationsPage = () => {
  const { lang } = useAuth();
  const tr = t(lang);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const enrich = (list: ApiNotification[]): Notification[] =>
    list.map(n => ({
      ...n,
      relativeTime: getRelativeTime(n.time, lang),
      group: getGroup(n.time),
    }));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchJson<ApiNotification[]>('/api/notifications');
        setNotifications(enrich(data));
      } catch (err) {
        console.error(err);
        setError(lang === 'fr' ? 'Impossible de charger les notifications.' : 'Failed to load notifications.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [lang]);

  const markAsRead = async (id: number) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    try {
      await fetchJson(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch (err) {
      console.error(err);
      toast.error(lang === 'fr' ? 'Erreur lors de la mise à jour' : 'Failed to update');
    }
  };

  const markAllRead = async () => {
    const previous = notifications;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetchJson('/api/notifications/read-all', { method: 'PATCH' });
    } catch (err) {
      console.error(err);
      setNotifications(previous);
      toast.error(lang === 'fr' ? 'Erreur lors de la mise à jour' : 'Failed to update');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const groups = ['today', 'yesterday', 'earlier'] as const;
  const groupLabels = { today: tr.today, yesterday: tr.yesterday, earlier: tr.earlier };

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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{tr.notifications}</h1>
          {unreadCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check className="h-4 w-4 mr-1" />{tr.markAllRead}
          </Button>
        )}
      </div>

      {notifications.length === 0 && (
        <p className="text-muted-foreground text-center py-8">{tr.noData}</p>
      )}

      {groups.map(group => {
        const items = notifications.filter(n => n.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <p className="text-sm font-semibold text-muted-foreground mb-2">{groupLabels[group]}</p>
            <div className="space-y-2">
              {items.map(n => {
                const cfg = iconMap[n.type] ?? DEFAULT_ICON;
                return (
                  <Card key={n.id} className={`border-0 shadow-sm cursor-pointer transition-all ${!n.read ? 'ring-1 ring-primary/30 bg-primary/[0.02]' : ''}`} onClick={() => markAsRead(n.id)}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                          <cfg.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className={`text-sm ${!n.read ? 'font-semibold' : ''}`}>{n.message}</p>
                          <p className="text-xs text-muted-foreground">{n.relativeTime}</p>
                        </div>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationsPage;