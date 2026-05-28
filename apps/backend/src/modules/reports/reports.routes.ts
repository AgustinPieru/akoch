import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  paymentsPeriodReport,
  activeDebtReport,
  expiringContractsReport,
  expensesPeriodReport,
  profitabilityReport,
  vacancyReport,
  adjustmentsReport,
  settlementsReport,
} from './reports.controller';

const router = Router();
router.use(authenticate);

router.get('/payments-period', paymentsPeriodReport);
router.get('/active-debt', activeDebtReport);
router.get('/expiring-contracts', expiringContractsReport);
router.get('/expenses-period', expensesPeriodReport);
router.get('/profitability', profitabilityReport);
router.get('/vacancy', vacancyReport);
router.get('/adjustments', adjustmentsReport);
router.get('/settlements', settlementsReport);

export default router;
