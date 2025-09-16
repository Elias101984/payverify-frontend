import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

/**
 * QRPreviewPage
 * ---------------------------------------
 * Allows manual input of a QR token for verification preview.
 * SRP: Standalone page for previewing QR token decoding.
 * DRY: Delegates decoding/validation to `/verify/:token` route.
 */
const QRPreviewPage: React.FC = () => {
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    /**
     * Navigate to /verify/:token if token is valid
     */
    const handleVerify = () => {
        if (!token.trim()) {
            setError('Please paste a token.');
            return;
        }
        setError('');
        navigate(`/verify/${token}`);
    };

    return (
        <>
            <Navbar />
            <div className="container mt-5">
                <h2>QR Code Token Preview</h2>
                <p className="text-muted">Paste a valid QR token to verify and preview merchant details.</p>

                <div className="mb-3">
                    <label htmlFor="tokenInput" className="form-label">JWT Token:</label>
                    <textarea
                        id="tokenInput"
                        className="form-control"
                        rows={4}
                        placeholder="Paste JWT token here"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                    />
                </div>

                {error && <div className="alert alert-danger">{error}</div>}

                <button className="btn btn-primary" onClick={handleVerify}>
                    Verify QR Code
                </button>
            </div>
        </>
    );
};

export default QRPreviewPage;
