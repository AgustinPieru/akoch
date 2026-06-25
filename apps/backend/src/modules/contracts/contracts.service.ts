import { ContractStatus, IndexType, Prisma, UpdateFrequency } from '@prisma/client';
import prisma from '../../lib/prisma';
import { calculateNextAdjustmentDate } from './contracts.helpers';

const contractInclude = {
  property: {
    include: {
      owners: { include: { owner: { select: { id: true, firstName: true, lastName: true, businessName: true, type: true } } } },
    },
  },
  tenants: {
    include: { tenant: { select: { id: true, firstName: true, lastName: true, businessName: true, type: true, phone: true, email: true } } },
  },
  guarantors: { where: { deletedAt: null }, orderBy: { id: 'asc' as const } },
  adjustments: { orderBy: { appliedAt: 'desc' as const }, take: 10 },
};

export interface ContractsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  propertyId?: number;
}

export async function getContracts(query: ContractsQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, query.limit || 20);
  const skip = (page - 1) * limit;

  const where: Prisma.ContractWhereInput = {
    deletedAt: null,
    ...(query.status && { status: query.status as ContractStatus }),
    ...(query.propertyId && { propertyId: query.propertyId }),
    ...(query.search && {
      OR: [
        { property: { street: { contains: query.search, mode: 'insensitive' } } },
        { property: { city: { contains: query.search, mode: 'insensitive' } } },
        { tenants: { some: { tenant: { firstName: { contains: query.search, mode: 'insensitive' } } } } },
        { tenants: { some: { tenant: { lastName: { contains: query.search, mode: 'insensitive' } } } } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: contractInclude,
    }),
    prisma.contract.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getContractById(id: number) {
  const contract = await prisma.contract.findFirst({
    where: { id, deletedAt: null },
    include: contractInclude,
  });
  if (!contract) throw { status: 404, message: 'Contrato no encontrado', code: 'NOT_FOUND' };
  return contract;
}

export interface CreateContractInput {
  propertyId: number;
  startDate: string;
  durationMonths: number;
  initialAmount: number;
  currency: string;
  indexType: string;
  updateFrequency: string;
  freePercentage?: number;
  adminCommissionPct: number;
  initialCommission?: number;
  specialClauses?: string;
  tenants: { tenantId: number; isPrimary: boolean }[];
  guarantors?: { fullName: string; dni?: string; address?: string; phone?: string; email?: string }[];
}

export async function createContract(input: CreateContractInput) {
  // Validar que la propiedad no tenga contrato activo
  const activeContract = await prisma.contract.findFirst({
    where: { propertyId: input.propertyId, status: 'ACTIVE', deletedAt: null },
  });
  if (activeContract) {
    throw { status: 409, message: 'La propiedad ya tiene un contrato activo', code: 'PROPERTY_ALREADY_RENTED' };
  }

  // Validar que haya al menos un inquilino titular
  const hasPrimary = input.tenants.some((t) => t.isPrimary);
  if (!hasPrimary) {
    throw { status: 400, message: 'Debe designar un inquilino titular', code: 'NO_PRIMARY_TENANT' };
  }

  const startDate = new Date(input.startDate + 'T00:00:00.000Z');
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + input.durationMonths);
  endDate.setUTCDate(endDate.getUTCDate() - 1);

  const nextAdjustmentDate =
    input.indexType !== 'NONE'
      ? calculateNextAdjustmentDate(startDate, null, input.updateFrequency as UpdateFrequency)
      : null;

  return prisma.contract.create({
    data: {
      propertyId: input.propertyId,
      startDate,
      endDate,
      durationMonths: input.durationMonths,
      initialAmount: input.initialAmount,
      currentAmount: input.initialAmount,
      currency: input.currency as any,
      indexType: input.indexType as IndexType,
      updateFrequency: input.updateFrequency as UpdateFrequency,
      freePercentage: input.freePercentage ?? null,
      adminCommissionPct: input.adminCommissionPct,
      initialCommission: input.initialCommission ?? null,
      specialClauses: input.specialClauses ?? null,
      nextAdjustmentDate,
      tenants: {
        create: input.tenants.map((t) => ({ tenantId: t.tenantId, isPrimary: t.isPrimary })),
      },
      ...(input.guarantors && input.guarantors.length > 0 && {
        guarantors: {
          create: input.guarantors.map((g) => ({
            fullName: g.fullName,
            dni: g.dni || null,
            address: g.address || null,
            phone: g.phone || null,
            email: g.email || null,
          })),
        },
      }),
    },
    include: contractInclude,
  });
}

export async function activateContract(id: number) {
  const contract = await getContractById(id);

  if (contract.status !== 'DRAFT') {
    throw { status: 409, message: 'Solo se pueden activar contratos en borrador', code: 'INVALID_STATUS' };
  }

  const activeContract = await prisma.contract.findFirst({
    where: { propertyId: contract.propertyId, status: 'ACTIVE', deletedAt: null, id: { not: id } },
  });
  if (activeContract) {
    throw { status: 409, message: 'La propiedad ya tiene un contrato activo', code: 'PROPERTY_ALREADY_RENTED' };
  }

  const [updated] = await prisma.$transaction([
    prisma.contract.update({
      where: { id },
      data: { status: 'ACTIVE' },
      include: contractInclude,
    }),
    prisma.property.update({
      where: { id: contract.propertyId },
      data: { status: 'RENTED' },
    }),
  ]);

  return updated;
}

export async function applyAdjustment(id: number, percentage: number, indexValue?: number, notes?: string) {
  const contract = await getContractById(id);

  if (contract.status !== 'ACTIVE') {
    throw { status: 409, message: 'Solo se pueden ajustar contratos activos', code: 'INVALID_STATUS' };
  }
  if (contract.indexType === 'NONE') {
    throw { status: 409, message: 'Este contrato no tiene ajuste de índice', code: 'NO_INDEX' };
  }

  const previousAmount = contract.currentAmount;
  const newAmount = previousAmount * (1 + percentage / 100);
  const now = new Date();
  const nextAdjustmentDate = calculateNextAdjustmentDate(
    contract.startDate,
    now,
    contract.updateFrequency as UpdateFrequency,
  );

  const [updated] = await prisma.$transaction([
    prisma.contract.update({
      where: { id },
      data: {
        currentAmount: newAmount,
        lastAdjustmentDate: now,
        nextAdjustmentDate,
      },
      include: contractInclude,
    }),
    prisma.contractAdjustment.create({
      data: {
        contractId: id,
        appliedAt: now,
        previousAmount,
        newAmount,
        percentage,
        indexType: contract.indexType as IndexType,
        indexValue: indexValue ?? null,
        notes: notes ?? null,
      },
    }),
    // Actualizar pagos PENDING de este contrato que aún no se cobraron
    prisma.payment.updateMany({
      where: { contractId: id, status: 'PENDING' },
      data: { expectedAmount: newAmount },
    }),
  ]);

  return updated;
}

export async function finalizeContract(id: number) {
  const contract = await getContractById(id);

  if (contract.status !== 'EXPIRED') {
    throw { status: 409, message: 'Solo se pueden finalizar contratos vencidos (EXPIRED)', code: 'INVALID_STATUS' };
  }

  const [updated] = await prisma.$transaction([
    prisma.contract.update({
      where: { id },
      data: { status: 'TERMINATED', terminationDate: new Date(), terminationReason: 'Finalización por vencimiento — inquilino desocupó' },
      include: contractInclude,
    }),
    prisma.property.update({
      where: { id: contract.propertyId },
      data: { status: 'AVAILABLE' },
    }),
  ]);

  return updated;
}

export interface RenewContractInput {
  startDate: string;
  durationMonths: number;
  initialAmount: number;
  currency?: string;
  indexType?: string;
  updateFrequency?: string;
  freePercentage?: number;
  adminCommissionPct?: number;
  initialCommission?: number;
  specialClauses?: string;
  tenants?: { tenantId: number; isPrimary: boolean }[];
}

export async function renewContract(id: number, input: RenewContractInput) {
  const contract = await getContractById(id);

  if (!['ACTIVE', 'EXPIRED'].includes(contract.status)) {
    throw { status: 409, message: 'Solo se pueden renovar contratos activos o vencidos', code: 'INVALID_STATUS' };
  }

  const startDate = new Date(input.startDate + 'T00:00:00.000Z');
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + input.durationMonths);
  endDate.setUTCDate(endDate.getUTCDate() - 1);

  const indexType = (input.indexType ?? contract.indexType) as IndexType;
  const updateFrequency = (input.updateFrequency ?? contract.updateFrequency) as UpdateFrequency;

  const nextAdjustmentDate =
    indexType !== 'NONE'
      ? calculateNextAdjustmentDate(startDate, null, updateFrequency)
      : null;

  const tenants =
    input.tenants ??
    contract.tenants.map((ct) => ({ tenantId: ct.tenant.id, isPrimary: ct.isPrimary }));

  const [, newContract] = await prisma.$transaction([
    prisma.contract.update({
      where: { id },
      data: { status: 'RENEWED' },
    }),
    prisma.contract.create({
      data: {
        propertyId: contract.propertyId,
        previousContractId: id,
        startDate,
        endDate,
        durationMonths: input.durationMonths,
        initialAmount: input.initialAmount,
        currentAmount: input.initialAmount,
        currency: (input.currency ?? contract.currency) as any,
        indexType,
        updateFrequency,
        freePercentage: input.freePercentage ?? contract.freePercentage ?? null,
        adminCommissionPct: input.adminCommissionPct ?? contract.adminCommissionPct,
        initialCommission: input.initialCommission ?? null,
        specialClauses: input.specialClauses ?? contract.specialClauses ?? null,
        nextAdjustmentDate,
        status: 'ACTIVE',
        tenants: {
          create: tenants.map((t) => ({ tenantId: t.tenantId, isPrimary: t.isPrimary })),
        },
      },
      include: contractInclude,
    }),
  ]);

  return newContract;
}

export interface UpdateContractInput {
  startDate?: string;
  durationMonths?: number;
  initialAmount?: number;
  currency?: string;
  indexType?: string;
  updateFrequency?: string;
  freePercentage?: number | null;
  adminCommissionPct?: number;
  initialCommission?: number | null;
  specialClauses?: string | null;
  tenants?: { tenantId: number; isPrimary: boolean }[];
}

export async function updateContract(id: number, input: UpdateContractInput) {
  const contract = await getContractById(id);

  if (contract.status !== 'DRAFT') {
    throw { status: 409, message: 'Solo se pueden editar contratos en borrador', code: 'INVALID_STATUS' };
  }

  const startDateStr = input.startDate ?? contract.startDate.toISOString().substring(0, 10);
  const startDate = new Date(startDateStr + 'T00:00:00.000Z');
  const months = input.durationMonths !== undefined ? input.durationMonths : contract.durationMonths;
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + months);
  endDate.setUTCDate(endDate.getUTCDate() - 1);

  const indexType = (input.indexType ?? contract.indexType) as IndexType;
  const updateFrequency = (input.updateFrequency ?? contract.updateFrequency) as UpdateFrequency;
  const nextAdjustmentDate = indexType !== 'NONE'
    ? calculateNextAdjustmentDate(startDate, null, updateFrequency)
    : null;

  if (input.tenants !== undefined) {
    const hasPrimary = input.tenants.some((t) => t.isPrimary);
    if (!hasPrimary) {
      throw { status: 400, message: 'Debe designar un inquilino titular', code: 'NO_PRIMARY_TENANT' };
    }
    await prisma.$transaction([
      prisma.contractTenant.deleteMany({ where: { contractId: id } }),
      prisma.contractTenant.createMany({
        data: input.tenants.map((t) => ({ contractId: id, tenantId: t.tenantId, isPrimary: t.isPrimary })),
      }),
    ]);
  }

  return prisma.contract.update({
    where: { id },
    data: {
      startDate,
      endDate,
      durationMonths: months,
      ...(input.initialAmount !== undefined && { initialAmount: input.initialAmount, currentAmount: input.initialAmount }),
      ...(input.currency !== undefined && { currency: input.currency as any }),
      indexType,
      updateFrequency,
      ...(input.freePercentage !== undefined && { freePercentage: input.freePercentage }),
      ...(input.adminCommissionPct !== undefined && { adminCommissionPct: input.adminCommissionPct }),
      ...(input.initialCommission !== undefined && { initialCommission: input.initialCommission }),
      ...(input.specialClauses !== undefined && { specialClauses: input.specialClauses }),
      nextAdjustmentDate,
    },
    include: contractInclude,
  });
}

export async function terminateContract(id: number, reason: string) {
  const contract = await getContractById(id);

  if (!['ACTIVE', 'DRAFT'].includes(contract.status)) {
    throw { status: 409, message: 'El contrato no puede rescindirse en su estado actual', code: 'INVALID_STATUS' };
  }

  const [updated] = await prisma.$transaction([
    prisma.contract.update({
      where: { id },
      data: { status: 'TERMINATED', terminationDate: new Date(), terminationReason: reason },
      include: contractInclude,
    }),
    prisma.property.update({
      where: { id: contract.propertyId },
      data: { status: 'AVAILABLE' },
    }),
  ]);

  return updated;
}
