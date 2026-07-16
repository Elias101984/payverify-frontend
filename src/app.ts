// =====================================================================================
// src/app.ts
// =====================================================================================
//
// PURPOSE:
// Main Express application bootstrap file.
//
// RESPONSIBILITIES:
// • Initialize Express
// • Load middleware (CORS, JSON, logging)
// • Mount all application routes
// • Inject Sequelize models into modular route factories
// • Provide health check endpoint
//
// =====================================================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import invoiceRoutes from "./routes/invoiceRoutes";

dotenv.config();

import { sequelize } from './config/db';
import * as models from './models';

import authRoutes from './routes/authRoutes';
import merchantRoutes from './routes/merchantRoutes';
import adminRoutes from './routes/adminRoutes';
import transactionRoutes from './routes/transactionRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import paymentRoutes from './routes/PaymentRoute';
import qrRoutes from './routes/qr';
import bankRoutes from './routes/bankRoutes';
import bankAuthRoutes from './routes/bankAuthRoutes';
import userRoutes from './routes/userRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import refundRoutes from './routes/refundRoutes';
import disputeRoutes from './routes/disputeRoutes';
import aiRoutes from './routes/aiRoutes';
import bankMerchantRoutes from './routes/bankMerchantRoutes';

import { createPurchaseOrderRoutes } from './routes/PurchaseOrderRoutes';
import paymentIntentRoutes from "./routes/paymentIntentRoutes";
import paystackWebhookRoutes from "./routes/paystackWebhookRoutes";
import publicInvoiceRoutes from "./routes/publicInvoiceRoutes";

const app = express();

app.set('trust proxy', 1);

const allowedOrigins =
    process.env.CORS_ORIGINS
        ?.split(',')
        .map(o => o.trim())
        .filter(Boolean) || [];

app.use(
    cors({
        origin: allowedOrigins.length
            ? allowedOrigins
            : true,
        credentials: true,
    })
);

// =====================================================================================
// PAYSTACK WEBHOOK — RAW BODY REQUIRED
// =====================================================================================
//
// CHANGED:
// Mount the webhook router ONCE at /api/webhooks before express.json().
// paystackWebhookRoutes.ts adds /paystack, creating:
//
//     POST /api/webhooks/paystack
//
// This preserves the untouched request body required for signature validation.
// =====================================================================================
app.use(
    "/api/webhooks",
    express.raw({
        type: "application/json",
    }),
    paystackWebhookRoutes
);

app.use(
    express.json({
        limit: '1mb',
    })
);

app.use("/api", publicInvoiceRoutes);

app.use(
    morgan(
        process.env.NODE_ENV === 'production'
            ? 'combined'
            : 'dev'
    )
);

app.use(
    '/api/purchase-orders',
    createPurchaseOrderRoutes(models, sequelize)
);

app.use('/api/auth', authRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/users', userRoutes);
app.use("/api/invoices", invoiceRoutes);

app.use('/api/bank', bankAuthRoutes);
app.use('/api/bank', bankMerchantRoutes);
app.use('/api/banks', bankRoutes);

app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', refundRoutes);
app.use('/api', disputeRoutes);
app.use("/api/payment-intents", paymentIntentRoutes);

app.get('/healthz', (_req, res) => {
    res.json({
        status: 'OK',
        service: 'PayVerify API',
        timestamp: new Date(),
    });
});

// IMPORTANT:
// Do not mount paystackWebhookRoutes again below express.json().
export default app;