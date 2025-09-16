import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Button from '../components/Button';

interface QRPayload {
    merchantId: number;
    businessName: string;
    accountNumber: string;
    bankName: string;
    token: string;
    amount: number;
    description: string;
}

const QRVerificationPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [qrData, setQrData] = useState<QRPayload | null>(null);
    const [valid, setValid] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setError('No token provided');
            return;
        }

        try {
            const decoded = jwtDecode<QRPayload>(token);
            setQrData(decoded);

            axios
                .post('http://localhost:3001/api/qr/validate', { token })
                .then((res) => {
                    if (res.data.valid) {
                        setValid(true);
                    } else {
                        setValid(false);
                        setError('Token is invalid or expired');
                    }
                })
                .catch(() => {
                    setValid(false);
                    setError('Failed to validate token with server');
                });
        } catch (err) {
            setError('Invalid QR token format');
            setValid(false);
        }
    }, [token]);

    return (
        <>
            <Navbar />
            <div className="container mt-4">
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item">
                            <Link to="/dashboard">Home</Link>
                        </li>
                        <li className="breadcrumb-item active" aria-current="page">
                            QR Verification
                        </li>
                    </ol>
                </nav>

                <h2 className="mb-4">QR Code Verification</h2>

                {valid === null && <p>Validating token...</p>}
                {error && <div className="alert alert-danger">{error}</div>}

                {valid && qrData && (
                    <div className="card p-4 shadow-sm">
                        <h4 className="mb-3 text-success">Merchant Verified</h4>

                        <p><strong>Business Name:</strong> {qrData.businessName}</p>
                        <p><strong>Bank:</strong> {qrData.bankName}</p>
                        <p><strong>Account Number:</strong> {qrData.accountNumber}</p>
                        {qrData.amount && (
                            <p><strong>Amount:</strong> ₦{qrData.amount.toLocaleString()}</p>
                        )}
                        {qrData.description && (
                            <p><strong>Description:</strong> {qrData.description}</p>
                        )}

                        <Button className="btn-outline-secondary mt-3" onClick={() => window.history.back()}>
                            Back
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
};

export default QRVerificationPage;
