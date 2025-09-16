import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

function isExpired(jwt: string): boolean {
    try {
        const payload = JSON.parse(atob(jwt.split('.')[1] || ''));
        if (!payload?.exp) return true;
        return payload.exp * 1000 < Date.now(); // exp is seconds, convert to ms
    } catch {
        return true; // invalid/malformed token -> treat as expired
    }
}

export default function BankProtectedRoute({ children }: { children: ReactNode }) {
    const [ready, setReady] = useState(false);
    const [ok, setOk] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('bank_token') || localStorage.getItem('bankToken');

        if (!stored || isExpired(stored)) {
            // Clean up any stale values for consistency
            localStorage.removeItem('bank_token');
            localStorage.removeItem('bankToken');
            setOk(false);
            setReady(true);
            return;
        }

        // (Optional) Soft role check so a merchant token can’t sneak in
        try {
            const payload = JSON.parse(atob(stored.split('.')[1] || ''));
            if (payload?.role && payload.role !== 'bank') {
                setOk(false);
            } else {
                setOk(true);
            }
        } catch {
            setOk(false);
        }

        setReady(true);
    }, []);

    if (!ready) return null; // or a small spinner/skeleton
    if (!ok) {
        // You can also send a reason if your /bank-login page wants to toast it
        return <Navigate to="/bank-login" replace />;
    }

    return <>{children}</>;
}
