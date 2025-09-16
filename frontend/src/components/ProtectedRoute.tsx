import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * ProtectedRoute
 *
 * If user is not authenticated, redirect to /login
 * and pass the current location as `state.from`
 * so LoginPage can redirect back to this page after successful login.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation(); //  get current attempted URL

    if (!isAuthenticated) {
        //  pass `from` so login knows where to return
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
