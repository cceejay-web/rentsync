import { Router } from 'express';
import { initiate, list } from '../controllers/paymentsController.js';
import requireManager from '../middleware/requireManager.js';

const router = Router();

router.post('/initiate', requireManager, initiate);
router.get('/',          requireManager, list);

export default router;
