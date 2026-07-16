// =============================================================================
// frontend/src/components/PaymentRequestModal.tsx
// =============================================================================
//
// PURPOSE
// -----------------------------------------------------------------------------
// Displays the reusable payment request modal for an approved purchase order.
//
// EXISTING FUNCTIONALITY PRESERVED
// -----------------------------------------------------------------------------
// ✅ Displays payment request amount and status
// ✅ Displays QR code
// ✅ Copies payment link
// ✅ Downloads QR code
// ✅ Downloads PDF invoice
// ✅ Opens public invoice/payment page
// ✅ Reuses the existing PaymentIntent
//
// WHAT CHANGED
// -----------------------------------------------------------------------------
// ✅ The payment URL is no longer rebuilt from window.location.origin alone.
// ✅ The component now prefers VITE_FRONTEND_URL for the public /pay/:token URL.
// ✅ If the page is ever rendered from a Render backend hostname, it falls back
//    to the configured Vercel frontend instead of generating another Render URL.
// ✅ Old payment links are repaired in-memory by extracting only the token.
// ✅ The PDF download now uses VITE_API_BASE_URL instead of a relative /api URL.
// ✅ QR download now targets this modal's QR canvas specifically.
//
// WHY
// -----------------------------------------------------------------------------
// window.location.origin is only safe when the component is definitely running
// from the Vercel frontend. If the browser is on a Render hostname, rebuilding
// the link from window.location.origin produces:
//
//     https://payverifyv1.onrender.com/pay/<token>
//
// Express does not own /pay/:token, so Render correctly returns:
//
//     Cannot GET /pay/<token>
//
// The /pay/:token route belongs to the React frontend. Therefore this component
// now resolves the frontend base URL explicitly and always builds the customer-
// facing payment URL from that frontend origin.
//
// RECOMMENDED VERCEL ENVIRONMENT VARIABLE
// -----------------------------------------------------------------------------
// VITE_FRONTEND_URL=https://payverify-web-v2.vercel.app
//
// EXISTING API ENVIRONMENT VARIABLE
// -----------------------------------------------------------------------------
// VITE_API_BASE_URL=https://payverifyv1.onrender.com/api
//
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { Badge, Button, Modal } from "react-bootstrap";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "react-toastify";

interface PaymentIntent {
    id: string;
    payment_link: string;
    amount: number;
    status: string;
    merchant_id?: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    paymentIntent: PaymentIntent | null;
}

const PRODUCTION_FRONTEND_FALLBACK =
    "https://payverify-web-v2.vercel.app";

const normalizeBaseUrl = (value: string): string =>
    value.trim().replace(/\/+$/, "");

