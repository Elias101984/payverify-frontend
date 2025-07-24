import { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Transaction } from '../types';
import CreateTransactionForm from '../components/CreateTransactionForm';

/**
 * TransactionsPage
 *
 * SRP: Responsible only for fetching, displaying, and updating transactions on this page.
 * Loose coupling: Relies on reusable components (`api.ts`, `CreateTransactionForm`) and not hardcoded logic.
 * Scalable: Ready for more features (pagination, filtering).
 */
const TransactionsPage = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    /**
     * Fetch transactions for logged-in user.
     * Handles redirect if not authenticated.
     */
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        api
            .get('/transactions', {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setTransactions(res.data.transactions || res.data); // handles paginated or flat
            })
            .catch((err) => {
                console.error('Error fetching transactions', err);
                setError('Failed to fetch transactions');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [navigate]);

    /**
     * Renders a styled status badge based on transaction status.
     *
     * SRP: Isolated presentation logic for status display.
     */
    const renderStatusBadge = (status: string) => {
        const className =
            status === 'completed'
                ? 'badge bg-success'
                : status === 'pending'
                    ? 'badge bg-warning text-dark'
                    : 'badge bg-danger';
        return <span className={className}>{status}</span>;
    };

    /**
     * Adds a newly created transaction to the top of the list.
     * SRP: Keeps transaction list state update logic separate.
     */
    const handleTransactionCreated = (txn: Transaction) => {
        setTransactions([txn, ...transactions]);
    };

    // DRY: Centralized rendering for loading & error states
    if (loading) return <p>Loading transactions...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className="container mt-4">
            <h2>My Transactions</h2>

            {/* reusable CreateTransactionForm */}
            <CreateTransactionForm onTransactionCreated={handleTransactionCreated} />

            {transactions.length === 0 ? (
                <p>No transactions found.</p>
            ) : (
                <table className="table table-hover table-bordered mt-3">
                    <thead className="table-dark">
                        <tr>
                            <th>ID</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((txn) => (
                            <tr key={txn.id}>
                                <td>{txn.id}</td>
                                <td>${txn.amount.toFixed(2)}</td>
                                <td>{renderStatusBadge(txn.status)}</td>
                                <td>{new Date(txn.createdAt).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Placeholder for future pagination */}
            <nav>
                <ul className="pagination justify-content-center">
                    <li className="page-item disabled">
                        <a className="page-link" href="#">&laquo;</a>
                    </li>
                    <li className="page-item active">
                        <a className="page-link" href="#">1</a>
                    </li>
                    <li className="page-item">
                        <a className="page-link" href="#">2</a>
                    </li>
                    <li className="page-item">
                        <a className="page-link" href="#">3</a>
                    </li>
                    <li className="page-item">
                        <a className="page-link" href="#">&raquo;</a>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

export default TransactionsPage;
