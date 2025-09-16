import AuditLog from '../models/Auditlog';

export const createAuditLog = async ({
    action,
    entity,
    performedBy,
    metadata
}: {
    action: string;
    entity: string;
    performedBy: string;
    metadata?: object;
}) => {
    await AuditLog.create({ action, entity, performedBy, metadata });
};
