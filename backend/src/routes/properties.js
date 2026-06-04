import { Router } from 'express';
import requireManager from '../middleware/requireManager.js';
import { list, create, getOne, update, remove } from '../controllers/propertiesController.js';

const router = Router();

router.get('/',     requireManager, list);
router.post('/',    requireManager, create);
router.get('/:id',  requireManager, getOne);
router.put('/:id',  requireManager, update);
router.delete('/:id', requireManager, remove);

export default router;
