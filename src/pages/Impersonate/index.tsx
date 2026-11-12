import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { GroupMember } from '../../model';
import { useUserContext } from '../../context/user';
import { useUserStateContext } from '../../context/user/user-state';
import { useGroupStateContext } from '../../context/group/group-state';
import { getImpersonationToken } from '../../api/admin';
import { Button } from '../../components/ui/button';

const Impersonate: React.FC = () => {
  const navigate = useNavigate();
  const { user, users } = useUserStateContext();
  const { fetchUsers } = useUserContext();
  const { activeGroup } = useGroupStateContext();
  const [pendingUid, setPendingUid] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const members = (users as unknown as GroupMember[]).filter((m) => m.uid !== user?.uid);

  const viewAs = useCallback(
    async (uid: string) => {
      setPendingUid(uid);
      setError(undefined);
      try {
        const token = await getImpersonationToken(uid);
        await signInWithCustomToken(getAuth(), token);
        navigate('/profile');
      } catch (err) {
        console.error(err);
        setError('Could not sign in as that user.');
        setPendingUid(undefined);
      }
    },
    [navigate]
  );

  return (
    <div className="p-5">
      <h2 className="text-xl font-bold mb-1 text-foreground">Impersonate</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Signs you out and in as the selected member of {activeGroup?.name ?? 'this group'}. Anything
        you submit is recorded as them. Sign out and back in to return to your account.
      </p>
      {error && <p className="text-sm text-destructive mb-3">{error}</p>}
      <div className="flex flex-col gap-3">
        {members.map((m) => (
          <div
            key={m.uid}
            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-surface"
          >
            <span className="text-foreground text-sm">{`${m.fName} ${m.lName}`.trim() || m.email}</span>
            <Button size="sm" disabled={!!pendingUid} onClick={() => viewAs(m.uid)}>
              View as
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Impersonate;

Impersonate.displayName = 'Impersonate';
