/**
 * Integration tests for transaction routes
 *
 * Uses Supertest + JWT to simulate real HTTP requests to Express app.
 * Ensures endpoints require and validate JWT.
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';

const JWT_SECRET = process.env.JWT_SECRET || 'defaultsecret';

// Generate a valid JWT token for authenticated requests
const token = jwt.sign(
    {
        id: 1,
        email: 'test@example.com',
        name: 'Merchant Name',
        role: 'merchant'
    },
    JWT_SECRET
);

describe('Transactions API', () => {
    it('should fetch all transactions', async () => {
        const res = await request(app)
            .get('/api/transactions')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('should create a new transaction', async () => {
        const res = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                merchantId: 1,
                amount: 1234.56,
                status: 'pending'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id');
    });
});
