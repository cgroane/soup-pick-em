import React, { useCallback, useState } from "react"
import { logInWithEmailAndPassword } from "../firebase/user/login";
import { registerWithEmailAndPassword } from "../firebase/user/create";

export const useEmailAndPassword = (signUp: boolean) => {
  const [loginInfo, setLoginInfo] = useState({
    email: '',
    password: '',
    name: ''
  });
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginInfo((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }, [setLoginInfo]);

  const handleSubmit = useCallback(() => {
    if (signUp) {
      registerWithEmailAndPassword(loginInfo.name, loginInfo.email, loginInfo.password);
    } else {
      logInWithEmailAndPassword(loginInfo.email, loginInfo.password)
    }
  }, [signUp, loginInfo])
  return {
    loginInfo,
    handleChange,
    handleSubmit
  }
}