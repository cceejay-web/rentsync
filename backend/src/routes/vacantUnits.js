import { Router } from 'express';
import requireManager from '../middleware/requireManager.js';
import { listVacant } from '../controllers/unitsController.js';

const router = Router();
router.get('/vacant', requireManager, listVacant);
export default router;
