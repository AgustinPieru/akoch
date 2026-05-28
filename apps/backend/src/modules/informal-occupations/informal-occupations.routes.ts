import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getOccupations, getOccupation, createOccupation,
  updateOccupation, closeOccupation, convertToContract,
} from './informal-occupations.controller';

const router = Router();
router.use(authenticate);

router.get('/', getOccupations);
router.get('/:id', getOccupation);
router.post('/', createOccupation);
router.patch('/:id', updateOccupation);
router.post('/:id/close', closeOccupation);
router.post('/:id/convert', convertToContract);

export default router;
