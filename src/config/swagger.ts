import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Define Swagger options
const options: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'PayVerify API',
            version: '1.0.0',
            description: 'API documentation for PayVerify backend'
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Local server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: ['./src/routes/*.ts'], // Path to route files with @swagger annotations
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerUi, swaggerSpec };
