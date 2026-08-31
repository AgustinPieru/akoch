import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadSingle } from '../../middleware/upload.middleware';
import { getSettings, updateSettings, uploadLogo } from './settings.controller';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.patch(
  '/',
  [
    body('autoAdjustEnabled').optional().isBoolean(),
    body('lateNotificationsEnabled').optional().isBoolean(),
    body('expiryNotificationsEnabled').optional().isBoolean(),
    body('monthlyNotificationsEnabled').optional().isBoolean(),
    body('agencyName').optional().isString(),
    body('agencyCuit').optional().isString(),
    body('agencyAddress').optional().isString(),
    body('agencyPhone').optional().isString(),
    body('agencyLicense').optional().isString(),
  ],
  updateSettings,
);
router.post('/logo', uploadSingle, uploadLogo);

export default router;
