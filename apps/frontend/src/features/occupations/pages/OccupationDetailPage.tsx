import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Chip, Grid, Divider,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem,
} from '@mui/material';
import {
  ArrowBack, CheckCircle, ExitToApp, SwapHoriz,
} from '@mui/icons-material';
import { useOccupation, useCloseOccupation, useConvertOccupation } from '../api/useOccupations';
import { ROUTES } from '@/router/routes';

const REASON_LABELS: Record<string, string> = {
  EXPIRED_CONTRACT: 'Contrato vencido',
  OWNER_FAMILY: 'Familiar del propietario',
  CONTRACT_IN_PROGRESS: 'Contrato en trámite',
  OTHER: 'Otro',
};

const STATUS_MAP: Record<string, { label: string; color: 'warning' | 'success' | 'default' }> = {
  ACTIVE: { label: 'Activa', color: 'warning' },
  REGULARIZED: { label: 'Regularizada', color: 'success' },
  VACATED: { label: 'Desocupada', color: 'default' },
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box py={0.75}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Box>
  );
}

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export default function OccupationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const occId = parseInt(id!);

  const { data: occ, isLoading, error } = useOccupation(occId);
  const close = useCloseOccupation(occId);
  const convert = useConvertOccupation(occId);

  const [closeDialog, setCloseDialog] = useState(false);
  const [closeStatus, setCloseStatus] = useState<'VACATED' | 'REGULARIZED'>('VACATED');
  const [closeDate, setCloseDate] = useState(new Date().toISOString().split('T')[0]);
  const [convertDialog, setConvertDialog] = useState(false);
  const [contractId, setContractId] = useState('');

  if (isLoading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;
  if (error || !occ) return <Alert severity="error">Ocupación no encontrada</Alert>;

  const days = daysSince(occ.startDate);
  const isActive = occ.status === 'ACTIVE';

  async function handleClose() {
    await close.mutateAsync({ status: closeStatus, endDate: closeDate });
    setCloseDialog(false);
  }

  async function handleConvert() {
    await convert.mutateAsync(parseInt(contractId));
    setConvertDialog(false);
    navigate(ROUTES.CONTRACT_DETAIL(parseInt(contractId)));
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate(ROUTES.OCCUPATIONS)} variant="text">
            Ocupaciones
          </Button>
          <Typography variant="h5">{occ.occupantName}</Typography>
          <Chip
            label={STATUS_MAP[occ.status]?.label || occ.status}
            color={STATUS_MAP[occ.status]?.color || 'default'}
            size="small"
          />
          {isActive && (
            <Chip
              label={`${days} días`}
              size="small"
              color={days >= 30 ? 'error' : days >= 15 ? 'warning' : 'default'}
            />
          )}
        </Box>
        {isActive && (
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<SwapHoriz />}
              onClick={() => setConvertDialog(true)}
              color="success"
            >
              Convertir a contrato
            </Button>
            <Button
              variant="outlined"
              startIcon={<ExitToApp />}
              onClick={() => setCloseDialog(true)}
              color="error"
            >
              Cerrar ocupación
            </Button>
          </Box>
        )}
      </Box>

      {isActive && days >= 30 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Esta propiedad lleva <strong>{days} días</strong> ocupada sin contrato formal. Se requiere acción inmediata.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Datos del ocupante</Typography>
              <Divider sx={{ mb: 2 }} />
              <InfoRow label="Nombre" value={occ.occupantName} />
              <InfoRow label="Teléfono" value={occ.occupantPhone} />
              <InfoRow label="Motivo" value={REASON_LABELS[occ.reason] || occ.reason} />
              <InfoRow label="Desde" value={new Date(occ.startDate).toLocaleDateString('es-AR')} />
              {occ.endDate && <InfoRow label="Hasta" value={new Date(occ.endDate).toLocaleDateString('es-AR')} />}
              {occ.informalAmount && (
                <InfoRow
                  label="Monto acordado"
                  value={`${occ.currency} ${occ.informalAmount.toLocaleString('es-AR')}`}
                />
              )}
              {occ.notes && <InfoRow label="Notas" value={occ.notes} />}
            </CardContent>
          </Card>

          {occ.convertedToContract && (
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <CheckCircle color="success" fontSize="small" />
                  <Typography variant="h6">Contrato generado</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <InfoRow label="Estado" value={occ.convertedToContract.status} />
                <InfoRow
                  label="Vigencia"
                  value={`${new Date(occ.convertedToContract.startDate).toLocaleDateString('es-AR')} — ${new Date(occ.convertedToContract.endDate).toLocaleDateString('es-AR')}`}
                />
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1 }}
                  onClick={() => navigate(ROUTES.CONTRACT_DETAIL(occ.convertedToContract!.id))}
                >
                  Ver contrato
                </Button>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Propiedad</Typography>
              <Divider sx={{ mb: 2 }} />
              <InfoRow
                label="Dirección"
                value={[
                  `${occ.property.street} ${occ.property.number}`,
                  occ.property.floor && `Piso ${occ.property.floor}`,
                  occ.property.apartment && `Dto ${occ.property.apartment}`,
                ].filter(Boolean).join(' ')}
              />
              <InfoRow label="Ciudad" value={occ.property.city} />
              <Button
                size="small"
                variant="outlined"
                sx={{ mt: 1 }}
                onClick={() => navigate(ROUTES.PROPERTY_DETAIL(occ.property.id))}
              >
                Ver propiedad
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Close dialog */}
      <Dialog open={closeDialog} onClose={() => setCloseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cerrar ocupación</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                select label="Motivo de cierre" fullWidth size="small"
                value={closeStatus} onChange={(e) => setCloseStatus(e.target.value as any)}
              >
                <MenuItem value="VACATED">Desocupada (el ocupante se fue)</MenuItem>
                <MenuItem value="REGULARIZED">Regularizada (sin conversión a contrato)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Fecha de egreso" type="date" fullWidth size="small"
                value={closeDate} onChange={(e) => setCloseDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialog(false)} disabled={close.isPending}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleClose} disabled={close.isPending}>
            {close.isPending ? <CircularProgress size={20} /> : 'Cerrar ocupación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Convert dialog */}
      <Dialog open={convertDialog} onClose={() => setConvertDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Convertir a contrato</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Ingresá el ID del contrato ya creado para esta propiedad. La ocupación quedará marcada como regularizada y vinculada al contrato.
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Si todavía no creaste el contrato, hacelo primero desde el módulo de Contratos y luego volvé acá.
          </Typography>
          <TextField
            label="ID del contrato *" type="number" fullWidth size="small"
            value={contractId} onChange={(e) => setContractId(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate(ROUTES.CONTRACT_NEW)} variant="outlined">
            Crear contrato primero
          </Button>
          <Button onClick={() => setConvertDialog(false)} disabled={convert.isPending}>Cancelar</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConvert}
            disabled={convert.isPending || !contractId}
          >
            {convert.isPending ? <CircularProgress size={20} /> : 'Vincular contrato'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
