import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';

function sanitize(data: Record<string, unknown>) {
  const result = { ...data };
  for (const key of Object.keys(result)) {
    if (result[key] === '') result[key] = null;
  }
  return result;
}

export async function getGuarantorsByContract(contractId: number) {
  return prisma.guarantor.findMany({
    where: { contractId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getGuarantorById(id: number) {
  const guarantor = await prisma.guarantor.findFirst({ where: { id, deletedAt: null } });
  if (!guarantor) throw { status: 404, message: 'Garante no encontrado', code: 'NOT_FOUND' };
  return guarantor;
}

export async function createGuarantor(contractId: number, data: Prisma.GuarantorCreateInput) {
  return prisma.guarantor.create({
    data: { ...sanitize(data as any), contractId } as any,
  });
}

export async function updateGuarantor(id: number, data: Prisma.GuarantorUpdateInput) {
  await getGuarantorById(id);
  return prisma.guarantor.update({ where: { id }, data: sanitize(data as any) as any });
}

export async function deleteGuarantor(id: number) {
  await getGuarantorById(id);
  return prisma.guarantor.update({ where: { id }, data: { deletedAt: new Date() } });
}
