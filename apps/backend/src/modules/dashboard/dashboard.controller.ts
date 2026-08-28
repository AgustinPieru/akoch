import { Response, Request } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../lib/prisma';

export async function getStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const in60Days = new Date(now);
    in60Days.setDate(in60Days.getDate() + 60);

    const [
      totalProperties,
      rentedProperties,
      availableProperties,
      totalOwners,
      totalTenants,
      activeContracts,
      propertiesByStatus,
      pendingPaymentsThisMonth,
      latePayments,
      contractsExpiringSoon,
      draftSettlements,
      recentProperties,
    ] = await Promise.all([
      prisma.property.count({ where: { deletedAt: null } }),
      prisma.property.count({ where: { deletedAt: null, status: 'RENTED' } }),
      prisma.property.count({ where: { deletedAt: null, status: 'AVAILABLE' } }),
      prisma.owner.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      prisma.tenant.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      prisma.contract.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      prisma.property.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { status: true },
      }),
      prisma.payment.findMany({
        where: { status: 'PENDING', periodYear: currentYear, periodMonth: currentMonth },
        include: {
          contract: {
            select: {
              currency: true,
              property: { select: { id: true, street: true, number: true, city: true } },
              tenants: {
                where: { isPrimary: true },
                include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true } } },
                take: 1,
              },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.payment.findMany({
        where: { status: 'LATE' },
        include: {
          contract: {
            select: {
              currency: true,
              property: { select: { id: true, street: true, number: true, city: true } },
              tenants: {
                where: { isPrimary: true },
                include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true } } },
                take: 1,
              },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.contract.findMany({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
          endDate: { gte: now, lte: in60Days },
        },
        select: {
          id: true,
          endDate: true,
          property: { select: { id: true, street: true, number: true, city: true } },
          tenants: {
            where: { isPrimary: true },
            include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true } } },
            take: 1,
          },
        },
        orderBy: { endDate: 'asc' },
        take: 10,
      }),
      prisma.ownerSettlement.findMany({
        where: { status: 'DRAFT' },
        select: {
          id: true, periodYear: true, periodMonth: true, netAmount: true, currency: true,
          owner: { select: { firstName: true, lastName: true, businessName: true, type: true } },
          properties: { select: { property: { select: { street: true, number: true, city: true } } } },
        },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        take: 10,
      }),
      prisma.property.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, street: true, number: true, city: true, status: true, type: true, createdAt: true },
      }),
    ]);

    const pendingCount = pendingPaymentsThisMonth.length;
    const pendingAmount = pendingPaymentsThisMonth.reduce((s, p) => s + p.expectedAmount, 0);
    const lateCount = latePayments.length;
    const lateAmount = latePayments.reduce((s, p) => s + p.expectedAmount, 0);

    res.json({
      properties: {
        total: totalProperties,
        rented: rentedProperties,
        available: availableProperties,
        byStatus: propertiesByStatus.map((g) => ({ status: g.status, count: g._count.status })),
      },
      owners: { total: totalOwners },
      tenants: { total: totalTenants },
      contracts: { active: activeContracts },
      payments: {
        pendingThisMonth: { count: pendingCount, amount: pendingAmount, items: pendingPaymentsThisMonth },
        late: { count: lateCount, amount: lateAmount, items: latePayments },
      },
      contractsExpiringSoon,
      draftSettlements,
      recentProperties,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export async function getAlerts(_req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const nowTs = now.getTime();

    const MS_DAY = 86_400_000;
    const daysAgo = (n: number) => new Date(nowTs - n * MS_DAY);
    const daysFromNow = (n: number) => new Date(nowTs + n * MS_DAY);

    const [
      expiredContracts,
      contractsExpiring30,
      contractsExpiring60,
      pendingAdjustments,
      latePayments,
      pendingOverdue15,
      pendingOverdue5,
      draftSettlementsThisMonth,
      activeOccupations,
    ] = await Promise.all([
      // 🔴 Contratos vencidos sin acción (status EXPIRED)
      prisma.contract.findMany({
        where: { deletedAt: null, status: 'EXPIRED' },
        select: {
          id: true,
          endDate: true,
          property: { select: { street: true, number: true, city: true } },
          tenants: {
            where: { isPrimary: true }, take: 1,
            include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true } } },
          },
        },
        orderBy: { endDate: 'asc' },
        take: 20,
      }),
      // 🟡 Contratos activos que vencen en < 30 días
      prisma.contract.findMany({
        where: { deletedAt: null, status: 'ACTIVE', endDate: { gte: now, lte: daysFromNow(30) } },
        select: {
          id: true, endDate: true,
          property: { select: { street: true, number: true, city: true } },
          tenants: {
            where: { isPrimary: true }, take: 1,
            include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true } } },
          },
        },
        orderBy: { endDate: 'asc' },
        take: 20,
      }),
      // 🔵 Contratos activos que vencen entre 30 y 60 días
      prisma.contract.findMany({
        where: { deletedAt: null, status: 'ACTIVE', endDate: { gt: daysFromNow(30), lte: daysFromNow(60) } },
        select: {
          id: true, endDate: true,
          property: { select: { street: true, number: true, city: true } },
          tenants: {
            where: { isPrimary: true }, take: 1,
            include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true } } },
          },
        },
        orderBy: { endDate: 'asc' },
        take: 20,
      }),
      // 🟡 Ajustes de alquiler vencidos (nextAdjustmentDate pasada, contrato ACTIVE)
      prisma.contract.findMany({
        where: { deletedAt: null, status: 'ACTIVE', nextAdjustmentDate: { lt: now }, indexType: { not: 'NONE' } },
        select: {
          id: true, nextAdjustmentDate: true, indexType: true,
          property: { select: { street: true, number: true, city: true } },
        },
        orderBy: { nextAdjustmentDate: 'asc' },
        take: 20,
      }),
      // 🔴 Cobros LATE con > 15 días de mora
      prisma.payment.findMany({
        where: { status: 'LATE', dueDate: { lte: daysAgo(15) } },
        include: {
          contract: {
            select: {
              id: true, currency: true,
              property: { select: { street: true, number: true, city: true } },
              tenants: {
                where: { isPrimary: true }, take: 1,
                include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true } } },
              },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      // 🔴 Cobros PENDING con vencimiento hace más de 15 días
      prisma.payment.findMany({
        where: { status: 'PENDING', dueDate: { lte: daysAgo(15) } },
        include: {
          contract: {
            select: {
              id: true, currency: true,
              property: { select: { street: true, number: true, city: true } },
              tenants: {
                where: { isPrimary: true }, take: 1,
                include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true } } },
              },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      // 🟡 Cobros PENDING con vencimiento hace 5-15 días
      prisma.payment.findMany({
        where: { status: 'PENDING', dueDate: { lte: daysAgo(5), gt: daysAgo(15) } },
        include: {
          contract: {
            select: {
              id: true, currency: true,
              property: { select: { street: true, number: true, city: true } },
              tenants: {
                where: { isPrimary: true }, take: 1,
                include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true } } },
              },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      // 🟡 Liquidaciones DRAFT del mes actual sin enviar
      prisma.ownerSettlement.findMany({
        where: { status: 'DRAFT' },
        select: {
          id: true, periodYear: true, periodMonth: true, netAmount: true, currency: true,
          owner: { select: { firstName: true, lastName: true, businessName: true, type: true } },
          properties: { select: { property: { select: { street: true, number: true, city: true } } } },
        },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        take: 20,
      }),
      // 🔴/🟡 Ocupaciones sin contrato activas
      prisma.informalOccupation.findMany({
        where: { status: 'ACTIVE', alertActive: true },
        include: {
          property: { select: { id: true, street: true, number: true, city: true } },
        },
        orderBy: { startDate: 'asc' },
        take: 20,
      }),
    ]);

    type Severity = 'critical' | 'warning' | 'info';
    type AlertType =
      | 'expired_contract' | 'expiring_contract_30' | 'expiring_contract_60'
      | 'pending_adjustment' | 'late_payment_15' | 'pending_payment_15'
      | 'pending_payment_5' | 'draft_settlement'
      | 'occupation_30' | 'occupation_new';

    interface Alert {
      id: string;
      severity: Severity;
      type: AlertType;
      title: string;
      message: string;
      entityId: number;
      entityType: string;
    }

    function tenantName(t: { type: string; firstName?: string | null; lastName?: string | null; businessName?: string | null }) {
      return t.type === 'PERSONA_JURIDICA'
        ? (t.businessName || '—')
        : [t.firstName, t.lastName].filter(Boolean).join(' ') || '—';
    }

    function daysSince(date: Date | string) {
      return Math.floor((nowTs - new Date(date).getTime()) / MS_DAY);
    }
    function daysUntilDate(date: Date | string) {
      return Math.ceil((new Date(date).getTime() - nowTs) / MS_DAY);
    }

    const INDEX_LABELS: Record<string, string> = { ICL_BCRA: 'ICL', IPC_INDEC: 'IPC', FREE: 'libre' };

    const alerts: Alert[] = [];

    // 🔴 Contratos EXPIRED
    for (const c of expiredContracts) {
      const prop = `${c.property.street} ${c.property.number}, ${c.property.city}`;
      const days = daysSince(c.endDate);
      alerts.push({
        id: `expired_contract_${c.id}`,
        severity: 'critical',
        type: 'expired_contract',
        title: 'Contrato vencido sin acción',
        message: `${prop} — vencido hace ${days} día${days !== 1 ? 's' : ''}`,
        entityId: c.id,
        entityType: 'contract',
      });
    }

    // 🔴 Cobros LATE > 15 días
    for (const p of latePayments) {
      const prop = `${p.contract.property.street} ${p.contract.property.number}, ${p.contract.property.city}`;
      const tenant = p.contract.tenants[0]?.tenant;
      const days = daysSince(p.dueDate);
      alerts.push({
        id: `late_payment_${p.id}`,
        severity: 'critical',
        type: 'late_payment_15',
        title: 'Cobro atrasado (> 15 días)',
        message: `${prop}${tenant ? ` — ${tenantName(tenant)}` : ''} — ${days} días de mora`,
        entityId: p.contract.id,
        entityType: 'contract',
      });
    }

    // 🔴 Cobros PENDING > 15 días del vencimiento
    for (const p of pendingOverdue15) {
      const prop = `${p.contract.property.street} ${p.contract.property.number}, ${p.contract.property.city}`;
      const tenant = p.contract.tenants[0]?.tenant;
      const days = daysSince(p.dueDate);
      alerts.push({
        id: `pending_overdue15_${p.id}`,
        severity: 'critical',
        type: 'pending_payment_15',
        title: 'Cobro sin registrar (> 15 días)',
        message: `${prop}${tenant ? ` — ${tenantName(tenant)}` : ''} — venció hace ${days} días`,
        entityId: p.contract.id,
        entityType: 'contract',
      });
    }

    // 🟡 Contratos por vencer en < 30 días
    for (const c of contractsExpiring30) {
      const prop = `${c.property.street} ${c.property.number}, ${c.property.city}`;
      const days = daysUntilDate(c.endDate);
      alerts.push({
        id: `expiring30_${c.id}`,
        severity: 'warning',
        type: 'expiring_contract_30',
        title: 'Contrato por vencer (< 30 días)',
        message: `${prop} — vence en ${days} día${days !== 1 ? 's' : ''}`,
        entityId: c.id,
        entityType: 'contract',
      });
    }

    // 🟡 Ajustes vencidos
    for (const c of pendingAdjustments) {
      const prop = `${c.property.street} ${c.property.number}, ${c.property.city}`;
      const days = daysSince(c.nextAdjustmentDate!);
      const idx = INDEX_LABELS[c.indexType] || c.indexType;
      alerts.push({
        id: `adj_${c.id}`,
        severity: 'warning',
        type: 'pending_adjustment',
        title: `Aumento ${idx} pendiente`,
        message: `${prop} — venció hace ${days} día${days !== 1 ? 's' : ''}`,
        entityId: c.id,
        entityType: 'contract',
      });
    }

    // 🟡 Cobros PENDING 5-15 días
    for (const p of pendingOverdue5) {
      const prop = `${p.contract.property.street} ${p.contract.property.number}, ${p.contract.property.city}`;
      const tenant = p.contract.tenants[0]?.tenant;
      const days = daysSince(p.dueDate);
      alerts.push({
        id: `pending_5_${p.id}`,
        severity: 'warning',
        type: 'pending_payment_5',
        title: 'Cobro sin registrar (5–15 días)',
        message: `${prop}${tenant ? ` — ${tenantName(tenant)}` : ''} — venció hace ${days} días`,
        entityId: p.contract.id,
        entityType: 'contract',
      });
    }

    // 🟡 Liquidaciones DRAFT sin enviar
    for (const s of draftSettlementsThisMonth) {
      const propCount = s.properties.length;
      const propLabel = propCount === 1
        ? `${s.properties[0].property.street} ${s.properties[0].property.number}, ${s.properties[0].property.city}`
        : `${propCount} propiedades`;
      alerts.push({
        id: `settlement_${s.id}`,
        severity: 'warning',
        type: 'draft_settlement',
        title: 'Liquidación sin enviar',
        message: `${tenantName(s.owner)} — ${propLabel} — ${s.periodMonth}/${s.periodYear}`,
        entityId: s.id,
        entityType: 'settlement',
      });
    }

    // 🔵 Contratos por vencer 30-60 días
    for (const c of contractsExpiring60) {
      const prop = `${c.property.street} ${c.property.number}, ${c.property.city}`;
      const days = daysUntilDate(c.endDate);
      alerts.push({
        id: `expiring60_${c.id}`,
        severity: 'info',
        type: 'expiring_contract_60',
        title: 'Contrato por vencer (30–60 días)',
        message: `${prop} — vence en ${days} días`,
        entityId: c.id,
        entityType: 'contract',
      });
    }

    // 🔴/🟡 Ocupaciones sin contrato
    for (const o of activeOccupations) {
      const prop = `${o.property.street} ${o.property.number}, ${o.property.city}`;
      const days = daysSince(o.startDate);
      const severity: Severity = days >= 30 ? 'critical' : 'warning';
      alerts.push({
        id: `occupation_${o.id}`,
        severity,
        type: days >= 30 ? 'occupation_30' : 'occupation_new',
        title: days >= 30 ? 'Ocupación sin contrato (> 30 días)' : 'Ocupación sin contrato',
        message: `${prop} — ${o.occupantName} — ${days} día${days !== 1 ? 's' : ''} sin contrato`,
        entityId: o.id,
        entityType: 'occupation',
      });
    }

    const summary = {
      critical: alerts.filter((a) => a.severity === 'critical').length,
      warning: alerts.filter((a) => a.severity === 'warning').length,
      info: alerts.filter((a) => a.severity === 'info').length,
    };

    res.json({ summary, alerts });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export async function getEarnings(req: Request, res: Response): Promise<void> {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    // Todos los pagos cobrados (PAID o PARTIAL) del año, con comisión del contrato
    const payments = await prisma.payment.findMany({
      where: {
        periodYear: year,
        status: { in: ['PAID', 'PARTIAL'] },
      },
      select: {
        periodMonth: true,
        paidAmount: true,
        expectedAmount: true,
        contract: { select: { adminCommissionPct: true, currency: true } },
      },
    });

    // Gastos del año pagados por la inmobiliaria (los adelantamos nosotros)
    const expenses = await prisma.expense.findMany({
      where: { periodYear: year, paidBy: 'AGENCY', deletedAt: null },
      select: { periodMonth: true, amount: true },
    });

    // Construir los 12 meses
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthPayments = payments.filter((p) => p.periodMonth === month);
      const monthExpenses = expenses.filter((e) => e.periodMonth === month);

      const rentCollected = monthPayments.reduce((s, p) => s + (p.paidAmount ?? 0), 0);
      const commissionEarned = monthPayments.reduce(
        (s, p) => s + ((p.paidAmount ?? 0) * p.contract.adminCommissionPct) / 100,
        0,
      );
      const expensesTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
      const paymentsCount = monthPayments.length;

      return { month, rentCollected, commissionEarned, expensesTotal, paymentsCount };
    });

    const totals = months.reduce(
      (acc, m) => ({
        rentCollected: acc.rentCollected + m.rentCollected,
        commissionEarned: acc.commissionEarned + m.commissionEarned,
        expensesTotal: acc.expensesTotal + m.expensesTotal,
        paymentsCount: acc.paymentsCount + m.paymentsCount,
      }),
      { rentCollected: 0, commissionEarned: 0, expensesTotal: 0, paymentsCount: 0 },
    );

    res.json({ year, months, totals });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
}
