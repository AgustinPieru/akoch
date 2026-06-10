import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Grid, Typography, Box, CircularProgress, Alert, InputAdornment, Tooltip,
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { useForm, useWatch } from 'react-hook-form';
import { Contract } from '../api/useContracts';
import { useAdjustContract } from '../api/useContracts';
import api from '@/lib/axios';

const INDEX_LABELS: Record<string, string> = {
  ICL_BCRA: 'ICL — Banco Central',
  IPC_INDEC: 'IPC — INDEC',
  FREE: 'Porcentaje libre pactado',
};

interface FormValues {
  percentage: number;
  indexValue: string;
  notes: string;
}

interface Props {
  contract: Contract;
  onClose: () => void;
}

export default function AdjustContractDialog({ contract, onClose }: Props) {
  const adjust = useAdjustContract();
  const [fetchingIndex, setFetchingIndex] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      percentage: contract.indexType === 'FREE' ? (contract.freePercentage ?? 0) : 0,
      indexValue: '',
      notes: '',
    },
  });

  const percentage = useWatch({ control, name: 'percentage' });
  const currentAmount = contract.currentAmount;
  const newAmount = currentAmount * (1 + Number(percentage) / 100);

  const formatMoney = (n: number) =>
    contract.currency === 'USD'
      ? `USD ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  const fetchIndexValue = async () => {
    setFetchingIndex(true);
    setFetchError(null);
    try {
      const result = await api.get(`/contracts/${contract.id}/index-preview`).then((r) => r.data);
      setValue('percentage', parseFloat(result.percentage.toFixed(2)));
      if (result.endValue) setValue('indexValue', result.endValue.toString());
    } catch (err: any) {
      setFetchError(err?.response?.data?.error || 'No se pudo obtener el valor del índice');
    } finally {
      setFetchingIndex(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    await adjust.mutateAsync({
      id: contract.id,
      data: {
        percentage: Number(values.percentage),
        indexValue: values.indexValue ? Number(values.indexValue) : undefined,
        notes: values.notes || undefined,
      },
    });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Aplicar ajuste de índice</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Índice: <strong>{INDEX_LABELS[contract.indexType] || contract.indexType}</strong>
            {contract.nextAdjustmentDate && (() => {
              const [y, m, d] = contract.nextAdjustmentDate!.substring(0, 10).split('-').map(Number);
              return <> · Próximo ajuste: <strong>{new Date(y, m - 1, d).toLocaleDateString('es-AR')}</strong></>;
            })()}
          </Alert>

          {contract.indexType !== 'FREE' && (
            <Box mb={2}>
              <Tooltip title="Consulta la API del BCRA o INDEC y completa el porcentaje automáticamente">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={fetchingIndex ? <CircularProgress size={14} /> : <Download />}
                  onClick={fetchIndexValue}
                  disabled={fetchingIndex}
                >
                  {fetchingIndex ? 'Consultando...' : 'Obtener valor del índice'}
                </Button>
              </Tooltip>
              {fetchError && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  {fetchError} — ingresá el porcentaje manualmente.
                </Alert>
              )}
            </Box>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Porcentaje de aumento *"
                type="number"
                fullWidth
                inputProps={{ min: 0, max: 1000, step: '0.01' }}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                {...register('percentage', { required: true, valueAsNumber: true, min: 0 })}
                error={!!errors.percentage}
                helperText={contract.indexType === 'FREE' ? 'Pre-acordado en el contrato' : 'Ingresá el valor publicado del índice'}
              />
            </Grid>
            {contract.indexType !== 'FREE' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Valor del índice (opcional)"
                  type="number"
                  fullWidth
                  inputProps={{ step: '0.0001' }}
                  {...register('indexValue')}
                  helperText="Ej: 1.0823 para ICL de agosto"
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                label="Notas (opcional)"
                fullWidth
                {...register('notes')}
                placeholder="Ej: Ajuste ICL agosto 2026 — 8.23%"
              />
            </Grid>
          </Grid>

          {/* Preview */}
          <Box mt={2.5} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="body2" color="text.secondary" gutterBottom>Vista previa del ajuste</Typography>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary">Monto actual</Typography>
                <Typography variant="body1" fontWeight={500}>{formatMoney(currentAmount)}</Typography>
              </Box>
              <Typography variant="h5" color="text.secondary" mx={1}>→</Typography>
              <Box textAlign="right">
                <Typography variant="caption" color="text.secondary">Nuevo monto</Typography>
                <Typography variant="body1" fontWeight={700} color="success.main">{formatMoney(newAmount)}</Typography>
              </Box>
              <Box textAlign="right" ml={2}>
                <Typography variant="caption" color="text.secondary">Diferencia</Typography>
                <Typography variant="body2" color="success.main" fontWeight={500}>
                  +{formatMoney(newAmount - currentAmount)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {adjust.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>Error al aplicar el ajuste.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={adjust.isPending || Number(percentage) <= 0}
            startIcon={adjust.isPending ? <CircularProgress size={16} /> : undefined}
          >
            Aplicar ajuste
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
