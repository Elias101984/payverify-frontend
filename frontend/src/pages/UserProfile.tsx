// src/pages/UserProfile.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ ADDED: for back button
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';

const UserProfile = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate(); // ✅ ADDED

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [saving, setSaving] = useState(false);

    const onChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirm) {
            toast.error('New passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            toast.error('New password must be at least 8 characters');
            return;
        }
        try {
            setSaving(true);
            await api.post(
                '/auth/change-password',
                { currentPassword, newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirm('');
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ||
                (err?.response?.status === 401 ? 'Current password is incorrect' : 'Failed to change password');
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container mt-4" style={{ maxWidth: 720 }}>
            {/* ✅ NEW: Header row with back button. Keeps your existing content fully intact. */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="mb-0">Profile Settings</h2>
                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => navigate('/dashboard')}
                    aria-label="Back to Dashboard"
                    title="Back to Dashboard"
                >
                    ← Back to Dashboard
                </button>
            </div>

            <p className="text-muted">Manage your account details and security.</p>

            {/* Account card (unchanged) */}
            <div className="card mt-3 mb-4">
                <div className="card-body">
                    <h5 className="card-title">Account</h5>
                    <div className="mb-2"><strong>Email:</strong> {user?.email}</div>
                    <div className="mb-2"><strong>Role:</strong> {user?.role}</div>
                </div>
            </div>

            {/* Change password (unchanged) */}
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title mb-3">Change Password</h5>
                    <form onSubmit={onChangePassword}>
                        <div className="mb-3">
                            <label>Current Password</label>
                            <input
                                className="form-control"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label>New Password</label>
                            <input
                                className="form-control"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="At least 8 characters"
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label>Confirm New Password</label>
                            <input
                                className="form-control"
                                type="password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder="Re-enter new password"
                                required
                            />
                        </div>
                        <button className="btn btn-primary" type="submit" disabled={saving}>
                            {saving ? 'Saving…' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
