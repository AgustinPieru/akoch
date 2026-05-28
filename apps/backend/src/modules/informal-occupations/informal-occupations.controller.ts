import { Request, Response, NextFunction } from 'express';
import * as svc from './informal-occupations.service';

export async function getOccupations(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.listOccupations({
      status: req.query.status as string | undefined,
      propertyId: req.query.propertyId ? Number(req.query.propertyId) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });
    res.json(result);
  } catch (err) { next(err); }
}

export async function getOccupation(req: Request, res: Response, next: NextFunction) {
  try {
    const occ = await svc.getOccupation(Number(req.params.id));
    if (!occ) { res.status(404).json({ message: 'Ocupación no encontrada' }); return; }
    res.json(occ);
  } catch (err) { next(err); }
}

export async function createOccupation(req: Request, res: Response, next: NextFunction) {
  try {
    const occ = await svc.createOccupation(req.body);
    res.status(201).json(occ);
  } catch (err) { next(err); }
}

export async function updateOccupation(req: Request, res: Response, next: NextFunction) {
  try {
    const occ = await svc.updateOccupation(Number(req.params.id), req.body);
    res.json(occ);
  } catch (err) { next(err); }
}

export async function closeOccupation(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, endDate } = req.body;
    if (!['VACATED', 'REGULARIZED'].includes(status)) {
      res.status(400).json({ message: 'Estado inválido. Use VACATED o REGULARIZED' });
      return;
    }
    const occ = await svc.closeOccupation(Number(req.params.id), status, endDate);
    if (!occ) { res.status(404).json({ message: 'Ocupación no encontrada' }); return; }
    res.json(occ);
  } catch (err) { next(err); }
}

export async function convertToContract(req: Request, res: Response, next: NextFunction) {
  try {
    const { contractId } = req.body;
    if (!contractId) { res.status(400).json({ message: 'contractId requerido' }); return; }
    const occ = await svc.convertToContract(Number(req.params.id), Number(contractId));
    res.json(occ);
  } catch (err) { next(err); }
}
