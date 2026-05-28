import { PaymentStatus, Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';

// ─── Cobros del período ───────────────────────────────────────────────────────

export async function getPaymentsPeriodReport(year: number, month: number) {
  const payments = await prisma.payment.findMany({
    where: { periodYear: year, periodMonth: month },
    include: {
      contract: {
        select: {
          currency: true,
          adminCommissionPct: true,
          property: { select: { id: true, street: true, number: true, city: true } },
          tenants: {
            where: { isPrimary: true },
            include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true } } },
            take: 1,
          },
        },
      },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  });

  const summary = {
    total: payments.length,
    paid: payments.filter((p) => p.status === 'PAID').length,
    partial: payments.filter((p) => p.status === 'PARTIAL').length,
    pending: payments.filter((p) => p.status === 'PENDING').length,
    late: payments.filter((p) => p.status === 'LATE').length,
    totalExpected: payments.reduce((s, p) => s + Number(p.expectedAmount), 0),
    totalCollected: payments.reduce((s, p) => s + Number(p.paidAmount ?? 0), 0),
    totalCommissions: payments
      .filter((p) => p.status === 'PAID' || p.status === 'PARTIAL')
      .reduce((s, p) => s + (Number(p.paidAmount ?? 0) * p.contract.adminCommissionPct) / 100, 0),
  };

  return { year, month, summary, payments };
}

// ─── Deuda activa ─────────────────────────────────────────────────────────────

export async function getActiveDebtReport() {
  const payments = await prisma.payment.findMany({
    where: { status: { in: ['PENDING', 'LATE', 'PARTIAL'] as PaymentStatus[] } },
    include: {
      contract: {
        select: {
          currency: true,
          property: { select: { id: true, street: true, number: true, city: true } },
          tenants: {
            where: { isPrimary: true },
            include: { tenant: { select: { id: true, firstName: true, lastName: true, businessName: true, type: true, phone: true } } },
            take: 1,
          },
        },
      },
    },
    orderBy: [{ dueDate: 'asc' }],
  });

  const now = new Date();
  const enriched = payments.map((p) => {
    const daysOverdue = p.status !== 'PENDING'
      ? Math.max(0, Math.floor((now.getTime() - new Date(p.dueDate).getTime()) / 86400000))
      : 0;
    const debtAmount = Number(p.expectedAmount) - Number(p.paidAmount ?? 0);
    return { ...p, daysOverdue, debtAmount };
  });

  const summary = {
    totalDebtors: new Set(enriched.map((p) => p.contract.tenants[0]?.tenant.id)).size,
    totalAmount: enriched.reduce((s, p) => s + p.debtAmount, 0),
    lateCount: enriched.filter((p) => p.status === 'LATE').length,
    pendingCount: enriched.filter((p) => p.status === 'PENDING').length,
    partialCount: enriched.filter((p) => p.status === 'PARTIAL').length,
  };

  return { summary, payments: enriched };
}

// ─── Contratos por vencer ─────────────────────────────────────────────────────

export async function getExpiringContractsReport(days: number) {
  const now = new Date();
  const until = new Date(now);
  until.setDate(until.getDate() + days);

  const contracts = await prisma.contract.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      endDate: { gte: now, lte: until },
    },
    include: {
      property: {
        select: {
          id: true, street: true, number: true, city: true,
          owners: {
            include: { owner: { select: { firstName: true, lastName: true, businessName: true, type: true, phone: true, email: true } } },
          },
        },
      },
      tenants: {
        include: { tenant: { select: { id: true, firstName: true, lastName: true, businessName: true, type: true, phone: true, email: true } } },
      },
    },
    orderBy: { endDate: 'asc' },
  });

  const enriched = contracts.map((c) => ({
    ...c,
    daysUntilExpiry: Math.ceil((new Date(c.endDate).getTime() - now.getTime()) / 86400000),
  }));

  const summary = {
    total: contracts.length,
    within15: enriched.filter((c) => c.daysUntilExpiry <= 15).length,
    within30: enriched.filter((c) => c.daysUntilExpiry <= 30).length,
    within60: enriched.filter((c) => c.daysUntilExpiry <= 60).length,
  };

  return { days, summary, contracts: enriched };
}

// ─── Gastos del período ───────────────────────────────────────────────────────

export async function getExpensesPeriodReport(year: number, month?: number) {
  const where: Prisma.ExpenseWhereInput = {
    deletedAt: null,
    periodYear: year,
    ...(month && { periodMonth: month }),
  };

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      property: { select: { id: true, street: true, number: true, city: true } },
    },
    orderBy: [{ date: 'desc' }],
  });

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  const byPayer = {
    AGENCY: expenses.filter((e) => e.paidBy === 'AGENCY').reduce((s, e) => s + Number(e.amount), 0),
    OWNER: expenses.filter((e) => e.paidBy === 'OWNER').reduce((s, e) => s + Number(e.amount), 0),
    TENANT: expenses.filter((e) => e.paidBy === 'TENANT').reduce((s, e) => s + Number(e.amount), 0),
  };

  const summary = {
    total: expenses.length,
    totalAmount: expenses.reduce((s, e) => s + Number(e.amount), 0),
    byCategory,
    byPayer,
  };

  return { year, month, summary, expenses };
}

// ─── Rentabilidad por propiedad ────────────────────────────────────────────────

