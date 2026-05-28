import { PrismaClient, OccupationReason, OccupationStatus, PropertyStatus } from '@prisma/client';

const prisma = new PrismaClient();

const INCLUDE = {
  property: {
    select: {
      id: true, street: true, number: true, floor: true, apartment: true, city: true, status: true,
      owners: {
        include: { owner: { select: { id: true, firstName: true, lastName: true, businessName: true, type: true, phone: true, email: true } } },
      },
    },
  },
  occupantTenant: {
    select: { id: true, firstName: true, lastName: true, businessName: true, type: true, phone: true, email: true },
  },
  convertedToContract: { select: { id: true, status: true, startDate: true, endDate: true } },
};

export interface OccupationQuery {
  status?: string;
  propertyId?: number;
  page?: number;
  limit?: number;
}

export async function listOccupations(query: OccupationQuery = {}) {
  const { page = 1, limit = 20 } = query;
  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.propertyId) where.propertyId = query.propertyId;

  const [data, total] = await Promise.all([
    prisma.informalOccupation.findMany({
      where,
      include: INCLUDE,
      orderBy: { startDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.informalOccupation.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function getOccupation(id: number) {
  return prisma.informalOccupation.findFirst({ where: { id }, include: INCLUDE });
}

export interface CreateOccupationDto {
  propertyId: number;
  occupantName: string;
  occupantPhone?: string;
  occupantTenantId?: number;
  startDate: string;
  reason: OccupationReason;
  informalAmount?: number;
  currency?: string;
  notes?: string;
}

export async function createOccupation(dto: CreateOccupationDto) {
  const occ = await prisma.informalOccupation.create({
    data: {
      propertyId: dto.propertyId,
      occupantName: dto.occupantName,
      occupantPhone: dto.occupantPhone,
      occupantTenantId: dto.occupantTenantId,
      startDate: new Date(dto.startDate),
      reason: dto.reason,
      informalAmount: dto.informalAmount,
      currency: (dto.currency as any) ?? 'ARS',
      notes: dto.notes,
    },
    include: INCLUDE,
  });

  // Mark property as occupied without contract
  await prisma.property.update({
    where: { id: dto.propertyId },
    data: { status: PropertyStatus.OCCUPIED_WITHOUT_CONTRACT },
  });

  return occ;
}

export interface UpdateOccupationDto {
  occupantName?: string;
  occupantPhone?: string;
  occupantTenantId?: number;
  reason?: OccupationReason;
  informalAmount?: number;
  notes?: string;
  alertActive?: boolean;
}

export async function updateOccupation(id: number, dto: UpdateOccupationDto) {
  return prisma.informalOccupation.update({
    where: { id },
    data: dto,
    include: INCLUDE,
  });
}

export async function closeOccupation(id: number, status: 'VACATED' | 'REGULARIZED', endDate?: string) {
  const occ = await prisma.informalOccupation.findFirst({ where: { id } });
  if (!occ) return null;

  const updated = await prisma.informalOccupation.update({
    where: { id },
    data: {
      status: status as OccupationStatus,
      endDate: endDate ? new Date(endDate) : new Date(),
      alertActive: false,
    },
    include: INCLUDE,
  });

  // Free the property if no active contract
  const activeContract = await prisma.contract.findFirst({
    where: { propertyId: occ.propertyId, status: 'ACTIVE', deletedAt: null },
  });
  if (!activeContract) {
    await prisma.property.update({
      where: { id: occ.propertyId },
      data: { status: PropertyStatus.AVAILABLE },
    });
  }

  return updated;
}

export async function convertToContract(id: number, contractId: number) {
  return prisma.informalOccupation.update({
    where: { id },
    data: {
      status: OccupationStatus.REGULARIZED,
      convertedToContractId: contractId,
      alertActive: false,
      endDate: new Date(),
    },
    include: INCLUDE,
  });
}
