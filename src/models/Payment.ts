import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/db';
import Transaction from './Transaction';
import BankAccount from './BankAccount';

/**
 * Interface for Payment model attributes
 */
interface PaymentAttributes {
    id: number;
    transactionId: number;
    bankAccountId: number;
    amount: number;
    method: string;
    status: 'initiated' | 'success' | 'failed';
    createdAt?: Date;
    updatedAt?: Date;
}

// `id` is optional when creating a Payment
interface PaymentCreationAttributes extends Optional<PaymentAttributes, 'id'> { }

/**
 * Payment model - stores payment confirmation details per transaction.
 * SRP: Focuses solely on payment record tracking.
 */
class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> implements PaymentAttributes {
    public id!: number;
    public transactionId!: number;
    public bankAccountId!: number;
    public amount!: number;
    public method!: string;
    public status!: 'initiated' | 'success' | 'failed';
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    // Declare the optional association fields here
    public transaction?: Transaction;
    static associate() {
        this.belongsTo(Transaction, {
            foreignKey: 'transactionId',
            as: 'transaction',
            onDelete: 'CASCADE'
        });

        this.belongsTo(BankAccount, {
            foreignKey: 'bankAccountId',
            as: 'bankAccount',
            onDelete: 'SET NULL'
        });
    }
}

// Initialize Sequelize model
Payment.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        transactionId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        bankAccountId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        amount: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        method: {
            type: DataTypes.STRING,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('initiated', 'success', 'failed'),
            defaultValue: 'initiated'
        }
    },
    {
        sequelize,
        modelName: 'Payment',
        tableName: 'payments',
        timestamps: true
    }
);

export default Payment;
