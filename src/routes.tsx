import React from "react";
import {  Route, Routes } from "react-router-dom"
import Profile from "./pages/Profile";
import Picks from "./pages/Picks";import Login from "./pages/Login";
import { PropsWithChildren } from "react";
import { UserRoles } from "./utils/constants";
import ChoosePicker from "./pages/ChoosePicker";
import CreateSlate from "./pages/CreateSlate";
import { useGlobalContext } from "./context/user";
import Colors from "./pages/Colors";
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
        authenticated && children 
      }
    </>
  )
};



const Router = () => {
  const { user } = useGlobalContext();

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/colors" element={<Colors />} />
      <Route
        path="/profile" 
        element={
          <PrivateRoutes authenticated={!!user?.isAuthenticated} >
            <RoleGuardedRoutes hasPermission={user?.roles?.includes(UserRoles.BASIC) as boolean} >
              <Profile/>
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
          <PrivateRoutes authenticated={!!user?.isAuthenticated} >
            <RoleGuardedRoutes hasPermission={user?.roles?.includes(UserRoles.BASIC) as boolean} >
              <Picks />
            </RoleGuardedRoutes>
          </PrivateRoutes>
      }
      />
      <Route 
        path="/choose-picker" 
        element={
          <PrivateRoutes authenticated={!!user?.isAuthenticated} >
            <RoleGuardedRoutes hasPermission={user?.roles?.includes(UserRoles.ADMIN) as boolean} >
              <ChoosePicker />
            </RoleGuardedRoutes>
          </PrivateRoutes>
      }
      />
      <Route 
        path="/choose-matchups" 
        element={
          <PrivateRoutes authenticated={!!user?.isAuthenticated} >
            <RoleGuardedRoutes hasPermission={!!user?.roles?.includes(UserRoles.BASIC)} >
              <CreateSlate />
            </RoleGuardedRoutes>
          </PrivateRoutes>
      }
      />
      <Route 
        path="/pick" 
        element={
          <PrivateRoutes authenticated={!!user?.isAuthenticated} >
            <RoleGuardedRoutes hasPermission={user?.roles?.includes(UserRoles.BASIC) as boolean} >
              <MakePicks />
            </RoleGuardedRoutes>
          </PrivateRoutes>
        }
      />
    </Routes>
  );
}
export default Router;