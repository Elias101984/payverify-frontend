// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { loginUser, registerUser } from '../services/api';

interface DecodedToken {
    id: number;
    email: string;
    name?: string;
    role: string;
    exp: number;
}

interface User {
    id: number;
    email: string;
    name?: string;
    role: string;
}

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

interface Merchant {
    id: number;
    name: string;
    userId: number;
    account_number: string;
    bank_name: string;
    qr_code?: string;
    createdAt: string;
}

interface AuthContextProps {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void; // ⬅️ unchanged API used by Navbar
    register: (data: RegisterData) => Promise<{ merchant: Merchant }>;
    setSession: (token: string, user: User) => void;
}

interface AuthProviderProps {
    children: React.ReactNode;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    /** 
     * 🔒 Private helper: wipe session WITHOUT redirect.
     * Used for internal flows (e.g., boot-time token expiry) so we don't force navigation.
     */
    const clearSession = useCallback(() => {
        setToken(null);
        setUser(null);
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } catch { }
    }, []);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            try {
                const payload: DecodedToken = jwtDecode(storedToken);
                if (payload.exp && Date.now() >= payload.exp * 1000) {
                    // ⛔ Was: logout() — which would redirect.
                    // ✅ Now: just clear session so app can render public routes (e.g., Landing) without a forced redirect.
                    clearSession();
                } else {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser) as User);
                }
            } catch (err) {
                console.error('Failed to decode token', err);
                clearSession();
            }
        }
    }, [clearSession]);

    const setSession = (newToken: string, newUser: User) => {
        try {
            const payload: DecodedToken = jwtDecode(newToken);
            if (payload.exp && Date.now() >= payload.exp * 1000) {
                clearSession();
                return;
            }
        } catch (e) {
            console.error('Invalid token passed to setSession', e);
            clearSession();
            return;
        }

        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const login = async (email: string, password: string) => {
        const res = await loginUser({ email, password });
        const { token } = res.data;

        const payload: DecodedToken = jwtDecode(token);
        const nextUser: User = {
            id: payload.id,
            email: payload.email,
            name: payload.name,
            role: payload.role,
        };

        setSession(token, nextUser);
    };

    const register = async (data: RegisterData): Promise<{ merchant: Merchant }> => {
        const res = await registerUser(data);
        const { token, merchant } = res.data;

        const payload: DecodedToken = jwtDecode(token);
        const nextUser: User = {
            id: payload.id,
            email: payload.email,
            name: payload.name,
            role: payload.role,
        };

        setSession(token, nextUser);
        return { merchant };
    };

    /**
     * 🚪 Explicit logout: clear session and redirect to Landing page.
     * - We use a hard redirect to guarantee no protected UI flashes and remove back-stack to the previous protected page.
     */
    const logout = () => {
        clearSession();
        window.location.replace('/'); // ⬅️ go to Landing page (default route)
    };

    const value: AuthContextProps = {
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,     // Navbar keeps calling this — no component changes needed
        register,
        setSession,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
};
