import { Currency, PaidBy, Prisma, SettlementStatus, SettlementChargeCategory } from '@prisma/client';
import prisma from '../../lib/prisma';
import { buildWordSearch } from '../../lib/searchUtils';

export interface SettlementsQuery {
  ownerId?: number;
  status?: string;
  year?: number;
  month?: number;
  page?: number;
  limit?: number;
  search?: string;
}

const ownerSettlementInclude = {
  owner: {
    select: { id: true, firstName: true, lastName: true, businessName: true, type: true, cbu: true, bankName: true, phone: true, email: true },
  },
  properties: {
    include: {
      property: { select: { id: true, street: true, number: true, city: true } },
    },
  },
  charges: { orderBy: { id: 'asc' as const } },
};

export async function getOwnerSettlements(query: SettlementsQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, query.limit || 20);
  const skip = (page - 1) * limit;

  const searchFilter = query.search
    ? buildWordSearch(query.search, (w) => [
        { owner: { firstName: { contains: w, mode: 'insensitive' } } } as Prisma.OwnerSettlementWhereInput,
        { owner: { lastName: { contains: w, mode: 'insensitive' } } } as Prisma.OwnerSettlementWhereInput,
        { owner: { businessName: { contains: w, mode: 'insensitive' } } } as Prisma.OwnerSettlementWhereInput,
        { properties: { some: { property: { street: { contains: w, mode: 'insensitive' } } } } } as Prisma.OwnerSettlementWhereInput,
        { properties: { some: { property: { city: { contains: w, mode: 'insensitive' } } } } } as Prisma.OwnerSettlementWhereInput,
      ])
    : undefined;

  const where: Prisma.OwnerSettlementWhereInput = {
    ...(query.ownerId && { ownerId: query.ownerId }),
    ...(query.status && { status: query.status as SettlementStatus }),
    ...(query.year && { periodYear: query.year }),
    ...(query.month && { periodMonth: query.month }),
    ...(searchFilter && searchFilter),
  };

  const [data, total] = await Promise.all([
    prisma.ownerSettlement.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      include: ownerSettlementInclude,
    }),
    prisma.ownerSettlement.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getOwnerSettlementById(id: number) {
  const settlement = await prisma.ownerSettlement.findUnique({
    where: { id },
    include: ownerSettlementInclude,
  });
  if (!settlement) throw { status: 404, message: 'Liquidación no encontrada', code: 'NOT_FOUND' };
  return settlement;
}

async function recomputeOwnerSettlementTotals(ownerSettlementId: number) {
  const [properties, charges] = await Promise.all([
    prisma.ownerSettlementProperty.findMany({ where: { ownerSettlementId } }),
    prisma.ownerSettlementCharge.findMany({ where: { ownerSettlementId } }),
  ]);
  const totalRent = properties.reduce((sum, p) => sum + p.rentCollected, 0);
  const totalCommission = properties.reduce((sum, p) => sum + p.commissionAmount, 0);
  const totalExpenses = properties.reduce((sum, p) => sum + p.expensesAmount, 0);
  // Un cargo a cargo del propietario (paidBy OWNER) no se descuenta del neto: el propietario ya lo
  // afronta directamente, no es plata que pase por la inmobiliaria.
  const totalCharges = charges.filter((c) => c.paidBy !== 'OWNER').reduce((sum, c) => sum + c.amount, 0);
  const netAmount = totalRent - totalCommission - totalExpenses - totalCharges;

  return prisma.ownerSettlement.update({
    where: { id: ownerSettlementId },
    data: { totalRent, totalCommission, totalExpenses, totalCharges, netAmount },
    include: ownerSettlementInclude,
  });
}

