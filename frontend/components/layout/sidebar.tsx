'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FileText, Upload, Package, BarChart3,
  Users, Settings, Bell, MessageCircle, LogOut, ChevronRight, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { openCrispChat } from '@/components/crisp-chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/upload', label: 'Upload Document', icon: Upload },
  { href: '/bulk-import', label: 'Bulk Import', icon: Package },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/team', label: 'Team', icon: Users, minRole: 'ADMIN' as const },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const ROLE_HIERARCHY = { OWNER: 3, ADMIN: 2, ACCOUNTANT: 1, VIEWER: 0 };

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, business, memberRole, logout } = useAuthStore();

  const canSee = (minRole?: 'ADMIN') => {
    if (!minRole) return true;
    const currentLevel = ROLE_HIERARCHY[memberRole ?? 'VIEWER'] ?? 0;
    return currentLevel >= ROLE_HIERARCHY[minRole];
  };

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-zinc-200">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900">
          <FileText className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-zinc-900">e-Invoice</span>
      </div>

      <Separator />

      {/* Business name */}
      {business && (
        <div className="px-6 py-3">
          <p className="text-xs text-zinc-500 truncate">{business.name}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV_ITEMS.filter((item) => canSee(item.minRole)).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
              {isActive && <ChevronRight className="ml-auto h-3 w-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade to Pro — OWNER only */}
      {memberRole === 'OWNER' && (
        <>
          <Separator />
          <div className="p-3">
            <Link
              href="/pricing"
              onClick={onClose}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              <Zap className="h-4 w-4 shrink-0 text-amber-500" />
              <div className="flex-1 min-w-0">
                <span>Upgrade to Pro</span>
                <p className="text-xs font-normal text-amber-600 truncate">Unlock all features</p>
              </div>
            </Link>
          </div>
        </>
      )}

      <Separator />

      {/* Bottom section */}
      <div className="p-3 space-y-1">
        <Link
          href="/settings/notifications"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
        >
          <Bell className="h-4 w-4" />
          Notifications
        </Link>
        <button
          onClick={openCrispChat}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          Help &amp; Support
        </button>
      </div>

      <Separator />

      {/* User */}
      <div className="p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-zinc-200 text-zinc-600 text-xs">
              {getInitials(user?.name ?? user?.email ?? '?')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">{user?.name ?? 'User'}</p>
            <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="h-7 w-7 text-zinc-400 hover:text-zinc-600">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
