import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './properties.service';

export async function getProperties(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page, limit, search, status, type } = req.query as Record<string, string>;
    const result = await service.getProperties({
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

export async function getProperty(req: AuthRequest, res: Response): Promise<void> {
  try {
    const property = await service.getPropertyById(parseInt(req.params.id));
    res.json(property);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function createProperty(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
    return;
  }
  try {
    const { owners, ...propertyData } = req.body;
    const property = await service.createProperty({ property: propertyData, owners: owners || [] });
    res.status(201).json(property);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function updateProperty(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
    return;
  }
  try {
    const property = await service.updateProperty(parseInt(req.params.id), req.body);
    res.json(property);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}

export async function deleteProperty(req: AuthRequest, res: Response): Promise<void> {
  try {
    await service.deleteProperty(parseInt(req.params.id));
    res.json({ message: 'Propiedad eliminada correctamente' });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
}
