import { Router } from 'express';
import { list, updateStatus } from '../controllers/requestsController.js';
import requireManager from '../middleware/requireManager.js';

const router = Router();

router.get('/',     requireManager, list);
router.patch('/:id', requireManager, updateStatus);

export default router;
