'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

export function CrispChat() {
  const user = useAuthStore((s) => s.user);
  const business = useAuthStore((s) => s.business);

  useEffect(() => {
    const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
    if (!websiteId || websiteId === 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx') return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = websiteId;

    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!window.$crisp || !user) return;
    window.$crisp.push(['set', 'user:email', [user.email]]);
    if (user.name) window.$crisp.push(['set', 'user:nickname', [user.name]]);
    if (business) window.$crisp.push(['set', 'user:company', [business.name]]);
  }, [user, business]);

  return null;
}

export function openCrispChat() {
  if (typeof window !== 'undefined' && window.$crisp) {
    window.$crisp.push(['do', 'chat:open']);
  }
}
