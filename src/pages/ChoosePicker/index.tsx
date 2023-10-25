import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, RadioButtonGroup } from 'grommet';
import { UserCollectionData } from '../../model';
import { UserRoles } from '../../utils/constants';
import { getAllUsers } from '../../firebase/user/get';
import { updateUserDoc } from '../../firebase/user/update';
 
interface ChoosePickerProps {}
const ChoosePicker: React.FC<ChoosePickerProps> = () => {
  /**
   * iterate over users
   * show name and whether they are the slate picker
   * use radio buttons
   * onchange update role in FB
   * requires admin role
   */
  const [users, setUsers] = useState<UserCollectionData[]>([]);
  const [selected, setSelected] = useState({} as UserCollectionData);

  const fetchUsers = useCallback(async () => {
    const results = await getAllUsers();
    setUsers(results as UserCollectionData[]);
    console.log(results);
  }, [setUsers]);

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
      value: user.uid
    }))
  }, [users]);

  const getUpdatedUserWithRoles = useCallback(async (user: UserCollectionData, previous: UserCollectionData) => {
    await updateUserDoc<UserRoles[]>('roles', user, [...user.roles, UserRoles.SLATE_PICKER]);
    const findPreviousUserSlatePickIndex = previous.roles.findIndex((r) => r === UserRoles.SLATE_PICKER);
    const newRolesForPrevPicker = [...previous.roles];
    newRolesForPrevPicker.splice(findPreviousUserSlatePickIndex, 1);
    await updateUserDoc<UserRoles[]>('roles', previous, newRolesForPrevPicker);
    return await fetchUsers();
    
  }, [fetchUsers])

  const updateSelectedUser = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    return await setSelected((previous) => {
      const user = users?.find((u) => u.uid === e.target.value);
      getUpdatedUserWithRoles(user as UserCollectionData, previous);
      return {
        ...user
      } as UserCollectionData
    })
  }, [users, getUpdatedUserWithRoles]);
  
  return (
    <>
      <Box pad={'20px'} >
        <RadioButtonGroup
          name='Slate maker'
          options={radioOptions}
          onChange={updateSelectedUser}
          value={selected?.uid}
      />
      </Box>
    </>
  )
}
 
export default ChoosePicker
 
ChoosePicker.displayName = "ChoosePicker"