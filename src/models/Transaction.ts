import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/db';

interface TransactionAttributes {
    id: number;
    amount: number;
    status: string;
    merchantId: number;
    createdAt?: Date;
    updatedAt?: Date;
}

// Allow creating a transaction without specifying `id` (auto-incremented)
interface TransactionCreationAttributes extends Optional<TransactionAttributes, 'id'> { }

/**
 * Sequelize Transaction model class with attributes and helper methods.
 */
class Transaction extends Model<TransactionAttributes, TransactionCreationAttributes>
    implements TransactionAttributes {
    public id!: number;
    public amount!: number;
    public status!: string;
    public merchantId!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    /**
     * Creates a transaction for the given merchant.
     * Changed: replaced hardcoded `TransactionModel` with `this` for proper static context.
     */
    static async createForMerchant(
        merchantId: number,
        amount: number,
        status: string = 'pending'
    ) {
        return await this.create({ merchantId, amount, status });
    }

    /**
     * Finds all transactions for a merchant, paginated.
     * Changed: replaced hardcoded `TransactionModel` with `this` for proper static context.
     */
    static async findByMerchant(
        merchantId: number,
        limit = 10,
        offset = 0
    ) {
        return await this.findAndCountAll({
            where: { merchantId },
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });
    }
}

/**
 * Initializes the Sequelize model and attaches it to the `Transaction` class.
 *  Changed: removed unnecessary `TransactionModel` variable.
 *  Why: keeps API clean and uses class name consistently throughout.
 */
Transaction.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        amount: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('pending', 'completed', 'failed'),
            allowNull: false,
            defaultValue: 'pending',
        },
        merchantId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: 'Transaction',
        tableName: 'transactions',
        timestamps: true, //  Added: makes it explicit that Sequelize will manage createdAt & updatedAt
    }
);

/**
 *  Changed export: Export the `Transaction` class directly as default.
 *  Why: cleaner, consistent import across app.
 */
export default Transaction;
