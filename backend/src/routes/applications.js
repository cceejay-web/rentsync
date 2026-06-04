import { Router } from 'express';
import { list, decide } from '../controllers/applicationsController.js';
import requireManager from '../middleware/requireManager.js';

const router = Router();

router.get('/',     requireManager, list);
router.patch('/:id', requireManager, decide);

export default router;
