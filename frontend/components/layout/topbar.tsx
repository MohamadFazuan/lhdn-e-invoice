'use client';

import { Menu, Bell } from 'lucide-react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Sidebar } from './sidebar';
import { useState } from 'react';

export function Topbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-14 items-center gap-3 border-b border-zinc-200 bg-white px-4 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <VisuallyHidden><SheetTitle>Navigation</SheetTitle></VisuallyHidden>
          <Sidebar onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900">
          <FileText className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="font-semibold text-zinc-900">e-Invoice</span>
      </Link>

      <div className="ml-auto">
        <Link href="/settings/notifications">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Bell className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </header>
  );
}
