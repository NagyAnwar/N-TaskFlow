'use client';

import { Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { apiRequest, messageOf } from '@/lib/api/client.ts';
import { CopyRow } from '../settings/integration-card.tsx';

export function AiConnectBanner({ mcpUrl }: { readonly mcpUrl: string }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function dismiss(): Promise<void> {
    setDismissed(true);
    setError(null);
    try {
      await apiRequest('/api/onboarding/ai-connect-hint', { method: 'DELETE', body: {} });
      router.refresh();
    } catch (caught) {
      setDismissed(false);
      setError(messageOf(caught));
    }
  }

  if (dismissed) return null;

  return (
  <div className="flex flex-col gap-6" data-testid="onboarding-connect">
    <header className="flex flex-col gap-1">
      <h1 className="font-semibold text-text text-xl">Welcome to Pharmaplast</h1>
      <p className="text-muted text-dense">
        Your Controlling Department workspace is ready to set up.
      </p>
    </header>

    <div className="flex gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={() => next().catch(() => undefined)}
        disabled={pending}
      >
        {continueLabel(pending, connected)}
      </Button>
    </div>
  </div>
);
}
