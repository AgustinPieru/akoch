import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getStats, getEarnings, getAlerts } from './dashboard.controller';

const router = Router();

router.use(authenticate);
router.get('/stats', getStats);
router.get('/earnings', getEarnings);
router.get('/alerts', getAlerts);

export default router;
