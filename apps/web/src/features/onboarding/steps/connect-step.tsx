'use client';

import { CircleCheck, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { messageOf } from '@/lib/api/client.ts';
import { cn } from '@/lib/cn.ts';
import { tabHover } from '@/lib/interaction.ts';
import { StarterPromptPicker } from '../../ai-connect/starter-prompt-picker.tsx';
import {
  type McpConnectionsState,
  useMcpConnections,
} from '../../ai-connect/use-mcp-connections.ts';
import { CopyRow } from '../../settings/integration-card.tsx';
import { mcpClients } from '../../settings/mcp-install-links.ts';
import { McpClientTile } from '../../settings/mcp-panel.tsx';
import { advanceStep } from '../api.ts';
import type { OnboardingStatusView } from '../types.ts';

export interface ConnectStepProps {
  readonly mcpUrl: string;
  readonly onNext: (status: OnboardingStatusView) => void;
}

export function ConnectStep({ mcpUrl, onNext }: ConnectStepProps) {
  const clients = mcpClients(mcpUrl);
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = clients.find((client) => client.id === clientId);
  const status = useMcpConnections();
  const connected = status.connections.length > 0;

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

function ConnectionStatus({ status }: { status: McpConnectionsState }) {
  const [first] = status.connections;
  if (first !== undefined) {
    const names = [...new Set(status.connections.map((connection) => connection.clientName))];
    return (
      <p role="status" className="flex items-center gap-2 text-dense text-text">
        <CircleCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
        Connected: {names.join(', ')}. Now give it a starter prompt.
      </p>
    );
  }
  return (
    <p role="status" className="flex items-center gap-2 text-muted text-xs">
      <LoaderCircle className="size-3.5 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
      {status.error === null
        ? 'Waiting for your AI tool. This updates as soon as you approve it.'
        : `Could not check the connection yet: ${status.error}`}
    </p>
  );
}

function continueLabel(pending: boolean, connected: boolean): string {
  if (pending) return 'Saving';
  return connected ? 'Continue' : 'Continue without connecting';
}
