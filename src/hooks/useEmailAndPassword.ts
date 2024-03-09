import React, { useCallback, useState } from "react"
import { logInWithEmailAndPassword } from "../firebase/user/login";
import { registerWithEmailAndPassword } from "../firebase/user/create";
import { useNavigate } from "react-router-dom";
import { useGlobalContext } from "../context/user";

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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginInfo((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }, [setLoginInfo]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (newUser) {
      registerWithEmailAndPassword(`${loginInfo.fName} ${loginInfo.lName}`, loginInfo.email, loginInfo.password).then((res) => {
        navigate('/dashboard')
        if(res) setUser(res.user);
      });
    } else {
      logInWithEmailAndPassword(loginInfo.email, loginInfo.password).then((res) => {
        navigate('/dashboard')
        if(res) setUser(res);
      });
    }
  }, [loginInfo, newUser, navigate, setUser])
  return {
    loginInfo,
    handleChange,
    handleSubmit,
    newUser,
    setNewUser
  }
}