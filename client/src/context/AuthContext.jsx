import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

axios.defaults.withCredentials = true;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/auth/me`);
        setUser(data);
      } catch (error) {
        console.error('Not authenticated');
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const login = async (username, password) => {
    const { data } = await axios.post(`${API_URL}/api/auth/login`, { username, password });
    setUser(data);
  };

  const register = async (username, password, securityQuestion, securityAnswer) => {
    const { data } = await axios.post(`${API_URL}/api/auth/register`, { username, password, securityQuestion, securityAnswer });
    setUser(data);
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`);
    } catch(err) {}
    setUser(null);
  };

  const googleLogin = async (token) => {
    const { data } = await axios.post(`${API_URL}/api/auth/google-login`, { token });
    setUser(data);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, googleLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
