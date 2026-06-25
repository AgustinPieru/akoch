import { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Grid, Typography, Box, CircularProgress, Alert, InputAdornment, Tooltip,
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { Contract } from '../api/useContracts';
import { useAdjustContract } from '../api/useContracts';
import CurrencyField from '@/components/CurrencyField';
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
  newAmount: number;
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
      newAmount: contract.currentAmount,
    },
  });

  const percentage = useWatch({ control, name: 'percentage' });
  const newAmount = useWatch({ control, name: 'newAmount' });
  const currentAmount = contract.currentAmount;

  // Recalcula el monto sugerido cada vez que cambia el porcentaje; el usuario
  // puede después editarlo a mano para redondear (frecuente en pagos en efectivo).
  const lastPercentage = useRef(percentage);
  useEffect(() => {
    if (percentage !== lastPercentage.current) {
      lastPercentage.current = percentage;
      const computed = currentAmount * (1 + Number(percentage) / 100);
      setValue('newAmount', Math.round(computed * 100) / 100);
    }
  }, [percentage, currentAmount, setValue]);

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
        newAmount: Number(values.newAmount),
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
          <Box mt={2.5} p={2.5} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="body2" color="text.secondary" gutterBottom>Vista previa del ajuste</Typography>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary" display="block">Monto actual</Typography>
                <Typography variant="body1" fontWeight={500} sx={{ py: '8.5px' }}>{formatMoney(currentAmount)}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Controller
                  name="newAmount"
                  control={control}
                  rules={{ required: true, min: 0 }}
                  render={({ field }) => (
                    <CurrencyField
                      label="Nuevo monto"
                      fullWidth
                      size="small"
                      value={field.value ?? ''}
                      onChange={(val) => field.onChange(val === '' ? 0 : val)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">{contract.currency === 'USD' ? 'USD' : '$'}</InputAdornment>,
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary" display="block">Diferencia</Typography>
                <Typography
                  variant="body1"
                  fontWeight={600}
                  color={newAmount - currentAmount >= 0 ? 'success.main' : 'error.main'}
                  sx={{ py: '8.5px' }}
                >
                  {newAmount - currentAmount >= 0 ? '+' : ''}{formatMoney(newAmount - currentAmount)}
                </Typography>
              </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              "Nuevo monto" es editable — podés redondear el valor calculado por el índice.
            </Typography>
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
