import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getSettlements, getSettlement, generateSettlement, generateAllSettlements, markSent, markPaid, downloadPdf, sendWhatsApp, sendEmail,
  addCharge, updateCharge, toggleChargePaid, deleteCharge,
} from './settlements.controller';

const router = Router();
router.use(authenticate);

router.get('/', getSettlements);
router.get('/:id', getSettlement);

router.post(
  '/generate',
  [
    body('ownerId').isInt().withMessage('Propietario requerido'),
    body('year').isInt({ min: 2000, max: 2100 }).withMessage('Año inválido'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Mes inválido'),
  ],
  generateSettlement,
);

router.post(
  '/generate-all',
  [
    body('year').isInt({ min: 2000, max: 2100 }).withMessage('Año inválido'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Mes inválido'),
  ],
  generateAllSettlements,
);

router.post('/:id/send', markSent);
router.post('/:id/send/whatsapp', sendWhatsApp);
router.post('/:id/send/email', sendEmail);
router.post('/:id/pay', markPaid);
router.get('/:id/pdf', downloadPdf);

router.post(
  '/:id/charges',
  [
    body('category').isIn(['IMPUESTO', 'SERVICIO', 'TASA', 'OTRO']).withMessage('Categoría inválida'),
    body('description').notEmpty().withMessage('Descripción requerida'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Monto inválido'),
    body('paidBy').optional().isIn(['AGENCY', 'OWNER', 'TENANT', 'SHARED', 'N_A']).withMessage('Pagador inválido'),
  ],
  addCharge,
);
router.patch('/charges/:chargeId', updateCharge);
router.patch('/charges/:chargeId/paid', toggleChargePaid);
router.delete('/charges/:chargeId', deleteCharge);

export default router;
