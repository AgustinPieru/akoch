import { PrismaClient, PropertyStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function runAutoExpire() {
  const now = new Date();

  // Find active contracts whose endDate has already passed
  const expired = await prisma.contract.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      endDate: { lt: now },
    },
    select: { id: true, propertyId: true, endDate: true },
  });

  if (expired.length === 0) return { expired: 0 };

  const contractIds = expired.map((c) => c.id);
  const propertyIds = [...new Set(expired.map((c) => c.propertyId))];

  await prisma.contract.updateMany({
    where: { id: { in: contractIds } },
    data: { status: 'EXPIRED' },
  });

  // Mark properties as occupied without contract (tenant still there)
  await prisma.property.updateMany({
    where: { id: { in: propertyIds }, status: PropertyStatus.RENTED },
    data: { status: PropertyStatus.OCCUPIED_WITHOUT_CONTRACT },
  });

  console.log(`[auto-expire] ${expired.length} contrato(s) expirado(s): IDs ${contractIds.join(', ')}`);
  return { expired: expired.length, contractIds };
}
