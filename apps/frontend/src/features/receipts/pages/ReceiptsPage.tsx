import { useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, TablePagination, Chip, IconButton, Tooltip, TextField, MenuItem,
  CircularProgress, Alert, InputAdornment,
} from '@mui/material';
import { PictureAsPdf, Search } from '@mui/icons-material';
import api from '@/lib/axios';
import { fmtDate } from '@/lib/dateUtils';
import { usePayments, Payment } from '@/features/payments/api/usePayments';
import { useSettlements, Settlement } from '@/features/settlements/api/useSettlements';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' }> = {
  PAID: { label: 'Pagado', color: 'success' },
  PARTIAL: { label: 'Parcial', color: 'warning' },
};

const SETTLEMENT_STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'info' | 'success' }> = {
  DRAFT: { label: 'Borrador', color: 'default' },
  SENT: { label: 'Enviada', color: 'info' },
  PAID: { label: 'Pagada', color: 'success' },
};

async function downloadPaymentReceipt(p: Payment) {
  const response = await api.get(`/payments/${p.id}/receipt`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `recibo-${p.id}-${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadSettlementPdf(s: Settlement) {
  const response = await api.get(`/settlements/${s.id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `liquidacion-${s.id}-${s.periodYear}-${String(s.periodMonth).padStart(2, '0')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function PaymentTenantName(payment: Payment) {
  const primary = payment.contract.tenants.find((t) => t.isPrimary) ?? payment.contract.tenants[0];
  if (!primary) return '—';
  return primary.tenant.type === 'PERSONA_JURIDICA'
    ? (primary.tenant.businessName ?? '—')
    : [primary.tenant.firstName, primary.tenant.lastName].filter(Boolean).join(' ') || '—';
}

function SettlementOwnerName(s: Settlement) {
  const o = s.property.owners[0]?.owner;
  if (!o) return '—';
  return o.type === 'PERSONA_JURIDICA'
    ? (o.businessName ?? '—')
    : [o.firstName, o.lastName].filter(Boolean).join(' ') || '—';
}

function PaymentReceiptsTab() {
  const [year, setYear] = useState<number>(currentYear);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;

  const { data, isLoading, isError } = usePayments({
    status: 'PAID,PARTIAL',
    year,
    ...(search.trim() && { search: search.trim() }),
    page: page + 1,
    limit: rowsPerPage,
  });

  const formatMoney = (n: number, currency: string) =>
    currency === 'USD'
      ? `USD ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  return (
    <Box>
      <Box display="flex" gap={2} mb={2} mt={2} flexWrap="wrap">
        <TextField
          size="small"
          label="Buscar inquilino, propietario o propiedad"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
          }}
        />
        <TextField
          select size="small" label="Año" value={year}
          onChange={(e) => { setYear(Number(e.target.value)); setPage(0); }}
          sx={{ minWidth: 120 }}
        >
          {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar los recibos de cobro.</Alert>}

      {data && (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                <TableCell>Período</TableCell>
                <TableCell>Inquilino</TableCell>
                <TableCell>Propiedad</TableCell>
                <TableCell align="right">Monto cobrado</TableCell>
                <TableCell>Fecha cobro</TableCell>
                <TableCell>N° Recibo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">PDF</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay recibos de cobro para este período.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((p) => {
                  const st = PAYMENT_STATUS_CONFIG[p.status];
                  const currency = p.contract.currency;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {MONTHS[p.periodMonth - 1]} {p.periodYear}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{PaymentTenantName(p)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{p.contract.property.street} {p.contract.property.number}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.contract.property.city}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {p.paidAmount != null ? formatMoney(p.paidAmount, currency) : '—'}
                      </TableCell>
                      <TableCell>
                        {p.paidAt ? fmtDate(p.paidAt) : '—'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {p.receiptNumber || `REC-${String(p.id).padStart(6, '0')}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={st.label} color={st.color} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Descargar recibo PDF">
                          <IconButton size="small" color="success" onClick={() => downloadPaymentReceipt(p)}>
                            <PictureAsPdf fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div" count={data.total} page={page}
            onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[rowsPerPage]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          />
        </Paper>
      )}
    </Box>
  );
}

function SettlementReceiptsTab() {
  const [year, setYear] = useState<number>(currentYear);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;

  const { data, isLoading, isError } = useSettlements({
    year,
    ...(search.trim() && { search: search.trim() }),
    page: page + 1,
    limit: rowsPerPage,
  });

  const formatMoney = (n: number, currency: string) =>
    currency === 'USD'
      ? `USD ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  return (
    <Box>
      <Box display="flex" gap={2} mb={2} mt={2} flexWrap="wrap">
        <TextField
          size="small"
          label="Buscar propietario, inquilino o propiedad"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
          }}
        />
        <TextField
          select size="small" label="Año" value={year}
          onChange={(e) => { setYear(Number(e.target.value)); setPage(0); }}
          sx={{ minWidth: 120 }}
        >
          {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar las liquidaciones.</Alert>}

      {data && (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                <TableCell>Período</TableCell>
                <TableCell>Propietario</TableCell>
                <TableCell>Propiedad</TableCell>
                <TableCell align="right">Neto transferido</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">PDF</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay liquidaciones para este período.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((s) => {
                  const st = SETTLEMENT_STATUS_CONFIG[s.status];
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {MONTHS[s.periodMonth - 1]} {s.periodYear}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{SettlementOwnerName(s)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{s.property.street} {s.property.number}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.property.city}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: s.netAmount >= 0 ? 'success.main' : 'error.main' }}>
                        {formatMoney(s.netAmount, s.currency)}
                      </TableCell>
                      <TableCell>
                        <Chip label={st.label} color={st.color} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Descargar liquidación PDF">
                          <IconButton size="small" color="error" onClick={() => downloadSettlementPdf(s)}>
                            <PictureAsPdf fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div" count={data.total} page={page}
            onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[rowsPerPage]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          />
        </Paper>
      )}
    </Box>
  );
}

export default function ReceiptsPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>Recibos</Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Recibos de cobro" />
          <Tab label="Liquidaciones" />
        </Tabs>
      </Paper>

      {tab === 0 && <PaymentReceiptsTab />}
      {tab === 1 && <SettlementReceiptsTab />}
    </Box>
  );
}
