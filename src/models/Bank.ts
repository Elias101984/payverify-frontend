// src/models/Bank.ts
// ----------------------------------------------------------------------------
// PURPOSE
// - Define the Bank model only (fields + options).
// - ❗ Do NOT declare associations here (avoid circular import timing).
//   Associations are applied centrally in src/models/associations.ts
//
// CHANGES
// - Added "Rejected" to the Bank status union type.
// - Added a runtime validator (isIn) to keep DB values consistent.
//   (Your column remains STRING; no DB enum migration needed.)
// ----------------------------------------------------------------------------

import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db';

// Exported so controllers/routes can reuse the type
export type BankStatus = 'Pending' | 'Active' | 'Rejected';

class Bank extends Model {
    public id!: number;
    public bankName!: string;
    public contactEmail!: string;
    public contactPhone!: string;
    public contactPerson!: string;
    public status!: BankStatus;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Bank.init(
    {
        bankName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        contactEmail: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: { isEmail: true },
        },
        contactPhone: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        contactPerson: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        status: {
            // Keeping STRING for simplicity; add a validator so only allowed values are saved.
            // If you later switch to ENUM, remember to ALTER TYPE in Postgres to add 'Rejected'.
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'Pending',
            validate: {
                isIn: [['Pending', 'Active', 'Rejected']],
            },
        },
    },
    {
        sequelize,
        modelName: 'Bank',
        tableName: 'banks',
        indexes: [
            { fields: ['contactEmail'], unique: true },
            { fields: ['status'] },
        ],
    }
);

// ❌ No Bank.hasMany(...) here; see src/models/associations.ts instead.

export default Bank;
