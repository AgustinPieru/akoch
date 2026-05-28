import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth.middleware';
import { getSales, getSale, createSale, updateSale, deleteSale } from './sales.controller';

const router = Router();
router.use(authenticate);
router.get('/', getSales);
router.get('/:id', getSale);
router.post('/', [body('propertyId').isInt(), body('askingPrice').isFloat({ min: 0 })], createSale);
router.patch('/:id', updateSale);
router.delete('/:id', deleteSale);
export default router;
