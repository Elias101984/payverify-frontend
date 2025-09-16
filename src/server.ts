// src/server.ts

// ✅ NEW: Load environment variables as early as possible (DB creds, JWT secrets, etc.)
import 'dotenv/config';

import app from './app';
import { sequelize, testConnection } from './config/db';

// ✅ IMPORTANT: Import models so their `.init(...)` runs (Sequelize registers them)
// These imports are intentionally kept even if not referenced directly.
import { User } from './models/User';
import { Merchant } from './models/Merchant';
import Transaction from './models/Transaction';

// ✅ NEW: Bring in models that participate in the new Bank ↔ Token relationship
import Bank from './models/Bank';
import BankLoginToken from './models/BankLoginToken';

// ✅ NEW: Central place to wire associations (avoids circular-import timing issues)
import { applyAssociations } from './models/associations';

// Use a strict parse for port; default to 5000
const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
    try {
        console.log(' Attempting to connect to the database…');
        await testConnection();
        console.log(' Database connection has been established successfully.');

        // ✅ NEW: Apply associations AFTER all models have been imported/initialized.
        // WHY: Prevents "Cannot read properties of undefined (reading 'Sequelize')" caused by
        // calling belongsTo/hasMany before a peer model finishes initialization.
        applyAssociations();
        console.log(' Sequelize associations applied.');

        // ✅ Keep sync in development only; rely on migrations elsewhere.
        if ((process.env.NODE_ENV || 'development') === 'development') {
            // If you're actively changing schemas in dev, you can use { alter: true } temporarily.
            await sequelize.sync();
            console.log(' Models synchronized with database (development).');
        } else {
            console.log(' Skipping sequelize.sync() (NODE_ENV !== development).');
        }

        // Start Express server
        app.listen(PORT, () => {
            console.log(` Server is running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error(` Error starting on port ${PORT}:`, err);
        process.exit(1);
    }
};

startServer();
