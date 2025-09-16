// src/components/AdminBanksPanel.tsx
import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

type BankRow = {
    id: number;
    bankName: string;
    contactEmail: string;
    contactPhone: string;
    contactPerson: string;
    status: 'Pending' | 'Active' | 'Rejected';
    createdAt: string;
};

export default function AdminBanksPanel() {
    const { token } = useAuth(); // ⬅️ NEW
    const [banks, setBanks] = useState<BankRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<number | null>(null);

    const auth = token ? { Authorization: `Bearer ${token}` } : undefined;

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get<BankRow[]>('/banks/pending', { headers: auth });
            setBanks(res.data);
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message ?? 'Failed to load pending banks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

    const approve = async (id: number) => {
        if (!confirm('Approve this bank?')) return;
        setBusyId(id);
        try {
            await api.patch(`/banks/approve/${id}`, {}, { headers: auth });
            setBanks(prev => prev.filter(b => b.id !== id));
            toast.success('Bank approved. Email sent.');
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message ?? 'Approval failed');
        } finally {
            setBusyId(null);
        }
    };

    const reject = async (id: number) => {
        const reason = prompt('Enter a short reason (optional):') ?? '';
        if (!confirm('Reject this bank?')) return;
        setBusyId(id);
        try {
            await api.patch(`/banks/reject/${id}`, { reason }, { headers: auth });
            setBanks(prev => prev.filter(b => b.id !== id));
            toast.info('Bank rejected. Email sent.');
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message ?? 'Rejection failed');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h4 className="mb-0">Pending Banks</h4>
                <button className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading}>
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="text-muted">Loading pending banks…</div>
            ) : banks.length === 0 ? (
                <div className="alert alert-success mb-0">No pending banks 🎉</div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-sm align-middle">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Bank</th>
                                <th>Contact</th>
                                <th>Phone</th>
                                <th>Person</th>
                                <th>Submitted</th>
                                <th style={{ width: 180 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {banks.map((b, i) => (
                                <tr key={b.id}>
                                    <td>{i + 1}</td>
                                    <td>{b.bankName}</td>
                                    <td>{b.contactEmail}</td>
                                    <td>{b.contactPhone}</td>
                                    <td>{b.contactPerson}</td>
                                    <td>{new Date(b.createdAt).toLocaleString()}</td>
                                    <td>
                                        <div className="btn-group">
                                            <button
                                                className="btn btn-success btn-sm"
                                                onClick={() => approve(b.id)}
                                                disabled={busyId === b.id}
                                            >
                                                {busyId === b.id ? 'Working…' : 'Approve'}
                                            </button>
                                            <button
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={() => reject(b.id)}
                                                disabled={busyId === b.id}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <small className="text-muted d-block mt-2">
                Approval sends an email with a link to the bank login page. Rejection sends a polite message with optional reason.
            </small>
        </div>
    );
}
