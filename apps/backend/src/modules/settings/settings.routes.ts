import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.middleware';
import { getSettings, updateSettings } from './settings.controller';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.patch('/', [body('autoAdjustEnabled').optional().isBoolean()], updateSettings);

export default router;
