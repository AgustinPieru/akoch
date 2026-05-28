import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.middleware';
import { getSettlements, getSettlement, generateSettlement, markSent, markPaid, downloadPdf, sendWhatsApp, sendEmail } from './settlements.controller';

const router = Router();
router.use(authenticate);

router.get('/', getSettlements);
router.get('/:id', getSettlement);

router.post(
  '/generate',
  [
    body('contractId').isInt().withMessage('Contrato requerido'),
    body('year').isInt({ min: 2000, max: 2100 }).withMessage('Año inválido'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Mes inválido'),
  ],
  generateSettlement,
);

router.post('/:id/send', markSent);
router.post('/:id/send/whatsapp', sendWhatsApp);
router.post('/:id/send/email', sendEmail);
router.post('/:id/pay', markPaid);
router.get('/:id/pdf', downloadPdf);

export default router;
