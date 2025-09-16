// src/components/CreateTransactionForm.tsx

/**
 * CreateTransactionForm
 * ------------------------------------------------------------------------
 * Purpose: Allows a user to create a new transaction and then redirects them
 *          to a dedicated Transaction Details page where a QR code is displayed.
 *
 * SRP (Single Responsibility Principle):
 *  - This component ONLY handles transaction creation and redirection.
 *  - QR code rendering is delegated to the TransactionCreatedPage.
 *
 * DRY (Don't Repeat Yourself):
 *  - All API calls are centralized to the /transactions endpoint.
 *  - No duplication of QR generation logic here (backend handles it).
 *
 * Decoupled Design:
 *  - Component can optionally notify a parent via `onTransactionCreated` callback.
 *  - Merchant selection and transaction form are independent UI blocks.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';

// -------------------- Types --------------------
// Describes the structure of a transaction object returned from the backend
type Transaction = {
    id: number;
    reference: string; // auto-generated unique reference (by backend)
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    merchantId: number;
    createdAt: string;
    qrUrl?: string | null; // optional URL to QR code image
};

// Minimal data needed to render merchant options in a dropdown
type MerchantLite = { id: number; name: string };

// Props interface allowing an optional callback after transaction creation
interface Props {
    onTransactionCreated?: (tx: Transaction) => void;
}

const CreateTransactionForm = ({ onTransactionCreated }: Props) => {
    // -------------------- Form State --------------------
    const [amount, setAmount] = useState<string>(''); // Transaction amount
    const [status, setStatus] = useState<Transaction['status']>('pending'); // Default to 'pending'

    // -------------------- Merchant Selection State --------------------
    const [merchants, setMerchants] = useState<MerchantLite[]>([]); // Available merchants for current user
    const [selectedMerchantId, setSelectedMerchantId] = useState<number | ''>(''); // Which merchant is selected
    const [loadingMerchants, setLoadingMerchants] = useState(false); // Loading indicator for merchant list

    // -------------------- Submission State --------------------
    const [submitting, setSubmitting] = useState(false); // Tracks whether form is being submitted
    const navigate = useNavigate();

    // -------------------- Fetch Merchants for Current User --------------------
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return; // Skip fetch if user is not authenticated

        setLoadingMerchants(true);

        api.get('/me/merchants', { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => {
                // Map API response to lightweight merchant list
                const list: MerchantLite[] = (res.data || []).map((m: any) => ({
                    id: m.id,
                    name: m.name || m.businessName || `#${m.id}`,
                }));
                setMerchants(list);

                // If only one merchant exists, auto-select it
                if (list.length === 1) setSelectedMerchantId(list[0].id);
            })
            .catch(() => {
                // If fetch fails, leave merchant list empty
                setMerchants([]);
            })
            .finally(() => setLoadingMerchants(false));
    }, []);

    // -------------------- Can Submit? --------------------
    // Validates that the form can be submitted:
    // - Must have a positive amount
    // - Must have a merchant selected
    // - Must not already be submitting
    const canSubmit = useMemo(() => {
        const amt = Number(amount);
        return !submitting && amt > 0 && typeof selectedMerchantId === 'number';
    }, [amount, submitting, selectedMerchantId]);

    // -------------------- Submit Handler --------------------
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const token = localStorage.getItem('token');
        if (!token) {
            // Redirect unauthenticated users to login
            navigate('/login');
            return;
        }

        if (!canSubmit) return;

        try {
            setSubmitting(true);

            // 1️⃣ Create transaction via backend
            const res = await api.post(
                '/transactions',
                {
                    amount: Number(amount),
                    status,
                    merchantId: selectedMerchantId, // Required field
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const created: Transaction = res.data;

            // Show success toast with reference number if available
            toast.success(`Transaction created${created?.reference ? ` (${created.reference})` : ''}`);

            // Reset form fields after success
            setAmount('');
            setStatus('pending');

            // 2️⃣ Notify parent component if a callback was provided
            onTransactionCreated?.(created);

            // 3️⃣ Redirect to details page where QR code will be displayed
            if (created?.reference) {
                navigate(`/transactions/${created.reference}`);
            }
        } catch (err: any) {
            // Handle API errors gracefully
            console.error(err);
            const msg = err?.response?.data?.message || 'Transaction failed.';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // -------------------- UI Rendering --------------------
    return (
        <div className="card mb-4">
            <div className="card-body">
                {/* Title */}
                <h5 className="mb-3">Create New Transaction</h5>

                {/* Form Start */}
                <form onSubmit={handleSubmit}>
                    {/* Row for form inputs, responsive with Bootstrap grid */}
                    <div className="row g-3">
                        {/* Merchant Selector */}
                        <div className="col-12 col-md-4">
                            <label className="form-label">Merchant</label>
                            {loadingMerchants ? (
                                // Show loading state
                                <input className="form-control" disabled value="Loading merchants…" />
                            ) : merchants.length <= 1 ? (
                                // Show single merchant or no merchant
                                <input
                                    className="form-control"
                                    disabled
                                    value={
                                        merchants.length === 1
                                            ? `${merchants[0].name} (#${merchants[0].id})`
                                            : 'No merchants'
                                    }
                                />
                            ) : (
                                // Dropdown for multiple merchants
                                <select
                                    className="form-select"
                                    value={selectedMerchantId}
                                    onChange={(e) => setSelectedMerchantId(Number(e.target.value))}
                                    required
                                >
                                    <option value="">Select a merchant…</option>
                                    {merchants.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} (#{m.id})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Amount Input */}
                        <div className="col-12 col-md-4">
                            <label className="form-label">Amount (₦)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="form-control"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>

                        {/* Status Selector */}
                        <div className="col-12 col-md-4">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as Transaction['status'])}
                            >
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="mt-3">
                        <button
                            type="submit"
                            className="btn btn-primary fw-semibold" // fw-semibold makes button text bold
                            disabled={!canSubmit}
                        >
                            Create Transaction
                        </button>
                    </div>
                </form>

                {/* Note: QR code is intentionally NOT rendered here.
                    After creation, user is redirected to TransactionCreatedPage,
                    which handles QR display, download, regeneration, and email. */}
            </div>
        </div>
    );
};

export default CreateTransactionForm;
``