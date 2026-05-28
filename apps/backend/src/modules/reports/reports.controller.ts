import { Request, Response, NextFunction } from 'express';
import * as service from './reports.service';

export async function paymentsPeriodReport(req: Request, res: Response, next: NextFunction) {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const data = await service.getPaymentsPeriodReport(year, month);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function activeDebtReport(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getActiveDebtReport();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function expiringContractsReport(req: Request, res: Response, next: NextFunction) {
  try {
    const days = Number(req.query.days) || 60;
    const data = await service.getExpiringContractsReport(days);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function expensesPeriodReport(req: Request, res: Response, next: NextFunction) {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = req.query.month ? Number(req.query.month) : undefined;
    const data = await service.getExpensesPeriodReport(year, month);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function profitabilityReport(req: Request, res: Response, next: NextFunction) {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    res.json(await service.getProfitabilityReport(year));
  } catch (err) { next(err); }
}

export async function vacancyReport(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getVacancyReport());
  } catch (err) { next(err); }
}

export async function adjustmentsReport(req: Request, res: Response, next: NextFunction) {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    res.json(await service.getAdjustmentsReport(year));
  } catch (err) { next(err); }
}

export async function settlementsReport(req: Request, res: Response, next: NextFunction) {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const ownerId = req.query.ownerId ? Number(req.query.ownerId) : undefined;
    res.json(await service.getSettlementsReport(year, ownerId));
  } catch (err) { next(err); }
}
