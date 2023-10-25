import React, { useCallback, useState } from "react"
import { logInWithEmailAndPassword } from "../firebase/user/login";
import { registerWithEmailAndPassword } from "../firebase/user/create";
import { useNavigate } from "react-router-dom";

export const useEmailAndPassword = () => {
  const [loginInfo, setLoginInfo] = useState({
    email: '',
    password: '',
    fName: '',
    lName: '',
  });
  const navigate = useNavigate()
  const [newUser, setNewUser] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginInfo((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }, [setLoginInfo]);

  const handleSubmit = useCallback(() => {
    if (newUser) {
      registerWithEmailAndPassword(`${loginInfo.fName} ${loginInfo.lName}`, loginInfo.email, loginInfo.password).then(() => navigate('/dashboard'));
    } else {
      logInWithEmailAndPassword(loginInfo.email, loginInfo.password).then(() => navigate('/dashboard'));
    }
  }, [loginInfo, newUser, navigate])
  return {
    loginInfo,
    handleChange,
    handleSubmit,
    newUser,
    setNewUser
  }
}