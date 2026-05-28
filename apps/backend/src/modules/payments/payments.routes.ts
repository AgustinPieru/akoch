import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getPayments, getPayment, generatePayments, registerPayment, markPaymentLate, downloadReceipt,
} from './payments.controller';

const router = Router();

router.use(authenticate);

router.get('/', getPayments);
router.get('/:id', getPayment);

// Genera todos los períodos de un contrato (idempotente)
router.post('/contract/:contractId/generate', generatePayments);

// Registrar pago
router.post(
  '/:id/register',
  [
    body('paidAmount').isFloat({ min: 0 }).withMessage('Monto pagado inválido'),
    body('paidAt').isISO8601().withMessage('Fecha de pago inválida'),
    body('paymentMethod').notEmpty().withMessage('Método de pago requerido'),
    body('interestRate').optional().isFloat({ min: 0, max: 10 }).withMessage('Tasa de interés inválida'),
  ],
  registerPayment,
);

// Marcar como atrasado
router.post('/:id/late', markPaymentLate);

// Descargar recibo PDF
router.get('/:id/receipt', downloadReceipt);

export default router;
