import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db';

export interface UserAttributes {
    id: number;
    email: string;
    password_hash: string;
    role: string;
    merchantId?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface UserCreationAttributes extends Partial<UserAttributes> { }

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public id!: number;
    public email!: string;
    public password_hash!: string;
    public role!: string;
    public merchantId?: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export const UserModel = User.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        password_hash: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        role: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'merchant',
        },
        merchantId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'users',
        timestamps: true,
    }
);
