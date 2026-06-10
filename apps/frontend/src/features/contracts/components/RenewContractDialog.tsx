import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, Typography, CircularProgress, Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Contract, useRenewContract } from '../api/useContracts';
import { ROUTES } from '@/router/routes';

const CURRENCY_OPTIONS = [
  { value: 'ARS', label: 'Pesos (ARS)' },
  { value: 'USD', label: 'Dólares (USD)' },
];

const INDEX_OPTIONS = [
  { value: 'ICL_BCRA', label: 'ICL — Banco Central' },
  { value: 'IPC_INDEC', label: 'IPC — INDEC' },
  { value: 'FREE', label: 'Porcentaje libre' },
  { value: 'NONE', label: 'Sin ajuste' },
];

const FREQ_OPTIONS = [
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'FOUR_MONTHLY', label: 'Cuatrimestral' },
  { value: 'SEMI_ANNUAL', label: 'Semestral' },
  { value: 'ANNUAL', label: 'Anual' },
];

interface Props {
  contract: Contract;
  onClose: () => void;
}

export default function RenewContractDialog({ contract, onClose }: Props) {
  const navigate = useNavigate();
  const renew = useRenewContract();

  const [ey, em, ed] = contract.endDate.substring(0, 10).split('-').map(Number);
  const suggestedStart = new Date(ey, em - 1, ed + 1);
  const suggestedStartStr = `${suggestedStart.getFullYear()}-${String(suggestedStart.getMonth() + 1).padStart(2, '0')}-${String(suggestedStart.getDate()).padStart(2, '0')}`;

  const [form, setForm] = useState({
    startDate: suggestedStartStr,
    durationMonths: String(contract.durationMonths),
    initialAmount: String(contract.currentAmount),
    currency: contract.currency,
    indexType: contract.indexType,
    updateFrequency: contract.updateFrequency,
    freePercentage: String(contract.freePercentage ?? ''),
    adminCommissionPct: String(contract.adminCommissionPct),
    specialClauses: contract.specialClauses ?? '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    try {
      const newContract = await renew.mutateAsync({
        id: contract.id,
        data: {
          startDate: form.startDate,
          durationMonths: parseInt(form.durationMonths),
          initialAmount: parseFloat(form.initialAmount),
          currency: form.currency,
          indexType: form.indexType,
          updateFrequency: form.updateFrequency,
          freePercentage: form.freePercentage ? parseFloat(form.freePercentage) : undefined,
          adminCommissionPct: parseFloat(form.adminCommissionPct),
          specialClauses: form.specialClauses || undefined,
        },
      });
      onClose();
      navigate(ROUTES.CONTRACT_DETAIL(newContract.id));
    } catch {
      // error shown inline
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Renovar contrato</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={2}>
          El contrato actual pasará a estado "Renovado". Se creará uno nuevo con los datos abajo indicados,
          heredando los mismos inquilinos.
        </Typography>

        {renew.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(renew.error as any)?.response?.data?.error ?? 'Error al renovar el contrato'}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Fecha de inicio *"
              type="date"
              fullWidth
              size="small"
              value={form.startDate}
              onChange={set('startDate')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Duración (meses) *"
              type="number"
              fullWidth
              size="small"
              value={form.durationMonths}
              onChange={set('durationMonths')}
              inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Monto inicial *"
              type="number"
              fullWidth
              size="small"
              value={form.initialAmount}
              onChange={set('initialAmount')}
              inputProps={{ min: 0, step: 100 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label="Moneda" fullWidth size="small" value={form.currency} onChange={set('currency')}>
              {CURRENCY_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label="Índice" fullWidth size="small" value={form.indexType} onChange={set('indexType')}>
              {INDEX_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Grid>
          {form.indexType !== 'NONE' && (
            <Grid item xs={12} sm={6}>
              <TextField select label="Periodicidad" fullWidth size="small" value={form.updateFrequency} onChange={set('updateFrequency')}>
                {FREQ_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
          )}
          {form.indexType === 'FREE' && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Porcentaje pactado (%)"
                type="number"
                fullWidth
                size="small"
                value={form.freePercentage}
                onChange={set('freePercentage')}
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Comisión administración (%)"
              type="number"
              fullWidth
              size="small"
              value={form.adminCommissionPct}
              onChange={set('adminCommissionPct')}
              inputProps={{ min: 0, step: 0.5 }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Cláusulas especiales"
              fullWidth
              size="small"
              multiline
              rows={2}
              value={form.specialClauses}
              onChange={set('specialClauses')}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={renew.isPending || !form.startDate || !form.durationMonths || !form.initialAmount}
        >
          {renew.isPending ? <CircularProgress size={20} /> : 'Renovar contrato'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
