import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, RadioButtonGroup } from 'grommet';
import { UserCollectionData } from '../../model';
import { UserRoles } from '../../utils/constants';
import { useGlobalContext } from '../../context/user';
import FirebaseUsersClassInstance from '../../firebase/user/user';
 
interface ChoosePickerProps {}
const ChoosePicker: React.FC<ChoosePickerProps> = () => {
  /**
   * iterate over users
   * show name and whether they are the slate picker
   * use radio buttons
   * onchange update role in FB
   * requires admin role
   */

  const {
    users,
    fetchUsers
  } = useGlobalContext();
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
      value: user.uid
    }))
  }, [users]);

  const getUpdatedUserWithRoles = useCallback(async (user: UserCollectionData, previous: UserCollectionData) => {
    await FirebaseUsersClassInstance.updateDocumentInCollection(user.uid, {roles: [...user.roles, UserRoles.SLATE_PICKER]});
    const findPreviousUserSlatePickIndex = previous.roles.findIndex((r) => r === UserRoles.SLATE_PICKER);
    const newRolesForPrevPicker = [...previous.roles];
    newRolesForPrevPicker.splice(findPreviousUserSlatePickIndex, 1);
    await FirebaseUsersClassInstance.updateDocumentInCollection(user.uid, {roles: newRolesForPrevPicker});
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