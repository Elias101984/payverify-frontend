import { sequelize } from '../src/config/db';
import { UserModel } from '../src/models/User';
import { MerchantModel } from '../src/models/Merchant';
import { TransactionModel } from '../src/models/Transaction';
import bcrypt from 'bcryptjs';

const seed = async () => {
    try {
        await sequelize.sync({ force: true });
        console.log(' Database synced');

        const hashedPassword = await bcrypt.hash('password123', 10);

        const user = await UserModel.create({
            name: 'Demo User',
            email: 'demo@example.com',
            password: hashedPassword,
            role: 'merchant',
        });

        const merchant = await MerchantModel.create({
            name: 'Demo Merchant',
            userId: user.id,
        });

        await TransactionModel.bulkCreate([
            { merchantId: merchant.id, amount: 100.0, status: 'completed' },
            { merchantId: merchant.id, amount: 50.0, status: 'pending' },
            { merchantId: merchant.id, amount: 200.0, status: 'failed' },
        ]);

        console.log(' Database seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error(' Error seeding database:', err);
        process.exit(1);
    }
};

seed();
