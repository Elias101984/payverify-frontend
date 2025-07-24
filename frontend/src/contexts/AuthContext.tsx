import React, { createContext, useContext, useEffect, useState } from 'react';
import { loginUser, registerUser } from '../services/api';

/**
 * User type describing decoded JWT payload
 */
interface User {
    id: number;
    email: string;
    role: string;
    name?: string;
}

interface AuthContextProps {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    register: (data: RegisterData) => Promise<void>;
}

interface AuthProviderProps {
    children: React.ReactNode;
}

/**
 * Registration payload fields.
 * Change: added all required merchant fields.
 */
interface RegisterData {
    name: string;
    email: string;
    password: string;
    cac_number: string;
    tin_number?: string;
    bvn?: string;
    account_number: string;
    bank_name: string;
    qr_code?: string;
    role?: string;
}

// Create AuthContext with default undefined for safety
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        // On mount, check localStorage for persisted session
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            // Decode token and check expiration
            const payload = JSON.parse(atob(storedToken.split('.')[1]));
            const exp = payload.exp;

            if (exp && Date.now() >= exp * 1000) {
                // Token expired
                logout();
            } else {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            }
        }
    }, []);

    /**
     * Login: calls backend, saves token & decoded user
     */
    const login = async (email: string, password: string) => {
        const res = await loginUser({ email, password });
        const { token } = res.data;

        const payload: User & { exp: number } = JSON.parse(atob(token.split('.')[1]));

        setToken(token);
        setUser(payload);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(payload));
    };

    /**
     * Register: calls backend, saves token & decoded user
     */
    const register = async (data: RegisterData) => {
        const res = await registerUser(data);
        const { token } = res.data;

        const payload: User & { exp: number } = JSON.parse(atob(token.split('.')[1]));

        setToken(token);
        setUser(payload);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(payload));
    };

    /**
     * Logout: clears state & storage
     */
    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const value: AuthContextProps = {
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,
        register,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Custom hook to consume AuthContext safely
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
