import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

interface Transaction {
    id: number;
    amount: number;
    status: string;
    merchantId: number;
    createdAt: string;
}

const AdminTransactionsPage = () => {
    const { token, logout } = useAuth();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [count, setCount] = useState(0);
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await api.get('/transactions/admin', {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params: {
                    limit,
                    offset
                }
            });
            setTransactions(res.data.rows);
            setCount(res.data.count);
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 401) {
                logout();
            } else {
                setError('Failed to load transactions');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
        // eslint-disable-next-line
    }, [offset]);

    const handlePrev = () => setOffset(Math.max(0, offset - limit));
    const handleNext = () => {
        if (offset + limit < count) {
            setOffset(offset + limit);
        }
    };

    return (
        <>
            <Navbar />
            <div className="container mt-4">
                <h2>Admin - All Transactions</h2>

                {loading && <p>Loading...</p>}
                {error && <div className="alert alert-danger">{error}</div>}

                {!loading && !error && (
                    <>
                        <table className="table table-striped">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Merchant ID</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Created At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => (
                                    <tr key={tx.id}>
                                        <td>{tx.id}</td>
                                        <td>{tx.merchantId}</td>
                                        <td>{tx.amount}</td>
                                        <td>{tx.status}</td>
                                        <td>{new Date(tx.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="d-flex justify-content-between">
                            <button className="btn btn-primary" disabled={offset === 0} onClick={handlePrev}>
                                Previous
                            </button>
                            <button
                                className="btn btn-primary"
                                disabled={offset + limit >= count}
                                onClick={handleNext}
                            >
                                Next
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default AdminTransactionsPage;
