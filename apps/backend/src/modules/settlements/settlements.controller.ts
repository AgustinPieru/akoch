import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as service from './settlements.service';
import { generateSettlementPdf } from './settlement-pdf.service';
import { sendSettlementViaWhatsApp, sendSettlementViaEmail } from '../notifications/notification.service';

export async function getSettlements(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getOwnerSettlements({
      ownerId: req.query.ownerId ? Number(req.query.ownerId) : undefined,
      status: req.query.status as string | undefined,
      year: req.query.year ? Number(req.query.year) : undefined,
      month: req.query.month ? Number(req.query.month) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      search: req.query.search as string | undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSettlement(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getOwnerSettlementById(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function generateSettlement(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
  }
  try {
    const { ownerId, year, month, notes } = req.body;
    const settlement = await service.generateOwnerSettlement(Number(ownerId), Number(year), Number(month), notes);
    res.status(201).json(settlement);
  } catch (err) {
    next(err);
  }
}

export async function generateAllSettlements(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
  }
  try {
    const { year, month } = req.body;
    const result = await service.generateAllOwnerSettlements(Number(year), Number(month));
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function markSent(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.markSettlementSent(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function markPaid(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.markSettlementPaid(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function downloadPdf(req: Request, res: Response, next: NextFunction) {
  try {
    await generateSettlementPdf(Number(req.params.id), res);
  } catch (err) {
    next(err);
  }
}

async function tryMarkSent(id: number) {
  try { await service.markSettlementSent(id); } catch (e: any) { if (e?.code !== 'INVALID_STATUS') throw e; }
}

export async function sendWhatsApp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Teléfono requerido', code: 'VALIDATION_ERROR' });
    const result = await sendSettlementViaWhatsApp(Number(req.params.id), phone);
    await tryMarkSent(Number(req.params.id));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function sendEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido', code: 'VALIDATION_ERROR' });
    const result = await sendSettlementViaEmail(Number(req.params.id), email);
    await tryMarkSent(Number(req.params.id));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─── Cargos ad-hoc ──────────────────────────────────────────────────────────

export async function addCharge(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
  }
  try {
    const { propertyId, category, description, amount, paidBy } = req.body;
    const result = await service.addCharge(Number(req.params.id), {
      propertyId: propertyId ? Number(propertyId) : undefined,
      category,
      description,
      amount: Number(amount),
      paidBy,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateCharge(req: Request, res: Response, next: NextFunction) {
  try {
    const { propertyId, category, description, amount, paidBy } = req.body;
    const result = await service.updateCharge(Number(req.params.chargeId), {
      ...(propertyId !== undefined && { propertyId: propertyId ? Number(propertyId) : undefined }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(amount !== undefined && { amount: Number(amount) }),
      ...(paidBy !== undefined && { paidBy }),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function toggleChargePaid(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.toggleChargePaid(Number(req.params.chargeId), !!req.body.isPaid);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteCharge(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.deleteCharge(Number(req.params.chargeId));
    res.json(result);
  } catch (err) {
    next(err);
  }
}
