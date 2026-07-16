//// src/services/api.tsx
///**
// * Axios client + endpoint helpers for PayVerify frontend.
// *
// * New (now):
// * - Added `registerMerchant()` helper for POST /merchants using snake_case keys
// *   that match your DB (cac_number, tin_number, bvn, bank_name, account_number, email, name).
// *   This removes the field-name mismatch that caused 400s.
// */

//// src/services/api.ts
//import axios from 'axios';

///**
// * Base API URL
// * - Must be set at build time in Azure for Vite
// * - Example: https://payverify-api.azurecontainerapps.io
// */
////const API_BASE_URL =
////    import.meta.env.VITE_API_BASE_URL ||
////    '/api'; // safe fallback for local dev with proxy

////swap the apibaseurl for local development REMEMBER TO SWITCH IT BACK FOR PROD

////const API_BASE_URL = import.meta.env.VITE_API_BASE;
//const API_BASE_URL = import.meta.env.VITE_API_URL;


//export const api = axios.create({
//    baseURL: API_BASE_URL,
//    headers: { 'Content-Type': 'application/json' },
//    timeout: Number(import.meta.env.VITE_HTTP_TIMEOUT_MS) || 15000,
//});

//// Attach auth token if present
//api.interceptors.request.use((config) => {
//    const token = localStorage.getItem('token');
//    if (token) {
//        config.headers = config.headers ?? {};
//        (config.headers as any).Authorization = `Bearer ${token}`;
//    }
//    return config;
//});

//// Handle auth expiration
//api.interceptors.response.use(
//    (res) => res,
//    (err) => {
//        if (err?.response?.status === 401) {
//            localStorage.removeItem('token');
//            localStorage.removeItem('user');
//        }
//        return Promise.reject(err);
//    }
//);

//// ---------- Auth (existing) ----------
//export const loginUser = (data: { email: string; password: string }) =>
//    api.post('/auth/login', data);

//export const registerUser = (data: {
//    name: string;
//    email: string;
//    password: string;
//    cac_number: string;
//    tin_number?: string;
//    bvn?: string;
//    account_number: string;
//    bank_name: string;
//    qr_code?: string;
//    role?: string;
//}) => api.post('/auth/register', data);

//// ---------- Merchant (NEW helper) ----------
//export const registerMerchant = (data: {
//    name: string;
//    cac_number: string;
//    tin_number: string;
//    bvn: string;
//    bank_name: string;
//    account_number: string;
//    email: string;
//}) => api.post('/merchants', data);

//// ---------- Password reset (existing) ----------
//export const requestPasswordReset = (email: string) =>
//    api.post('/auth/forgot-password', { email });

//export const resetPassword = (token: string, password: string) =>
//    api.post('/auth/reset-password', { token, password });

//// ---------- Transactions / Analytics / Dashboard (existing) ----------
//export const fetchTransactions = (params?: { limit?: number; offset?: number }) =>
//    api.get('/transactions', { params });

//export const createTransaction = (data: {
//    merchantId?: number;
//    amount: number;
//    status: 'pending' | 'completed' | 'failed';
//}) => api.post('/transactions', data);

//export const fetchAllTransactionsAdmin = (params?: { limit?: number; offset?: number }) =>
//    api.get('/transactions/admin', { params });

//export const fetchTransactionsByMerchantIdAdmin = (
//    merchantId: number,
//    params?: { limit?: number; offset?: number }
//) => api.get(`/transactions/admin/${merchantId}`, { params });

//export const fetchTransactionsSummary = (params?: {
//    interval?: 'day' | 'week' | 'month';
//    dateFrom?: string;
//    dateTo?: string;
//    merchantId?: number;
//}) => api.get('/analytics/transactions/summary', { params });

//export const fetchDashboardStats = () => api.get('/dashboard');

//// src/services/api.ts
//export const getRefunds = (txId: number) =>
//    api.get(`/transactions/${txId}/refunds`);

//export const createRefund = (txId: number, payload: { amount: number; reason?: string }) =>
//    api.post(`/transactions/${txId}/refunds`, payload);

//export const getDisputes = (txId: number) =>
//    api.get(`/transactions/${txId}/disputes`);

//export const getFraudBreakdown = () =>
//    api.get('/analytics/fraud-breakdown');

//export default api;




