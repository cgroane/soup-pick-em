import { Navigate, Route, Routes } from "react-router-dom"
import Profile from "./pages/Profile";
import Picks from "./pages/Picks";import Login from "./pages/Login";
import { PropsWithChildren } from "react";
import { UserRoles } from "./utils/constants";
import ChoosePicker from "./pages/ChoosePicker";
import CreateSlate from "./pages/CreateSlate";
import { useGlobalContext } from "./context/user";
import Colors from "./pages/Colors";
import Dashboard from "./pages/Dashboard";
import MakePicks from "./pages/MakePicks";

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

const PrivateRoutes: React.FC<PropsWithChildren & {authenticated: boolean}> = ({
  authenticated,
  children
}) => {

  return (
    <>
      {
        authenticated ? children : <Navigate to={'/login'} replace />
      }
    </>
  )
};



const Router = () => {
  // const userRoles = useSelector(selectUserRoles);
  const userRoles: UserRoles[] = [UserRoles.BASIC, UserRoles.SLATE_PICKER, UserRoles.ADMIN];
  const { user } = useGlobalContext();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Login />} />
      <Route path="/colors" element={<Colors />} />
      <Route
        path="/profile" 
        element={
          <PrivateRoutes authenticated={!!user?.isAuthenticated} >
            <RoleGuardedRoutes hasPermission={userRoles.includes(UserRoles.BASIC)} >
              <Profile/>
            </RoleGuardedRoutes>
          </PrivateRoutes>
      }
      />
      <Route
        path="/dashboard" 
        element={
          <PrivateRoutes authenticated={!!user?.isAuthenticated} >
            <RoleGuardedRoutes hasPermission={userRoles.includes(UserRoles.BASIC)} >
              <Dashboard />
            </RoleGuardedRoutes>
          </PrivateRoutes>
      }
      />
      <Route 
        path="/picks" 
        element={
          <PrivateRoutes authenticated={!!user?.isAuthenticated} >
            <RoleGuardedRoutes hasPermission={userRoles.includes(UserRoles.BASIC)} >
              <Picks />
            </RoleGuardedRoutes>
          </PrivateRoutes>
      }
      />
      <Route 
        path="/choose-picker" 
        element={
          <PrivateRoutes authenticated={!!user?.isAuthenticated} >
            <RoleGuardedRoutes hasPermission={userRoles.includes(UserRoles.ADMIN)} >
              <ChoosePicker />
            </RoleGuardedRoutes>
          </PrivateRoutes>
      }
      />
      <Route 
        path="/choose-matchups" 
        element={
          <PrivateRoutes authenticated={!!user?.isAuthenticated} >
            <RoleGuardedRoutes hasPermission={userRoles.includes(UserRoles.SLATE_PICKER)} >
              <CreateSlate />
            </RoleGuardedRoutes>
          </PrivateRoutes>
      }
      />
      <Route 
        path="/pick" 
        element={
          <PrivateRoutes authenticated={!!user?.isAuthenticated} >
            <RoleGuardedRoutes hasPermission={userRoles.includes(UserRoles.SLATE_PICKER)} >
              <MakePicks />
            </RoleGuardedRoutes>
          </PrivateRoutes>
        }
      />
    </Routes>
  );
}
export default Router;