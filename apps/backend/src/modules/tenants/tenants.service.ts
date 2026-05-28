import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';

export interface TenantsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export async function getTenants(query: TenantsQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, query.limit || 20);
  const skip = (page - 1) * limit;

  const where: Prisma.TenantWhereInput = {
    deletedAt: null,
    ...(query.status && { status: query.status as any }),
    ...(query.search && {
      OR: [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { businessName: { contains: query.search, mode: 'insensitive' } },
        { dni: { contains: query.search } },
        { cuit: { contains: query.search } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tenant.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getTenantById(id: number) {
  const tenant = await prisma.tenant.findFirst({
    where: { id, deletedAt: null },
  });
  if (!tenant) throw { status: 404, message: 'Inquilino no encontrado', code: 'NOT_FOUND' };
  return tenant;
}

function sanitize(data: Record<string, unknown>) {
  const result = { ...data };
  // Convertir fecha sola "YYYY-MM-DD" a DateTime ISO
  if (result.birthDate && typeof result.birthDate === 'string' && result.birthDate.length === 10) {
    result.birthDate = new Date(result.birthDate + 'T00:00:00.000Z');
  }
  // Convertir strings vacíos a null en campos opcionales
  for (const key of Object.keys(result)) {
    if (result[key] === '') result[key] = null;
  }
  return result;
}

export async function createTenant(data: Prisma.TenantCreateInput) {
  return prisma.tenant.create({ data: sanitize(data as any) as any });
}

export async function updateTenant(id: number, data: Prisma.TenantUpdateInput) {
  await getTenantById(id);
  return prisma.tenant.update({ where: { id }, data: sanitize(data as any) as any });
}

export async function deleteTenant(id: number) {
  await getTenantById(id);
  return prisma.tenant.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'INACTIVE' },
  });
}

export async function getTenantAccountStatement(id: number) {
  const tenant = await getTenantById(id);

  const payments = await prisma.payment.findMany({
    where: {
      contract: {
        tenants: { some: { tenantId: id } },
        deletedAt: null,
      },
    },
    include: {
      contract: {
        select: {
          id: true,
          currency: true,
          status: true,
          property: { select: { street: true, number: true, city: true } },
        },
      },
    },
    orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
  });

  const now = new Date();
  const totalExpected = payments.reduce((s, p) => s + Number(p.expectedAmount), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.paidAmount ?? 0), 0);
  const totalDebt = payments
    .filter((p) => p.status === 'PENDING' || p.status === 'LATE' || p.status === 'PARTIAL')
    .reduce((s, p) => s + (Number(p.expectedAmount) - Number(p.paidAmount ?? 0)), 0);
  const totalInterest = payments.reduce((s, p) => s + Number(p.interestAmount ?? 0), 0);
  const overdueCount = payments.filter(
    (p) => (p.status === 'LATE' || p.status === 'PENDING') && new Date(p.dueDate) < now,
  ).length;

  return {
    tenant,
    summary: { totalExpected, totalPaid, totalDebt, totalInterest, overdueCount, totalPayments: payments.length },
    payments,
  };
}
