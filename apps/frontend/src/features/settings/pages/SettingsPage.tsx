import { useRef } from 'react';
import {
  Box, Typography, Paper, FormControlLabel, Switch, Alert, CircularProgress,
  Grid, TextField, Button, Avatar, Divider,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useSettings, useUpdateSettings, useUploadLogo, Settings } from '../api/useSettings';

interface AgencyFormValues {
  agencyName: string;
  agencyCuit: string;
  agencyAddress: string;
  agencyPhone: string;
  agencyLicense: string;
}

function AgencyProfileSection({ settings }: { settings: Settings }) {
  const update = useUpdateSettings();
  const uploadLogo = useUploadLogo();
  const inputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit } = useForm<AgencyFormValues>({
    defaultValues: {
      agencyName: settings.agencyName ?? '',
      agencyCuit: settings.agencyCuit ?? '',
      agencyAddress: settings.agencyAddress ?? '',
      agencyPhone: settings.agencyPhone ?? '',
      agencyLicense: settings.agencyLicense ?? '',
    },
  });

  const onSubmit = (values: AgencyFormValues) => {
    update.mutate(values);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogo.mutate(file);
    e.target.value = '';
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>Perfil de la agencia</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Estos datos y el logo aparecen en los recibos, liquidaciones y resúmenes de contrato en PDF.
      </Typography>

      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Avatar
          src={settings.logoUrl}
          variant="rounded"
          sx={{ width: 64, height: 64, bgcolor: 'grey.100' }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={uploadLogo.isPending ? <CircularProgress size={16} /> : <CloudUpload />}
          onClick={() => inputRef.current?.click()}
          disabled={uploadLogo.isPending}
        >
          {settings.logoUrl ? 'Cambiar logo' : 'Subir logo'}
        </Button>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
      </Box>
      {uploadLogo.isError && <Alert severity="error" sx={{ mb: 2 }}>No se pudo subir el logo.</Alert>}

      <Divider sx={{ mb: 2 }} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Nombre de la agencia" fullWidth {...register('agencyName')} placeholder="Akoch Administración Inmobiliaria" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="CUIT" fullWidth {...register('agencyCuit')} />
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField label="Dirección" fullWidth {...register('agencyAddress')} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Teléfono" fullWidth {...register('agencyPhone')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Matrícula" fullWidth {...register('agencyLicense')} placeholder="CCI N° 515" />
          </Grid>
        </Grid>
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button type="submit" variant="contained" disabled={update.isPending}>
            {update.isPending ? <CircularProgress size={20} /> : 'Guardar datos de la agencia'}
          </Button>
        </Box>
        {update.isError && <Alert severity="error" sx={{ mt: 2 }}>No se pudieron guardar los datos.</Alert>}
      </form>
    </Paper>
  );
}

export default function SettingsPage() {
  const { data, isLoading, isError } = useSettings();
  const update = useUpdateSettings();

  return (
    <Box maxWidth={700} mx="auto">
      <Typography variant="h5" fontWeight={700} mb={3}>Configuración</Typography>

      {isLoading && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar la configuración.</Alert>}

      {data && (
        <>
          <AgencyProfileSection settings={data} />

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

          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Notificaciones automáticas por WhatsApp</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Estas alertas se envían solas todos los días. Podés pausar cada una sin afectar las demás.
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={data.lateNotificationsEnabled}
                  onChange={(e) => update.mutate({ lateNotificationsEnabled: e.target.checked })}
                  disabled={update.isPending}
                />
              }
              label="Recordatorio de alquiler vencido (mora)"
            />
            <Typography variant="body2" color="text.secondary" mb={2}>
              Todos los días a las 00:30 se les avisa a los inquilinos con pagos vencidos, con el cálculo de interés.
              Los pagos se siguen marcando como vencidos igual; esto solo pausa el mensaje.
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={data.expiryNotificationsEnabled}
                  onChange={(e) => update.mutate({ expiryNotificationsEnabled: e.target.checked })}
                  disabled={update.isPending}
                />
              }
              label="Aviso de vencimiento de contrato"
            />
            <Typography variant="body2" color="text.secondary" mb={2}>
              Todos los días a las 09:00 se avisa a admin, inquilino y propietario cuando un contrato
              está por vencer (60/30/15 días antes).
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={data.monthlyNotificationsEnabled}
                  onChange={(e) => update.mutate({ monthlyNotificationsEnabled: e.target.checked })}
                  disabled={update.isPending}
                />
              }
              label="Recordatorio mensual de alquiler"
            />
            <Typography variant="body2" color="text.secondary">
              El día 1 de cada mes a las 07:00 se le recuerda a cada inquilino el monto del mes
              y se le manda a cada propietario un resumen de cobros.
            </Typography>

            {update.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>No se pudo guardar el cambio.</Alert>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
}
