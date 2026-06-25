import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.middleware';
import { createGuarantor, deleteGuarantor, getGuarantors, updateGuarantor } from './guarantors.controller';

const router = Router();

router.use(authenticate);

router.get('/contract/:contractId', getGuarantors);

router.post(
  '/contract/:contractId',
  [body('fullName').notEmpty().withMessage('El nombre es requerido')],
  createGuarantor
);

router.patch(
  '/:id',
  [body('fullName').optional().notEmpty().withMessage('El nombre no puede estar vacío')],
  updateGuarantor
);

router.delete('/:id', deleteGuarantor);

export default router;
