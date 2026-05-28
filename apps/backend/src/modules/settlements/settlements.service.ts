import { Currency, Prisma, SettlementStatus } from '@prisma/client';
import prisma from '../../lib/prisma';
import { buildWordSearch } from '../../lib/searchUtils';

export interface SettlementsQuery {
  propertyId?: number;
  contractId?: number;
  status?: string;
  year?: number;
  page?: number;
  limit?: number;
  search?: string;
  ownerId?: number;
  tenantId?: number;
}

const settlementInclude = {
  property: {
    select: {
      id: true, street: true, number: true, city: true,
      owners: {
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, businessName: true, type: true, cbu: true, bankName: true, phone: true, email: true } },
        },
      },
    },
  },
  contract: {
    select: {
      id: true, adminCommissionPct: true, currency: true,
      tenants: {
        where: { isPrimary: true },
        include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true } } },
        take: 1,
      },
    },
  },
};

export async function getSettlements(query: SettlementsQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, query.limit || 20);
  const skip = (page - 1) * limit;

  const searchFilter = query.search
    ? buildWordSearch(query.search, (w) => [
        { property: { street: { contains: w, mode: 'insensitive' } } } as Prisma.SettlementWhereInput,
        { property: { city: { contains: w, mode: 'insensitive' } } } as Prisma.SettlementWhereInput,
        { property: { owners: { some: { owner: { firstName: { contains: w, mode: 'insensitive' } } } } } } as Prisma.SettlementWhereInput,
        { property: { owners: { some: { owner: { lastName: { contains: w, mode: 'insensitive' } } } } } } as Prisma.SettlementWhereInput,
        { property: { owners: { some: { owner: { businessName: { contains: w, mode: 'insensitive' } } } } } } as Prisma.SettlementWhereInput,
        { contract: { tenants: { some: { tenant: { firstName: { contains: w, mode: 'insensitive' } } } } } } as Prisma.SettlementWhereInput,
        { contract: { tenants: { some: { tenant: { lastName: { contains: w, mode: 'insensitive' } } } } } } as Prisma.SettlementWhereInput,
        { contract: { tenants: { some: { tenant: { businessName: { contains: w, mode: 'insensitive' } } } } } } as Prisma.SettlementWhereInput,
      ])
    : undefined;

  const where: Prisma.SettlementWhereInput = {
    ...(query.propertyId && { propertyId: query.propertyId }),
    ...(query.contractId && { contractId: query.contractId }),
    ...(query.status && { status: query.status as SettlementStatus }),
    ...(query.year && { periodYear: query.year }),
    ...(query.ownerId && { property: { owners: { some: { ownerId: query.ownerId } } } }),
    ...(query.tenantId && { contract: { tenants: { some: { tenantId: query.tenantId } } } }),
    ...(searchFilter && searchFilter),
  };

  const [data, total] = await Promise.all([
    prisma.settlement.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      include: settlementInclude,
    }),
    prisma.settlement.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getSettlementById(id: number) {
  const settlement = await prisma.settlement.findUnique({
    where: { id },
    include: settlementInclude,
  });
  if (!settlement) throw { status: 404, message: 'Liquidación no encontrada', code: 'NOT_FOUND' };
  return settlement;
}

export async function generateSettlement(contractId: number, year: number, month: number, notes?: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { id: true, propertyId: true, adminCommissionPct: true, currency: true, status: true },
  });
  if (!contract) throw { status: 404, message: 'Contrato no encontrado', code: 'NOT_FOUND' };
  if (contract.status !== 'ACTIVE') throw { status: 409, message: 'El contrato debe estar activo', code: 'INVALID_STATUS' };

  // Cobros pagados (total o parcial) en el período
  const payments = await prisma.payment.findMany({
    where: { contractId, periodYear: year, periodMonth: month, status: { in: ['PAID', 'PARTIAL'] } },
  });
  const rentCollected = payments.reduce((sum, p) => sum + (p.paidAmount ?? 0), 0);

  // Gastos a cargo de la inmobiliaria en ese período y propiedad
  const expenses = await prisma.expense.findMany({
    where: { propertyId: contract.propertyId, periodYear: year, periodMonth: month, paidBy: { not: 'OWNER' }, deletedAt: null },
  });
  const expensesAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const commissionPct = contract.adminCommissionPct;
  const commissionAmount = (rentCollected * commissionPct) / 100;
  const netAmount = rentCollected - commissionAmount - expensesAmount;

  // Upsert: si ya existe borrador lo reemplaza, si está enviado/pagado falla
  const existing = await prisma.settlement.findUnique({
    where: { contractId_periodYear_periodMonth: { contractId, periodYear: year, periodMonth: month } },
  });
  if (existing && existing.status !== 'DRAFT') {
    throw { status: 409, message: 'Ya existe una liquidación enviada o pagada para este período', code: 'SETTLEMENT_LOCKED' };
  }

  if (existing) {
    return prisma.settlement.update({
      where: { id: existing.id },
      data: { rentCollected, commissionPct, commissionAmount, expensesAmount, netAmount, notes: notes ?? null },
      include: settlementInclude,
    });
  }

  return prisma.settlement.create({
    data: {
      propertyId: contract.propertyId,
      contractId,
      periodYear: year,
      periodMonth: month,
      rentCollected,
      commissionPct,
      commissionAmount,
      expensesAmount,
      netAmount,
      currency: contract.currency as Currency,
      notes: notes ?? null,
    },
    include: settlementInclude,
  });
}

export async function markSettlementSent(id: number) {
  const s = await getSettlementById(id);
  if (s.status !== 'DRAFT') throw { status: 409, message: 'Solo se pueden enviar liquidaciones en borrador', code: 'INVALID_STATUS' };
  return prisma.settlement.update({ where: { id }, data: { status: 'SENT', sentAt: new Date() }, include: settlementInclude });
}

export async function markSettlementPaid(id: number) {
  const s = await getSettlementById(id);
  if (s.status !== 'SENT') throw { status: 409, message: 'Solo se pueden marcar como pagadas liquidaciones enviadas', code: 'INVALID_STATUS' };
  return prisma.settlement.update({ where: { id }, data: { status: 'PAID', paidAt: new Date() }, include: settlementInclude });
}
