//import { useEffect, useState } from 'react';
//import { useParams, useNavigate } from 'react-router-dom';
//import axios from 'axios';

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPurchaseOrderById } from '../services/api';

export default function PurchaseOrderDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [po, setPo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPurchaseOrder();
    }, [id]);

    //const loadPurchaseOrder = async () => {
    //    try {
    //        const token = localStorage.getItem('token');

    //        const response = await axios.get(
    //            `${import.meta.env.VITE_API_URL}/purchase-orders/${id}`,
    //            {
    //                headers: {
    //                    Authorization: `Bearer ${token}`
    //                }
    //            }
    //        );

    //        console.log(
    //            'PO ITEMS:',
    //            response.data.data.items
    //        );

    //        console.log('PO RESPONSE:', response.data);
    //        setPo(response.data.data);
    //    } catch (err) {
    //        console.error('Failed to load purchase order:', err);
    //        setPo(null);
    //    } finally {
    //        setLoading(false);
    //    }
    //};

    const loadPurchaseOrder = async () => {
        try {
            setLoading(true);

            if (!id) {
                console.error('Purchase order ID is missing');
                setPo(null);
                return;
            }

            const response = await fetchPurchaseOrderById(id);

            console.log('PO RESPONSE:', response.data);
            console.log('PO ITEMS:', response.data?.data?.items);

            setPo(response.data.data);
        } catch (err) {
            console.error('Failed to load purchase order:', err);
            setPo(null);
        } finally {
            setLoading(false);
        }
    };


    const money = (value: any) =>
        `₦${Number(value || 0).toLocaleString()}`;

    const dateTime = (value: any) =>
        value ? new Date(value).toLocaleString() : 'N/A';

    const dateOnly = (value: any) =>
        value ? new Date(value).toLocaleDateString() : 'N/A';

    const statusClass = (status: string) => {
        switch ((status || '').toLowerCase()) {
            case 'paid':
                return 'bg-success';
            case 'approved':
                return 'bg-primary';
            case 'pending':
                return 'bg-warning text-dark';
            case 'rejected':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    };

    if (loading) {
        return (
            <div className="pv-po-bg">
                <div className="container py-4 text-white">Loading...</div>
            </div>
        );
    }

    if (!po) {
        return (
            <div className="pv-po-bg">
                <div className="container py-4 text-white">
                    Purchase Order not found
                </div>
            </div>
        );
    }

    return (
        <div className="pv-po-bg">
            <div className="container py-4 text-white">

                <button
                    className="btn btn-outline-light btn-sm mb-3"
                    onClick={() => navigate(-1)}
                >
                    ← Back
                </button>

                <div className="pv-po-shell">

                    <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h2 className="mb-1">Purchase Order Details</h2>
                            <div className="text-light opacity-75">
                                {po.poNumber || po.poReference || `PO-${po.id}`}
                            </div>
                        </div>

                        <span className={`badge ${statusClass(po.status)} px-3 py-2`}>
                            {(po.status || 'N/A').toUpperCase()}
                        </span>
                    </div>

                    <div className="row g-3">

                        <div className="col-md-6">
                            <div className="pv-info-card">
                                <h6>Order Summary</h6>

                                <InfoRow label="PO ID" value={po.id} />
                                <InfoRow label="PO Number" value={po.poNumber || po.poReference || `PO-${po.id}`} />
                                <InfoRow label="Amount" value={money(po.totalAmount || po.amount)} />
                                <InfoRow label="Status" value={po.status || 'N/A'} />
                                <InfoRow label="Created" value={dateTime(po.createdAt)} />
                                <InfoRow label="Due Date" value={dateOnly(po.dueDate)} />
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="pv-info-card">
                                <h6>Merchant / Customer</h6>

                                <InfoRow label="Merchant ID" value={po.merchantId || 'N/A'} />
                                <InfoRow label="Merchant Name" value={po.merchantName || po.merchant?.name || 'N/A'} />
                                <InfoRow label="Customer Email" value={po.customerEmail || 'N/A'} />
                                <InfoRow label="Created By" value={po.createdBy || po.userId || 'N/A'} />
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="pv-info-card">
                                <h6>Payment / Invoice</h6>

                                <InfoRow label="Invoice ID" value={po.invoiceId || po.invoice?.id || 'N/A'} />
                                <InfoRow label="Invoice Status" value={po.invoiceStatus || po.invoice?.status || 'N/A'} />
                                <InfoRow label="Payment Intent ID" value={po.paymentIntentId || po.paymentIntent?.id || 'N/A'} />
                                <InfoRow label="Payment Status" value={po.paymentStatus || po.paymentIntent?.status || 'N/A'} />

                                {(po.paymentLink || po.paymentIntent?.payment_link) && (
                                    <a
                                        className="btn btn-primary btn-sm mt-2"
                                        href={po.paymentLink || po.paymentIntent?.payment_link}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Open Payment Link
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="pv-info-card">
                                <h6>Description</h6>
                                <p className="mb-0 text-white">
                                    {po.description || 'No description provided'}
                                </p>
                            </div>
                        </div>

                        {Array.isArray(po.items) && po.items.length > 0 && (
                            <div className="col-12">
                                <div className="pv-info-card">
                                    <h6>Line Items</h6>

                                    <div className="table-responsive">
                                        <table className="table table-dark table-sm table-hover mb-0">
                                            <thead>
                                                <tr>
                                                    <th>Item</th>
                                                    <th>Description</th>
                                                    <th>Qty</th>
                                                    <th>Unit Price</th>
                                                    <th>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {po.items.map((item: any, index: number) => (
                                                    <tr key={item.id || index}>
                                                        <td>{item.name || 'N/A'}</td>
                                                        <td>{item.description || 'N/A'}</td>
                                                        <td>{item.quantity || 0}</td>
                                                        <td>{money(item.unitPrice)}</td>
                                                        <td>{money(item.total)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <StyleBlock />
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: any }) {
    return (
        <div className="pv-info-row">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

const StyleBlock = () => (
    <style>{`
        .pv-po-bg {
            min-height: 100vh;
            background:
                radial-gradient(900px 400px at 70% -10%, rgba(0, 102, 255, 0.22), rgba(0,0,0,0) 60%),
                linear-gradient(180deg, #06070a 0%, #061024 55%, #0a1c40 100%);
        }

        .pv-po-shell {
            max-width: 920px;
            border-radius: 16px;
            padding: 22px;
            background: rgba(255, 255, 255, 0.055);
            border: 1px solid rgba(255,255,255,0.15);
            box-shadow: 0 14px 35px rgba(0,0,0,0.35);
        }

        .pv-info-card {
            height: 100%;
            border-radius: 14px;
            padding: 16px;
            background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04));
            border: 1px solid rgba(255,255,255,0.12);
            color: #ffffff;
        }

        .pv-info-card h6 {
            color: #8ec5ff;
            text-transform: uppercase;
            font-size: 0.78rem;
            letter-spacing: 0.06em;
            margin-bottom: 12px;
        }

        .pv-info-row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.78);
            font-size: 0.92rem;
        }

        .pv-info-row:last-child {
            border-bottom: none;
        }

        .pv-info-row strong {
            color: #ffffff;
            text-align: right;
            font-weight: 700;
            max-width: 60%;
            overflow-wrap: anywhere;
        }

        .table-dark {
            --bs-table-bg: transparent;
            --bs-table-color: #ffffff;
            --bs-table-border-color: rgba(255,255,255,0.12);
        }
    `}</style>
);