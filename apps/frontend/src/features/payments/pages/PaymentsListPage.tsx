import { useState } from 'react';
import {
  Box, Typography, TextField, MenuItem, Paper, CircularProgress, Alert, TablePagination,
  InputAdornment,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { usePayments } from '../api/usePayments';
import PaymentsTable from '../components/PaymentsTable';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'LATE', label: 'Atrasados' },
  { value: 'PARTIAL', label: 'Parciales' },
  { value: 'PAID', label: 'Pagados' },
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function PaymentsListPage() {
  const [status, setStatus] = useState('');
  const [year, setYear] = useState<number | ''>(currentYear);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;

  const { data, isLoading, isError } = usePayments({
    ...(status && { status }),
    ...(year !== '' && { year }),
    ...(search.trim() && { search: search.trim() }),
    page: page + 1,
    limit: rowsPerPage,
  });

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>Cobros</Typography>

      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
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
          select
          size="small"
          label="Estado"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          sx={{ minWidth: 150 }}
        >
          {STATUS_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField
          select
          size="small"
          label="Año"
          value={year}
          onChange={(e) => { setYear(e.target.value === '' ? '' : Number(e.target.value)); setPage(0); }}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar los cobros.</Alert>}

      {data && (
        <Paper>
          <PaymentsTable payments={data.data} />
          <TablePagination
            component="div"
            count={data.total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[rowsPerPage]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          />
        </Paper>
      )}
    </Box>
  );
}
