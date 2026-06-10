/**
 * Format a date string from the API (UTC midnight ISO) as a local date in es-AR.
 * Extracts the YYYY-MM-DD portion before converting to avoid UTC-3 offset shifting the day.
 */
export function fmtDate(s: string): string {
  const [year, month, day] = s.substring(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-AR');
}
