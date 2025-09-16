import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { saveAs } from 'file-saver';

/**
 * Props expected from the transaction context
 */
export interface QRCodeDisplayProps {
    businessName: string;
    accountNumber: string;
    bankName: string;
    amount: number;
    description: string;
}

/**
 * QRCodeDisplay
 * ---------------------------------------------------------
 * SRP: Generates and displays a downloadable QR code image.
 * DRY: QR content generation and image blob logic are centralized.
 * Loose Coupling: Receives all props externally (no global state).
 */
const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
    businessName,
    accountNumber,
    bankName,
    amount,
    description
}) => {
    const [qrUrl, setQrUrl] = useState<string>('');
    const [qrBlob, setQrBlob] = useState<Blob | null>(null);

    /**
     * Generate QR code when input values change
     */
    useEffect(() => {
        const generateQR = async () => {
            const qrPayload = {
                businessName,
                accountNumber: '****' + accountNumber.slice(-4),
                bankName,
                amount,
                description
            };

            const qrString = JSON.stringify(qrPayload);

            try {
                // Generate data URL for on-screen display
                const url = await QRCode.toDataURL(qrString);
                setQrUrl(url);

                // Generate binary blob for file download
                const buffer = await QRCode.toBuffer(qrString);
                const blob = new Blob([buffer], { type: 'image/png' });
                setQrBlob(blob);
            } catch (err) {
                console.error('QR generation error', err);
            }
        };

        generateQR();
    }, [businessName, accountNumber, bankName, amount, description]);

    /**
     * Download the QR code as PNG
     */
    const handleDownload = () => {
        if (qrBlob) {
            saveAs(qrBlob, `PayVerify-QR-${Date.now()}.png`);
        }
    };

    return (
        <div className="mt-4 p-3 border rounded shadow-sm text-center">
            <h5>Generated QR Code</h5>
            {qrUrl && (
                <>
                    <img src={qrUrl} alt="QR Code" className="img-fluid my-3" />
                    <button className="btn btn-outline-primary" onClick={handleDownload}>
                        Download QR Code
                    </button>
                </>
            )}
        </div>
    );
};

export default QRCodeDisplay;
