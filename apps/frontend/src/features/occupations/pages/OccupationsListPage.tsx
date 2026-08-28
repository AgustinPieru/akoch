import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Table, TableContainer, TableHead, TableRow,
  TableCell, TableBody, Chip, IconButton, Tooltip, CircularProgress, Alert,
  TextField, MenuItem, InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useOccupations } from '../api/useOccupations';
import { ROUTES } from '@/router/routes';
import OccupationFormDialog from '../components/OccupationFormDialog';
import { fmtDate } from '@/lib/dateUtils';

const REASON_LABELS: Record<string, string> = {
  EXPIRED_CONTRACT: 'Contrato vencido',
  OWNER_FAMILY: 'Familiar del propietario',
  CONTRACT_IN_PROGRESS: 'Contrato en trámite',
  OTHER: 'Otro',
};

const STATUS_MAP: Record<string, { label: string; color: 'warning' | 'success' | 'default' | 'error' }> = {
  ACTIVE: { label: 'Activa', color: 'warning' },
  REGULARIZED: { label: 'Regularizada', color: 'success' },
  VACATED: { label: 'Desocupada', color: 'default' },
};

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export default function OccupationsListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error } = useOccupations({ status: status || undefined });

  const filtered = data?.data.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.occupantName.toLowerCase().includes(q) ||
      o.property.street.toLowerCase().includes(q) ||
      o.property.city.toLowerCase().includes(q)
    );
  }) ?? [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5" fontWeight={700}>Ocupaciones sin contrato</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Nueva ocupación
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '12px !important' }}>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              size="small" placeholder="Buscar por ocupante o dirección"
              value={search} onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 220 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
            <TextField select size="small" label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="ACTIVE">Activas</MenuItem>
              <MenuItem value="REGULARIZED">Regularizadas</MenuItem>
              <MenuItem value="VACATED">Desocupadas</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {isLoading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
      {error && <Alert severity="error">Error al cargar ocupaciones</Alert>}

      {!isLoading && (
        <Card>
          <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600, bgcolor: 'grey.50' } }}>
                <TableCell>Propiedad</TableCell>
                <TableCell>Ocupante</TableCell>
                <TableCell>Motivo</TableCell>
                <TableCell>Desde</TableCell>
                <TableCell>Días</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay ocupaciones registradas
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((o) => {
                const days = daysSince(o.startDate);
                return (
                  <TableRow
                    key={o.id}
                    hover sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(ROUTES.OCCUPATION_DETAIL(o.id))}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {o.property.street} {o.property.number}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{o.property.city}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{o.occupantName}</Typography>
                      {o.occupantPhone && (
                        <Typography variant="caption" color="text.secondary">{o.occupantPhone}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{REASON_LABELS[o.reason] || o.reason}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {fmtDate(o.startDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${days}d`}
                        size="small"
                        color={days >= 30 ? 'error' : days >= 15 ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_MAP[o.status]?.label || o.status}
                        color={STATUS_MAP[o.status]?.color || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" onClick={() => navigate(ROUTES.OCCUPATION_DETAIL(o.id))}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </TableContainer>
        </Card>
      )}

      {createOpen && <OccupationFormDialog onClose={() => setCreateOpen(false)} />}
    </Box>
  );
}
