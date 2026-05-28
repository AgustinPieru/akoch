import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './tenants.service';

export async function getTenants(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page, limit, search, status } = req.query as Record<string, string>;
    const result = await service.getTenants({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status,
    });
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function getTenant(req: AuthRequest, res: Response): Promise<void> {
  try {
    const tenant = await service.getTenantById(parseInt(req.params.id));
    res.json(tenant);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function createTenant(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
    return;
  }
  try {
    const tenant = await service.createTenant(req.body);
    res.status(201).json(tenant);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function updateTenant(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
    return;
  }
  try {
    const tenant = await service.updateTenant(parseInt(req.params.id), req.body);
    res.json(tenant);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function deleteTenant(req: AuthRequest, res: Response): Promise<void> {
  try {
    await service.deleteTenant(parseInt(req.params.id));
    res.json({ message: 'Inquilino eliminado correctamente' });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function getTenantAccountStatement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = await service.getTenantAccountStatement(parseInt(req.params.id));
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}
