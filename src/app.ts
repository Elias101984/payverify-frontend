import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';


// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Swagger API docs ( updated to use swagger-jsdoc and annotations)
import { swaggerUi, swaggerSpec } from './config/swagger';
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
import authRoutes from './routes/authRoutes';
import merchantRoutes from './routes/merchantRoutes';
import adminRoutes from './routes/adminRoutes';
import transactionRoutes from './routes/transactionRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import paymentRoutes from './routes/paymentRoutes';

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/payments', paymentRoutes);

export default app;
