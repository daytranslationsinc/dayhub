import { createContext, useContext, useState, ReactNode } from 'react';

interface PasswordContextType {
  isAuthenticated: boolean;
  authenticate: (password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const PasswordContext = createContext<PasswordContextType | undefined>(undefined);

const AUTH_KEY = 'dayhub_authenticated';

export function PasswordProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check if already authenticated in session storage
    return sessionStorage.getItem(AUTH_KEY) === 'true';
  });
  const [isLoading, setIsLoading] = useState(false);

  const authenticate = async (password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Call backend to create session
      const response = await fetch('/api/trpc/auth.adminLogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { password } }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.result?.data?.json?.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem(AUTH_KEY, 'true');
        setIsLoading(false);
        return true;
      }

      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(AUTH_KEY);
    // Clear cookie by making logout call
    fetch('/api/trpc/auth.logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      credentials: 'include',
    }).catch(() => {});
  };

  return (
    <PasswordContext.Provider value={{ isAuthenticated, authenticate, logout, isLoading }}>
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
