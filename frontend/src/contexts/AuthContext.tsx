import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: number;
  username: string;
  email: string;
  restaurantId?: number;
  restaurantName?: string;
  restaurantSlug?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const AUTH_STORAGE_KEY = 'qrmenu_auth';
const TOKEN_STORAGE_KEY = 'qrmenu_token';
const REFRESH_TOKEN_STORAGE_KEY = 'qrmenu_refresh_token';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Verify token is still valid
          const isValid = await validateToken(storedToken);
          if (!isValid) {
            // Try to refresh token
            const refreshed = await refreshToken();
            if (!refreshed) {
              logout();
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const validateToken = async (tokenToValidate: string): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5092/api'}/auth/validate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenToValidate),
      });

      if (response.ok) {
        const result = await response.json();
        return result.isValid;
      }
      return false;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  const login = async (usernameOrEmail: string, password: string, rememberMe: boolean = false): Promise<void> => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5092/api'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usernameOrEmail,
          password,
          rememberMe,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      
      // Store auth data
      setToken(data.token);
      setUser(data.user);
      
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
      
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refreshToken);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      if (!storedRefreshToken) {
        return false;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5092/api'}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: storedRefreshToken,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      setToken(data.token);
      setUser(data.user);
      
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user));
      
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refreshToken);
      }

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
    refreshToken,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 