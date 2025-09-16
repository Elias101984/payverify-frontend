// src/components/AiInsightsPanel.tsx
import { useEffect, useState } from 'react';
import api from '../services/api';

export default function AiInsightsPanel() {
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

    const load = async () => {
        setLoading(true); setErr(null);
        try {
            const { data } = await api.get('/analytics/ai/insights');
            setData(data);
        } catch (e: any) {
            setErr(e?.response?.status === 501 ? 'AI not configured' : (e?.message || 'Failed to load AI insights'));
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    if (err === 'AI not configured') return null; // hide panel if disabled

    return (
        <div className="card mt-4">
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">AI Insights</h5>
                    <button className="btn btn-sm btn-outline-primary" onClick={load}>Refresh</button>
                </div>

                {loading && <div className="mt-3">Analyzing…</div>}
                {err && <div className="alert alert-danger mt-3">{err}</div>}

                {!loading && !err && data && (
                    <>
                        <ul className="mt-3">
                            {(data.insights ?? []).map((i: any, idx: number) => (
                                <li key={idx}><strong>{i.title}:</strong> {i.detail}</li>
                            ))}
                        </ul>
                        {(data.actions?.length ? (
                            <>
                                <div className="text-uppercase opacity-75 mt-3" style={{ fontSize: '.8rem' }}>Suggested Actions</div>
                                <ul className="mb-0">
                                    {data.actions.map((a: string, i: number) => <li key={i}>{a}</li>)}
                                </ul>
                            </>
                        ) : null)}
                    </>
                )}
            </div>
        </div>
    );
}
