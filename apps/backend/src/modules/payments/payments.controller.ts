import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as service from './payments.service';
import { generatePaymentReceipt } from './receipt.service';

export async function getPayments(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getPayments({
      contractId: req.query.contractId ? Number(req.query.contractId) : undefined,
      status: req.query.status as string | undefined,
      year: req.query.year ? Number(req.query.year) : undefined,
      month: req.query.month ? Number(req.query.month) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      search: req.query.search as string | undefined,
      tenantId: req.query.tenantId ? Number(req.query.tenantId) : undefined,
      ownerId: req.query.ownerId ? Number(req.query.ownerId) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const payment = await service.getPaymentById(Number(req.params.id));
    res.json(payment);
  } catch (err) {
    next(err);
  }
}

export async function generatePayments(req: Request, res: Response, next: NextFunction) {
  try {
    const payments = await service.generatePaymentsForContract(Number(req.params.contractId));
    res.status(201).json(payments);
  } catch (err) {
    next(err);
  }
}

export async function registerPayment(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
  }
  try {
    const payment = await service.registerPayment(Number(req.params.id), req.body);
    res.json(payment);
  } catch (err) {
    next(err);
  }
}

export async function updatePaymentAmount(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
  }
  try {
    const payment = await service.updatePaymentAmount(Number(req.params.id), Number(req.body.expectedAmount));
    res.json(payment);
  } catch (err) {
    next(err);
  }
}

export async function markPaymentLate(req: Request, res: Response, next: NextFunction) {
  try {
    const payment = await service.markPaymentLate(Number(req.params.id));
    res.json(payment);
  } catch (err) {
    next(err);
  }
}

export async function downloadReceipt(req: Request, res: Response, next: NextFunction) {
  try {
    await generatePaymentReceipt(Number(req.params.id), res);
  } catch (err) {
    next(err);
  }
}
