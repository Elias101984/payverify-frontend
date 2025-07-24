import { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Transaction } from '../types';

/**
 * Props interface
 * Loose coupling: parent page decides what to do with the created transaction.
 */
interface Props {
    onTransactionCreated: (transaction: Transaction) => void;
}

/**
 * CreateTransactionForm
 *
 * SRP: Handles only the creation of a new transaction through user input.
 * Loose coupling: Does not own the list of transactions — simply notifies the parent.
 * Scalable: Clean state handling & reusable on any page needing this form.
 */
const CreateTransactionForm = ({ onTransactionCreated }: Props) => {
    // Form field state
    const [amount, setAmount] = useState('');
    const [status, setStatus] = useState('pending');

    // User feedback state
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const navigate = useNavigate();

    /**
     * Submit handler for form.
     *
     * SRP: Validates JWT, sends POST to backend, resets form state.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Ensure user is authenticated
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        // Call backend API to create transaction
        api
            .post(
                '/transactions',
                { amount: parseFloat(amount), status }, // payload
                { headers: { Authorization: `Bearer ${token}` } } // auth header
            )
            .then((res) => {
                // On success: clear form & notify parent
                setFormSuccess('Transaction created!');
                setFormError('');
                onTransactionCreated(res.data); // Parent updates transaction list
                setAmount('');
                setStatus('pending');
            })
            .catch(() => {
                // On error: show feedback
                setFormError('Failed to create transaction');
                setFormSuccess('');
            });
    };

    return (
        <div className="card mb-4">
            <div className="card-body">
                <h5>Create New Transaction</h5>

                {/* Feedback messages */}
                {formError && <p className="text-danger">{formError}</p>}
                {formSuccess && <p className="text-success">{formSuccess}</p>}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="row g-2 align-items-center">
                        {/* Amount input */}
                        <div className="col-auto">
                            <input
                                type="number"
                                className="form-control"
                                placeholder="Amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>

                        {/* Status selector */}
                        <div className="col-auto">
                            <select
                                className="form-select"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>

                        {/* Submit button */}
                        <div className="col-auto">
                            <button type="submit" className="btn btn-primary">
                                Create
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTransactionForm;
