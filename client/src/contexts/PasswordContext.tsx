import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PasswordContextType {
  isAuthenticated: boolean;
  authenticate: (password: string) => boolean;
  logout: () => void;
}

const PasswordContext = createContext<PasswordContextType | undefined>(undefined);

const CORRECT_PASSWORD = 'dayhub2025'; // You can change this password
const AUTH_KEY = 'dayhub_authenticated';

export function PasswordProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check if already authenticated in session storage
    return sessionStorage.getItem(AUTH_KEY) === 'true';
  });

  const authenticate = (password: string): boolean => {
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem(AUTH_KEY, 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(AUTH_KEY);
  };

  return (
    <PasswordContext.Provider value={{ isAuthenticated, authenticate, logout }}>
      {children}
    </PasswordContext.Provider>
  );
}

export function usePassword() {
  const context = useContext(PasswordContext);
  if (context === undefined) {
    throw new Error('usePassword must be used within a PasswordProvider');
  }
  return context;
}
