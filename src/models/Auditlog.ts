import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/db';

/**
 * Audit log structure representing system actions.
 */
interface AuditLogAttributes {
    id: number;
    paymentId?: number; // ✅ Made optional to allow non-payment logs
    action: string;
    entity: string;
    performedBy: string; // ✅ Renamed from `actor` for clarity
    metadata?: object;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Creation attributes for Sequelize (id and paymentId are optional now).
 */
interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'metadata' | 'paymentId'> { }

/**
 * AuditLog Model
 * 
 * SRP: Represents a single user/system-triggered action.
 * DRY: Centralized definition of audit schema.
 * Loose Coupling: Used across services and controllers.
 */
class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
    public id!: number;
    public paymentId?: number;
    public action!: string;
    public entity!: string;
    public performedBy!: string;
    public metadata?: object;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    /**
     * ✅ Helper method for easier service-level logging.
     * Accepts optional metadata and paymentId.
     */
    static async record(
        action: string,
        entity: string,
        performedBy: string,
        paymentId?: number,
        metadata?: object
    ) {
        return await this.create({ action, entity, performedBy, paymentId, metadata });
    }
}

/**
 * Sequelize model definition for `audit_logs` table.
 */
AuditLog.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        paymentId: {
            type: DataTypes.INTEGER,
            allowNull: true // ✅ Allow null since some actions may not involve payments
        },
        action: {
            type: DataTypes.STRING,
            allowNull: false
        },
        entity: {
            type: DataTypes.STRING,
            allowNull: false
        },
        performedBy: {
            type: DataTypes.STRING,
            allowNull: false // ✅ Required to track user/system who performed the action
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true
        } // ✅ Fixed: previously missing comma before this line
    },
    {
        sequelize,
        modelName: 'AuditLog',
        tableName: 'audit_logs',
        timestamps: true // ✅ Enables Sequelize's createdAt and updatedAt fields
    }
);

export default AuditLog;
