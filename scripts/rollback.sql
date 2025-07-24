-- ===============================================
-- PayVerify DB Rollback Script: Drop Schema
-- ===============================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS merchants;

-- Optionally drop indexes explicitly (not strictly necessary with CASCADE)
DROP INDEX IF EXISTS idx_merchants_cac_number;
DROP INDEX IF EXISTS idx_transactions_merchantId;
DROP INDEX IF EXISTS idx_transactions_status;

-- Optional: vacuum to reclaim space
--VACUUM FULL;
