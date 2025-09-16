import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';

// Replace with your actual environment variable or fallback
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

/**
 * Interface for JWT payload structure.
 * Extend this based on your actual payload needs (e.g. id, email, role)
 */
interface TokenPayload extends JwtPayload {
    id: string;
    email?: string;
    role?: string;
}

/**
 * Signs a JWT token with the provided payload and expiry.
 * @param payload - The data to encode into the token
 * @param expiresIn - Token expiration time (e.g., '1h', '7d')
 * @returns A signed JWT token
 */
export const signToken = (
    payload: TokenPayload,
    expiresIn: SignOptions['expiresIn'] = '1h'
): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * Verifies a JWT token and returns the decoded payload.
 * Throws an error if invalid.
 * @param token - The JWT token string
 * @returns The decoded token payload
 */
export const verifyToken = (token: string): TokenPayload => {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
};
