import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { buildWordSearch } from '../../lib/searchUtils';

export interface PaymentsQuery {
  contractId?: number;
  status?: string;
  year?: number;
  month?: number;
  page?: number;
  limit?: number;
  search?: string;
  tenantId?: number;
  ownerId?: number;
}

export interface RegisterPaymentInput {
  paidAmount: number;
  paidAt: string;
  paymentMethod: string;
  receiptNumber?: string;
  notes?: string;
  interestRate?: number; // tasa anual BNA, ej: 0.60 = 60%
}

export function calculateInterest(capital: number, annualRate: number, days: number): number {
  return capital * (annualRate / 365) * days;
}

export interface GeneratePeriodsInput {
  contractId: number;
}

const paymentInclude = {
  contract: {
    select: {
      id: true,
      currentAmount: true,
      currency: true,
      property: { select: { street: true, number: true, city: true } },
      tenants: {
        where: { isPrimary: true },
        include: { tenant: { select: { firstName: true, lastName: true, businessName: true, type: true, phone: true, email: true } } },
        take: 1,
      },
    },
  },
};

export async function getPayments(query: PaymentsQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, query.limit || 20);
  const skip = (page - 1) * limit;

  const statusFilter = query.status
    ? query.status.includes(',')
      ? { status: { in: query.status.split(',') as PaymentStatus[] } }
      : { status: query.status as PaymentStatus }
    : {};

  const searchFilter = query.search
    ? buildWordSearch(query.search, (w) => [
        { contract: { property: { street: { contains: w, mode: 'insensitive' } } } } as Prisma.PaymentWhereInput,
        { contract: { property: { city: { contains: w, mode: 'insensitive' } } } } as Prisma.PaymentWhereInput,
        { contract: { property: { owners: { some: { owner: { firstName: { contains: w, mode: 'insensitive' } } } } } } } as Prisma.PaymentWhereInput,
        { contract: { property: { owners: { some: { owner: { lastName: { contains: w, mode: 'insensitive' } } } } } } } as Prisma.PaymentWhereInput,
        { contract: { property: { owners: { some: { owner: { businessName: { contains: w, mode: 'insensitive' } } } } } } } as Prisma.PaymentWhereInput,
        { contract: { tenants: { some: { tenant: { firstName: { contains: w, mode: 'insensitive' } } } } } } as Prisma.PaymentWhereInput,
        { contract: { tenants: { some: { tenant: { lastName: { contains: w, mode: 'insensitive' } } } } } } as Prisma.PaymentWhereInput,
        { contract: { tenants: { some: { tenant: { businessName: { contains: w, mode: 'insensitive' } } } } } } as Prisma.PaymentWhereInput,
      ])
    : undefined;

  const where: Prisma.PaymentWhereInput = {
    ...(query.contractId && { contractId: query.contractId }),
    ...statusFilter,
    ...(query.year && { periodYear: query.year }),
    ...(query.month && { periodMonth: query.month }),
    ...(query.tenantId && { contract: { tenants: { some: { tenantId: query.tenantId } } } }),
    ...(query.ownerId && { contract: { property: { owners: { some: { ownerId: query.ownerId } } } } }),
    ...(searchFilter && searchFilter),
  };

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
      include: paymentInclude,
    }),
    prisma.payment.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getPaymentById(id: number) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: paymentInclude,
  });
  if (!payment) throw { status: 404, message: 'Cobro no encontrado', code: 'NOT_FOUND' };
  return payment;
}

export async function generatePaymentsForContract(contractId: number) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { id: true, startDate: true, durationMonths: true, currentAmount: true, status: true },
  });
  if (!contract) throw { status: 404, message: 'Contrato no encontrado', code: 'NOT_FOUND' };
  if (contract.status === 'DRAFT') throw { status: 409, message: 'El contrato debe estar activo', code: 'INVALID_STATUS' };

  const periods: { contractId: number; periodYear: number; periodMonth: number; expectedAmount: number; dueDate: Date; status: PaymentStatus }[] = [];
  const startUtc = contract.startDate;
  const startYear = startUtc.getUTCFullYear();
  const startMonth = startUtc.getUTCMonth();

  for (let i = 0; i < contract.durationMonths; i++) {
    const totalMonths = startMonth + i;
    const periodYear = startYear + Math.floor(totalMonths / 12);
    const periodMonth = (totalMonths % 12) + 1;
    const dueDate = new Date(Date.UTC(periodYear, periodMonth - 1, 10));

    periods.push({
      contractId,
      periodYear,
      periodMonth,
      expectedAmount: contract.currentAmount,
      dueDate,
      status: 'PENDING',
    });
  }

  // Insertar ignorando duplicados (ya existen si se regenera)
  await prisma.payment.createMany({ data: periods, skipDuplicates: true });

  return prisma.payment.findMany({
    where: { contractId },
    orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
  });
}

export async function registerPayment(id: number, input: RegisterPaymentInput) {
  const payment = await getPaymentById(id);

  if (payment.status === 'PAID') {
    throw { status: 409, message: 'Este cobro ya fue registrado', code: 'ALREADY_PAID' };
  }

  const paidAt = new Date(input.paidAt);
  const dueDate = new Date(payment.dueDate);
  const isLate = paidAt > dueDate;
  const isPartial = input.paidAmount < payment.expectedAmount;
  const status: PaymentStatus = isPartial ? 'PARTIAL' : 'PAID';

  // Calcular intereses por mora si hay tasa y el pago es tardío
  let interestAmount: number | null = null;
  let interestDays: number | null = null;
  if (isLate && input.interestRate && input.interestRate > 0) {
    interestDays = Math.floor((paidAt.getTime() - dueDate.getTime()) / 86400000);
    const capital = Number(payment.expectedAmount) - Number(payment.paidAmount ?? 0);
    interestAmount = calculateInterest(capital, input.interestRate, interestDays);
  }

  return prisma.payment.update({
    where: { id },
    data: {
      paidAmount: input.paidAmount,
      paidAt,
      paymentMethod: input.paymentMethod as PaymentMethod,
      receiptNumber: input.receiptNumber ?? null,
      notes: input.notes ?? null,
      status: isPartial ? 'PARTIAL' : 'PAID',
      interestAmount,
      interestRate: interestAmount !== null ? input.interestRate : null,
      interestDays,
    },
    include: paymentInclude,
  });
}

export async function markPaymentLate(id: number) {
  const payment = await getPaymentById(id);
  if (payment.status !== 'PENDING') {
    throw { status: 409, message: 'Solo se pueden marcar como atrasados pagos pendientes', code: 'INVALID_STATUS' };
  }
  return prisma.payment.update({ where: { id }, data: { status: 'LATE' } });
}
