import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './contracts.service';

export async function getContracts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page, limit, search, status, propertyId } = req.query as Record<string, string>;
    const result = await service.getContracts({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status,
      propertyId: propertyId ? parseInt(propertyId) : undefined,
    });
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function getContract(req: AuthRequest, res: Response): Promise<void> {
  try {
    const contract = await service.getContractById(parseInt(req.params.id));
    res.json(contract);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function createContract(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
    return;
  }
  try {
    const contract = await service.createContract(req.body);
    res.status(201).json(contract);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function updateContract(req: AuthRequest, res: Response): Promise<void> {
  try {
    const contract = await service.updateContract(parseInt(req.params.id), req.body);
    res.json(contract);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function setCommissionInstallmentStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status } = req.body;
    if (!['PENDING', 'PAID'].includes(status)) {
      res.status(422).json({ error: 'Estado inválido', code: 'VALIDATION_ERROR' });
      return;
    }
    const installment = await service.setCommissionInstallmentStatus(
      parseInt(req.params.id),
      parseInt(req.params.installmentId),
      status,
    );
    res.json(installment);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function activateContract(req: AuthRequest, res: Response): Promise<void> {
  try {
    const contract = await service.activateContract(parseInt(req.params.id));
    res.json(contract);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function adjustContract(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
    return;
  }
  try {
    const { percentage, indexValue, notes } = req.body;
    const contract = await service.applyAdjustment(
      parseInt(req.params.id),
      Number(percentage),
      indexValue ? Number(indexValue) : undefined,
      notes,
    );
    res.json(contract);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function finalizeContract(req: AuthRequest, res: Response): Promise<void> {
  try {
    const contract = await service.finalizeContract(parseInt(req.params.id));
    res.json(contract);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function renewContract(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
    return;
  }
  try {
    const contract = await service.renewContract(parseInt(req.params.id), req.body);
    res.status(201).json(contract);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function terminateContract(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
    return;
  }
  try {
    const contract = await service.terminateContract(parseInt(req.params.id), req.body.reason);
    res.json(contract);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}
