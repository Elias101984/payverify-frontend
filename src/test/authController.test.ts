/**
 * Unit tests for authController
 *
 * SRP: Test `login`, `register`, and `me` independently.
 * Loose Coupling: Mock DB, bcrypt, JWT, and Sequelize to isolate controller logic.
 *
 * Change: Removed `jest.mock('config/db')` to allow models to load properly.
 * We now only mock `sequelize.transaction()` where needed.
 */

import { login, register, me } from 'controllers/authController';
import { User } from 'models/User';
import { Merchant } from 'models/Merchant';
import { sequelize } from 'config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

// Mock dependencies
jest.mock('models/User');
jest.mock('models/Merchant');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

// Suppress noisy console.error during tests
beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
});

describe('authController.login', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        req = { body: {} };
        res = { status: statusMock, json: jsonMock };

        (User.findOne as jest.Mock).mockReset();
        (Merchant.findOne as jest.Mock).mockReset();
        (bcrypt.compare as jest.Mock).mockReset();
        (jwt.sign as jest.Mock).mockReset();
    });

    it('should return 400 if email or password is missing', async () => {
        req.body = {};
        await login(req as Request, res as Response);
        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Email and password are required' });
    });

    it('should return 401 if user not found', async () => {
        req.body = { email: 'test@example.com', password: 'pass' };
        (User.findOne as jest.Mock).mockResolvedValue(null);

        await login(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should return 401 if password does not match', async () => {
        req.body = { email: 'test@example.com', password: 'wrongpass' };
        (User.findOne as jest.Mock).mockResolvedValue({ password_hash: 'hashed' });
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await login(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should return 200 and token if login successful', async () => {
        req.body = { email: 'test@example.com', password: 'correctpass' };

        const fakeUser = {
            id: 1,
            email: 'test@example.com',
            role: 'merchant',
            password_hash: 'hashed'
        };

        const fakeMerchant = {
            name: 'Merchant Name'
        };

        const fakeToken = 'jwt-token';

        (User.findOne as jest.Mock).mockResolvedValue(fakeUser);
        (Merchant.findOne as jest.Mock).mockResolvedValue(fakeMerchant);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue(fakeToken);

        await login(req as Request, res as Response);

        expect(jsonMock).toHaveBeenCalledWith({
            message: 'Login successful',
            token: fakeToken
        });
    });

    it('should handle server errors', async () => {
        req.body = { email: 'test@example.com', password: 'pass' };
        (User.findOne as jest.Mock).mockRejectedValue(new Error('DB error'));

        await login(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Server error during login' });
    });
});

describe('authController.register', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        req = { body: {} };
        res = { status: statusMock, json: jsonMock };

        (User.findOne as jest.Mock).mockReset();
        (User.create as jest.Mock).mockReset();
        (Merchant.create as jest.Mock).mockReset();
        (sequelize.transaction as jest.Mock).mockReset();
        (bcrypt.hash as jest.Mock).mockReset();
        (jwt.sign as jest.Mock).mockReset();

        //  Only mock sequelize.transaction here
        (sequelize.transaction as jest.Mock).mockResolvedValue({
            commit: jest.fn(),
            rollback: jest.fn()
        });
    });

    it('should return 400 if required fields missing', async () => {
        req.body = {};
        await register(req as Request, res as Response);
        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Missing required fields' });
    });

    it('should return 409 if user already exists', async () => {
        req.body = {
            name: 'Merchant',
            email: 'test@example.com',
            password: 'pass',
            cac_number: 'CAC123',
            account_number: '123456789',
            bank_name: 'Bank'
        };
        (User.findOne as jest.Mock).mockResolvedValue({});

        await register(req as Request, res as Response);
        expect(statusMock).toHaveBeenCalledWith(409);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'User already exists' });
    });

    it('should create user, merchant and return token', async () => {
        req.body = {
            name: 'Merchant',
            email: 'test@example.com',
            password: 'pass',
            cac_number: 'CAC123',
            account_number: '123456789',
            bank_name: 'Bank'
        };

        (User.findOne as jest.Mock).mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPass');
        (User.create as jest.Mock).mockResolvedValue({
            id: 1,
            email: req.body.email,
            role: 'merchant'
        });

        (Merchant.create as jest.Mock).mockResolvedValue({
            name: req.body.name
        });

        (jwt.sign as jest.Mock).mockReturnValue('jwt-token');

        await register(req as Request, res as Response);

        expect(jsonMock).toHaveBeenCalledWith({
            message: 'User and merchant registered successfully',
            token: 'jwt-token'
        });
    });

    it('should handle server error', async () => {
        req.body = {
            name: 'Merchant',
            email: 'test@example.com',
            password: 'pass',
            cac_number: 'CAC123',
            account_number: '123456789',
            bank_name: 'Bank'
        };

        (User.findOne as jest.Mock).mockRejectedValue(new Error('DB error'));

        await register(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Server error during registration' });
    });
});

describe('authController.me', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });

        req = {};
        res = { status: statusMock, json: jsonMock };
    });

    it('should return 401 if no user in request', () => {
        me(req as Request, res as Response);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return req.user if authenticated', () => {
        req.user = {
            id: 1,
            email: 'test@example.com',
            name: 'Merchant Name',
            role: 'merchant'
        };

        me(req as Request, res as Response);

        expect(jsonMock).toHaveBeenCalledWith(req.user);
    });
});
