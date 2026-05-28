import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.middleware';
import { createTenant, deleteTenant, getTenant, getTenants, updateTenant, getTenantAccountStatement } from './tenants.controller';

const router = Router();

router.use(authenticate);

router.get('/', getTenants);
router.get('/:id/account-statement', getTenantAccountStatement);
router.get('/:id', getTenant);

router.post(
  '/',
  [body('type').isIn(['PERSONA_FISICA', 'PERSONA_JURIDICA']).withMessage('Tipo inválido')],
  createTenant
);

router.patch(
  '/:id',
  [body('type').optional().isIn(['PERSONA_FISICA', 'PERSONA_JURIDICA'])],
  updateTenant
);

router.delete('/:id', deleteTenant);

export default router;
