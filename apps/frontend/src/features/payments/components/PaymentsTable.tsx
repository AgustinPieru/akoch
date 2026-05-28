import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableRow, Chip, IconButton,
  Tooltip, Typography,
} from '@mui/material';
import { CheckCircle, Warning, PictureAsPdf, Send } from '@mui/icons-material';
import api from '@/lib/axios';
import { Payment } from '../api/usePayments';
import RegisterPaymentDialog from './RegisterPaymentDialog';
import SendReceiptDialog from '@/features/notifications/components/SendReceiptDialog';

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
  PENDING: { label: 'Pendiente', color: 'default' },
  PAID: { label: 'Pagado', color: 'success' },
  LATE: { label: 'Atrasado', color: 'error' },
  PARTIAL: { label: 'Parcial', color: 'warning' },
};

interface Props {
  payments: Payment[];
  currency?: string; // fallback; cada fila usa p.contract.currency
}

async function downloadReceipt(payment: Payment) {
  const response = await api.get(`/payments/${payment.id}/receipt`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `recibo-${payment.id}-${payment.periodYear}-${String(payment.periodMonth).padStart(2, '0')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PaymentsTable({ payments, currency }: Props) {
  const [selected, setSelected] = useState<Payment | null>(null);
  const [sendReceipt, setSendReceipt] = useState<Payment | null>(null);

  const formatMoney = (n: number, cur?: string) => {
    const c = cur ?? currency ?? 'ARS';
    return c === 'USD'
      ? `USD ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (s: string) => new Date(s).toLocaleDateString('es-AR');

  return (
    <>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 600 } }}>
            <TableCell>Período</TableCell>
            <TableCell>Vencimiento</TableCell>
            <TableCell align="right">Esperado</TableCell>
            <TableCell align="right">Cobrado</TableCell>
            <TableCell align="right">Mora</TableCell>
            <TableCell>Fecha cobro</TableCell>
            <TableCell>Medio</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell align="center">Acción</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                No hay cobros generados.
              </TableCell>
            </TableRow>
          ) : (
            payments.map((p) => {
              const st = STATUS_CONFIG[p.status];
              const canRegister = p.status === 'PENDING' || p.status === 'LATE' || p.status === 'PARTIAL';
              const methodLabel: Record<string, string> = {
                TRANSFER: 'Transferencia', CASH: 'Efectivo', CHECK: 'Cheque', OTHER: 'Otro',
              };
              return (
                <TableRow key={p.id} sx={{ opacity: p.status === 'PAID' ? 0.75 : 1 }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {MONTHS[p.periodMonth - 1]} {p.periodYear}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(p.dueDate)}</TableCell>
                  <TableCell align="right">{formatMoney(p.expectedAmount, p.contract.currency)}</TableCell>
                  <TableCell align="right">{p.paidAmount != null ? formatMoney(p.paidAmount, p.contract.currency) : '—'}</TableCell>
                  <TableCell align="right">
                    {p.interestAmount != null && p.interestAmount > 0 ? (
                      <Tooltip title={`${p.interestDays}d de mora · tasa ${((p.interestRate ?? 0) * 100).toFixed(0)}% anual`}>
                        <Typography variant="body2" color="warning.main" fontWeight={600}>
                          {formatMoney(p.interestAmount, p.contract.currency)}
                        </Typography>
                      </Tooltip>
                    ) : '—'}
                  </TableCell>
                  <TableCell>{p.paidAt ? formatDate(p.paidAt) : '—'}</TableCell>
                  <TableCell>{p.paymentMethod ? (methodLabel[p.paymentMethod] || p.paymentMethod) : '—'}</TableCell>
                  <TableCell><Chip label={st.label} color={st.color} size="small" /></TableCell>
                  <TableCell align="center">
                    {canRegister && (
                      <Tooltip title="Registrar cobro">
                        <IconButton size="small" color="primary" onClick={() => setSelected(p)}>
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {(p.status === 'PAID' || p.status === 'PARTIAL') && (
                      <>
                        <Tooltip title={p.receiptNumber ? `Descargar recibo ${p.receiptNumber}` : 'Descargar recibo'}>
                          <IconButton size="small" color="success" onClick={() => downloadReceipt(p)}>
                            <PictureAsPdf fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Enviar recibo por WhatsApp o Email">
                          <IconButton size="small" color="primary" onClick={() => setSendReceipt(p)}>
                            <Send fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {p.status === 'LATE' && (
                      <Tooltip title="Pago atrasado">
                        <Warning fontSize="small" color="error" />
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {selected && (
        <RegisterPaymentDialog payment={selected} onClose={() => setSelected(null)} />
      )}

      {sendReceipt && (
        <SendReceiptDialog
          paymentId={sendReceipt.id}
          defaultPhone={sendReceipt.contract.tenants[0]?.tenant.phone ?? undefined}
          defaultEmail={sendReceipt.contract.tenants[0]?.tenant.email ?? undefined}
          period={`${MONTHS_SHORT[sendReceipt.periodMonth - 1]} ${sendReceipt.periodYear}`}
          onClose={() => setSendReceipt(null)}
        />
      )}
    </>
  );
}
