import { UpdateFrequency } from '@prisma/client';

export function frequencyToMonths(frequency: UpdateFrequency): number {
  const map: Record<UpdateFrequency, number> = {
    MONTHLY: 1,
    QUARTERLY: 3,
    FOUR_MONTHLY: 4,
    SEMI_ANNUAL: 6,
    ANNUAL: 12,
  };
  return map[frequency] ?? 3;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function calculateNextAdjustmentDate(
  startDate: Date,
  lastAdjustmentDate: Date | null,
  frequency: UpdateFrequency
): Date {
  const base = lastAdjustmentDate ?? startDate;
  return addMonths(base, frequencyToMonths(frequency));
}
