// Define the exact shape of the JWT payload your application issues
// Reason: Your JWT includes `id`, `email`, `name`, `role`, plus optional `iat` and `exp` from JWT standard
export interface UserJwtPayload {
    /** Unique identifier of the user */
    id: number;

    /** User's email address */
    email: string;

    /** User's name */
    name: string;

    /** User's role (e.g., 'admin', 'merchant') */
    role: string;

    /** Issued At timestamp (optional, standard JWT field) */
    iat?: number;

    /** Expiration timestamp (optional, standard JWT field) */
    exp?: number;
}

// Augment Express.Request to include a `user` property of type UserJwtPayload
// Reason: Replaced generic `JwtPayload` with specific `UserJwtPayload`
// Why: Ensures strong typing, autocompletion, and safer access to expected fields
// Removed: unnecessary flexibility of generic JwtPayload which may not have the fields you rely on
// Benefit: Cleaner code and better developer experience when accessing `req.user`
declare global {
    namespace Express {
        interface Request {
            /**
             * The authenticated user's decoded JWT payload.
             * Set by `authMiddleware` after verifying JWT.
             * Always has shape defined by `UserJwtPayload`.
             */
            user?: UserJwtPayload;
        }
    }
}
