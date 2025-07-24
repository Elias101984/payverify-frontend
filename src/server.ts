import { sequelize, testConnection } from './config/db';
import { User } from './models/User';
import { Merchant } from './models/Merchant';
import app from './app';
import Transaction from './models/Transaction';

// Read PORT from environment variables or fallback to default
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        console.log(' Attempting to connect to the database…');
        await testConnection();
        console.log(' Database connection has been established successfully.');

        // Sync all models
        await sequelize.sync({ alter: true });
        console.log('Models synchronized with database');

        // Optional: Seed sample data (DEV ONLY) — uncomment if needed
        /*
        const hashed = await bcrypt.hash('password123', 10);
        const user = await User.create({ name: 'Test User', email: 'test@example.com', password: hashed });
        const merchant = await Merchant.create({ name: 'Test Merchant', userId: user.id });
        await Transaction.bulkCreate([
          { amount: 100.0, status: 'completed', merchantId: merchant.id },
          { amount: 50.0, status: 'pending', merchantId: merchant.id },
        ]);
        console.log(' Sample data inserted');
        */

        // Start Express server
        app.listen(PORT, () => {
            console.log(` Server is running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error(` Error starting on port ${PORT}:`, err);
        process.exit(1);
    }
};

// Start the server
startServer();
