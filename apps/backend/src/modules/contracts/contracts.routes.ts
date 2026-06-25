import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.middleware';
import { activateContract, adjustContract, createContract, getContract, getContracts, terminateContract, finalizeContract, renewContract, updateContract, setCommissionInstallmentStatus } from './contracts.controller';

const router = Router();

router.use(authenticate);

router.get('/', getContracts);
router.get('/:id', getContract);

router.post(
  '/',
  [
    body('propertyId').isInt().withMessage('Propiedad requerida'),
    body('startDate').isISO8601().withMessage('Fecha de inicio inválida'),
    body('durationMonths').isInt({ min: 1 }).withMessage('Duración inválida'),
    body('initialAmount').isFloat({ min: 0 }).withMessage('Monto inicial inválido'),
    body('tenants').isArray({ min: 1 }).withMessage('Se requiere al menos un inquilino'),
  ],
  createContract
);

router.patch('/:id', updateContract);
router.post('/:id/activate', activateContract);
router.patch(
  '/:id/commission-installments/:installmentId',
  [body('status').isIn(['PENDING', 'PAID']).withMessage('Estado inválido')],
  setCommissionInstallmentStatus,
);

router.get('/:id/index-preview', async (req, res, next) => {
  try {
    const contract = await (await import('./contracts.service')).getContractById(Number(req.params.id));
    if (contract.indexType === 'NONE') {
      res.status(400).json({ error: 'Este contrato no tiene ajuste de índice', code: 'NO_INDEX' });
      return;
    }
    const fromDate = contract.lastAdjustmentDate ?? contract.startDate;
    const now = new Date();

    let result: { percentage: number; startValue?: number; endValue?: number };
    if (contract.indexType === 'FREE') {
      result = { percentage: contract.freePercentage ?? 0 };
    } else if (contract.indexType === 'ICL_BCRA') {
      const { getICLPercentage } = await import('../../lib/indices');
      result = await getICLPercentage(fromDate, now);
    } else {
      const { getIPCPercentage } = await import('../../lib/indices');
      result = await getIPCPercentage(fromDate, now);
    }

    res.json(result);
  } catch (err: any) {
    next(err);
  }
});

router.post(
  '/:id/adjust',
  [body('percentage').isFloat({ min: 0, max: 1000 }).withMessage('Porcentaje inválido')],
  adjustContract,
);

router.post(
  '/:id/terminate',
  [body('reason').notEmpty().withMessage('El motivo de rescisión es requerido')],
  terminateContract
);

// Finalizar contrato vencido (inquilino desocupó — libera la propiedad)
router.post('/:id/finalize', finalizeContract);

router.post(
  '/:id/renew',
  [
    body('startDate').isISO8601().withMessage('Fecha de inicio inválida'),
    body('durationMonths').isInt({ min: 1 }).withMessage('Duración inválida'),
    body('initialAmount').isFloat({ min: 0 }).withMessage('Monto inicial inválido'),
  ],
  renewContract,
);

export default router;
