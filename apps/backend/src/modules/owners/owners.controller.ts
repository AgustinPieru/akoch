import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './owners.service';

export async function getOwners(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page, limit, search, status, type } = req.query as Record<string, string>;
    const result = await service.getOwners({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status,
      type,
    });
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function getOwner(req: AuthRequest, res: Response): Promise<void> {
  try {
    const owner = await service.getOwnerById(parseInt(req.params.id));
    res.json(owner);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function createOwner(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
    return;
  }
  try {
    const owner = await service.createOwner(req.body);
    res.status(201).json(owner);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function updateOwner(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
    return;
  }
  try {
    const owner = await service.updateOwner(parseInt(req.params.id), req.body);
    res.json(owner);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function deleteOwner(req: AuthRequest, res: Response): Promise<void> {
  try {
    await service.deleteOwner(parseInt(req.params.id));
    res.json({ message: 'Propietario eliminado correctamente' });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}
