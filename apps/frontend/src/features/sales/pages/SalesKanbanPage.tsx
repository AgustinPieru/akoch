import { useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, TablePagination, Chip, IconButton, Tooltip, MenuItem, TextField,
  CircularProgress, Alert, InputAdornment,
} from '@mui/material';
import { Add, Edit, Delete, Search } from '@mui/icons-material';
import { Sale, SaleStage, useSales, useDeleteSale } from '../api/useSales';
import SaleFormDialog from '../components/SaleFormDialog';

const STAGE_CONFIG: Record<SaleStage, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  PROSPECTING:     { label: 'Prospección',       color: 'secondary' },
  VISIT_SCHEDULED: { label: 'Visita programada', color: 'info' },
  OFFER_MADE:      { label: 'Oferta realizada',  color: 'warning' },
  NEGOTIATING:     { label: 'Negociando',         color: 'error' },
  SIGNED:          { label: 'Firmado',            color: 'success' },
  CLOSED:          { label: 'Cerrado',            color: 'success' },
  CANCELLED:       { label: 'Cancelado',          color: 'default' },
};

const STAGE_ORDER: SaleStage[] = [
  'PROSPECTING', 'VISIT_SCHEDULED', 'OFFER_MADE', 'NEGOTIATING', 'SIGNED', 'CLOSED', 'CANCELLED',
];

const STAGE_OPTIONS = [
  { value: '', label: 'Todas las etapas' },
  ...STAGE_ORDER.map((s) => ({ value: s, label: STAGE_CONFIG[s].label })),
];

function formatMoney(amount: number, currency: string) {
  const val = Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 0 });
  return currency === 'USD' ? `USD ${val}` : `$${val}`;
}

function ownerName(sale: Sale) {
  const owner = sale.property.owners[0]?.owner;
  if (!owner) return '—';
  return owner.type === 'PERSONA_JURIDICA'
    ? (owner.businessName ?? '—')
    : [owner.firstName, owner.lastName].filter(Boolean).join(' ') || '—';
}

export default function SalesKanbanPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [stage, setStage] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;

  const { data, isLoading, isError } = useSales({
    ...(stage && { stage: stage as SaleStage }),
    ...(search.trim() && { search: search.trim() }),
    page: page + 1,
    limit: rowsPerPage,
  });

  const deleteSale = useDeleteSale();

  const handleEdit = (s: Sale) => {
    setSelected(s);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelected(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta venta?')) return;
    await deleteSale.mutateAsync(id);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5" fontWeight={700}>Ventas</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setSelected(null); setDialogOpen(true); }}>
          Nueva venta
        </Button>
      </Box>

      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField
          size="small"
          label="Buscar propiedad, comprador o propietario"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
          }}
        />
        <TextField
          select size="small" label="Etapa" value={stage}
          onChange={(e) => { setStage(e.target.value); setPage(0); }}
          sx={{ minWidth: 180 }}
        >
          {STAGE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar las ventas.</Alert>}

      {data && (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600 } }}>
                <TableCell>Propiedad</TableCell>
                <TableCell>Etapa</TableCell>
                <TableCell align="right">Precio pedido</TableCell>
                <TableCell align="right">Oferta</TableCell>
                <TableCell>Comprador</TableCell>
                <TableCell>Propietario</TableCell>
                <TableCell align="right">Comisión</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay ventas registradas.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((sale) => {
                  const cfg = STAGE_CONFIG[sale.stage];
                  return (
                    <TableRow key={sale.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {sale.property.street} {sale.property.number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{sale.property.city}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={cfg.label} color={cfg.color} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        {formatMoney(sale.askingPrice, sale.currency)}
                      </TableCell>
                      <TableCell align="right">
                        {sale.offerAmount ? formatMoney(sale.offerAmount, sale.currency) : '—'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{sale.buyerName || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{ownerName(sale)}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 500 }}>
                        {sale.commissionAmount ? formatMoney(sale.commissionAmount, sale.currency) : '—'}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => handleEdit(sale)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" color="error" onClick={() => handleDelete(sale.id)}>
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
            component="div" count={data.total} page={page}
            onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[rowsPerPage]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          />
        </Paper>
      )}

      {dialogOpen && (
        <SaleFormDialog sale={selected} onClose={handleClose} />
      )}
    </Box>
  );
}
