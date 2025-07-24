import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Navbar with logout and user info
 */
const Navbar = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container">
                <Link className="navbar-brand" to="/dashboard">PayVerify</Link>
                <div>
                    <span className="text-white me-3">{user?.email}</span>
                    <button onClick={handleLogout} className="btn btn-sm btn-outline-light">
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
