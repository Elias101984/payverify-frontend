import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * LoginPage Component
 *
 * Handles login form and redirects to the originally requested page (if any)
 * or to /dashboard by default after successful login.
 */
const LoginPage: React.FC = () => {
    const { login } = useAuth();                   // Auth context login method
    const navigate = useNavigate();               // Router navigation
    const location = useLocation();               // Get current route state

    // Where the user originally wanted to go, or fallback to dashboard
    const from = (location.state as any)?.from?.pathname || '/dashboard';

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    /**
     * Handle form submit
     * On success ? navigate to `from`
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await login(email, password);
            navigate(from, { replace: true });   // Redirect to intended page
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="container mt-5">
            <h2>Login</h2>

            <form onSubmit={handleSubmit} className="mt-3">
                {/* Email */}
                <div className="mb-3">
                    <label>Email</label>
                    <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                {/* Password */}
                <div className="mb-3">
                    <label>Password</label>
                    <input
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {/* Error message */}
                {error && (
                    <div className="alert alert-danger">
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button type="submit" className="btn btn-primary">
                    Login
                </button>
            </form>
        </div>
    );
};

export default LoginPage;
