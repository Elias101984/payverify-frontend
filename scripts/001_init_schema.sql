-- ===============================================
-- PayVerify DB Migration Script: Initial Schema
-- ===============================================

-- Drop tables if they already exist (for dev/testing only — REMOVE in production)
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS merchants;

-- ===========================
-- Create merchants table
-- ===========================
CREATE TABLE merchants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cac_number VARCHAR(50) NOT NULL UNIQUE,
    tin_number VARCHAR(50),
    bvn VARCHAR(50),
    account_number VARCHAR(20) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    qr_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- Create transactions table
-- ===========================
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    merchantId INT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- Indexes for performance
-- ===========================
CREATE INDEX idx_merchants_cac_number ON merchants(cac_number);
CREATE INDEX idx_transactions_merchantId ON transactions(merchantId);
CREATE INDEX idx_transactions_status ON transactions(status);

-- ===========================
-- Seed merchants table
-- ===========================
INSERT INTO merchants (name, cac_number, tin_number, bvn, account_number, bank_name, qr_code) VALUES
('ABC Ventures', 'CAC001', 'TIN001', 'BVN001', '0123456789', 'First Bank', 'QR001'),
('XYZ Enterprises', 'CAC002', 'TIN002', 'BVN002', '1234567890', 'GTBank', 'QR002'),
('QuickMart', 'CAC003', 'TIN003', 'BVN003', '2345678901', 'Access Bank', 'QR003'),
('Fresh Foods', 'CAC004', 'TIN004', 'BVN004', '3456789012', 'UBA', 'QR004'),
('Techie Hub', 'CAC005', 'TIN005', 'BVN005', '4567890123', 'Zenith Bank', 'QR005'),
('Mega Stores', 'CAC006', 'TIN006', 'BVN006', '5678901234', 'Fidelity Bank', 'QR006'),
('Payless Mart', 'CAC007', 'TIN007', 'BVN007', '6789012345', 'Stanbic IBTC', 'QR007');


-- ===========================
-- Seed transactions table
-- ===========================
INSERT INTO transactions (merchantId, amount, status) VALUES
(1, 5000.00, 'completed'),
(1, 12000.50, 'pending'),
(2, 7500.25, 'completed'),
(3, 3200.00, 'failed'),
(3, 4500.75, 'pending'),
(4, 10000.00, 'completed'),
(5, 8500.00, 'completed'),
(6, 20000.00, 'pending'),
(7, 1500.00, 'failed'),
(2, 6000.00, 'completed'),
(4, 7800.00, 'pending');

-- =============================
-- User table
-- =============================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    merchantId INT REFERENCES merchants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'merchant',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);
-- ===========================
-- Seed user table
-- ===========================

INSERT INTO users (merchantId, email, password_hash, role)
VALUES
(1, 'owner1@abcventures.com', '$2b$10$abc...', 'merchant'),
(2, 'owner2@xyzenterprises.com', '$2b$10$def...', 'merchant');


INSERT INTO users (email, password_hash, role)
VALUES ('admin@payverify.com', '$2b$10$abc...', 'admin');





