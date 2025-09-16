// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';

import LandingPage from './pages/LandingPage';        // ✅ NEW: import your landing page

// existing imports…
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import ProtectedRoute from './components/ProtectedRoute';
import QRCodeGeneratorPage from './pages/QRCodeGeneratorPage';
import QRVerificationPage from './pages/QrVerificationPages';
import ExpiredSessionPage from './pages/ExpiredSessionPage';
import QRPreviewPage from './pages/QRPreviewPage';
import AdminTransactionsPage from './pages/adminTransactionPage';
import BankLoginPage from './pages/BankLoginPage';
import UserRegistration from './pages/UserRegistration';
import BankRegistrationForm from './pages/BankRegistrationForm';
import MerchantCreatedPage from './pages/MerchantCreatedPage';
import UserProfile from './pages/UserProfile';
import TransactionDetailsPage from './pages/TransactionDetailsPage';
import BankDashboard from './pages/BankDashboard';
import BankProtectedRoute from './components/BankProtectedRoute';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
//import MerchantsPage from './pages/MerchantsPage';




const App = () => {
    return (
        <>
            <ToastContainer position="top-center" autoClose={3000} />

            <Routes>
                {/* 🔁 OLD (remove this): <Route path="/" element={<Navigate to="/login" replace />} /> */}
                {/* ✅ NEW: Landing page is now the first page users see */}
                <Route path="/" element={<LandingPage />} />

                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/register-user" element={<UserRegistration />} />
                <Route path="/register-bank" element={<BankRegistrationForm />} />
                <Route path="/bank-login" element={<BankLoginPage />} />
                <Route path="/verify/:token" element={<QRVerificationPage />} />
                <Route path="/qr-verify" element={<QRPreviewPage />} />
                <Route path="/expired" element={<ExpiredSessionPage />} />
                <Route path="/admin-transactions" element={<AdminTransactionsPage />} />
                <Route path="/transactions/:reference" element={<TransactionDetailsPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Protected (unchanged) */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/transactions"
                    element={
                        <ProtectedRoute>
                            <TransactionsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/qr-generator"
                    element={
                        <ProtectedRoute>
                            <QRCodeGeneratorPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <UserProfile />
                        </ProtectedRoute>
                    }
                />

                {/* Bank protected */}
                <Route
                    path="/bank-dashboard"
                    element={
                        <BankProtectedRoute>
                            <BankDashboard />
                        </BankProtectedRoute>
                    }
                />

                {/* Optional: unknown routes go home */}
                <Route path="*" element={<Navigate to="/" replace />} />

                <Route path="/merchant-created/:merchantId" element={<MerchantCreatedPage />} />

            </Routes>

            
        </>
    );
};

export default App;
