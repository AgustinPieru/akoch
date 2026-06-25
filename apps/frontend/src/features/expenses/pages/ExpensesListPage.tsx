import { useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, TablePagination, Chip, IconButton, MenuItem, TextField,
  CircularProgress, Alert, Tooltip, InputAdornment,
} from '@mui/material';
import { Add, Edit, Delete, Search } from '@mui/icons-material';
import { useExpenses, useDeleteExpense, Expense } from '../api/useExpenses';
import ExpenseFormDialog from '../components/ExpenseFormDialog';
import { fmtDate } from '@/lib/dateUtils';

const CATEGORY_LABELS: Record<string, string> = {
  EXPENSAS: 'Expensas', ABL: 'Tasa municipal', API: 'Impuesto inmobiliario', GAS: 'Gas', ELECTRICIDAD: 'Electricidad',
  AGUA: 'Agua', REPARACION: 'Reparación', SEGURO: 'Seguro', HONORARIOS: 'Honorarios', OTRO: 'Otro',
};

const PAID_BY_LABELS: Record<string, { label: string; color: 'default' | 'warning' | 'info' | 'success' }> = {
  AGENCY: { label: 'Inmobiliaria', color: 'warning' },
  OWNER: { label: 'Propietario', color: 'info' },
  TENANT: { label: 'Inquilino', color: 'success' },
};

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
const MONTH_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];

export default function ExpensesListPage() {
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const rowsPerPage = 20;
  const { data, isLoading, isError } = useExpenses({
    year,
    ...(month !== '' && { month }),
    ...(search.trim() && { search: search.trim() }),
    page: page + 1,
    limit: rowsPerPage,
  });

  const deleteExpense = useDeleteExpense();

  const formatMoney = (amount: number, currency: string) =>
    currency === 'USD'
      ? `USD ${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  const formatDate = fmtDate;

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar este gasto?')) {
      await deleteExpense.mutateAsync(id);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Gastos</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(null); setDialogOpen(true); }}>
          Registrar gasto
        </Button>
      </Box>

      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField
          size="small"
          label="Buscar propietario, propiedad o descripción"
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
          label="Año"
          value={year}
          onChange={(e) => { setYear(Number(e.target.value)); setPage(0); }}
          sx={{ minWidth: 120 }}
        >
          {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
        <TextField
          select
          size="small"
          label="Mes"
          value={month}
          onChange={(e) => { setMonth(e.target.value === '' ? '' : Number(e.target.value)); setPage(0); }}
          sx={{ minWidth: 140 }}
        >
          {MONTH_OPTIONS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
        </TextField>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar los gastos.</Alert>}

      {data && (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                <TableCell>Fecha</TableCell>
                <TableCell>Propiedad</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell>Pagado por</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay gastos registrados.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((expense) => {
                  const pb = PAID_BY_LABELS[expense.paidBy] || { label: expense.paidBy, color: 'default' as const };
                  return (
                    <TableRow key={expense.id} hover>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {expense.property.street} {expense.property.number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{expense.property.city}</Typography>
                      </TableCell>
                      <TableCell>{CATEGORY_LABELS[expense.category] || expense.category}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{expense.description}</Typography>
                        {expense.invoiceNumber && (
                          <Typography variant="caption" color="text.secondary">Comp. {expense.invoiceNumber}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{formatMoney(expense.amount, expense.currency)}</TableCell>
                      <TableCell>
                        <Chip label={pb.label} color={pb.color} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => { setEditing(expense); setDialogOpen(true); }}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" color="error" onClick={() => handleDelete(expense.id)}>
                            <Delete fontSize="small" />
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

      {dialogOpen && (
        <ExpenseFormDialog
          expense={editing ?? undefined}
          onClose={() => { setDialogOpen(false); setEditing(null); }}
        />
      )}
    </Box>
  );
}
