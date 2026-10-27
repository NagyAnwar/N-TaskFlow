'use client';

import { ORG_ROLES, type OrgRole } from '@orbit/shared/constants';
import { emailSchema } from '@orbit/shared/validators';
import { Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { apiRequest, messageOf } from '@/lib/api/client.ts';
import { cn } from '@/lib/cn.ts';
import { cardHover } from '@/lib/interaction.ts';
import type { PendingInviteView, TeamBadge } from './data.ts';

export interface EmailParseResult {
  readonly valid: string[];
  readonly invalid: string[];
}

export function parseEmails(value: string): EmailParseResult {
  const entries = [
    ...new Set(
      value
        .split(/[\s,;]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  ];

  const valid = new Set<string>();
  const invalid: string[] = [];

  for (const entry of entries) {
    const parsed = emailSchema.safeParse(entry);
    if (parsed.success) valid.add(parsed.data);
    else invalid.push(entry);
  }

  return { valid: [...valid], invalid };
}

const ROLE_LABELS: Record<OrgRole, string> = {
  admin: 'Admin',
  member: 'Member',
  contributor: 'Contributor',
  guest: 'Guest',
};

export interface InvitePanelProps {
  readonly teams: readonly TeamBadge[];
  readonly invites: readonly PendingInviteView[];
  readonly canInvite: boolean;
  readonly canInviteAdmins?: boolean;
  readonly emailEnabled?: boolean;
}

export function InvitePanel({
  teams,
  invites,
  canInvite,
  canInviteAdmins = false,
}: InvitePanelProps) {
  const router = useRouter();

  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<OrgRole>('member');
  const [teamIds, setTeamIds] = useState<readonly string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdInvites, setCreatedInvites] = useState<{ email: string; inviteUrl: string }[]>([]);

  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);

  const parsed = parseEmails(emails);
  const permittedRole = role === 'admin' && !canInviteAdmins ? 'member' : role;

  function toggleTeam(teamId: string): void {
    setTeamIds((current) =>
      current.includes(teamId) ? current.filter((entry) => entry !== teamId) : [...current, teamId],
    );
  }

  async function copyInviteLink(inviteUrl: string): Promise<void> {
    setError(null);

    try {
      const fullUrl = new URL(inviteUrl, window.location.origin).href;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedUrl(inviteUrl);
    } catch {
      setError('Could not copy the link. Please copy it manually.');
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setError(null);
    setCreatedInvites([]);
    setCopiedUrl(null);

    if (parsed.invalid.length > 0) {
      setError(`Not a valid email address: ${parsed.invalid.join(', ')}`);
      return;
    }

    if (parsed.valid.length === 0) {
      setError('Add at least one email address.');
      return;
    }

    setPending(true);

    try {
      const result = await apiRequest<{
        invites: { email: string; inviteUrl: string }[];
      }>('/api/invites', {
        method: 'POST',
        body: {
          invites: parsed.valid.map((email) => ({
            email,
            role: permittedRole,
            teamIds: [...teamIds],
          })),
        },
      });

      setCreatedInvites(result.invites);
      setEmails('');
      router.refresh();
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setPending(false);
    }
  }

  async function inviteAction(inviteId: string, method: string, path: string): Promise<void> {
    setBusyInviteId(inviteId);
    setError(null);

    try {
      await apiRequest(path, { method });
      router.refresh();
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusyInviteId(null);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <header className="flex flex-col gap-1">
        <h3 className="font-medium text-dense text-text">Invite people</h3>
        <p className="text-muted text-xs">
          Enter one email per line or separate addresses with commas. Create invitation links and
          share them manually. Links expire in 14 days.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <fieldset disabled={!canInvite || pending} className="flex flex-col gap-3">
          <label htmlFor="invite-emails" className="flex flex-col gap-1.5">
            <span className="sr-only">Email addresses</span>
            <Textarea
              id="invite-emails"
              value={emails}
              onChange={(event) => setEmails(event.target.value)}
              rows={3}
              placeholder="teammate@example.com"
              aria-label="Email addresses"
              name="emails"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-muted text-xs">Role</span>
              <Select value={permittedRole} onValueChange={(next) => setRole(next as OrgRole)}>
                <SelectTrigger className="h-7 w-36 text-xs" aria-label="Invite role">
                  <SelectValue>{ROLE_LABELS[permittedRole]}</SelectValue>
                </SelectTrigger>

                <SelectContent>
                  {ORG_ROLES.filter((entry) => entry !== 'admin' || canInviteAdmins).map(
                    (entry) => (
                      <SelectItem key={entry} value={entry}>
                        {ROLE_LABELS[entry]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {teams.length === 0 ? null : (
              <fieldset className="flex flex-wrap items-center gap-2.5">
                <legend className="sr-only">Teams</legend>
                <span className="text-muted text-xs">Teams</span>

                {teams.map((team) => (
                  <label
                    key={team.id}
                    htmlFor={`invite-team-${team.id}`}
                    className="flex items-center gap-1.5 text-muted text-xs"
                  >
                    <Checkbox
                      id={`invite-team-${team.id}`}
                      checked={teamIds.includes(team.id)}
                      onCheckedChange={() => toggleTeam(team.id)}
                      aria-label={team.name}
                    />
                    {team.key}
                  </label>
                ))}
              </fieldset>
            )}
          </div>
        </fieldset>

        {parsed.valid.length > 0 ? (
          <p className="text-faint text-xs">
            {parsed.valid.length} address
            {parsed.valid.length === 1 ? '' : 'es'} ready to invite.
          </p>
        ) : null}

        {error === null ? null : (
          <p role="alert" className="text-danger text-xs">
            {error}
          </p>
        )}

        {createdInvites.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p role="status" className="text-success text-xs">
              Invitation links created successfully. Share each link with its intended recipient.
            </p>

            {createdInvites.map((invite) => (
              <div key={invite.email} className="flex flex-col gap-1.5">
                <span className="text-dense text-text text-xs">{invite.email}</span>

                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={invite.inviteUrl}
                    aria-label={`Invitation link for ${invite.email}`}
                    className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1.5 text-xs"
                    onFocus={(event) => event.currentTarget.select()}
                  />

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => copyInviteLink(invite.inviteUrl)}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    {copiedUrl === invite.inviteUrl ? 'Copied' : 'Copy link'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div>
          <Button type="submit" variant="primary" size="sm" disabled={!canInvite || pending}>
            {pending ? 'Creating links...' : 'Create invitation links'}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-2 border-border border-t pt-3">
        <h4 className="font-medium text-muted text-xs">Pending invites</h4>

        {invites.length === 0 ? (
          <p className="text-faint text-xs">No pending invites.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {invites.map((invite) => {
              const inviteUrl = `/invite/${invite.id}`;

              return (
                <li
                  key={invite.id}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5',
                    cardHover,
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-dense text-text">{invite.email}</span>
                    <Badge tone="neutral">{invite.role}</Badge>
                  </span>

                  <span className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!canInvite}
                      onClick={() => copyInviteLink(inviteUrl)}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      {copiedUrl === inviteUrl ? 'Copied' : 'Copy link'}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!canInvite || busyInviteId === invite.id}
                      onClick={() => inviteAction(invite.id, 'DELETE', `/api/invites/${invite.id}`)}
                    >
                      Revoke
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
