import React from 'react';

type BankLite = { bankName?: string | null; accountNumberMasked?: string | null };

type Merchant = {
    id: number;
    name: string;
    email?: string | null;
    userId?: number | null;
    createdAt?: string | Date;
    // 👇 NEW: support top-level fields from your merchants table
    bank_name?: string | null;
    account_number?: string | null;

    // legacy/alt shape (if you ever attach related accounts to the response)
    bankAccounts?: BankLite[];
};

interface Props {
    open: boolean;
    merchant: Merchant | null;
    onClose: () => void;
}

// Mask full account number → ****1234
function maskAcct(raw?: string | null) {
    if (!raw) return '-';
    const s = String(raw).replace(/\s/g, '');
    return s.length <= 4 ? s : '****' + s.slice(-4);
}

const MerchantDetailsDrawer: React.FC<Props> = ({ open, merchant, onClose }) => {
    if (!open || !merchant) return null;

    const firstAcct = merchant.bankAccounts?.[0];

    // 🔁 Prefer bankAccounts[0] if provided, otherwise fall back to top-level fields
    const bankName = firstAcct?.bankName ?? merchant.bank_name ?? '-';
    const acctMasked =
        firstAcct?.accountNumberMasked ??
        (merchant.account_number ? maskAcct(merchant.account_number) : '-');

    const created =
        merchant.createdAt
            ? new Date(merchant.createdAt as any).toLocaleString()
            : '-';

    return (
        <>
            {/* backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 1070,
                }}
            />
            {/* drawer */}
            <div
                role="dialog"
                aria-modal="true"
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: '420px',
                    maxWidth: '100vw',
                    height: '100vh',
                    background:
                        'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    color: '#e9f2ff',
                    borderLeft: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 10px 24px rgba(0,0,0,0.45)',
                    zIndex: 1080,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div
                    className="p-3 d-flex justify-content-between align-items-center"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}
                >
                    <h5 className="mb-0">Merchant Details</h5>
                    <button className="btn btn-outline-light btn-sm" onClick={onClose}>
                        Close
                    </button>
                </div>

                <div className="p-3" style={{ overflowY: 'auto' }}>
                    <div className="mb-3">
                        <div className="text-uppercase opacity-75" style={{ fontSize: '.8rem' }}>
                            Name
                        </div>
                        <div style={{ fontWeight: 700 }}>{merchant.name ?? '-'}</div>
                    </div>

                    <div className="mb-3">
                        <div className="text-uppercase opacity-75" style={{ fontSize: '.8rem' }}>
                            Email
                        </div>
                        <div>{merchant.email ?? '-'}</div>
                    </div>

                    <div className="mb-3">
                        <div className="text-uppercase opacity-75" style={{ fontSize: '.8rem' }}>
                            Merchant ID
                        </div>
                        <div>#{merchant.id}</div>
                    </div>

                    <div className="mb-3">
                        <div className="text-uppercase opacity-75" style={{ fontSize: '.8rem' }}>
                            Created
                        </div>
                        <div>{created}</div>
                    </div>

                    <div className="mb-3">
                        <div className="text-uppercase opacity-75" style={{ fontSize: '.8rem' }}>
                            Primary Bank
                        </div>
                        <div>{bankName}</div>
                    </div>

                    <div className="mb-3">
                        <div className="text-uppercase opacity-75" style={{ fontSize: '.8rem' }}>
                            Account
                        </div>
                        <div>{acctMasked}</div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MerchantDetailsDrawer;
