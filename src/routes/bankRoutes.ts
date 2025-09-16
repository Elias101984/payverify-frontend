// src/routes/bankRoutes.ts
import { Router } from 'express';
import { registerBank, approveBank, getPendingBanks, rejectBank } from '../controllers/bankController';
import { honeypotGuard, registerSpeedLimiter, registerHardLimiter } from '../middlewares/abuseProtection';

const router = Router();

// Apply slow-down first, then hard cap, then honeypot, then handler
router.post('/banks/register',
    registerSpeedLimiter,
    registerHardLimiter,
    honeypotGuard,
    registerBank
);

// Admin review list
router.get('/pending', getPendingBanks);

// Admin actions
router.patch('/approve/:id', approveBank);
router.patch('/reject/:id', rejectBank); // ← added back now that a handler exists

export default router;