// src/services/api.tsx
/**
 * Central Axios client and endpoint helpers for the PayVerify frontend.
 *
 * WHAT CHANGED:
 * - Fixed the environment-variable name mismatch.
 * - The frontend now reads VITE_API_BASE_URL, which matches Vercel.
 * - Added a local-development fallback.
 * - Added a startup log so the active API URL is visible in the browser console.
 *
 * WHY:
 * The old code used:
 *
 *   import.meta.env.VITE_API_URL
 *
 * but Vercel was configured with:
 *
 *   VITE_API_BASE_URL
 *
 * That made the Axios baseURL undefined, so requests such as /auth/login
 * were sent to the Vercel frontend domain and returned 405.
 */












import axios from 'axios';

// =============================================================================
// MAIN PAYVERIFY API BASE URL
//
// Production:
//   VITE_API_BASE_URL=https://payverifyv1.onrender.com
//
// Local development fallback:
//   http://localhost:5000
//
// Do not add /api here unless your backend routes are mounted under /api.
// Your current helpers call routes such as /auth/login and /merchants.
// =============================================================================

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:5000/api';

console.log('PayVerify API base URL:', API_BASE_URL);

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: Number(import.meta.env.VITE_HTTP_TIMEOUT_MS) || 15000,
});

// =============================================================================
// REQUEST INTERCEPTOR
// Attach JWT token when present.
// =============================================================================

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');

    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});




// =============================================================================
// PURCHASE ORDERS
// =============================================================================

/**
 * Fetch a single purchase order by ID.
 *
 * Uses the shared Axios client so:
 * - VITE_API_BASE_URL is used consistently.
 * - The JWT Authorization header is attached automatically.
 * - Production and local environments use the same API configuration.
 */
export const fetchPurchaseOrderById = (
    purchaseOrderId: number | string
) =>
    api.get(`/purchase-orders/${purchaseOrderId}`);



// =============================================================================
// RESPONSE INTERCEPTOR
// Clear expired authentication state on 401 responses.
// =============================================================================

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }

        return Promise.reject(error);
    }
);

// =============================================================================
// AUTH
// =============================================================================

export const loginUser = (data: {
    email: string;
    password: string;
}) => api.post('/auth/login', data);

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
}) => api.post('/auth/register', data);

// =============================================================================
// MERCHANT
// =============================================================================

export const registerMerchant = (data: {
    name: string;
    cac_number: string;
    tin_number: string;
    bvn: string;
    bank_name: string;
    account_number: string;
    email: string;
}) => api.post('/merchants', data);

// =============================================================================
// PASSWORD RESET
// =============================================================================

export const requestPasswordReset = (email: string) =>
    api.post('/auth/forgot-password', { email });

export const resetPassword = (
    token: string,
    password: string
) => api.post('/auth/reset-password', {
    token,
    password,
});

// =============================================================================
// TRANSACTIONS / ANALYTICS / DASHBOARD
// =============================================================================

export const fetchTransactions = (params?: {
    limit?: number;
    offset?: number;
}) => api.get('/transactions', { params });

export const createTransaction = (data: {
    merchantId?: number;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
}) => api.post('/transactions', data);

export const fetchAllTransactionsAdmin = (params?: {
    limit?: number;
    offset?: number;
}) => api.get('/transactions/admin', { params });

export const fetchTransactionsByMerchantIdAdmin = (
    merchantId: number,
    params?: {
        limit?: number;
        offset?: number;
    }
) => api.get(
    `/transactions/admin/${merchantId}`,
    { params }
);

export const fetchTransactionsSummary = (params?: {
    interval?: 'day' | 'week' | 'month';
    dateFrom?: string;
    dateTo?: string;
    merchantId?: number;
}) => api.get('/analytics/transactions/summary', {
    params,
});

export const fetchDashboardStats = () =>
    api.get('/dashboard');

// =============================================================================
// REFUNDS / DISPUTES / FRAUD
// =============================================================================

export const getRefunds = (transactionId: number) =>
    api.get(`/transactions/${transactionId}/refunds`);

export const createRefund = (
    transactionId: number,
    payload: {
        amount: number;
        reason?: string;
    }
) => api.post(
    `/transactions/${transactionId}/refunds`,
    payload
);

export const getDisputes = (transactionId: number) =>
    api.get(`/transactions/${transactionId}/disputes`);

export const getFraudBreakdown = () =>
    api.get('/analytics/fraud-breakdown');

export default api;