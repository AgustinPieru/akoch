import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Tooltip,
  TablePagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Add, Search, Visibility } from '@mui/icons-material';
import { useProperties } from '../api/useProperties';
import { ROUTES } from '@/router/routes';

const STATUS_MAP: Record<string, { label: string; color: 'success' | 'default' | 'warning' | 'error' | 'info' }> = {
  AVAILABLE: { label: 'Disponible', color: 'success' },
  RENTED: { label: 'Alquilada', color: 'info' },
  FOR_SALE: { label: 'En venta', color: 'warning' },
  SOLD: { label: 'Vendida', color: 'default' },
  OCCUPIED_WITHOUT_CONTRACT: { label: 'Ocupada s/contrato', color: 'error' },
  UNDER_RENOVATION: { label: 'En refacción', color: 'warning' },
  BLOCKED: { label: 'Bloqueada', color: 'error' },
};

const TYPE_LABELS: Record<string, string> = {
  CASA: 'Casa',
  DEPARTAMENTO: 'Departamento',
  LOCAL_COMERCIAL: 'Local comercial',
  OFICINA: 'Oficina',
  TERRENO: 'Terreno',
  COCHERA: 'Cochera',
  DEPOSITO: 'Depósito',
  GALPON: 'Galpón',
  OTRO: 'Otro',
};

export default function PropertiesListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const { data, isLoading, error } = useProperties({
    search,
    status: statusFilter,
    page: page + 1,
    limit: rowsPerPage,
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Propiedades</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate(ROUTES.PROPERTY_NEW)}
        >
          Nueva propiedad
        </Button>
      </Box>

      <Card>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Buscar por calle o ciudad..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            size="small"
            sx={{ width: 320 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
            }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={statusFilter}
              label="Estado"
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            >
              <MenuItem value="">Todos</MenuItem>
              {Object.entries(STATUS_MAP).map(([value, { label }]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {isLoading && (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ m: 2 }}>Error al cargar propiedades</Alert>}

        {data && (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Dirección</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Ciudad</TableCell>
                    <TableCell>Propietarios</TableCell>
                    <TableCell>Superficie</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.data.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {p.street} {p.number}
                          {p.floor && ` Piso ${p.floor}`}
                          {p.apartment && ` Dto ${p.apartment}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{TYPE_LABELS[p.type] || p.type}</Typography>
                      </TableCell>
                      <TableCell>{p.city}</TableCell>
                      <TableCell>{p.owners.length}</TableCell>
                      <TableCell>
                        {p.coveredSurface ? `${p.coveredSurface} m²` : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_MAP[p.status]?.label || p.status}
                          color={STATUS_MAP[p.status]?.color || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver detalle">
                          <IconButton
                            size="small"
                            onClick={() => navigate(ROUTES.PROPERTY_DETAIL(p.id))}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No se encontraron propiedades
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={data.total}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
              rowsPerPageOptions={[10, 20, 50]}
              labelRowsPerPage="Filas por página"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            />
          </>
        )}
      </Card>
    </Box>
  );
}
