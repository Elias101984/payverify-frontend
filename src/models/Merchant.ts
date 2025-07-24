import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/db';

//  Add all DB columns to the attributes interface
export interface MerchantAttributes {
    id: number;
    name: string;
    userId: number;
    cac_number: string;
    tin_number?: string;
    bvn?: string;
    account_number: string;
    bank_name: string;
    qr_code?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// id is optional for creation, createdAt/updatedAt are auto-managed
export interface MerchantCreationAttributes extends Optional<MerchantAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

//  Class implementation of the model
export class Merchant extends Model<MerchantAttributes, MerchantCreationAttributes> implements MerchantAttributes {
    public id!: number;
    public name!: string;
    public userId!: number;
    public cac_number!: string;
    public tin_number?: string;
    public bvn?: string;
    public account_number!: string;
    public bank_name!: string;
    public qr_code?: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

//  Init model with all columns and DB-level constraints
export const MerchantModel = Merchant.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        cac_number: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        tin_number: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        bvn: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        account_number: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        bank_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        qr_code: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'merchants',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
