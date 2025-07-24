import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/db';
import { User } from '../models/User';
import { Merchant } from '../models/Merchant';

const JWT_SECRET = process.env.JWT_SECRET || 'defaultsecret';

/**
 * Register a new user and their merchant profile within a transaction.
 * SRP: Controller coordinates the flow, DB operations remain on models.
 * Ensures atomicity: either both User & Merchant are created, or none.
 *
 * Change: JWT payload now includes `name` to align with `UserJwtPayload` type.
 */
export const register = async (req: Request, res: Response) => {
    const transaction = await sequelize.transaction();

    try {
        const {
            name,
            email,
            password,
            role,
            cac_number,
            tin_number,
            bvn,
            account_number,
            bank_name,
            qr_code
        } = req.body;

        // Validate required fields
        if (!name || !email || !password || !cac_number || !account_number || !bank_name) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const existingUser = await User.findOne({ where: { email }, transaction });
        if (existingUser) {
            await transaction.rollback();
            return res.status(409).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create User
        const newUser = await User.create(
            {
                email,
                password_hash: hashedPassword,
                role: role || 'merchant',
            },
            { transaction }
        );

        // Create Merchant
        const merchant = await Merchant.create(
            {
                name,
                cac_number,
                tin_number,
                bvn,
                account_number,
                bank_name,
                qr_code,
                userId: newUser.id,
            },
            { transaction }
        );

        await transaction.commit();

        //  Include `name` in JWT payload
        const token = jwt.sign(
            {
                id: newUser.id,
                email: newUser.email,
                name: merchant.name,
                role: newUser.role
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.status(201).json({
            message: 'User and merchant registered successfully',
            token
        });
    } catch (err) {
        console.error('Registration error, rolling back:', err);
        await transaction.rollback();
        return res.status(500).json({ message: 'Server error during registration' });
    }
};

/**
 * Handles user login by validating credentials and issuing a JWT.
 * SRP: Responsible only for authentication, not registration or authorization.
 * DRY: Reuses JWT and bcrypt logic from `register`.
 *
 * Change: JWT payload now includes `name` to align with `UserJwtPayload` type.
 */
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // ✅ Fetch merchant name for JWT payload
        const merchant = await Merchant.findOne({ where: { userId: user.id } });
        const merchantName = merchant?.name || 'Merchant';

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: merchantName,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.json({
            message: 'Login successful',
            token
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Server error during login' });
    }
};

/**
 * Get the currently authenticated user's info.
 * SRP: Simply returns `req.user` decoded from JWT.
 */
export const me = (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    return res.json(req.user);
};
