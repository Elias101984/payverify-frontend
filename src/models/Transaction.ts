import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/db';
import { Merchant } from './Merchant';

/**
 * Full set of attributes in the `transactions` table.
 * Added:
 *  - reference: unique string per transaction (for QR & tracking)
 *  - qrUrl: optional Cloudinary URL to QR image
 */
interface TransactionAttributes {
    id: number;
    amount: number;
    status: string;
    merchantId: number;
    reference: string;
    qrUrl?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Attributes allowed when creating a transaction
 */
interface TransactionCreationAttributes extends Optional<TransactionAttributes, 'id' | 'qrUrl'> { }

/**
 * Sequelize Model representing the 'transactions' table.
 */
class Transaction extends Model<TransactionAttributes, TransactionCreationAttributes>
    implements TransactionAttributes {
    public id!: number;
    public amount!: number;
    public status!: string;
    public merchantId!: number;
    public reference!: string;
    public qrUrl?: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public merchant?: Merchant;

    // Custom static method: create a transaction
    static async createForMerchant(
        merchantId: number,
        amount: number,
        status: string,
        reference: string,
        qrUrl?: string
    ) {
        return await this.create({ merchantId, amount, status, reference, qrUrl });
    }

    // Custom static method: find transactions for a merchant
    static async findByMerchant(merchantId: number, limit = 10, offset = 0) {
        return await this.findAndCountAll({
            where: { merchantId },
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });
    }
}

// ✅ Initialize model
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
        reference: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        qrUrl: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: 'Transaction',
        tableName: 'transactions',
        timestamps: true,
    }
);



export default Transaction;
