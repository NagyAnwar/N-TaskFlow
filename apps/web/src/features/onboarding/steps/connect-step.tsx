'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { messageOf } from '@/lib/api/client.ts';
import { advanceStep } from '../api.ts';
import type { OnboardingStatusView } from '../types.ts';

export interface ConnectStepProps {
  readonly mcpUrl: string;
  readonly onNext: (status: OnboardingStatusView) => void;
}

export function ConnectStep({ onNext }: ConnectStepProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function next(): Promise<void> {
    setPending(true);
    setError(null);

    try {
      onNext(await advanceStep({ step: 'connect' }));
    } catch (caught) {
      setError(messageOf(caught));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6" data-testid="onboarding-connect">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-text text-xl">Welcome to Pharmaplast</h1>
        <p className="text-muted text-dense">
          Your Controlling Department workspace is ready to set up.
        </p>
      </header>

      {error === null ? null : (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => next().catch(() => undefined)}
          disabled={pending}
        >
          {pending ? 'Please wait…' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}