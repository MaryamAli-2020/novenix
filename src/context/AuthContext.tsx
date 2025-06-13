import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import api from '../services/api';

interface User {
  _id: string;
  email: string;
  name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOGIN_SUCCESS'; payload: { token: string; user: User } }
  | { type: 'LOGIN_FAIL'; payload: string }
  | { type: 'REGISTER_SUCCESS'; payload: { token: string; user: User } }
  | { type: 'REGISTER_FAIL'; payload: string }
  | { type: 'USER_LOADED'; payload: User }
  | { type: 'AUTH_ERROR' }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const initialState: AuthState = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: Boolean(localStorage.getItem('token')),
  loading: true,
  error: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'USER_LOADED':
      localStorage.setItem('user', JSON.stringify(action.payload));
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
      };
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    case 'AUTH_ERROR':
    case 'LOGIN_FAIL':
    case 'REGISTER_FAIL':
    case 'LOGOUT':
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return {
        ...state,
        token: null,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.type === 'LOGOUT' ? null : ('payload' in action ? action.payload : null),
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user if token exists
  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      if (!state.token) {
        dispatch({ type: 'AUTH_ERROR' });
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (mounted) {
          dispatch({ type: 'USER_LOADED', payload: res.data.user });
        }
      } catch (err) {
        if (mounted) {
          dispatch({ type: 'AUTH_ERROR' });
        }
      }
    };

    loadUser();

    // Set up periodic token refresh (every 6 hours)
    const refreshInterval = setInterval(loadUser, 6 * 60 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(refreshInterval);
    };
  }, [state.token]);

  // Login user
  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login API call...');
      const res = await api.post('/auth/login', { email, password });
      console.log('Login API response:', res.data);

      if (!res.data.token) {
        throw new Error('No token received from server');
      }

      dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });
    } catch (err: any) {
      console.error('Login error details:', {
        error: err,
        response: err.response,
        message: err.response?.data?.message || err.message
      });

      dispatch({
        type: 'LOGIN_FAIL',
        payload: err.response?.data?.message || err.message || 'Login failed. Please try again.'
      });
      throw err;
    }
  };

  // Register user
  const register = async (name: string, email: string, password: string) => {
    try {
      console.log('Attempting registration...');
      const res = await api.post('/auth/register', { name, email, password });
      console.log('Registration response:', res.data);

      if (!res.data.token) {
        throw new Error('No token received from server');
      }

      dispatch({ type: 'REGISTER_SUCCESS', payload: res.data });
    } catch (err: any) {
      console.error('Registration error details:', {
        error: err,
        response: err.response,
        message: err.response?.data?.message || err.message
      });

      dispatch({
        type: 'REGISTER_FAIL',
        payload: err.response?.data?.message || err.message || 'Registration failed. Please try again.'
      });
      throw err;
    }
  };

  // Logout user
  const logout = () => dispatch({ type: 'LOGOUT' });

  // Clear error
  const clearError = () => dispatch({ type: 'CLEAR_ERROR' });

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
