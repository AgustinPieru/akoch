import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';

export interface OwnersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
}

export async function getOwners(query: OwnersQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, query.limit || 20);
  const skip = (page - 1) * limit;

  const where: Prisma.OwnerWhereInput = {
    deletedAt: null,
    ...(query.status && { status: query.status as any }),
    ...(query.type && { type: query.type as any }),
    ...(query.search && {
      OR: [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { businessName: { contains: query.search, mode: 'insensitive' } },
        { cuit: { contains: query.search } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.owner.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        properties: {
          include: { property: { select: { id: true, street: true, number: true, city: true, status: true } } },
        },
      },
    }),
    prisma.owner.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getOwnerById(id: number) {
  const owner = await prisma.owner.findFirst({
    where: { id, deletedAt: null },
    include: {
      properties: {
        include: { property: true },
      },
    },
  });
  if (!owner) throw { status: 404, message: 'Propietario no encontrado', code: 'NOT_FOUND' };
  return owner;
}

export async function createOwner(data: Prisma.OwnerCreateInput) {
  const existing = await prisma.owner.findUnique({ where: { cuit: data.cuit } });
  if (existing) {
    throw { status: 409, message: 'Ya existe un propietario con ese CUIT', code: 'CUIT_DUPLICATE' };
  }
  return prisma.owner.create({ data });
}

export async function updateOwner(id: number, data: Record<string, unknown>) {
  await getOwnerById(id);
  const { id: _id, createdAt, updatedAt, deletedAt, properties, ...updateData } = data;
  return prisma.owner.update({ where: { id }, data: updateData as Prisma.OwnerUpdateInput });
}

export async function deleteOwner(id: number) {
  const owner = await getOwnerById(id);
  const activeProperties = owner.properties.filter((po) => po.property.status === 'RENTED');
  if (activeProperties.length > 0) {
    throw { status: 409, message: 'No se puede eliminar un propietario con propiedades activas', code: 'HAS_ACTIVE_PROPERTIES' };
  }
  return prisma.owner.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } });
}
