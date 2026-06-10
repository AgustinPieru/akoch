import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, TextField, MenuItem,
  CircularProgress, Alert, TablePagination, InputAdornment,
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { useContracts } from '../api/useContracts';
import { fmtDate } from '@/lib/dateUtils';
import { ROUTES } from '@/router/routes';

const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  DRAFT: { label: 'Borrador', color: 'default' },
  ACTIVE: { label: 'Activo', color: 'success' },
  EXPIRED: { label: 'Vencido', color: 'warning' },
  TERMINATED: { label: 'Rescindido', color: 'error' },
  RENEWED: { label: 'Renovado', color: 'info' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'DRAFT', label: 'Borradores' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'EXPIRED', label: 'Vencidos' },
  { value: 'TERMINATED', label: 'Rescindidos' },
];

export default function ContractsListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;

  const { data, isLoading, isError } = useContracts({
    ...(status && { status }),
    ...(search.trim() && { search: search.trim() }),
    page: page + 1,
    limit: rowsPerPage,
  });

  const formatDate = fmtDate;

  const getTenantName = (tenants: { isPrimary: boolean; tenant: { firstName?: string; lastName?: string; businessName?: string; type: string } }[]) => {
    const primary = tenants.find((t) => t.isPrimary) || tenants[0];
    if (!primary) return '—';
    return primary.tenant.type === 'PERSONA_JURIDICA'
      ? primary.tenant.businessName || '—'
      : [primary.tenant.firstName, primary.tenant.lastName].filter(Boolean).join(' ') || '—';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Contratos</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate(ROUTES.CONTRACT_NEW)}>
          Nuevo contrato
        </Button>
      </Box>

      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField
          size="small"
          label="Buscar inquilino o propiedad"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 260 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
          }}
        />
        <TextField
          select
          size="small"
          label="Estado"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          sx={{ minWidth: 160 }}
        >
          {STATUS_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar los contratos.</Alert>}

      {data && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                <TableCell>Propiedad</TableCell>
                <TableCell>Inquilino principal</TableCell>
                <TableCell>Inicio</TableCell>
                <TableCell>Vencimiento</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay contratos.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((c) => {
                  const st = STATUS_LABELS[c.status] || { label: c.status, color: 'default' as const };
                  return (
                    <TableRow
                      key={c.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(ROUTES.CONTRACT_DETAIL(c.id))}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {c.property.street} {c.property.number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{c.property.city}</Typography>
                      </TableCell>
                      <TableCell>{getTenantName(c.tenants)}</TableCell>
                      <TableCell>{formatDate(c.startDate)}</TableCell>
                      <TableCell>{formatDate(c.endDate)}</TableCell>
                      <TableCell align="right">
                        {c.currency === 'USD'
                          ? `USD ${Number(c.currentAmount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                          : `$${Number(c.currentAmount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
                      </TableCell>
                      <TableCell>
                        <Chip label={st.label} color={st.color} size="small" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={data.total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[rowsPerPage]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          />
        </TableContainer>
      )}
    </Box>
  );
}
