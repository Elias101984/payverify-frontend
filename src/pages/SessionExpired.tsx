import React from 'react';
import { Link } from 'react-router-dom';

const SessionExpired = () => {
    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Session Expired</h2>
            <p>Your session has expired. Please log in again.</p>
            <Link to="/login">Go to Login</Link>
        </div>
    );
};

export default SessionExpired;
