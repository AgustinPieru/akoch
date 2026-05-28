import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.middleware';
import { createOwner, deleteOwner, getOwner, getOwners, updateOwner } from './owners.controller';

const router = Router();

router.use(authenticate);

router.get('/', getOwners);
router.get('/:id', getOwner);

router.post(
  '/',
  [
    body('cuit').notEmpty().withMessage('CUIT requerido'),
    body('type').isIn(['PERSONA_FISICA', 'PERSONA_JURIDICA']).withMessage('Tipo inválido'),
  ],
  createOwner
);

router.patch(
  '/:id',
  [body('type').optional().isIn(['PERSONA_FISICA', 'PERSONA_JURIDICA'])],
  updateOwner
);

router.delete('/:id', deleteOwner);

export default router;
