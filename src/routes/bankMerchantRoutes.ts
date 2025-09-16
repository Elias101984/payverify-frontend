import { Router } from 'express';
import { isAuthenticatedBank } from '../middlewares/isAuthenticatedBank';
import {
    listPendingMerchantsForBank,
    approveMerchant,
    rejectMerchant,
} from '../controllers/bankMerchantController';

const router = Router();

// Bank users review & decide on merchants
router.get('/merchants/pending', isAuthenticatedBank, listPendingMerchantsForBank);
router.post('/merchants/:id/approve', isAuthenticatedBank, approveMerchant);
router.post('/merchants/:id/reject', isAuthenticatedBank, rejectMerchant);

export default router;
