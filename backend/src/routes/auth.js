import { Router } from 'express';
import { signup, login, me } from '../controllers/authController.js';
import requireAuth from '../middleware/requireAuth.js';
import requireManager from '../middleware/requireManager.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.get('/manager-test', requireManager, (req, res) => res.json({ ok: true }));

export default router;
