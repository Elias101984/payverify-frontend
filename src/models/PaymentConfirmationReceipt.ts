import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/db';
import Payment from './Payment';

/**
 * Interface for PaymentConfirmationReceipt model attributes
 */
interface PaymentConfirmationReceiptAttributes {
    id: number;
    paymentId: number;
    receiptUrl: string;
    deliveredTo: string;
    deliveredAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

// `id` is optional during creation
interface PaymentConfirmationReceiptCreationAttributes
    extends Optional<PaymentConfirmationReceiptAttributes, 'id'> { }

/**
 * PaymentConfirmationReceipt model
 * 
 * SRP: Represents a confirmation document (e.g., PDF or image) 
 * that proves a payment was processed and delivered to the customer.
 */
class PaymentConfirmationReceipt
    extends Model<PaymentConfirmationReceiptAttributes, PaymentConfirmationReceiptCreationAttributes>
    implements PaymentConfirmationReceiptAttributes {

    public id!: number;
    public paymentId!: number;
    public receiptUrl!: string;
    public deliveredTo!: string;
    public deliveredAt!: Date;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    /**
     * Sequelize association — this receipt belongs to one payment.
     */
    static associate() {
        this.belongsTo(Payment, {
            foreignKey: 'paymentId',
            as: 'payment',
            onDelete: 'CASCADE'
        });
    }
}

// Sequelize model initialization
PaymentConfirmationReceipt.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        paymentId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        receiptUrl: {
            type: DataTypes.STRING,
            allowNull: false
        },
        deliveredTo: {
            type: DataTypes.STRING,
            allowNull: false
        },
        deliveredAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        sequelize,
        modelName: 'PaymentConfirmationReceipt',
        tableName: 'payment_confirmation_receipts',
        timestamps: true
    }
);

export default PaymentConfirmationReceipt;