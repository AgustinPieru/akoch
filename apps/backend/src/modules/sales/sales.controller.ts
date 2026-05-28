import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as service from './sales.service';

export async function getSales(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getSales({
      stage: req.query.stage as string | undefined,
      search: req.query.search as string | undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 100,
    }));
  } catch (err) { next(err); }
}

export async function getSale(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getSaleById(Number(req.params.id))); }
  catch (err) { next(err); }
}

export async function createSale(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
  try { res.status(201).json(await service.createSale(req.body)); }
  catch (err) { next(err); }
}

export async function updateSale(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.updateSale(Number(req.params.id), req.body)); }
  catch (err) { next(err); }
}

export async function deleteSale(req: Request, res: Response, next: NextFunction) {
  try { await service.deleteSale(Number(req.params.id)); res.status(204).send(); }
  catch (err) { next(err); }
}
