// src/models/index.ts
import { Sequelize } from 'sequelize';
import { sequelize } from '../config/db';

import { User } from './User';
import { Merchant } from './Merchant';
import BankAccount from './BankAccount';
import Transaction from './Transaction';
import Payment from './Payment';
import AuditLog from './Auditlog';
import PaymentConfirmationReceipt from './PaymentConfirmationReceipt';
import Bank from './Bank';
import BankLoginToken from './BankLoginToken';

// ❗ IMPORTANT: No associations in this file.
// It only exposes initialized models + sequelize instance.

export {
    sequelize,
    Sequelize,
    User,
    Merchant,
    BankAccount,
    Transaction,
    Payment,
    AuditLog,
    PaymentConfirmationReceipt,
    Bank,
    BankLoginToken,
};
