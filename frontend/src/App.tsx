import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; 
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import ProtectedRoute from './components/ProtectedRoute';
import QRCodeGeneratorPage from './pages/QRCodeGeneratorPage';


const App = () => {
    return (
     <Router>
        <Routes>
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                    <DashboardPage />
                    </ProtectedRoute>
                } />
                <Route path="/transactions" element={
                    <ProtectedRoute>
                        <TransactionsPage />
                    </ProtectedRoute>
                } />
                <Route path="/generate-qr" element={
                    <ProtectedRoute>
                        <QRCodeGeneratorPage />
                    </ProtectedRoute>
                } />

            </Routes>
     </Router >
  );
};

export default App;
