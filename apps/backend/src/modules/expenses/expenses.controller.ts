import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as service from './expenses.service';

export async function getExpenses(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getExpenses({
      propertyId: req.query.propertyId ? Number(req.query.propertyId) : undefined,
      contractId: req.query.contractId ? Number(req.query.contractId) : undefined,
      category: req.query.category as string | undefined,
      year: req.query.year ? Number(req.query.year) : undefined,
      month: req.query.month ? Number(req.query.month) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      search: req.query.search as string | undefined,
      ownerId: req.query.ownerId ? Number(req.query.ownerId) : undefined,
      tenantId: req.query.tenantId ? Number(req.query.tenantId) : undefined,
      paidBy: req.query.paidBy as string | undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getExpense(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getExpenseById(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function createExpense(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Datos inválidos', code: 'VALIDATION_ERROR', details: errors.array() });
  }
  try {
    res.status(201).json(await service.createExpense(req.body));
  } catch (err) {
    next(err);
  }
}

export async function updateExpense(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.updateExpense(Number(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
}

export async function deleteExpense(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteExpense(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getExpensesSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { propertyId } = req.params;
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    res.json(await service.getExpensesSummary(Number(propertyId), year, month));
  } catch (err) {
    next(err);
  }
}
