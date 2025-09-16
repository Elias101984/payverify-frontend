// src/models/associations.ts
import { User } from './User';
import { Merchant } from './Merchant';
import BankAccount from './BankAccount';
import Transaction from './Transaction';
import Payment from './Payment';
import AuditLog from './Auditlog';
import PaymentConfirmationReceipt from './PaymentConfirmationReceipt';
import Bank from './Bank';
import BankLoginToken from './BankLoginToken';

let applied = false;

export function applyAssociations() {
    if (applied) return;
    applied = true;
    console.log('[models] associations applied once');

    // USER ↔ MERCHANT (keep hasOne if that’s your current shape)
    User.hasOne(Merchant, { foreignKey: 'userId', as: 'merchant', onDelete: 'CASCADE' });
    Merchant.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    // MERCHANT ↔ BANK ACCOUNTS
    Merchant.hasMany(BankAccount, { foreignKey: 'merchantId', as: 'bankAccounts', onDelete: 'CASCADE' });
    BankAccount.belongsTo(Merchant, { foreignKey: 'merchantId', as: 'merchant' });

    // MERCHANT ↔ TRANSACTIONS
    Merchant.hasMany(Transaction, { foreignKey: 'merchantId', as: 'transactions', onDelete: 'CASCADE' });
    Transaction.belongsTo(Merchant, { foreignKey: 'merchantId', as: 'merchant' });

    // TRANSACTION ↔ PAYMENT
    Transaction.hasOne(Payment, { foreignKey: 'transactionId', as: 'payment', onDelete: 'CASCADE' });
    Payment.belongsTo(Transaction, { foreignKey: 'transactionId', as: 'transaction' });

    // PAYMENT ↔ AUDIT LOGS
    Payment.hasMany(AuditLog, { foreignKey: 'paymentId', as: 'auditLogs', onDelete: 'CASCADE' });
    AuditLog.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });

    // PAYMENT ↔ CONFIRMATION RECEIPT
    Payment.hasOne(PaymentConfirmationReceipt, { foreignKey: 'paymentId', as: 'confirmationReceipt', onDelete: 'CASCADE' });
    PaymentConfirmationReceipt.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });

    // BANK ↔ LOGIN TOKENS (the alias that was duplicated)
    Bank.hasMany(BankLoginToken, { foreignKey: 'bankId', as: 'loginTokens', onDelete: 'CASCADE' });
    BankLoginToken.belongsTo(Bank, { foreignKey: 'bankId', as: 'bank' });
}
