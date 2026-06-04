import { Router } from 'express';
import { callback } from '../controllers/paymentsController.js';

const router = Router();

// Public — no auth. Safaricom calls this directly after STK Push completes.
router.post('/callback', callback);

export default router;
