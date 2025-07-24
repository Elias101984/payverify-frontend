/**
 * Axios instance for making API calls.
 *
 * Why: DRY & centralized configuration
 */

import axios from 'axios';

const API_BASE_URL =
    process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Axios instance pre-configured for backend
 */
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Login an existing user
 */
export const loginUser = (data: {
    email: string;
    password: string;
}) => {
    return api.post('/auth/login', data);
};

/**
 * Register a new user & merchant
 */
export const registerUser = (data: {
    name: string;
    email: string;
    password: string;
    cac_number: string;
    tin_number?: string;
    bvn?: string;
    account_number: string;
    bank_name: string;
    qr_code?: string;
    role?: string;
}) => {
    return api.post('/auth/register', data);
};

/**
 * Fetch transactions
 */
export const fetchTransactions = () => {
    return api.get('/transactions');
};

/**
 * Create transaction
 */
export const createTransaction = (data: {
    merchantId: number;
    amount: number;
    status: string;
}) => {
    return api.post('/transactions', data);
};

/**
 * Fetch dashboard stats
 */
export const fetchDashboardStats = () => {
    return api.get('/dashboard');
};

/**
 * Default axios instance for custom calls
 */
export default api;