const extractPaymentToken = (
    paymentLink?: string | null
): string => {
    if (!paymentLink) {
        return "";
    }

    try {
        const parsedUrl = new URL(
            paymentLink,
            window.location.origin
        );

        const marker = "/pay/";
        const markerIndex =
            parsedUrl.pathname.indexOf(marker);

        if (markerIndex === -1) {
            return "";
        }

        return decodeURIComponent(
            parsedUrl.pathname
                .substring(markerIndex + marker.length)
                .replace(/^\/+|\/+$/g, "")
        );
    } catch {
        const token =
            paymentLink.split("/pay/")[1];

        if (!token) {
            return "";
        }

        return decodeURIComponent(
            token
                .split(/[?#]/)[0]
                .replace(/^\/+|\/+$/g, "")
        );
    }
};

const resolveFrontendBaseUrl = (): string => {
    const configuredFrontendUrl =
        String(
            import.meta.env.VITE_FRONTEND_URL || ""
        ).trim();

    if (configuredFrontendUrl) {
        return normalizeBaseUrl(
            configuredFrontendUrl
        );
    }

    const currentOrigin =
        normalizeBaseUrl(
            window.location.origin
        );

    // -------------------------------------------------------------------------
    // SAFETY FALLBACK
    //
    // If this component is ever opened from a Render backend hostname, never
    // use that origin for /pay/:token. That route belongs to the Vercel app.
    // -------------------------------------------------------------------------
    if (
        window.location.hostname
            .toLowerCase()
            .endsWith(".onrender.com")
    ) {
        return PRODUCTION_FRONTEND_FALLBACK;
    }

    return currentOrigin;
};

const resolveApiBaseUrl = (): string => {
    const configuredApiUrl =
        String(
            import.meta.env.VITE_API_BASE_URL ||
            import.meta.env.VITE_API_URL ||
            ""
        ).trim();

    if (configuredApiUrl) {
        return normalizeBaseUrl(
            configuredApiUrl
        );
    }

    // Local backend fallback used by the existing PayVerify setup.
    return "http://localhost:5000/api";
};

const PaymentRequestModal: React.FC<Props> = ({
    open,
    onClose,
    paymentIntent,
}) => {
    const [cachedIntent, setCachedIntent] =
        useState<PaymentIntent | null>(
            paymentIntent
        );

    const [copied, setCopied] =
        useState(false);

    useEffect(() => {
        if (paymentIntent) {
            setCachedIntent(
                paymentIntent
            );
        }
    }, [paymentIntent]);

    // =========================================================================
    // UPDATED: PUBLIC FRONTEND PAYMENT LINK
    // =========================================================================
    //
    // We keep the original token, but always rebuild the public URL using the
    // resolved frontend base URL.
    //
    // This repairs both:
    // - newly returned links with the wrong hostname;
    // - old PaymentIntent rows already stored with a Render hostname.
    // =========================================================================
    const frontendPaymentLink =
        useMemo(() => {
            const token =
                extractPaymentToken(
                    cachedIntent?.payment_link
                );

            if (!token) {
                return "";
            }

            const frontendBaseUrl =
                resolveFrontendBaseUrl();

            return `${frontendBaseUrl}/pay/${token}`;
        }, [cachedIntent?.payment_link]);

    const paymentToken =
        useMemo(
            () =>
                extractPaymentToken(
                    frontendPaymentLink
                ),
            [frontendPaymentLink]
        );

    const qrCanvasId =
        `payment-request-qr-${cachedIntent?.id || "current"}`;

    if (!open) {
        return null;
    }

    const handleCopy = async () => {
        if (!frontendPaymentLink) {
            toast.error(
                "Payment link is unavailable"
            );

            return;
        }

        try {
            await navigator.clipboard.writeText(
                frontendPaymentLink
            );

            setCopied(true);
            toast.success("Copied");

            window.setTimeout(
                () => setCopied(false),
                2000
            );
        } catch (error) {
            console.error(
                "Failed to copy payment link:",
                error
            );

            toast.error(
                "Unable to copy payment link"
            );
        }
    };

    const downloadQR = () => {
        const canvas =
            document.getElementById(
                qrCanvasId
            ) as HTMLCanvasElement | null;

        if (!canvas) {
            toast.error(
                "Unable to find payment QR code"
            );

            return;
        }

        const imageUrl =
            canvas.toDataURL("image/png");

        const downloadLink =
            document.createElement("a");

        downloadLink.href = imageUrl;
        downloadLink.download =
            "payment-qr.png";

        downloadLink.click();
    };

    // =========================================================================
    // UPDATED: PDF DOWNLOAD
    // =========================================================================
    //
    // BEFORE:
    //     /api/invoices/token/<token>/pdf
    //
    // That relative path can be sent to Vercel instead of the Render API.
    //
    // NOW:
    //     <VITE_API_BASE_URL>/invoices/token/<token>/pdf
    //
    // =========================================================================
    const downloadPDF = () => {
        if (!paymentToken) {
            toast.error(
                "Unable to determine invoice token"
            );

            return;
        }

        const apiBaseUrl =
            resolveApiBaseUrl();

        const pdfUrl =
            `${apiBaseUrl}/invoices/token/${encodeURIComponent(
                paymentToken
            )}/pdf`;

        window.open(
            pdfUrl,
            "_blank",
            "noopener,noreferrer"
        );
    };

    const handleOpenInvoice = () => {
        if (!frontendPaymentLink) {
            toast.error(
                "Payment link is unavailable"
            );

            return;
        }

        window.open(
            frontendPaymentLink,
            "_blank",
            "noopener,noreferrer"
        );
    };

    return (
        <Modal
            show={open}
            onHide={onClose}
            centered
            backdrop="static"
        >
            <Modal.Header closeButton>
                <Modal.Title>
                    Payment Request Created
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <h4>
                    ₦
                    {Number(
                        cachedIntent?.amount || 0
                    ).toLocaleString()}
                </h4>

                <Badge bg="warning">
                    {cachedIntent?.status || "Pending"}
                </Badge>

                <div className="text-center my-3">
                    <QRCodeCanvas
                        id={qrCanvasId}
                        value={frontendPaymentLink}
                        size={200}
                    />
                </div>

                <small
                    style={{
                        display: "block",
                        overflowWrap: "anywhere",
                    }}
                >
                    {frontendPaymentLink ||
                        "Payment link unavailable"}
                </small>
            </Modal.Body>

            <Modal.Footer>
                <Button
                    onClick={handleCopy}
                    disabled={!frontendPaymentLink}
                >
                    {copied
                        ? "Copied"
                        : "Copy Link"}
                </Button>

                <Button
                    onClick={downloadQR}
                    disabled={!frontendPaymentLink}
                >
                    Download QR
                </Button>

                <Button
                    onClick={downloadPDF}
                    disabled={!paymentToken}
                >
                    Download PDF
                </Button>

                <Button
                    onClick={handleOpenInvoice}
                    disabled={!frontendPaymentLink}
                >
                    Open Invoice
                </Button>

                <Button onClick={onClose}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default PaymentRequestModal;