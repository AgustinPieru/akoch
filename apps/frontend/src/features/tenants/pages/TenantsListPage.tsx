import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Chip, IconButton, TextField,
  InputAdornment, CircularProgress, Alert, Tooltip, TablePagination,
} from '@mui/material';
import { Add, Search, Visibility } from '@mui/icons-material';
import { useTenants } from '../api/useTenants';
import { ROUTES } from '@/router/routes';

const STATUS_MAP: Record<string, { label: string; color: 'success' | 'default' }> = {
  ACTIVE: { label: 'Activo', color: 'success' },
  INACTIVE: { label: 'Inactivo', color: 'default' },
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  EMPLEADO_RELACION_DEPENDENCIA: 'Relación de dependencia',
  AUTONOMO: 'Autónomo',
  JUBILADO: 'Jubilado',
  OTRO: 'Otro',
};

export default function TenantsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const { data, isLoading, error } = useTenants({ search, page: page + 1, limit: rowsPerPage });

  const getDisplayName = (t: { type: string; firstName?: string; lastName?: string; businessName?: string }) =>
    t.type === 'PERSONA_JURIDICA'
      ? t.businessName || '—'
      : [t.firstName, t.lastName].filter(Boolean).join(' ') || '—';

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Inquilinos</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate(ROUTES.TENANT_NEW)}>
          Nuevo inquilino
        </Button>
      </Box>

      <Card>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            placeholder="Buscar por nombre, DNI, CUIT o email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            size="small"
            sx={{ width: 360 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
            }}
          />
        </Box>

        {isLoading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
        {error && <Alert severity="error" sx={{ m: 2 }}>Error al cargar inquilinos</Alert>}

        {data && (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>DNI / CUIT</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Situación laboral</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.data.map((tenant) => (
                    <TableRow key={tenant.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{getDisplayName(tenant)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tenant.type === 'PERSONA_JURIDICA' ? 'Persona jurídica' : 'Persona física'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {tenant.dni || tenant.cuit || '—'}
                      </TableCell>
                      <TableCell>{tenant.email || '—'}</TableCell>
                      <TableCell>{tenant.phone || '—'}</TableCell>
                      <TableCell>
                        {tenant.employmentStatus ? EMPLOYMENT_LABELS[tenant.employmentStatus] || tenant.employmentStatus : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_MAP[tenant.status]?.label || tenant.status}
                          color={STATUS_MAP[tenant.status]?.color || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" onClick={() => navigate(ROUTES.TENANT_DETAIL(tenant.id))}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">No se encontraron inquilinos</Typography>
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