export async function getProfitabilityReport(year: number) {
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { periodYear: year, status: { in: ['PAID', 'PARTIAL'] } },
      include: {
        contract: {
          select: {
            currency: true,
            adminCommissionPct: true,
            propertyId: true,
            property: { select: { id: true, street: true, number: true, city: true, type: true } },
          },
        },
      },
    }),
    prisma.expense.findMany({
      where: { deletedAt: null, periodYear: year },
      select: { propertyId: true, amount: true, currency: true, paidBy: true },
    }),
  ]);

  const map = new Map<number, {
    property: { id: number; street: string; number: string; city: string; type: string };
    currency: string;
    grossIncome: number;
    commissions: number;
    expenses: number;
    netIncome: number;
  }>();

  for (const p of payments) {
    const prop = p.contract.property;
    const entry = map.get(prop.id) ?? {
      property: prop,
      currency: p.contract.currency,
      grossIncome: 0,
      commissions: 0,
      expenses: 0,
      netIncome: 0,
    };
    const paid = Number(p.paidAmount ?? 0);
    entry.grossIncome += paid;
    entry.commissions += (paid * p.contract.adminCommissionPct) / 100;
    map.set(prop.id, entry);
  }

  for (const e of expenses) {
    const entry = map.get(e.propertyId);
    if (entry) {
      entry.expenses += Number(e.amount);
    }
  }

  const rows = Array.from(map.values()).map((row) => ({
    ...row,
    netIncome: row.grossIncome - row.commissions - row.expenses,
  })).sort((a, b) => b.netIncome - a.netIncome);

  const summary = {
    totalGross: rows.reduce((s, r) => s + r.grossIncome, 0),
    totalCommissions: rows.reduce((s, r) => s + r.commissions, 0),
    totalExpenses: rows.reduce((s, r) => s + r.expenses, 0),
    totalNet: rows.reduce((s, r) => s + r.netIncome, 0),
  };

  return { year, summary, properties: rows };
}

// ─── Vacancia ─────────────────────────────────────────────────────────────────

export async function getVacancyReport() {
  const properties = await prisma.property.findMany({
    where: { deletedAt: null },
    include: {
      owners: {
        include: { owner: { select: { firstName: true, lastName: true, businessName: true, type: true, phone: true } } },
      },
      contracts: {
        where: { deletedAt: null, status: { in: ['ACTIVE', 'DRAFT'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, status: true, endDate: true, currentAmount: true, currency: true },
      },
    },
    orderBy: { status: 'asc' },
  });

  const vacant = properties.filter((p) => p.status === 'AVAILABLE' || p.status === 'UNDER_RENOVATION');
  const occupied = properties.filter((p) => p.status === 'RENTED' || p.status === 'OCCUPIED_WITHOUT_CONTRACT');
  const forSale = properties.filter((p) => p.status === 'FOR_SALE' || p.status === 'SOLD');

  const summary = {
    total: properties.length,
    vacant: vacant.length,
    occupied: occupied.length,
    forSale: forSale.length,
    vacancyRate: properties.length > 0 ? ((vacant.length / properties.length) * 100).toFixed(1) : '0',
  };

  return { summary, properties };
}

// ─── Historial de aumentos ─────────────────────────────────────────────────────

export async function getAdjustmentsReport(year: number) {
  const adjustments = await prisma.contractAdjustment.findMany({
    where: { appliedAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
    include: {
      contract: {
        select: {
          id: true,
          currency: true,
          property: { select: { street: true, number: true, city: true } },
          tenants: {
            where: { isPrimary: true },
            include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true } } },
            take: 1,
          },
        },
      },
    },
    orderBy: { appliedAt: 'desc' },
  });

  const summary = {
    total: adjustments.length,
    avgPercentage:
      adjustments.length > 0
        ? (adjustments.reduce((s, a) => s + a.percentage, 0) / adjustments.length).toFixed(2)
        : '0',
    byIndex: adjustments.reduce<Record<string, number>>((acc, a) => {
      acc[a.indexType] = (acc[a.indexType] ?? 0) + 1;
      return acc;
    }, {}),
  };

  return { year, summary, adjustments };
}

// ─── Liquidaciones por propietario ────────────────────────────────────────────

export async function getSettlementsReport(year: number, ownerId?: number) {
  type SettlementWithProperty = Awaited<ReturnType<typeof prisma.settlement.findMany<{
    include: { property: { select: { id: true; street: true; number: true; city: true; owners: { include: { owner: { select: { id: true; firstName: true; lastName: true; businessName: true; type: true } } } } } } }
  }>>>[number];

  const settlements = await prisma.settlement.findMany({
    where: {
      periodYear: year,
      ...(ownerId && {
        property: { owners: { some: { ownerId } } },
      }),
    },
    include: {
      property: {
        select: {
          id: true, street: true, number: true, city: true,
          owners: {
            include: { owner: { select: { id: true, firstName: true, lastName: true, businessName: true, type: true } } },
          },
        },
      },
    },
    orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
  });

  const byOwner = new Map<number, {
    owner: { id: number; firstName?: string | null; lastName?: string | null; businessName?: string | null; type: string };
    settlements: SettlementWithProperty[];
    totalNet: number;
    totalCommissions: number;
  }>();

  for (const s of settlements) {
    const ownerEntry = s.property.owners[0]?.owner;
    if (!ownerEntry) continue;
    const entry = byOwner.get(ownerEntry.id) ?? { owner: ownerEntry, settlements: [] as SettlementWithProperty[], totalNet: 0, totalCommissions: 0 };
    entry.settlements.push(s);
    entry.totalNet += Number(s.netAmount);
    entry.totalCommissions += Number(s.commissionAmount);
    byOwner.set(ownerEntry.id, entry);
  }

  const summary = {
    total: settlements.length,
    totalNet: settlements.reduce((s, e) => s + Number(e.netAmount), 0),
    totalCommissions: settlements.reduce((s, e) => s + Number(e.commissionAmount), 0),
  };

  return { year, summary, settlements, byOwner: Array.from(byOwner.values()) };
}
