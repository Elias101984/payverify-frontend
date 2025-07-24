import React, { useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

/**
 * QRCodeGeneratorPage
 *
 * SRP: Page that allows merchant to generate and display a payment QR code.
 * DRY: Reuses API and AuthContext for token.
 */
const QRCodeGeneratorPage: React.FC = () => {
    const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    /**
     * Calls backend `/api/payments/qr` with merchantId, amount & reference.
     * Sets the returned Base64 QR code image URL in state.
     */
    const generateQR = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/payments/qr', {
                params: {
                    merchantId: 1,                // Replace with dynamic merchantId if needed
                    amount: 1000,                 // Replace with dynamic amount
                    reference: 'ORDER123',       //  Replace with dynamic reference
                },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,  //  Pass JWT
                },
            });
            setQrImageUrl(res.data.qrImageUrl);
        } catch (err) {
            console.error(err);
            alert('Failed to generate QR code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="container mt-4">
                <h2>Generate Payment QR Code</h2>
                <p>Click the button below to generate a QR code for a payment request.</p>

                <button className="btn btn-primary" onClick={generateQR} disabled={loading}>
                    {loading ? 'Generating...' : 'Generate QR Code'}
                </button>

                {qrImageUrl && (
                    <div className="mt-4">
                        <h4>QR Code:</h4>
                        <img src={qrImageUrl} alt="QR Code" />
                    </div>
                )}
            </div>
        </>
    );
};

export default QRCodeGeneratorPage;
