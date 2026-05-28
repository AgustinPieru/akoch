import prisma from '../../lib/prisma';
import { getICLPercentage, getIPCPercentage } from '../../lib/indices';
import { applyAdjustment } from './contracts.service';

export interface AutoAdjustResult {
  checked: number;
  adjusted: number;
  skipped: number;
  errors: { contractId: number; property: string; reason: string }[];
}

export async function runAutoAdjustments(): Promise<AutoAdjustResult> {
  const now = new Date();

  const dueContracts = await prisma.contract.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      indexType: { not: 'NONE' },
      nextAdjustmentDate: { lte: now },
    },
    include: {
      property: { select: { street: true, number: true, city: true } },
    },
  });

  const result: AutoAdjustResult = {
    checked: dueContracts.length,
    adjusted: 0,
    skipped: 0,
    errors: [],
  };

  for (const contract of dueContracts) {
    const propertyLabel = `${contract.property.street} ${contract.property.number}, ${contract.property.city}`;
    const fromDate = contract.lastAdjustmentDate ?? contract.startDate;

    try {
      let percentage: number;
      let indexValue: number | undefined;

      if (contract.indexType === 'FREE') {
        if (!contract.freePercentage) {
          result.errors.push({ contractId: contract.id, property: propertyLabel, reason: 'Porcentaje libre no configurado' });
          result.skipped++;
          continue;
        }
        percentage = contract.freePercentage;
      } else if (contract.indexType === 'ICL_BCRA') {
        const icl = await getICLPercentage(fromDate, now);
        percentage = icl.percentage;
        indexValue = icl.endValue;
      } else if (contract.indexType === 'IPC_INDEC') {
        const ipc = await getIPCPercentage(fromDate, now);
        percentage = ipc.percentage;
        indexValue = ipc.endValue;
      } else {
        result.skipped++;
        continue;
      }

      if (percentage <= 0) {
        result.errors.push({ contractId: contract.id, property: propertyLabel, reason: `Porcentaje calculado inválido: ${percentage.toFixed(4)}%` });
        result.skipped++;
        continue;
      }

      await applyAdjustment(contract.id, percentage, indexValue, 'Ajuste automático');
      result.adjusted++;

      console.log(`[auto-adjust] Contrato ${contract.id} (${propertyLabel}): +${percentage.toFixed(2)}%`);
    } catch (err: any) {
      result.errors.push({ contractId: contract.id, property: propertyLabel, reason: err.message });
      result.skipped++;
      console.error(`[auto-adjust] Error en contrato ${contract.id}: ${err.message}`);
    }
  }

  console.log(`[auto-adjust] Fin: ${result.adjusted} ajustados, ${result.skipped} omitidos de ${result.checked} contratos`);
  return result;
}
