import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserJwtPayload } from '../types/express'; // Import the strongly-typed JWT payload

// Read JWT secret from environment variables, fallback to default if not set
const JWT_SECRET = process.env.JWT_SECRET || 'defaultsecret';

/**
 * Middleware to verify JWT in Authorization header.
 * Protects routes by ensuring only requests with valid tokens proceed.
 * 
 * What changed:
 *  Replaced `JwtPayload` with `UserJwtPayload` for stronger typing.
 *  Ensures `req.user` has the exact expected shape (id, email, name, role).
 *  Improves developer experience and reduces runtime errors by removing ambiguity.
 */
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    // Read the Authorization header from the incoming request
    const authHeader = req.headers.authorization;

    // If no Authorization header or not in Bearer format, reject
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    // Extract the token by removing 'Bearer ' prefix
    const token = authHeader.split(' ')[1];

    try {
        // Verify the JWT and explicitly cast to UserJwtPayload
        const decoded = jwt.verify(token, JWT_SECRET) as UserJwtPayload;

        // Attach the decoded payload to req.user for downstream use
        req.user = decoded;

        // Proceed to the next middleware or route handler
        next();
    } catch (err) {
        // If verification fails, reject the request
        return res.status(401).json({ message: 'Invalid token' });
    }
};
