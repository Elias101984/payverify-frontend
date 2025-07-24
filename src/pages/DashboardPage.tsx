import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * DashboardPage
 *
 * Displays stats:
 * - For merchant: only their own transactions.
 * - For admin: all merchants' combined transactions.
 */
const DashboardPage = () => {
    const { token, logout, user } = useAuth();

    // Dashboard stats from API
    const [stats, setStats] = useState<{
        total: number;
        pending: number;
        completed: number;
        sum: number;
    } | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/dashboard', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setStats(res.data);
            } catch (err: any) {
                console.error(err);
                if (err.response?.status === 401) {
                    setError('Session expired. Please log in again.');
                    logout();
                } else {
                    setError('Failed to fetch dashboard stats.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [token, logout]);

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="container mt-4">
                    <p>Loading dashboard...</p>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Navbar />
                <div className="container mt-4">
                    <p style={{ color: 'red' }}>{error}</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="container mt-4">
                <h2>Dashboard</h2>
                <p className="text-muted">
                    {user?.role === 'admin'
                        ? 'Showing global stats for all merchants'
                        : 'Showing stats for your merchant account'}
                </p>

                <div className="row mt-4">
                    <div className="col-md-3">
                        <div className="card text-white bg-primary mb-3">
                            <div className="card-body">
                                <h5 className="card-title">Total Transactions</h5>
                                <p className="card-text">{stats?.total ?? 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3">
                        <div className="card text-white bg-success mb-3">
                            <div className="card-body">
                                <h5 className="card-title">Completed</h5>
                                <p className="card-text">{stats?.completed ?? 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3">
                        <div className="card text-dark bg-warning mb-3">
                            <div className="card-body">
                                <h5 className="card-title">Pending</h5>
                                <p className="card-text">{stats?.pending ?? 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3">
                        <div className="card text-white bg-info mb-3">
                            <div className="card-body">
                                <h5 className="card-title">Total Sum</h5>
                                <p className="card-text">
                                    ${stats?.sum?.toFixed(2) ?? '0.00'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DashboardPage;
