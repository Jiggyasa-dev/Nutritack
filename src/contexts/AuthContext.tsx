import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthUser {
  id:        number;
  name:      string;
  email:     string;
  avatar:    string;
  dailyGoal: number;
  weight:    string;
  height:    string;
  age:       string;
  gender:    string;
  goal:      string;
}

interface AuthContextType {
  user:       AuthUser | null;
  token:      string | null;
  isLoading:  boolean;
  signIn:     (token: string, user: AuthUser) => Promise<void>;
  signOut:    () => Promise<void>;
  updateUser: (partial: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null, token: null, isLoading: true,
  signIn: async () => {}, signOut: async () => {}, updateUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AuthUser | null>(null);
  const [token,     setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem('auth_token'),
          AsyncStorage.getItem('auth_user'),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {}
      finally { setIsLoading(false); }
    })();
  }, []);

  const signIn = async (newToken: string, newUser: AuthUser) => {
    await Promise.all([
      AsyncStorage.setItem('auth_token', newToken),
      AsyncStorage.setItem('auth_user', JSON.stringify(newUser)),
    ]);
    setToken(newToken);
    setUser(newUser);
  };

  const signOut = async () => {
    await Promise.all([
      AsyncStorage.removeItem('auth_token'),
      AsyncStorage.removeItem('auth_user'),
    ]);
    setToken(null);
    setUser(null);
  };

  const updateUser = (partial: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      AsyncStorage.setItem('auth_user', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
