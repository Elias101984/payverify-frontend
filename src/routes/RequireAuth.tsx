// src/routes/RequireAuth.tsx
// Guard that blocks protected routes when there is NO token OR the token is EXPIRED.
// This prevents Dashboard/Transactions from mounting and firing requests.

import { Navigate, Outlet, useLocation } from 'react-router-dom';

function isTokenExpired(token?: string | null): boolean {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // exp is in seconds
        return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
    } catch {
        return true;
    }
}

export default function RequireAuth() {
    const location = useLocation();
    // Read directly from localStorage so it matches your axios interceptor source of truth
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token || isTokenExpired(token)) {
        // clear any stale data to avoid loops
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } catch { }
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
}
