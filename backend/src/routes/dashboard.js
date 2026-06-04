import { Router } from 'express';
import requireManager from '../middleware/requireManager.js';
import { summary } from '../controllers/dashboardController.js';

const router = Router();
router.get('/summary', requireManager, summary);
export default router;
