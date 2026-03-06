import { createContext, useContext, useState } from 'react';
import { apiPost } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email, password) => {
    const data = await apiPost('/auth/login', { email, password });
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  };

  const register = async (name, email, password) => {
    const data = await apiPost('/auth/register', { name, email, password });
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateUser = (updater) => {
    setUser(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next) localStorage.setItem('user', JSON.stringify(next));
      else localStorage.removeItem('user');
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, setUser: updateUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
