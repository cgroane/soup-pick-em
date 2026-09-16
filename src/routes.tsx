import React from "react";
import { Navigate, Route, Routes } from "react-router-dom"
import Profile from "./pages/Profile";
import Picks from "./pages/Picks"; import Login from "./pages/Login";
import { PropsWithChildren } from "react";
import { UserRoles } from "./utils/constants";
import ChoosePicker from "./pages/ChoosePicker";
import CreateSlate from "./pages/CreateSlate";
import { useUserStateContext } from "./context/user/user-state";
import { useGroupStateContext } from "./context/group/group-state";
import Colors from "./pages/Colors";
import MakePicks from "./pages/MakePicks";
import CFPBracket from "./pages/CFPBracket";
import AdminCFP from "./pages/AdminCFP";
import Groups from "./pages/Groups";
import { useAuthStateContext } from "context/auth/auth-state";

/**
 * admin has all routes, but must be logged in.
 * Pick assignee page
 * Picker has the pick selection page.
 * 
 */
const RoleGuardedRoutes: React.FC<PropsWithChildren & { hasPermission: boolean }> = ({
  children, hasPermission
}) => {
  return (
    <>
      {hasPermission ? children : <>You do not have permission to view this page</>}
    </>
  )
};

const PrivateRoutes: React.FC<PropsWithChildren> = ({
  children
}) => {
  const { status } = useAuthStateContext();
  if (status === 'initializing') return null;
  if (status === 'unauthenticated') return <Navigate to="/" replace />;
  return <>{children}</>;
};



const Router = () => {
  const { user } = useUserStateContext();
  const { isGroupOwner } = useGroupStateContext();

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/colors" element={<Colors />} />
      <Route
        path="/profile"
        element={
          <PrivateRoutes >
            <RoleGuardedRoutes hasPermission={user?.roles?.includes(UserRoles.BASIC) as boolean} >
              <Profile />
            </RoleGuardedRoutes>
          </PrivateRoutes>
        }
      />
      {/* 
        * page for showing a table of everyone's choices
       */}
      <Route
        path="/picks"
        element={
          <PrivateRoutes >
            <RoleGuardedRoutes hasPermission={user?.roles?.includes(UserRoles.BASIC) as boolean} >
              <Picks />
            </RoleGuardedRoutes>
          </PrivateRoutes>
        }
      />
      <Route
        path="/choose-picker"
        element={
          <PrivateRoutes >
            <RoleGuardedRoutes hasPermission={!!user?.roles?.includes(UserRoles.ADMIN) || isGroupOwner} >
              <ChoosePicker />
            </RoleGuardedRoutes>
          </PrivateRoutes>
        }
      />
      <Route
        path="/choose-matchups"
        element={
          <PrivateRoutes >
            <RoleGuardedRoutes hasPermission={!!user?.roles?.includes(UserRoles.BASIC)} >
              <CreateSlate />
            </RoleGuardedRoutes>
          </PrivateRoutes>
        }
      />
      <Route
        path="/pick"
        element={
          <PrivateRoutes >
            <RoleGuardedRoutes hasPermission={user?.roles?.includes(UserRoles.BASIC) as boolean} >
              <MakePicks />
            </RoleGuardedRoutes>
          </PrivateRoutes>
        }
      />
      <Route
        path="/groups"
        element={
          <PrivateRoutes >
            <RoleGuardedRoutes hasPermission={!!user?.roles?.includes(UserRoles.BASIC)} >
              <Groups />
            </RoleGuardedRoutes>
          </PrivateRoutes>
        }
      />
      <Route
        path="/cfp-bracket"
        element={
          <PrivateRoutes >
            <RoleGuardedRoutes hasPermission={user?.roles?.includes(UserRoles.BASIC) as boolean}>
              <CFPBracket />
            </RoleGuardedRoutes>
          </PrivateRoutes>
        }
      />
      <Route
        path="/admin-cfp"
        element={
          <PrivateRoutes >
            <RoleGuardedRoutes hasPermission={user?.roles?.includes(UserRoles.ADMIN) as boolean}>
              <AdminCFP />
            </RoleGuardedRoutes>
          </PrivateRoutes>
        }
      />
    </Routes>
  );
}
export default Router;