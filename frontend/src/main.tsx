// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';      // 1) Bootstrap CSS
import './index.css';                               // 2) your base CSS (if any)
import './styles/transactions-theme.css';           // 3) THEME LAST so it overrides
import 'bootstrap/dist/js/bootstrap.bundle.min.js'; // (optional) Bootstrap JS

import { AuthProvider } from './contexts/AuthContext';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
);
