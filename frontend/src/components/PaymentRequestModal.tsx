// =============================================================================
// PaymentRequestModal.tsx (UPDATED)
//
// EXISTING FUNCTIONALITY PRESERVED:
// ------------------------------------------------------------
// ✅ Displays payment request details
// ✅ Displays QR code
// ✅ Copies payment link
// ✅ Downloads QR code
// ✅ Downloads PDF invoice
// ✅ Opens public invoice/payment page
// ✅ Extracts public token from payment_link
//
// NEW CHANGES:
// ------------------------------------------------------------
// ✅ Added getFrontendPaymentLink()
// ✅ Normalizes old/stored payment links to the current frontend domain
// ✅ QR code now uses the normalized frontend payment URL
// ✅ Copy Link now copies the normalized frontend payment URL
// ✅ Open Invoice now opens the normalized frontend payment URL
// ✅ PDF token extraction now uses the normalized payment URL
//
// WHY THIS CHANGE WAS NEEDED:
// ------------------------------------------------------------
// Some payment intents may contain an old or incorrectly generated URL:
//
//   https://payverifyv1.onrender.com/pay/<token>
//
// The /pay/:token route belongs to the React frontend hosted on Vercel.
// It is NOT an Express backend route on Render.
//
// Therefore, the frontend now:
// 1. Reads the existing payment_link.
// 2. Finds the "/pay/" portion of the URL.
// 3. Extracts the public payment token.
// 4. Rebuilds the URL using window.location.origin.
//
// Example:
//
// OLD:
//   https://payverifyv1.onrender.com/pay/abc123
//
// NORMALIZED:
//   https://payverify-web-v2.vercel.app/pay/abc123
//
// This also protects existing payment intents already stored in the database
// with an outdated or incorrect frontend hostname.
// =============================================================================

