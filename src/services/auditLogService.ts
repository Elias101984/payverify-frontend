import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/db';
import Payment from '../models/Payment';

/**
 * AuditLog Attributes
 * - `actorId`: the user, system, or service ID that performed the action
 * - `actorType`: type of the actor (e.g., 'admin', 'merchant', 'system')
 * - `reference`: optional transaction or payment reference this log is linked to
 */
interface AuditLogAttributes {
    id: number;
    actorId: number;
    actorType: string;
    action: string;
    details?: string;
    reference?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// Optional fields during creation
interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'details' | 'reference'> { }

class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes>
    implements AuditLogAttributes {
    public id!: number;
    public actorId!: number;
    public actorType!: string;
    public action!: string;
    public details?: string;
    public reference?: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    /**
     * Associates AuditLog to other models where applicable.
     */
    static associate() {
        AuditLog.belongsTo(Payment, {
            foreignKey: 'reference',
            targetKey: 'reference',
            constraints: false, // prevent circular hard constraints
        });
    }
}

// Initialize the model
AuditLog.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        actorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        actorType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        action: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        details: {
            type: DataTypes.TEXT,
        },
        reference: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: 'AuditLog',
        tableName: 'audit_logs',
        timestamps: true,
    }
);

export default AuditLog;
