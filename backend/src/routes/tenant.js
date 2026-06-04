import { Router } from 'express';
import {
  me, payments, listRequests, createRequest, availableUnits,
  applyForUnit, listApplications, withdrawApplication,
} from '../controllers/tenantController.js';
import requireTenant from '../middleware/requireTenant.js';

const router = Router();

router.get('/me',           requireTenant, me);
router.get('/payments',     requireTenant, payments);
router.get('/requests',        requireTenant, listRequests);
router.post('/requests',       requireTenant, createRequest);
router.get('/available-units',          requireTenant, availableUnits);
router.post('/applications',            requireTenant, applyForUnit);
router.get('/applications',             requireTenant, listApplications);
router.patch('/applications/:id/withdraw', requireTenant, withdrawApplication);

export default router;
