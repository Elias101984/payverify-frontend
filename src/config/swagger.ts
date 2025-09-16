import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * Swagger configuration for the PayVerify API.
 * Includes:
 * - Global metadata
 * - JWT security scheme
 * - Reusable schemas: Merchant, User, Transaction, QRResponse, AuditLog, PaymentConfirmation
 */

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'PayVerify API',
            version: '1.0.0',
            description: 'API documentation for PayVerify backend',
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Local development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                // ✅ Merchant schema
                Merchant: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Tunde Motors' },
                        userId: { type: 'integer', example: 1 },
                        cac_number: { type: 'string', example: 'CAC123456' },
                        tin_number: { type: 'string', example: 'TIN112233' },
                        bvn: { type: 'string', example: '22334455667' },
                        account_number: { type: 'string', example: '0123456789' },
                        bank_name: { type: 'string', example: 'Zenith Bank' },
                        qrToken: { type: 'string', example: 'jwt.qr.token' },
                        qrUrl: { type: 'string', example: 'https://cloudinary.com/qrs/qr.png' },
                        qrGeneratedAt: { type: 'string', format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },

                // ✅ User schema
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        email: { type: 'string', example: 'merchant@example.com' },
                        password_hash: { type: 'string', example: '$2a$10$hashed...' },
                        role: { type: 'string', example: 'merchant' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },

                // ✅ Transaction schema
                Transaction: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 101 },
                        amount: { type: 'number', format: 'float', example: 5000.0 },
                        status: { type: 'string', example: 'completed' },
                        reference: { type: 'string', example: 'TXN123456789' },
                        merchantId: { type: 'integer', example: 1 },
                        qrUrl: { type: 'string', example: 'https://cloudinary.com/qrs/qr.png' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },

                // ✅ QR Code response schema
                QRResponse: {
                    type: 'object',
                    properties: {
                        token: { type: 'string', example: 'jwt.token.payload' },
                        qrUrl: { type: 'string', example: 'https://cloudinary.com/qrs/qr.png' },
                        verifyUrl: { type: 'string', example: 'https://payverify.com/verify/jwt.token.payload' },
                    },
                },

                // ✅ Audit log schema
                AuditLog: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        action: { type: 'string', example: 'QR code scanned' },
                        performedBy: { type: 'string', example: 'user@example.com' },
                        ipAddress: { type: 'string', example: '192.168.0.1' },
                        timestamp: { type: 'string', format: 'date-time' },
                        entityType: { type: 'string', example: 'Merchant' },
                        entityId: { type: 'integer', example: 1 },
                    },
                },

                // ✅ Payment confirmation schema
                PaymentConfirmation: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        transactionId: { type: 'integer', example: 101 },
                        confirmedBy: { type: 'string', example: 'bank_admin@gtbank.com' },
                        confirmationTime: { type: 'string', format: 'date-time' },
                        method: { type: 'string', example: 'manual' },
                        status: { type: 'string', example: 'confirmed' },
                    },
                },

                // ✅ Error response schema (standardized)
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Something went wrong' },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },

    // ✅ Pull Swagger annotations from route & controller files
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerUi, swaggerSpec };
