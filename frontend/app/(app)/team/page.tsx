'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { UserPlus, Loader2, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { api } from '@/lib/api';
import { formatDate, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import type { ApiResponse, TeamMember, MemberRole } from '@/types/api';

const ROLE_STYLES: Record<MemberRole, string> = {
  OWNER: 'bg-zinc-900 text-white border-0',
  ADMIN: 'bg-blue-50 text-blue-700 border-blue-200',
  ACCOUNTANT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  VIEWER: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const inviteSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.enum(['ADMIN', 'ACCOUNTANT', 'VIEWER']),
});
type InviteData = z.infer<typeof inviteSchema>;

export default function TeamPage() {
  const qc = useQueryClient();
  const { memberRole } = useAuthStore();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isAdmin = memberRole === 'OWNER' || memberRole === 'ADMIN';
  const isOwner = memberRole === 'OWNER';

  const { data: members, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const res = await api.get('api/team');
      const json: ApiResponse<TeamMember[]> = await res.json();
      return json.data ?? [];
    },
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<InviteData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'ACCOUNTANT' },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteData) => {
      await api.post('api/team/invite', { json: data });
    },
    onSuccess: () => {
      toast.success('Invite sent!');
      setInviteOpen(false);
      reset();
      qc.invalidateQueries({ queryKey: ['team'] });
    },
    onError: () => toast.error('Failed to send invite'),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`api/team/${id}`); },
    onSuccess: () => {
      toast.success('Member removed');
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['team'] });
    },
    onError: () => toast.error('Failed to remove member'),
  });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Team">
        {isAdmin && (
          <Button size="sm" className="bg-zinc-900 hover:bg-zinc-700 text-white" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />Invite Member
          </Button>
        )}
      </PageHeader>

      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left px-6 py-3 font-medium text-zinc-500">Member</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">Joined</th>
                  {isAdmin && <th className="text-right px-6 py-3 font-medium text-zinc-500">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {members?.map((member) => (
                  <tr key={member.id} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-zinc-200 text-zinc-600 text-xs">
                            {getInitials(member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-zinc-700">{member.email ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${ROLE_STYLES[member.role]}`}>{member.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${member.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {member.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{member.joinedAt ? formatDate(member.joinedAt) : '—'}</td>
                    {isAdmin && (
                      <td className="px-6 py-3 text-right">
                        {member.role !== 'OWNER' && (
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-red-600"
                            onClick={() => setDeleteId(member.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Role matrix */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm font-medium"><Shield className="h-4 w-4" />Role Permissions</CardTitle></CardHeader>
        <CardContent className="text-xs text-zinc-600 grid grid-cols-2 gap-x-8 gap-y-1">
          <div><span className="font-semibold text-zinc-900">OWNER</span> — Full access, billing, delete business</div>
          <div><span className="font-semibold text-zinc-900">ADMIN</span> — Manage team, all invoice operations</div>
          <div><span className="font-semibold text-zinc-900">ACCOUNTANT</span> — Create, edit, submit invoices</div>
          <div><span className="font-semibold text-zinc-900">VIEWER</span> — Read-only access</div>
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => inviteMutation.mutate(d))} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="colleague@company.com" {...register('email')} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select onValueChange={(v) => setValue('role', v as InviteData['role'])} value={watch('role')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isOwner && <SelectItem value="ADMIN">Admin</SelectItem>}
                  <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-700 text-white" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invite
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove Member"
        description="This will remove the member from your team. They will lose access immediately."
        confirmLabel="Remove"
        destructive
        onConfirm={() => deleteId && removeMutation.mutate(deleteId)}
      />
    </div>
  );
}
