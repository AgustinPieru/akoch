import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getExpenses, getExpense, createExpense, updateExpense, deleteExpense, getExpensesSummary,
} from './expenses.controller';

const router = Router();
router.use(authenticate);

router.get('/', getExpenses);
router.get('/:id', getExpense);
router.get('/summary/:propertyId', getExpensesSummary);

router.post(
  '/',
  [
    body('propertyId').isInt().withMessage('Propiedad requerida'),
    body('description').notEmpty().withMessage('Descripción requerida'),
    body('amount').isFloat({ min: 0 }).withMessage('Monto inválido'),
    body('date').isISO8601().withMessage('Fecha inválida'),
  ],
  createExpense,
);

router.patch('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
