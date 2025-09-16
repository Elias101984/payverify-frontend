import { useLocation } from 'react-router-dom';

const Breadcrumbs = () => {
    const location = useLocation();
    const segments = location.pathname.split('/').filter(Boolean);

    return (
        <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
                <li className="breadcrumb-item">
                    <a href="/dashboard">Home</a>
                </li>
                {segments.map((seg, idx) => (
                    <li key={idx} className={`breadcrumb-item ${idx === segments.length - 1 ? 'active' : ''}`}>
                        {seg.replace(/-/g, ' ')}
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;
