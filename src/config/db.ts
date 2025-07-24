/**
 * Sequelize Database Configuration & Connection
 * 
 * Reason: Centralized DB config keeps connection logic DRY and decoupled.
 * Enables reuse across all models and services.
 */

import { Sequelize } from 'sequelize';

// Load DB credentials from environment variables
const DB_NAME = process.env.DB_NAME || 'payverifydb';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASS || 'payverify';
const DB_HOST = process.env.DB_HOST || 'localhost';

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    dialect: 'postgres',
    logging: false // disable SQL logging
});

// Utility function to test DB connection
export const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log(' Database connection established successfully.');
    } catch (error) {
        console.error(' Unable to connect to the database:', error);
    }
};