export async function generateOwnerSettlement(ownerId: number, year: number, month: number, notes?: string) {
  const owner = await prisma.owner.findUnique({ where: { id: ownerId } });
  if (!owner) throw { status: 404, message: 'Propietario no encontrado', code: 'NOT_FOUND' };

  const existing = await prisma.ownerSettlement.findUnique({
    where: { ownerId_periodYear_periodMonth: { ownerId, periodYear: year, periodMonth: month } },
  });
  if (existing && existing.status !== 'DRAFT') {
    throw { status: 409, message: 'Ya existe una liquidación enviada o pagada para este período', code: 'SETTLEMENT_LOCKED' };
  }

  const ownedProperties = await prisma.propertyOwner.findMany({ where: { ownerId } });
  let currency: Currency = 'ARS';

  const propertyRows: Omit<Prisma.OwnerSettlementPropertyCreateManyInput, 'ownerSettlementId'>[] = [];

  for (const po of ownedProperties) {
    // Contrato activo de la propiedad (si lo hay), independientemente de si ya se cobró el
    // alquiler de este período — así la propiedad aparece igual en la revisión para poder
    // cargarle impuestos/servicios/tasas aunque el cobro todavía esté pendiente.
    const activeContract = await prisma.contract.findFirst({
      where: { propertyId: po.propertyId, status: 'ACTIVE' },
      select: { id: true, adminCommissionPct: true, currency: true },
    });

    const payments = activeContract
      ? await prisma.payment.findMany({
          where: { contractId: activeContract.id, periodYear: year, periodMonth: month, status: { in: ['PAID', 'PARTIAL'] } },
        })
      : [];

    const expenses = await prisma.expense.findMany({
      where: { propertyId: po.propertyId, periodYear: year, periodMonth: month, paidBy: { not: 'OWNER' }, deletedAt: null },
    });
    const propertyExpensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

    const rentCollectedFull = payments.reduce((sum, p) => sum + (p.paidAmount ?? 0), 0);
    const commissionPct = activeContract?.adminCommissionPct ?? 0;
    if (activeContract) currency = activeContract.currency;

    const commissionAmountFull = (rentCollectedFull * commissionPct) / 100;

    // Sin contrato activo y sin gastos: la propiedad no tiene nada que aportar este período.
    if (!activeContract && propertyExpensesTotal === 0) continue;

    const share = po.percentage / 100;
    const rentCollected = rentCollectedFull * share;
    const commissionAmount = commissionAmountFull * share;
    const expensesAmount = propertyExpensesTotal * share;

    propertyRows.push({
      propertyId: po.propertyId,
      contractId: activeContract?.id ?? null,
      sharePercentage: po.percentage,
      rentCollected,
      commissionPct,
      commissionAmount,
      expensesAmount,
      subtotal: rentCollected - commissionAmount - expensesAmount,
    });
  }

  const ownerSettlement = await prisma.ownerSettlement.upsert({
    where: { ownerId_periodYear_periodMonth: { ownerId, periodYear: year, periodMonth: month } },
    create: { ownerId, periodYear: year, periodMonth: month, currency, notes: notes ?? null },
    update: { currency, notes: notes ?? null },
  });

  await prisma.ownerSettlementProperty.deleteMany({ where: { ownerSettlementId: ownerSettlement.id } });
  if (propertyRows.length > 0) {
    await prisma.ownerSettlementProperty.createMany({
      data: propertyRows.map((r) => ({ ...r, ownerSettlementId: ownerSettlement.id })),
    });
  }

  return recomputeOwnerSettlementTotals(ownerSettlement.id);
}

// Genera (o recalcula) la liquidación de TODOS los propietarios que tienen al menos una propiedad
// con contrato activo, para el período dado — así no hace falta generar liquidación propietario por
// propietario. Las que ya estén enviadas/pagadas para ese período se dejan intactas y se listan aparte.
export async function generateAllOwnerSettlements(year: number, month: number) {
  const owners = await prisma.propertyOwner.findMany({
    where: { property: { contracts: { some: { status: 'ACTIVE' } } } },
    select: { ownerId: true },
    distinct: ['ownerId'],
  });

  const settlements: Awaited<ReturnType<typeof generateOwnerSettlement>>[] = [];
  const lockedOwnerIds: number[] = [];

  for (const { ownerId } of owners) {
    try {
      settlements.push(await generateOwnerSettlement(ownerId, year, month));
    } catch (err: any) {
      if (err?.code === 'SETTLEMENT_LOCKED') { lockedOwnerIds.push(ownerId); continue; }
      throw err;
    }
  }

  return { settlements, lockedOwnerIds };
}

