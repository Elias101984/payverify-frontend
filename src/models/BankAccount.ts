import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/db';
import {Merchant} from './Merchant';

interface BankAccountAttributes {
    id: number;
    account_number: string;
    bank_name: string;
    account_name?: string;
    merchant_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

// Optional fields when creating
interface BankAccountCreationAttributes extends Optional<BankAccountAttributes, 'id'> { }

/**
 * BankAccount Model
 * Represents a merchant's bank account record.
 */
class BankAccount extends Model<BankAccountAttributes, BankAccountCreationAttributes>
    implements BankAccountAttributes {
    public id!: number;
    public account_number!: string;
    public bank_name!: string;
    public account_name?: string;
    public merchant_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

// Model definition
BankAccount.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        account_number: {
            type: DataTypes.STRING(30),
            allowNull: false,
            unique: true
        },
        bank_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        account_name: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        merchant_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    },
    {
        sequelize,
        tableName: 'bank_accounts',
        modelName: 'BankAccount',
        timestamps: true
    }
);


export default BankAccount;
