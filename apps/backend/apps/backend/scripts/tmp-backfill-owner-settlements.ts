import { PrismaClient, SettlementStatus } from '@prisma/client';

const prisma = new PrismaClient();

const STATUS_RANK: Record<SettlementStatus, number> = { DRAFT: 0, SENT: 1, PAID: 2 };

async function main() {
  const legacySettlements = await prisma.settlement.findMany({
    include: { property: { include: { owners: true } } },
    orderBy: { id: 'asc' },
  });

  console.log(`Migrando ${legacySettlements.length} liquidaciones legacy...`);

  for (const s of legacySettlements) {
    for (const po of s.property.owners) {
      const share = po.percentage / 100;
      const rentCollected = s.rentCollected * share;
      const commissionAmount = s.commissionAmount * share;
      const expensesAmount = s.expensesAmount * share;
      const subtotal = rentCollected - commissionAmount - expensesAmount;

      const existing = await prisma.ownerSettlement.findUnique({
        where: { ownerId_periodYear_periodMonth: { ownerId: po.ownerId, periodYear: s.periodYear, periodMonth: s.periodMonth } },
      });

      const mergedStatus = existing && STATUS_RANK[existing.status] > STATUS_RANK[s.status] ? existing.status : s.status;
      const sentAt = existing?.sentAt ?? (s.status !== 'DRAFT' ? s.sentAt : null);
      const paidAt = existing?.paidAt ?? (s.status === 'PAID' ? s.paidAt : null);

      const ownerSettlement = await prisma.ownerSettlement.upsert({
        where: { ownerId_periodYear_periodMonth: { ownerId: po.ownerId, periodYear: s.periodYear, periodMonth: s.periodMonth } },
        create: {
          ownerId: po.ownerId,
          periodYear: s.periodYear,
          periodMonth: s.periodMonth,
          status: s.status,
          currency: s.currency,
          sentAt: s.sentAt,
          paidAt: s.paidAt,
          notes: s.notes,
        },
        update: { status: mergedStatus, sentAt, paidAt },
      });

      await prisma.ownerSettlementProperty.upsert({
        where: { ownerSettlementId_propertyId: { ownerSettlementId: ownerSettlement.id, propertyId: s.propertyId } },
        create: {
          ownerSettlementId: ownerSettlement.id,
          propertyId: s.propertyId,
          contractId: s.contractId,
          sharePercentage: po.percentage,
          rentCollected,
          commissionPct: s.commissionPct,
          commissionAmount,
          expensesAmount,
          subtotal,
        },
        update: {
          contractId: s.contractId,
          sharePercentage: po.percentage,
          rentCollected,
          commissionPct: s.commissionPct,
          commissionAmount,
          expensesAmount,
          subtotal,
        },
      });

      console.log(`  Settlement legacy #${s.id} (prop ${s.propertyId}, ${s.periodYear}-${s.periodMonth}) -> OwnerSettlement owner=${po.ownerId} id=${ownerSettlement.id}`);
    }
  }

  // Recalcular agregados de cada OwnerSettlement en base a sus properties + charges
  const allOwnerSettlements = await prisma.ownerSettlement.findMany({ include: { properties: true, charges: true } });
  for (const os of allOwnerSettlements) {
    const totalRent = os.properties.reduce((sum, p) => sum + p.rentCollected, 0);
    const totalCommission = os.properties.reduce((sum, p) => sum + p.commissionAmount, 0);
    const totalExpenses = os.properties.reduce((sum, p) => sum + p.expensesAmount, 0);
    const totalCharges = os.charges.reduce((sum, c) => sum + c.amount, 0);
    const netAmount = totalRent - totalCommission - totalExpenses - totalCharges;
    await prisma.ownerSettlement.update({
      where: { id: os.id },
      data: { totalRent, totalCommission, totalExpenses, totalCharges, netAmount },
    });
  }

  console.log(`\nListo. ${allOwnerSettlements.length} OwnerSettlement creados/actualizados.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
