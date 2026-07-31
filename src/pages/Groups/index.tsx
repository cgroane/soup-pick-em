import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Users } from 'lucide-react';
import { useGroupContext } from '../../context/group';
import { GroupVisibility } from '../../model';
import {
  createGroup,
  joinGroup,
  listPublicGroups,
  updateGroup,
} from '../../api/groups';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { cn } from 'lib/utils';

type PublicGroup = { id: string; name: string; ownerUid: string };

const Groups: React.FC = () => {
  const {
    memberships,
    activeGroupId,
    activeGroup,
    isGroupOwner,
    setActiveGroup,
    refreshMemberships,
    refreshActiveGroup,
  } = useGroupContext();

  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<GroupVisibility>('private');
  const [code, setCode] = useState('');
  const [publicGroups, setPublicGroups] = useState<PublicGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const joinedIds = new Set(memberships.map((m) => m.gid));

  const loadPublic = useCallback(async () => {
    try {
      setPublicGroups(await listPublicGroups());
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadPublic();
  }, [loadPublic]);

  const withBusy = useCallback(
    async (fn: () => Promise<void>, ok?: string) => {
      setBusy(true);
      setMessage(null);
      try {
        await fn();
        if (ok) setMessage(ok);
      } catch (err: any) {
        setMessage(err?.response?.data?.message ?? 'Something went wrong');
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const onCreate = () =>
    withBusy(async () => {
      const group = await createGroup(name, visibility);
      await refreshMemberships();
      setActiveGroup(group.id);
      setName('');
      setVisibility('private');
    }, 'Group created');

  const onJoinCode = () =>
    withBusy(async () => {
      const { gid } = await joinGroup({ inviteCode: code });
      await refreshMemberships();
      setActiveGroup(gid);
      setCode('');
    }, 'Joined group');

  const onJoinPublic = (gid: string) =>
    withBusy(async () => {
      await joinGroup({ gid });
      await refreshMemberships();
      setActiveGroup(gid);
    }, 'Joined group');

  const onRename = (next: string) =>
    withBusy(async () => {
      if (!activeGroupId) return;
      await updateGroup(activeGroupId, { name: next });
      await Promise.all([refreshMemberships(), refreshActiveGroup()]);
    });

  const onToggleVisibility = () =>
    withBusy(async () => {
      if (!activeGroupId || !activeGroup) return;
      await updateGroup(activeGroupId, {
        visibility: activeGroup.visibility === 'public' ? 'private' : 'public',
      });
      await refreshActiveGroup();
      await loadPublic();
    });

  const copyCode = () => {
    if (!activeGroup?.inviteCode) return;
    navigator.clipboard?.writeText(activeGroup.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-4 max-w-lg mx-auto w-full">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Users className="h-6 w-6" /> Groups
      </h1>

      {message && (
        <div className="text-sm rounded-md bg-surface-elevated px-3 py-2 text-foreground">{message}</div>
      )}

      {/* Your groups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your groups</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {memberships.length ? (
            memberships.map((m) => (
              <button
                key={m.gid}
                onClick={() => setActiveGroup(m.gid)}
                className={cn(
                  'flex items-center justify-between rounded-md px-3 py-2 text-sm text-left',
                  m.gid === activeGroupId
                    ? 'bg-primary text-white'
                    : 'bg-surface-elevated text-foreground hover:bg-surface'
                )}
              >
                <span className="truncate">{m.name}</span>
                <span className="ml-2 text-xs opacity-80">
                  {m.roles?.filter((r) => r !== 'member').join(', ') || 'member'}
                </span>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">You're not in any groups yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Owner settings for the active group */}
      {isGroupOwner && activeGroup && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manage “{activeGroup.name}”</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Group name</label>
              <Input
                defaultValue={activeGroup.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== activeGroup.name) onRename(v);
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">
                Visibility: <b>{activeGroup.visibility}</b>
              </span>
              <Button variant="outline" size="sm" disabled={busy} onClick={onToggleVisibility}>
                Make {activeGroup.visibility === 'public' ? 'private' : 'public'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">
                Invite code: <b className="font-mono">{activeGroup.inviteCode}</b>
              </span>
              <Button variant="ghost" size="sm" onClick={copyCode} aria-label="Copy invite code">
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create a group</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex gap-2">
            {(['private', 'public'] as GroupVisibility[]).map((v) => (
              <Button
                key={v}
                type="button"
                variant={visibility === v ? 'default' : 'outline'}
                size="sm"
                className="flex-1 capitalize"
                onClick={() => setVisibility(v)}
              >
                {v}
              </Button>
            ))}
          </div>
          <Button disabled={busy || !name.trim()} onClick={onCreate}>
            Create
          </Button>
        </CardContent>
      </Card>

      {/* Join by code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Join with a code</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            placeholder="Invite code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono uppercase"
          />
          <Button disabled={busy || !code.trim()} onClick={onJoinCode}>
            Join
          </Button>
        </CardContent>
      </Card>

      {/* Discover public groups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Discover public groups</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {publicGroups.filter((g) => !joinedIds.has(g.id)).length ? (
            publicGroups
              .filter((g) => !joinedIds.has(g.id))
              .map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-md bg-surface-elevated px-3 py-2"
                >
                  <span className="text-sm text-foreground truncate">{g.name}</span>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => onJoinPublic(g.id)}>
                    Join
                  </Button>
                </div>
              ))
          ) : (
            <p className="text-sm text-muted-foreground">No public groups to join right now.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Groups;

Groups.displayName = 'Groups';
