import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableRow, Chip, IconButton,
  Tooltip, Typography, Box,
} from '@mui/material';
import { CheckCircle, Warning, PictureAsPdf, Send, Home, Person } from '@mui/icons-material';
import api from '@/lib/axios';
import { Payment } from '../api/usePayments';
import RegisterPaymentDialog from './RegisterPaymentDialog';
import SendReceiptDialog from '@/features/notifications/components/SendReceiptDialog';

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

type TenantRef = Payment['contract']['tenants'][number]['tenant'];

function tenantName(t: TenantRef) {
  return t.type === 'PERSONA_JURIDICA'
    ? (t.businessName ?? '—')
    : [t.firstName, t.lastName].filter(Boolean).join(' ') || '—';
}

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
  PENDING: { label: 'Pendiente', color: 'default' },
  PAID: { label: 'Pagado', color: 'success' },
  LATE: { label: 'Atrasado', color: 'error' },
  PARTIAL: { label: 'Parcial', color: 'warning' },
};

interface Props {
  payments: Payment[];
  currency?: string; // fallback; cada fila usa p.contract.currency
  hideContext?: boolean; // oculta columna Inquilino/Inmueble (para vistas dentro de un contrato)
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

export default function PaymentsTable({ payments, currency, hideContext = false }: Props) {
  const [selected, setSelected] = useState<Payment | null>(null);
  const [sendReceipt, setSendReceipt] = useState<Payment | null>(null);

  const formatMoney = (n: number, cur?: string) => {
    const c = cur ?? currency ?? 'ARS';
    return c === 'USD'
      ? `USD ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (s: string) => {
    const [year, month, day] = s.substring(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-AR');
  };

  return (
    <>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 600 } }}>
            <TableCell>Período</TableCell>
            {!hideContext && <TableCell sx={{ minWidth: 200 }}>Inquilino / Inmueble</TableCell>}
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
              <TableCell colSpan={hideContext ? 9 : 10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
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
              const primaryTenant = p.contract.tenants.find((t) => t.isPrimary)?.tenant
                ?? p.contract.tenants[0]?.tenant;
              const { street, number: num, city } = p.contract.property;

              return (
                <TableRow key={p.id} sx={{ opacity: p.status === 'PAID' ? 0.75 : 1 }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {MONTHS[p.periodMonth - 1]} {p.periodYear}
                    </Typography>
                  </TableCell>
                  {!hideContext && (
                    <TableCell>
                      <Box>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Person sx={{ fontSize: 13, color: 'text.disabled' }} />
                          <Typography variant="body2" fontWeight={500} lineHeight={1.3}>
                            {primaryTenant ? tenantName(primaryTenant) : '—'}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5} mt={0.25}>
                          <Home sx={{ fontSize: 13, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary" lineHeight={1.3}>
                            {street} {num}, {city}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                  )}
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
