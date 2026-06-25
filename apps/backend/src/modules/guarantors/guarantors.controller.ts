import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './guarantors.service';

export async function getGuarantors(req: AuthRequest, res: Response): Promise<void> {
  try {
    const guarantors = await service.getGuarantorsByContract(parseInt(req.params.contractId));
    res.json(guarantors);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function createGuarantor(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
    return;
  }
  try {
    const guarantor = await service.createGuarantor(parseInt(req.params.contractId), req.body);
    res.status(201).json(guarantor);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function updateGuarantor(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
    return;
  }
  try {
    const guarantor = await service.updateGuarantor(parseInt(req.params.id), req.body);
    res.json(guarantor);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function deleteGuarantor(req: AuthRequest, res: Response): Promise<void> {
  try {
    await service.deleteGuarantor(parseInt(req.params.id));
    res.json({ message: 'Garante eliminado correctamente' });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}
