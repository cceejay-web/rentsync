import { Router } from 'express';
import requireManager from '../middleware/requireManager.js';
import { list, create, getOne, update, remove } from '../controllers/unitsController.js';

const router = Router({ mergeParams: true });

router.get('/',        requireManager, list);
router.post('/',       requireManager, create);
router.get('/:unitId', requireManager, getOne);
router.put('/:unitId', requireManager, update);
router.delete('/:unitId', requireManager, remove);

export default router;
