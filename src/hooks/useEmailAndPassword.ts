import React, { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom";
import { useGlobalContext } from "../context/user";
import FirebaseUsersClassInstance from "../firebase/user/user";
import { UserCollectionData } from "../model";
import { useUIContext } from "../context/ui";

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
  const {
    seasonData
  } = useUIContext()

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginInfo((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }, [setLoginInfo]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (newUser) {
      FirebaseUsersClassInstance.registerWithEmailAndPassword(`${loginInfo.fName} ${loginInfo.lName}`, loginInfo.email, loginInfo.password, seasonData?.Season).then((res) => {
        navigate('/profile')
        if(res) setUser(res as UserCollectionData);
      });
    } else {
      FirebaseUsersClassInstance.logInWithEmailAndPassword(loginInfo.email, loginInfo.password).then((res) => {
        navigate('/profile')
        if(res) setUser(res);
      });
    }
  }, [loginInfo, newUser, navigate, setUser, seasonData?.Season])
  return {
    loginInfo,
    handleChange,
    handleSubmit,
    newUser,
    setNewUser
  }
}