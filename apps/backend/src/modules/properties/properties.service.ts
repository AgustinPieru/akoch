import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';

export interface PropertiesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
}

const propertyInclude = {
  owners: {
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, businessName: true, type: true, cuit: true } },
    },
  },
  photos: { orderBy: { takenAt: 'desc' as const }, take: 5 },
};

export async function getProperties(query: PropertiesQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, query.limit || 20);
  const skip = (page - 1) * limit;

  const where: Prisma.PropertyWhereInput = {
    deletedAt: null,
    ...(query.status && { status: query.status as any }),
    ...(query.type && { type: query.type as any }),
    ...(query.search && {
      OR: [
        { street: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { number: { contains: query.search } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: propertyInclude,
    }),
    prisma.property.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getPropertyById(id: number) {
  const property = await prisma.property.findFirst({
    where: { id, deletedAt: null },
    include: propertyInclude,
  });
  if (!property) throw { status: 404, message: 'Propiedad no encontrada', code: 'NOT_FOUND' };
  return property;
}

export async function createProperty(data: {
  property: Omit<Prisma.PropertyCreateInput, 'owners' | 'photos'>;
  owners: { ownerId: number; percentage: number }[];
}) {
  const totalPercentage = data.owners.reduce((sum, o) => sum + o.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw { status: 400, message: 'La suma de porcentajes de titularidad debe ser 100%', code: 'INVALID_PERCENTAGE' };
  }

  return prisma.property.create({
    data: {
      ...data.property,
      owners: {
        create: data.owners.map((o) => ({ ownerId: o.ownerId, percentage: o.percentage })),
      },
    },
    include: propertyInclude,
  });
}

export async function updateProperty(
  id: number,
  data: Record<string, unknown>
) {
  await getPropertyById(id);
  const { id: _id, createdAt, updatedAt, deletedAt, photos, owners, ...propertyData } = data;

  if (owners && Array.isArray(owners)) {
    const totalPct = (owners as { percentage: number }[]).reduce((s, o) => s + Number(o.percentage), 0);
    if (Math.abs(totalPct - 100) > 0.01) {
      throw { status: 400, message: 'La suma de porcentajes de titularidad debe ser 100%', code: 'INVALID_PERCENTAGE' };
    }
  }

  const ownersUpdate = owners && Array.isArray(owners)
    ? {
        owners: {
          deleteMany: {},
          create: (owners as { ownerId: number; percentage: number }[]).map((o) => ({
            ownerId: Number(o.ownerId),
            percentage: Number(o.percentage),
          })),
        },
      }
    : {};

  return prisma.property.update({
    where: { id },
    data: {
      ...(propertyData as Prisma.PropertyUpdateInput),
      ...ownersUpdate,
    },
    include: propertyInclude,
  });
}

export async function deleteProperty(id: number) {
  const property = await getPropertyById(id);
  if (property.status === 'RENTED') {
    throw { status: 409, message: 'No se puede eliminar una propiedad alquilada', code: 'PROPERTY_RENTED' };
  }
  return prisma.property.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