export async function markSettlementSent(id: number) {
  const s = await getOwnerSettlementById(id);
  if (s.status !== 'DRAFT') throw { status: 409, message: 'Solo se pueden enviar liquidaciones en borrador', code: 'INVALID_STATUS' };
  return prisma.ownerSettlement.update({ where: { id }, data: { status: 'SENT', sentAt: new Date() }, include: ownerSettlementInclude });
}

export async function markSettlementPaid(id: number) {
  const s = await getOwnerSettlementById(id);
  if (s.status !== 'SENT') throw { status: 409, message: 'Solo se pueden marcar como pagadas liquidaciones enviadas', code: 'INVALID_STATUS' };
  return prisma.ownerSettlement.update({ where: { id }, data: { status: 'PAID', paidAt: new Date() }, include: ownerSettlementInclude });
}

// ─── Cargos ad-hoc (impuestos, servicios, tasas, otros) ───────────────────────

export interface ChargeInput {
  propertyId?: number;
  category: SettlementChargeCategory;
  description: string;
  amount: number;
  paidBy?: PaidBy;
}

async function assertSettlementEditable(ownerSettlementId: number) {
  const s = await getOwnerSettlementById(ownerSettlementId);
  if (s.status === 'PAID') throw { status: 409, message: 'La liquidación ya está pagada y no admite cambios', code: 'SETTLEMENT_LOCKED' };
  return s;
}

export async function addCharge(ownerSettlementId: number, input: ChargeInput) {
  await assertSettlementEditable(ownerSettlementId);
  await prisma.ownerSettlementCharge.create({
    data: {
      ownerSettlementId,
      propertyId: input.propertyId ?? null,
      category: input.category,
      description: input.description,
      amount: input.amount,
      paidBy: input.paidBy ?? 'AGENCY',
    },
  });
  return recomputeOwnerSettlementTotals(ownerSettlementId);
}

async function getChargeOrThrow(chargeId: number) {
  const charge = await prisma.ownerSettlementCharge.findUnique({ where: { id: chargeId } });
  if (!charge) throw { status: 404, message: 'Cargo no encontrado', code: 'NOT_FOUND' };
  return charge;
}

export async function updateCharge(chargeId: number, input: Partial<ChargeInput>) {
  const charge = await getChargeOrThrow(chargeId);
  await assertSettlementEditable(charge.ownerSettlementId);
  await prisma.ownerSettlementCharge.update({
    where: { id: chargeId },
    data: {
      ...(input.propertyId !== undefined && { propertyId: input.propertyId }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.paidBy !== undefined && { paidBy: input.paidBy }),
    },
  });
  return recomputeOwnerSettlementTotals(charge.ownerSettlementId);
}

export async function toggleChargePaid(chargeId: number, isPaid: boolean) {
  const charge = await getChargeOrThrow(chargeId);
  await prisma.ownerSettlementCharge.update({
    where: { id: chargeId },
    data: { isPaid, paidAt: isPaid ? new Date() : null },
  });
  return recomputeOwnerSettlementTotals(charge.ownerSettlementId);
}

export async function deleteCharge(chargeId: number) {
  const charge = await getChargeOrThrow(chargeId);
  await assertSettlementEditable(charge.ownerSettlementId);
  await prisma.ownerSettlementCharge.delete({ where: { id: chargeId } });
  return recomputeOwnerSettlementTotals(charge.ownerSettlementId);
}
