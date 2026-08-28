import { Alert } from '@mui/material';
import { Settlement } from '../api/useSettlements';

const COPY: Record<string, { severity: 'info' | 'warning' | 'success'; text: string }> = {
  DRAFT: {
    severity: 'info',
    text: 'Borrador: revisá los datos y agregá impuestos, servicios o tasas si hace falta. Cuando esté lista, usá "Marcar como enviada".',
  },
  SENT: {
    severity: 'warning',
    text: 'Enviada al propietario. Cuando se transfiera el dinero, confirmá el pago — es el último paso para cerrarla.',
  },
  PAID: {
    severity: 'success',
    text: 'Liquidación pagada y cerrada. Ya no admite cambios.',
  },
};

export default function SettlementStatusGuidance({ settlement }: { settlement: Settlement }) {
  const c = COPY[settlement.status];
  if (!c) return null;
  return <Alert severity={c.severity} sx={{ mb: 2 }}>{c.text}</Alert>;
}
