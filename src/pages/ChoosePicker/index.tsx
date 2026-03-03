import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserCollectionData } from '../../model';
import { UserRoles } from '../../utils/constants';
import { useGlobalContext } from '../../context/user';
import FirebaseUsersClassInstance from '../../firebase/user/user';

interface ChoosePickerProps {}

const ChoosePicker: React.FC<ChoosePickerProps> = () => {
  const { users, fetchUsers } = useGlobalContext();
  const [selected, setSelected] = useState({} as UserCollectionData);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (users) {
      const findCurrentPicker = users?.find((user) => user?.roles?.includes(UserRoles.SLATE_PICKER));
      setSelected(findCurrentPicker as UserCollectionData);
    }
  }, [setSelected, users]);

  const radioOptions = useMemo(() => {
    return users?.map((user) => ({
      id: user.uid,
      disabled: false,
      label: user.fName,
      value: user.uid,
    }));
  }, [users]);

  const getUpdatedUserWithRoles = useCallback(
    async (user: UserCollectionData, previous: UserCollectionData) => {
      await FirebaseUsersClassInstance.updateDocumentInCollection(user.uid, {
        roles: [...user.roles, UserRoles.SLATE_PICKER],
      });
      const findPreviousUserSlatePickIndex = previous.roles.findIndex(
        (r) => r === UserRoles.SLATE_PICKER
      );
      const newRolesForPrevPicker = [...previous.roles];
      newRolesForPrevPicker.splice(findPreviousUserSlatePickIndex, 1);
      await FirebaseUsersClassInstance.updateDocumentInCollection(previous.uid, {
        roles: newRolesForPrevPicker,
      });
      return await fetchUsers();
    },
    [fetchUsers]
  );

  const updateSelectedUser = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      return await setSelected((previous) => {
        const user = users?.find((u) => u.uid === e.target.value);
        getUpdatedUserWithRoles(user as UserCollectionData, previous);
        return { ...user } as UserCollectionData;
      });
    },
    [users, getUpdatedUserWithRoles]
  );

  return (
    <div className="p-5">
      <h2 className="text-xl font-bold mb-4 text-foreground">Choose Slate Maker</h2>
      <div className="flex flex-col gap-3">
        {radioOptions?.map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border bg-surface hover:bg-surface-elevated transition-colors"
          >
            <input
              type="radio"
              name="Slate maker"
              value={option.value}
              checked={selected?.uid === option.value}
              onChange={updateSelectedUser}
              disabled={option.disabled}
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
