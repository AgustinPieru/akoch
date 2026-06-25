import {
  Box, Typography, Paper, FormControlLabel, Switch, Alert, CircularProgress,
} from '@mui/material';
import { useSettings, useUpdateSettings } from '../api/useSettings';

export default function SettingsPage() {
  const { data, isLoading, isError } = useSettings();
  const update = useUpdateSettings();

  return (
    <Box maxWidth={700} mx="auto">
      <Typography variant="h5" fontWeight={700} mb={3}>Configuración</Typography>

      {isLoading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar la configuración.</Alert>}

      {data && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>Ajustes de índice</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={data.autoAdjustEnabled}
                onChange={(e) => update.mutate({ autoAdjustEnabled: e.target.checked })}
                disabled={update.isPending}
              />
            }
            label="Aplicar aumentos de índice automáticamente todos los días"
          />
          <Typography variant="body2" color="text.secondary" mt={1}>
            Cuando está activado, el sistema revisa todos los días a las 8am los contratos activos
            y aplica el aumento de índice correspondiente a los que ya llegaron a su fecha de ajuste.
          </Typography>
          {!data.autoAdjustEnabled && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              El aumento automático está <strong>pausado</strong>. Los contratos no se ajustarán solos —
              tenés que aplicar cada ajuste manualmente desde el detalle de cada contrato
              ("Aplicar ajuste de índice"). Útil mientras se cargan o corrigen datos.
            </Alert>
          )}
          {update.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>No se pudo guardar el cambio.</Alert>
          )}
        </Paper>
      )}
    </Box>
  );
}