import React, { useState, useEffect } from "react";
import { Modal, Button, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import { QRCodeCanvas } from "qrcode.react";

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

const PaymentRequestModal: React.FC<Props> = ({
    open,
    onClose,
    paymentIntent
}) => {

    const [cachedIntent, setCachedIntent] = useState(paymentIntent);
    const [copied, setCopied] = useState(false);

    // =============================================================================
    // EXISTING:
    // Keep the locally cached payment intent synchronized with the payment intent
    // received from the parent component.
    // =============================================================================
    useEffect(() => {
        if (paymentIntent) {
            setCachedIntent(paymentIntent);
        }
    }, [paymentIntent]);

    // =============================================================================
    // NEW: NORMALIZE PAYMENT LINK TO CURRENT FRONTEND DOMAIN
    //
    // WHAT CHANGED:
    // ------------------------------------------------------------
    // The payment_link returned by the backend may contain an old or incorrect
    // hostname, for example:
    //
    //   https://payverifyv1.onrender.com/pay/<token>
    //
    // Since /pay/:token is a React frontend route, we extract the token and
    // rebuild the URL using the current browser origin.
    //
    // In production:
    //
    //   window.location.origin
    //
    // becomes:
    //
    //   https://payverify-web-v2.vercel.app
    //
    // In local development it automatically becomes:
    //
    //   http://localhost:5173
    //
    // WHY:
    // ------------------------------------------------------------
    // This prevents the frontend from opening /pay/:token on the Render backend,
    // where Express correctly returns:
    //
    //   Cannot GET /pay/<token>
    //
    // It also fixes existing payment intents that may already have an incorrect
    // payment_link stored in the database.
    // =============================================================================
    const getFrontendPaymentLink = (): string => {

        const storedLink = cachedIntent?.payment_link;

        if (!storedLink) {
            return "";
        }

        try {
            // Parse the stored payment link.
            //
            // The second argument allows this to also work if storedLink
            // is ever returned as a relative URL instead of an absolute URL.
            const parsedUrl = new URL(
                storedLink,
                window.location.origin
            );

            // The public frontend payment route always contains:
            //
            //   /pay/<token>
            //
            // We use this marker to locate the token regardless of which
            // hostname was originally stored.
            const marker = "/pay/";

            // Find where "/pay/" begins inside the URL pathname.
            //
            // Example pathname:
            //
            //   /pay/abc123
            //
            // markerIndex will be 0.
            //
            // If the URL were:
            //
            //   /something/pay/abc123
            //
            // markerIndex would point to the location where "/pay/" begins.
            const markerIndex =
                parsedUrl.pathname.indexOf(marker);

            // If the URL does not contain /pay/, we cannot safely extract
            // a payment token, so preserve the original URL.
            if (markerIndex === -1) {
                return storedLink;
            }

            // Extract everything after "/pay/".
            //
            // Example:
            //
            //   pathname = /pay/abc123
            //   marker   = /pay/
            //
            // Result:
            //
            //   token = abc123
            const token =
                parsedUrl.pathname.substring(
                    markerIndex + marker.length
                );

            // If token extraction somehow produces an empty value,
            // preserve the original link instead of creating /pay/.
            if (!token) {
                return storedLink;
            }

            // Rebuild the payment URL using the CURRENT frontend domain.
            //
            // Production:
            //   https://payverify-web-v2.vercel.app/pay/abc123
            //
            // Local:
            //   http://localhost:5173/pay/abc123
            return `${window.location.origin}/pay/${token}`;

        } catch (error) {

            // =============================================================================
            // FALLBACK:
            //
            // If URL parsing fails for any reason, attempt simple string extraction.
            //
            // Example:
            //
            //   https://payverifyv1.onrender.com/pay/abc123
            //
            // split("/pay/")[1]
            //
            // returns:
            //
            //   abc123
            // =============================================================================
            const token =
                storedLink.split("/pay/")[1];

            if (token) {
                return `${window.location.origin}/pay/${token}`;
            }

            // If the link cannot be normalized safely,
            // preserve the original value.
            return storedLink;
        }
    };

    // =============================================================================
    // NEW:
    // Resolve the normalized frontend payment URL once for use throughout
    // this render.
    //
    // All user-facing payment actions below now use this URL instead of
    // cachedIntent.payment_link directly.
    // =============================================================================
    const frontendPaymentLink = getFrontendPaymentLink();

    // =============================================================================
    // IMPORTANT:
    // Keep this conditional return AFTER the hooks above.
    //
    // React hooks must always execute in the same order on every render.
    // =============================================================================
    if (!open) return null;

    // =============================================================================
    // UPDATED: COPY PAYMENT LINK
    //
    // BEFORE:
    //   cachedIntent.payment_link
    //
    // NOW:
    //   frontendPaymentLink
    //
    // WHY:
    // Ensures users copy the Vercel frontend URL rather than an old Render URL.
    // =============================================================================
    const handleCopy = async () => {

        if (!frontendPaymentLink) return;

        try {
            await navigator.clipboard.writeText(
                frontendPaymentLink
            );

            setCopied(true);

            toast.success("Copied");

            setTimeout(
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

    // =============================================================================
    // EXISTING: DOWNLOAD QR CODE
    //
    // The QR code itself is now generated from frontendPaymentLink below,
    // so the downloaded QR image will also point to the correct frontend URL.
    // =============================================================================
    const downloadQR = () => {

        const canvas =
            document.querySelector("canvas");

        if (!canvas) {
            toast.error(
                "Unable to find payment QR code"
            );

            return;
        }

        const url =
            canvas.toDataURL("image/png");

        const link =
            document.createElement("a");

        link.href = url;
        link.download = "payment-qr.png";

        link.click();
    };

    // =============================================================================
    // UPDATED: DOWNLOAD PDF INVOICE
    //
    // WHAT CHANGED:
    // ------------------------------------------------------------
    // Token extraction now uses frontendPaymentLink instead of the original
    // cachedIntent.payment_link.
    //
    // WHY:
    // ------------------------------------------------------------
    // Keeps token extraction consistent with the normalized payment URL.
    // =============================================================================
    const downloadPDF = () => {

        if (!frontendPaymentLink) {
            toast.error(
                "Payment link is unavailable"
            );

            return;
        }

        const token =
            frontendPaymentLink.split("/pay/")[1];

        if (!token) {
            toast.error(
                "Unable to determine invoice token"
            );

            return;
        }

        // =============================================================================
        // EXISTING PDF ROUTE PRESERVED
        //
        // NOTE:
        // This remains unchanged from your existing implementation.
        // =============================================================================
        window.open(
            `/api/invoices/token/${token}/pdf`,
            "_blank",
            "noopener,noreferrer"
        );
    };

    // =============================================================================
    // NEW: OPEN INVOICE HANDLER
    //
    // BEFORE:
    //
    //   window.open(
    //       cachedIntent?.payment_link,
    //       "_blank"
    //   )
    //
    // NOW:
    //
    //   window.open(
    //       frontendPaymentLink,
    //       "_blank"
    //   )
    //
    // WHY:
    // ------------------------------------------------------------
    // Prevents navigation to:
    //
    //   https://payverifyv1.onrender.com/pay/<token>
    //
    // and ensures navigation to:
    //
    //   https://payverify-web-v2.vercel.app/pay/<token>
    // =============================================================================
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
                    ₦{cachedIntent?.amount?.toLocaleString()}
                </h4>

                <Badge bg="warning">
                    Pending
                </Badge>

                <div className="text-center my-3">

                    {/* =========================================================
                        UPDATED:
                        QR now contains the normalized frontend payment URL.

                        OLD:
                            cachedIntent?.payment_link

                        NEW:
                            frontendPaymentLink

                        WHY:
                        Scanning the QR must open the Vercel frontend payment
                        page, not the Render backend.
                       ========================================================= */}
                    <QRCodeCanvas
                        value={frontendPaymentLink}
                        size={200}
                    />

                </div>

                {/* =============================================================
                    UPDATED:
                    Display the corrected frontend payment link to the user.
                   ============================================================= */}
                <small>
                    {frontendPaymentLink}
                </small>

            </Modal.Body>

            <Modal.Footer>

                <Button onClick={handleCopy}>
                    {copied ? "Copied" : "Copy Link"}
                </Button>

                <Button onClick={downloadQR}>
                    Download QR
                </Button>

                <Button onClick={downloadPDF}>
                    Download PDF
                </Button>

                {/* =============================================================
                    UPDATED:
                    Uses the normalized frontend URL rather than opening the
                    backend-generated payment_link directly.
                   ============================================================= */}
                <Button onClick={handleOpenInvoice}>
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