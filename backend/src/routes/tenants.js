import { Router } from 'express';
import requireManager from '../middleware/requireManager.js';
import { list, create, getOne, update, terminate } from '../controllers/tenantsController.js';

const router = Router();

router.use(requireManager);

router.get('/',                      list);
router.post('/',                     create);
router.get('/:tenantId',             getOne);
router.put('/:tenantId',             update);
router.post('/:tenantId/terminate',  terminate);

export default router;
