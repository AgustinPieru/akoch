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
} from '@mui/material';
import { Add, Search, Visibility } from '@mui/icons-material';
import { useOwners } from '../api/useOwners';
import { ROUTES } from '@/router/routes';

const STATUS_MAP: Record<string, { label: string; color: 'success' | 'default' | 'error' }> = {
  ACTIVE: { label: 'Activo', color: 'success' },
  INACTIVE: { label: 'Inactivo', color: 'default' },
  BLOCKED: { label: 'Bloqueado', color: 'error' },
};

export default function OwnersListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const { data, isLoading, error } = useOwners({
    search,
    page: page + 1,
    limit: rowsPerPage,
  });

  const getDisplayName = (owner: { type: string; firstName?: string; lastName?: string; businessName?: string }) =>
    owner.type === 'PERSONA_JURIDICA'
      ? owner.businessName || '—'
      : [owner.firstName, owner.lastName].filter(Boolean).join(' ') || '—';

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5">Propietarios</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate(ROUTES.OWNER_NEW)}
        >
          Nuevo propietario
        </Button>
      </Box>

      <Card>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            placeholder="Buscar por nombre, CUIT o email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            size="small"
            sx={{ width: { xs: '100%', sm: 360 } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
            }}
          />
        </Box>

        {isLoading && (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ m: 2 }}>Error al cargar propietarios</Alert>}

        {data && (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre / Razón social</TableCell>
                    <TableCell>CUIT</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Propiedades</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.data.map((owner) => (
                    <TableRow key={owner.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {getDisplayName(owner)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {owner.type === 'PERSONA_JURIDICA' ? 'Persona jurídica' : 'Persona física'}
                        </Typography>
                      </TableCell>
                      <TableCell>{owner.cuit}</TableCell>
                      <TableCell>{owner.email || '—'}</TableCell>
                      <TableCell>{owner.phone || '—'}</TableCell>
                      <TableCell>{owner.properties.length}</TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_MAP[owner.status]?.label || owner.status}
                          color={STATUS_MAP[owner.status]?.color || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver detalle">
                          <IconButton
                            size="small"
                            onClick={() => navigate(ROUTES.OWNER_DETAIL(owner.id))}
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
                          No se encontraron propietarios
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
