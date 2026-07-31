import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GroupMember } from '../../model';
import { useGlobalContext } from '../../context/user';
import { useGroupContext } from '../../context/group';
import { assignSlatePicker } from '../../api/groups';

interface ChoosePickerProps {}

const ChoosePicker: React.FC<ChoosePickerProps> = () => {
  const { users, fetchUsers } = useGlobalContext();
  const { activeGroupId, activeGroup, isGroupOwner } = useGroupContext();
  const [selectedUid, setSelectedUid] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // `users` is now the active group's members (each carries a group `role`).
  const members = users as unknown as GroupMember[];

  useEffect(() => {
    const current = members?.find((m) => m.roles?.includes('slate-picker'));
    setSelectedUid(current?.uid);
  }, [members]);

  const options = useMemo(
    () => members?.map((m) => ({ id: m.uid, label: `${m.fName} ${m.lName}`.trim(), value: m.uid })),
    [members]
  );

  const onSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const uid = e.target.value;
      if (!activeGroupId) return;
      setSelectedUid(uid);
      setSaving(true);
      try {
        await assignSlatePicker(activeGroupId, uid);
        await fetchUsers();
      } catch (err) {
        console.error(err);
      } finally {
        setSaving(false);
      }
    },
    [activeGroupId, fetchUsers]
  );

  if (!isGroupOwner) {
    return (
      <div className="p-5">
        <p className="text-muted-foreground text-sm">
          Only the group owner can choose the slate maker.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5">
      <h2 className="text-xl font-bold mb-1 text-foreground">Choose Slate Maker</h2>
      <p className="text-sm text-muted-foreground mb-4">
        For {activeGroup?.name ?? 'this group'}
      </p>
      <div className="flex flex-col gap-3">
        {options?.map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border bg-surface hover:bg-surface-elevated transition-colors"
          >
            <input
              type="radio"
              name="Slate maker"
              value={option.value}
              checked={selectedUid === option.value}
              onChange={onSelect}
              disabled={saving}
              className="accent-primary h-4 w-4"
            />
            <span className="text-foreground text-sm">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default ChoosePicker;

ChoosePicker.displayName = 'ChoosePicker';
