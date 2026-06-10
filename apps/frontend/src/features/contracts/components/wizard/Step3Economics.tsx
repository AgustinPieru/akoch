import {
  Box, Grid, TextField, MenuItem, Typography, Divider,
  InputAdornment, Alert,
} from '@mui/material';
import { useFormContext, Controller } from 'react-hook-form';
import CurrencyField from '@/components/CurrencyField';

const INDEX_TYPES = [
  { value: 'ICL_BCRA', label: 'ICL — Índice Banco Central' },
  { value: 'IPC_INDEC', label: 'IPC — INDEC' },
  { value: 'FREE', label: 'Porcentaje libre pactado' },
  { value: 'NONE', label: 'Sin ajuste (USD u otros)' },
];

const FREQUENCIES = [
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'FOUR_MONTHLY', label: 'Cuatrimestral' },
  { value: 'SEMI_ANNUAL', label: 'Semestral' },
  { value: 'ANNUAL', label: 'Anual' },
];

const CURRENCIES = [
  { value: 'ARS', label: 'Pesos (ARS)' },
  { value: 'USD', label: 'Dólares (USD)' },
];

export default function Step3Economics() {
  const { register, watch, control, formState: { errors } } = useFormContext();

  const indexType = watch('indexType');
  const currency = watch('currency');
  const startDate = watch('startDate');
  const durationMonths = watch('durationMonths');

  const endDate = (() => {
    if (!startDate || !durationMonths) return '';
    const [y, m, d] = startDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setMonth(date.getMonth() + parseInt(durationMonths));
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  })();

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Condiciones económicas</Typography>

      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Período del contrato</Typography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Fecha de inicio *"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            {...register('startDate', { required: true })}
            error={!!errors.startDate}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Duración (meses) *"
            type="number"
            fullWidth
            inputProps={{ min: 1, max: 120 }}
            {...register('durationMonths', { required: true, valueAsNumber: true, min: 1 })}
            error={!!errors.durationMonths}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Fecha de vencimiento"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={endDate}
            InputProps={{ readOnly: true }}
            helperText="Calculada automáticamente"
          />
        </Grid>
      </Grid>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Monto y moneda</Typography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <Controller
            name="initialAmount"
            control={control}
            rules={{ required: true, min: 0 }}
            render={({ field }) => (
              <CurrencyField
                label="Monto inicial *"
                fullWidth
                value={field.value ?? ''}
                onChange={(val) => field.onChange(val === '' ? 0 : val)}
                error={!!errors.initialAmount}
                InputProps={{
                  startAdornment: <InputAdornment position="start">{currency === 'USD' ? 'USD' : '$'}</InputAdornment>,
                }}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            label="Moneda"
            fullWidth
            defaultValue="ARS"
            {...register('currency')}
          >
            {CURRENCIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
          </TextField>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Índice de actualización</Typography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={5}>
          <TextField
            select
            label="Índice *"
            fullWidth
            defaultValue="ICL_BCRA"
            {...register('indexType')}
          >
            {INDEX_TYPES.map((i) => <MenuItem key={i.value} value={i.value}>{i.label}</MenuItem>)}
          </TextField>
        </Grid>
        {indexType !== 'NONE' && (
          <Grid item xs={12} sm={4}>
            <TextField
              select
              label="Periodicidad *"
              fullWidth
              defaultValue="QUARTERLY"
              {...register('updateFrequency')}
            >
              {FREQUENCIES.map((f) => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
            </TextField>
          </Grid>
        )}
        {indexType === 'FREE' && (
          <Grid item xs={12} sm={3}>
            <TextField
              label="Porcentaje *"
              type="number"
              fullWidth
              inputProps={{ min: 0, max: 1000, step: '0.01' }}
              InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              {...register('freePercentage', { valueAsNumber: true })}
            />
          </Grid>
        )}
      </Grid>

      {indexType === 'NONE' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Sin ajuste: el monto se mantiene fijo durante toda la vigencia del contrato.
        </Alert>
      )}

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Comisiones</Typography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Comisión de administración *"
            type="number"
            fullWidth
            inputProps={{ min: 0, max: 100, step: '0.1' }}
            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            defaultValue={10}
            {...register('adminCommissionPct', { valueAsNumber: true })}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Controller
            name="initialCommission"
            control={control}
            render={({ field }) => (
              <CurrencyField
                label="Comisión inicial (opcional)"
                fullWidth
                value={field.value ?? ''}
                onChange={(val) => field.onChange(val === '' ? undefined : val)}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              />
            )}
          />
        </Grid>
      </Grid>

      <TextField
        label="Cláusulas especiales"
        fullWidth
        multiline
        rows={3}
        placeholder="Ej: El inquilino se hace cargo del mantenimiento del jardín..."
        {...register('specialClauses')}
      />
    </Box>
  );
}
