'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { api } from '@/lib/api';
import { formatDatetime } from '@/lib/utils';
import type { ApiResponse, NotificationPreferences, NotificationLog } from '@/types/api';

const PREF_LABELS: Record<keyof Omit<NotificationPreferences, 'id' | 'userId' | 'businessId'>, string> = {
  emailOnSubmit: 'Email when invoice submitted to LHDN',
  emailOnValidated: 'Email when invoice validated',
  emailOnRejected: 'Email when invoice rejected (with reason)',
  emailOnCancelled: 'Email when invoice cancelled',
  emailOnTeamInvite: 'Email when team member invited',
};

const LOG_STATUS_COLORS: Record<string, string> = {
  QUEUED: 'bg-zinc-100 text-zinc-600',
  SENT: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
};

export default function NotificationsSettingsPage() {
  const qc = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: async () => {
      const res = await api.get('api/notifications/preferences');
      const json: ApiResponse<NotificationPreferences> = await res.json();
      return json.data!;
    },
  });

  const { data: logs } = useQuery({
    queryKey: ['notification-logs'],
    queryFn: async () => {
      const res = await api.get('api/notifications/logs?limit=50&offset=0');
      const json: ApiResponse<NotificationLog[]> = await res.json();
      return json.data ?? [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      await api.patch('api/notifications/preferences', { json: patch });
    },
    onSuccess: () => {
      toast.success('Preferences saved');
      qc.invalidateQueries({ queryKey: ['notification-prefs'] });
    },
    onError: () => toast.error('Failed to save preferences'),
  });

  const toggle = (key: keyof typeof PREF_LABELS, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title="Notification Preferences" />

      <Card className="border-zinc-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Email Notifications</CardTitle>
          <CardDescription>Choose which events trigger email notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)
          ) : (
            Object.entries(PREF_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={key} className="text-sm text-zinc-700 font-normal cursor-pointer">{label}</Label>
                <div className="flex items-center gap-2">
                  {updateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
                  <Switch
                    id={key}
                    checked={prefs?.[key as keyof typeof PREF_LABELS] ?? false}
                    onCheckedChange={(v) => toggle(key as keyof typeof PREF_LABELS, v)}
                    disabled={updateMutation.isPending}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Notification history */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader><CardTitle className="text-base font-medium">Notification History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!logs?.length ? (
            <p className="text-sm text-zinc-400 text-center py-8">No notifications sent yet</p>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left px-4 py-2 font-medium text-zinc-500">Event</th>
                <th className="text-left px-4 py-2 font-medium text-zinc-500">Status</th>
                <th className="text-right px-4 py-2 font-medium text-zinc-500">Sent</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2 text-zinc-700">{log.event.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2">
                      <Badge className={`${LOG_STATUS_COLORS[log.status]} border-0 text-xs`}>{log.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-400">{log.sentAt ? formatDatetime(log.sentAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
