export interface Bank {
    id: number;
    bankName: string;
    contactPerson: string;
    contactEmail: string;
    contactPhone: string;
    status: 'Pending' | 'Active' | 'Rejected';
    createdAt?: string;
    updatedAt?: string;
}
