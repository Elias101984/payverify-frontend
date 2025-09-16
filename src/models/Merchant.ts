// src/models/Merchants.ts
// -----------------------------------------------------------------------------
// What changed & why
// - ❌ Removed `field: 'bankid'` on `bankId`. Your DB has "bankId" (camelCase).
//   Keeping that mapping made Sequelize query "bankid" AS "bankId" and Postgres
//   threw 42703 (column does not exist).
// - ✅ status is a strict union type everywhere to prevent invalid strings.
// - ✅ bankId remains INTEGER NULL with FK semantics (safe for existing rows).
// -----------------------------------------------------------------------------

import { Model, DataTypes, Optional, Association } from 'sequelize';
import { sequelize } from '../config/db';
import { User } from './User';

export interface MerchantAttributes {
    id: number;
    name: string;
    userId: number;
    cac_number: string;
    tin_number?: string | null;
    bvn?: string | null;
    account_number: string;
    bank_name: string;
    qrToken?: string | null;
    qrUrl?: string | null;
    qrGeneratedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    email?: string | null;

    // Normalized approval/ownership fields
    bankId?: number | null; // FK -> banks.id, nullable until assigned
    status: 'pending' | 'approved' | 'rejected';
}

export interface MerchantCreationAttributes
    extends Optional<
        MerchantAttributes,
        | 'id'
        | 'tin_number'
        | 'bvn'
        | 'qrToken'
        | 'qrUrl'
        | 'qrGeneratedAt'
        | 'createdAt'
        | 'updatedAt'
        | 'email'
        | 'bankId' // may be null at create
        | 'status' // DB/model default
    > { }

export class Merchant
    extends Model<MerchantAttributes, MerchantCreationAttributes>
    implements MerchantAttributes {
    public id!: number;
    public name!: string;
    public userId!: number;
    public cac_number!: string;
    public tin_number!: string | null;
    public bvn!: string | null;
    public account_number!: string;
    public bank_name!: string;
    public qrToken!: string | null;
    public qrUrl!: string | null;
    public qrGeneratedAt!: Date | null;
    public createdAt!: Date;
    public updatedAt!: Date;
    public email?: string | null;

    public bankId?: number | null;
    public status!: 'pending' | 'approved' | 'rejected';

    // typed for eager loads (e.g., include: [{ model: User, as: 'user' }])
    public user?: User;

    public static associations: {
        user: Association<Merchant, User>;
    };
}

Merchant.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING, allowNull: false },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: User, key: 'id' },
            onDelete: 'CASCADE',
        },
        cac_number: { type: DataTypes.STRING, allowNull: false, unique: true },
        tin_number: { type: DataTypes.STRING, allowNull: true },
        bvn: { type: DataTypes.STRING, allowNull: true },
        account_number: { type: DataTypes.STRING, allowNull: false },
        bank_name: { type: DataTypes.STRING, allowNull: false },
        qrToken: { type: DataTypes.TEXT, allowNull: true, comment: 'JWT payload encoded for QR code' },
        qrUrl: { type: DataTypes.STRING, allowNull: true, comment: 'Cloudinary image URL of QR code' },
        qrGeneratedAt: { type: DataTypes.DATE, allowNull: true, comment: 'When the QR code was generated' },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        email: { type: DataTypes.STRING, allowNull: true },

        // ✅ Map directly to the DB column "bankId" (no field override)
        bankId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'banks', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        },

        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'pending',
            validate: { isIn: [['pending', 'approved', 'rejected']] },
        },
    },
    {
        sequelize,
        tableName: 'merchants',
        timestamps: true,
    }
);

// (Optional) If you maintain associations elsewhere, keep them there.
// Merchant.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default Merchant;
