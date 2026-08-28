import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Chip, MenuItem, TextField, CircularProgress, Alert,
  IconButton, Tooltip, InputAdornment,
} from '@mui/material';
import { Add, PictureAsPdf, Search } from '@mui/icons-material';
import api from '@/lib/axios';
import { useSettlements } from '../api/useSettlements';
import GenerateSettlementDialog from '../components/GenerateSettlementDialog';
import { ROUTES } from '@/router/routes';

async function downloadSettlementPdf(id: number, year: number, month: number) {
  const response = await api.get(`/settlements/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `liquidacion-${id}-${year}-${String(month).padStart(2, '0')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'info' | 'success' }> = {
  DRAFT: { label: 'Borrador', color: 'default' },
  SENT: { label: 'Enviada', color: 'info' },
  PAID: { label: 'Pagada', color: 'success' },
};

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'DRAFT', label: 'Borradores' },
  { value: 'SENT', label: 'Enviadas' },
  { value: 'PAID', label: 'Pagadas' },
];

export default function SettlementsListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [year, setYear] = useState<number>(currentYear);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const rowsPerPage = 20;

  const { data, isLoading, isError } = useSettlements({
    ...(status && { status }),
    year,
    ...(search.trim() && { search: search.trim() }),
    page: page + 1,
    limit: rowsPerPage,
  });

  const formatMoney = (amount: number, currency: string) =>
    currency === 'USD'
      ? `USD ${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5" fontWeight={700}>Liquidaciones</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
          Nueva liquidación
        </Button>
      </Box>

      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
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
          select size="small" label="Estado" value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          sx={{ minWidth: 150 }}
        >
          {STATUS_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField
          select size="small" label="Año" value={year}
          onChange={(e) => { setYear(Number(e.target.value)); setPage(0); }}
          sx={{ minWidth: 120 }}
        >
          {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar las liquidaciones.</Alert>}

      {data && (
        <Paper>
          <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                <TableCell>Período</TableCell>
                <TableCell>Propietario</TableCell>
                <TableCell>Propiedades</TableCell>
                <TableCell align="right">Cobrado</TableCell>
                <TableCell align="right">Comisión</TableCell>
                <TableCell align="right">Gastos y cargos</TableCell>
                <TableCell align="right">Neto</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">PDF</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay liquidaciones.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((s) => {
                  const st = STATUS_CONFIG[s.status];
                  const ownerName = s.owner.type === 'PERSONA_JURIDICA'
                    ? s.owner.businessName
                    : [s.owner.firstName, s.owner.lastName].filter(Boolean).join(' ');
                  const expensesAndCharges = s.totalExpenses + s.totalCharges;
                  return (
                    <TableRow
                      key={s.id} hover sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(ROUTES.SETTLEMENT_DETAIL(s.id))}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {MONTHS_SHORT[s.periodMonth - 1]} {s.periodYear}
                        </Typography>
                      </TableCell>
                      <TableCell>{ownerName}</TableCell>
                      <TableCell>
                        {s.properties.length === 1 ? (
                          <>
                            <Typography variant="body2">{s.properties[0].property.street} {s.properties[0].property.number}</Typography>
                            <Typography variant="caption" color="text.secondary">{s.properties[0].property.city}</Typography>
                          </>
                        ) : (
                          <Typography variant="body2">{s.properties.length} propiedades</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{formatMoney(s.totalRent, s.currency)}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        -{formatMoney(s.totalCommission, s.currency)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        {expensesAndCharges > 0 ? `-${formatMoney(expensesAndCharges, s.currency)}` : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: s.netAmount >= 0 ? 'success.main' : 'error.main' }}>
                        {formatMoney(s.netAmount, s.currency)}
                      </TableCell>
                      <TableCell><Chip label={st.label} color={st.color} size="small" /></TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Descargar PDF">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => downloadSettlementPdf(s.id, s.periodYear, s.periodMonth)}
                          >
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
          </TableContainer>
          <TablePagination
            component="div" count={data.total} page={page}
            onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[rowsPerPage]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          />
        </Paper>
      )}

      {dialogOpen && (
        <GenerateSettlementDialog
          onClose={() => setDialogOpen(false)}
          onSuccess={(year, month) => navigate(ROUTES.SETTLEMENTS_PERIOD(year, month))}
        />
      )}
    </Box>
  );
}
