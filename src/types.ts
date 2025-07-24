/**
 * Shared types used across frontend components/pages.
 * Scalable: Add more domain models here as needed.
 */

export interface Transaction {
    id: number;
    amount: number;
    status: string;
    createdAt: string;
}
