import React, { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom";
import { useGlobalContext } from "../context/user";
import FirebaseUsersClassInstance from "../firebase/user/user";
import { UserCollectionData } from "../model";
import { useAuthContext } from "../context/auth";

export const useEmailAndPassword = () => {
  const [loginInfo, setLoginInfo] = useState({
    email: '',
    password: '',
    fName: '',
    lName: '',
  });
  const navigate = useNavigate()
  const [newUser, setNewUser] = useState(false);
  const {
    setUser
  } = useGlobalContext();
  const { signIn } = useAuthContext();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginInfo((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }, [setLoginInfo]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (newUser) {
      // No register action on the auth context yet, so this path still calls the
      // singleton directly.
      FirebaseUsersClassInstance.registerWithEmailAndPassword(`${loginInfo.fName} ${loginInfo.lName}`, loginInfo.fName, loginInfo.lName, loginInfo.email, loginInfo.password).then((res) => {
        navigate('/profile')
        if (res) setUser(res as UserCollectionData);
      });
    } else {
      // signIn navigates on success and records failures on the auth state.
      signIn(loginInfo.email, loginInfo.password);
    }
  }, [loginInfo, newUser, navigate, setUser, signIn])
  return {
    loginInfo,
    handleChange,
    handleSubmit,
    newUser,
    setNewUser
  }
}