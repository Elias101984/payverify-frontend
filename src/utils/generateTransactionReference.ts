/**
 * Generates a unique transaction reference like 'TX-1721952884095-4831'
 * Combines timestamp with random digits to reduce collision.
 */
export const generateTransactionReference = (): string => {
    const timestamp = Date.now(); // milliseconds since epoch
    const random = Math.floor(1000 + Math.random() * 9000); // random 4-digit number
    return `TX-${timestamp}-${random}`;
};
