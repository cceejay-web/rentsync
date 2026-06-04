import { Router } from 'express';
import { summary } from '../controllers/reportsController.js';
import requireManager from '../middleware/requireManager.js';

const router = Router();

router.get('/summary', requireManager, summary);

export default router;
