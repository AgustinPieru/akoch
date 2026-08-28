const UNITS = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const TEENS = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const TENS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function threeDigitsToWords(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';

  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(HUNDREDS[h]);

  if (rest > 0) {
    if (rest < 10) {
      parts.push(UNITS[rest]);
    } else if (rest < 20) {
      parts.push(TEENS[rest - 10]);
    } else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      if (t === 2 && u > 0) {
        parts.push(`veinti${UNITS[u]}`);
      } else if (u > 0) {
        parts.push(`${TENS[t]} y ${UNITS[u]}`);
      } else {
        parts.push(TENS[t]);
      }
    }
  }

  return parts.join(' ');
}

function integerToWords(n: number): string {
  if (n === 0) return 'cero';

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];

  if (millions > 0) {
    parts.push(millions === 1 ? 'un millón' : `${integerToWords(millions)} millones`);
  }
  if (thousands > 0) {
    parts.push(thousands === 1 ? 'mil' : `${threeDigitsToWords(thousands)} mil`);
  }
  if (rest > 0) {
    parts.push(threeDigitsToWords(rest));
  }

  return parts.join(' ');
}

// Convierte un monto a su expresión en palabras para recibos, ej: 98790.5 -> "noventa y ocho mil
// setecientos noventa con 50/100".
export function amountToWordsEs(amount: number, currencyLabel = 'pesos'): string {
  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const integerPart = Math.floor(rounded);
  const cents = Math.round((rounded - integerPart) * 100);

  const words = integerToWords(integerPart);
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  const centsStr = String(cents).padStart(2, '0');

  return `${capitalized} ${currencyLabel} con ${centsStr}/100`;
}
