// src/app.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';

// Load environment variables from .env file
dotenv.config();
console.log('[mail] from:', process.env.SENDGRID_FROM_EMAIL || process.env.NOTIFY_FROM_EMAIL);
console.log('[mail] key present:', !!process.env.SENDGRID_API_KEY);


// Initialize the Express application
const app = express();

// Global middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routers
import authRoutes from './routes/authRoutes';
import merchantRoutes from './routes/merchantRoutes';
import adminRoutes from './routes/adminRoutes';
import transactionRoutes from './routes/transactionRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import paymentRoutes from './routes/paymentRoutes';
import qrRoutes from './routes/qr';
import bankRoutes from './routes/bankRoutes';            // registration + admin (plural: /api/banks)
import bankAuthRoutes from './routes/bankAuthRoutes';    // magic-link login + profile (singular: /api/bank)
import userRoutes from './routes/userRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import refundRoutes from './routes/refundRoutes';
import disputeRoutes from './routes/disputeRoutes';
import aiRoutes from './routes/aiRoutes';
import bankMerchantRoutes from './routes/bankMerchantRoutes';

app.use('/api/bank', bankAuthRoutes);      // login, verify, me
app.use('/api/bank', bankMerchantRoutes);  // merchants: pending/approve/rejec


// (Remove any old app.use('/api/ai', aiRoutes) unless you intentionally want both)
app.use('/api/analytics', analyticsRoutes);


// So rate-limit sees the real client IP when behind a proxy/CDN
app.set('trust proxy', 1);

// …
app.use('/api', refundRoutes);
app.use('/api', disputeRoutes);
app.use('/api', analyticsRoutes); // if not already present
app.use('/api', aiRoutes);


// …
app.use('/api', refundRoutes);
app.use('/api', disputeRoutes);

// Mount application routes
app.use('/api/auth', authRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/qr', qrRoutes);


// 🔑 Bank auth (magic link + profile):
// Exposes:
//   POST /api/bank/login/request
//   GET  /api/bank/login/verify
//   GET  /api/bank/me
app.use('/api/bank', bankAuthRoutes);

// 🏦 Bank lifecycle (register/pending/approve/reject):
// Exposes:
//   POST /api/banks/register
//   GET  /api/banks/pending
//   PATCH /api/banks/approve/:id
//   PATCH /api/banks/reject/:id
app.use('/api/banks', bankRoutes); // ← mount once (duplicate removed)

app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

// Swagger (mount AFTER routes so it never conflicts)
import { swaggerUi, swaggerSpec } from './config/swagger';
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Optional: simple health check
app.get('/healthz', (_req, res) => res.json({ ok: true }));

export default app;
