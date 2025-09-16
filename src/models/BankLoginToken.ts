// src/models/BankLoginToken.ts
// -----------------------------------------------------------------------------
// What changed & why
// - Added explicit `id` column in init(): TS complained because `id` was in the
//   model attributes but not declared in the schema. This resolves TS2345.
// - Added attribute and creation types so TS knows `id` is optional on create.
// - Kept snake_case mapping via `field` to match existing DB columns.
// - `timestamps: false` prevents Sequelize from inserting createdAt/updatedAt.
// -----------------------------------------------------------------------------

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/db';

// 1) Attributes as they exist in the DB/model
export interface BankLoginTokenAttrs {
    id: number;
    token: string;
    bankId: number;          // camelCase in code…
    used: boolean;
    expiresAt: Date | null;
}

// 2) Attributes required when creating a row
//    - id is auto-generated
//    - used defaults to false
//    - expiresAt can be null
export type BankLoginTokenCreationAttrs = Optional<
    BankLoginTokenAttrs,
    'id' | 'used' | 'expiresAt'
>;

class BankLoginToken
    extends Model<BankLoginTokenAttrs, BankLoginTokenCreationAttrs>
    implements BankLoginTokenAttrs {
    public id!: number;
    public token!: string;
    public bankId!: number;
    public used!: boolean;
    public expiresAt!: Date | null;
}

BankLoginToken.init(
    {
        // 👇 Add the id column so TS is satisfied
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            field: 'id', // optional, shown for clarity
        },
        token: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
        },
        bankId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'bank_id', // map camelCase attr -> snake_case column
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'expires_at',
        },
        used: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'used',
        },
    },
    {
        sequelize,
        modelName: 'BankLoginToken',
        tableName: 'bank_login_tokens',
        timestamps: false,   // stop inserting createdAt/updatedAt
        underscored: true,   // future auto names/joins will be snake_case
        indexes: [
            { unique: true, fields: ['token'] },
            { fields: ['bank_id'] },
            { fields: ['used'] },
        ],
    }
);

export default BankLoginToken;
