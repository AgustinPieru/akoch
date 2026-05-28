import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, MenuItem, CircularProgress, Alert,
} from '@mui/material';
import { useCreateOccupation } from '../api/useOccupations';

const REASONS = [
  { value: 'EXPIRED_CONTRACT', label: 'Contrato vencido' },
  { value: 'OWNER_FAMILY', label: 'Familiar del propietario' },
  { value: 'CONTRACT_IN_PROGRESS', label: 'Contrato en trámite' },
  { value: 'OTHER', label: 'Otro' },
];

interface Props {
  onClose: () => void;
  propertyId?: number;
}

export default function OccupationFormDialog({ onClose, propertyId }: Props) {
  const create = useCreateOccupation();
  const [form, setForm] = useState({
    propertyId: propertyId ?? '',
    occupantName: '',
    occupantPhone: '',
    startDate: new Date().toISOString().split('T')[0],
    reason: 'EXPIRED_CONTRACT',
    informalAmount: '',
    currency: 'ARS',
    notes: '',
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    await create.mutateAsync({
      ...form,
      propertyId: Number(form.propertyId),
      informalAmount: form.informalAmount ? Number(form.informalAmount) : undefined,
    } as any);
    onClose();
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar ocupación sin contrato</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {create.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(create.error as any)?.response?.data?.message ?? 'Error al guardar'}
          </Alert>
        )}
        <Grid container spacing={2}>
          {!propertyId && (
            <Grid item xs={12}>
              <TextField
                label="ID de propiedad *" fullWidth size="small" type="number"
                value={form.propertyId} onChange={(e) => set('propertyId', e.target.value)}
              />
            </Grid>
          )}
          <Grid item xs={12} sm={8}>
            <TextField
              label="Nombre del ocupante *" fullWidth size="small"
              value={form.occupantName} onChange={(e) => set('occupantName', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Teléfono" fullWidth size="small"
              value={form.occupantPhone} onChange={(e) => set('occupantPhone', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Fecha de inicio *" type="date" fullWidth size="small"
              value={form.startDate} onChange={(e) => set('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label="Motivo *" fullWidth size="small" value={form.reason} onChange={(e) => set('reason', e.target.value)}>
              {REASONS.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={8}>
            <TextField
              label="Monto acordado (opcional)" fullWidth size="small" type="number"
              value={form.informalAmount} onChange={(e) => set('informalAmount', e.target.value)}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField select label="Moneda" fullWidth size="small" value={form.currency} onChange={(e) => set('currency', e.target.value)}>
              <MenuItem value="ARS">ARS</MenuItem>
              <MenuItem value="USD">USD</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Notas" fullWidth size="small" multiline rows={3}
              value={form.notes} onChange={(e) => set('notes', e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={create.isPending}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={create.isPending || !form.occupantName || !form.propertyId}
        >
          {create.isPending ? <CircularProgress size={20} /> : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
