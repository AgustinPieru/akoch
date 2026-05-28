import { Box, Grid, TextField, MenuItem, Typography, Divider } from '@mui/material';
import { useFormContext } from 'react-hook-form';

const TENANT_TYPES = [
  { value: 'PERSONA_FISICA', label: 'Persona física' },
  { value: 'PERSONA_JURIDICA', label: 'Persona jurídica' },
];

const EMPLOYMENT_STATUS = [
  { value: 'EMPLEADO_RELACION_DEPENDENCIA', label: 'Empleado en relación de dependencia' },
  { value: 'AUTONOMO', label: 'Autónomo / Monotributista' },
  { value: 'JUBILADO', label: 'Jubilado / Pensionado' },
  { value: 'OTRO', label: 'Otro' },
];

export default function TenantForm() {
  const { register, watch, formState: { errors } } = useFormContext();
  const type = watch('type');

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Tipo de inquilino
      </Typography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            label="Tipo"
            fullWidth
            defaultValue="PERSONA_FISICA"
            {...register('type')}
          >
            {TENANT_TYPES.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {type === 'PERSONA_FISICA' ? (
        <>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Datos personales
          </Typography>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6}>
              <TextField label="Nombre *" fullWidth {...register('firstName')} error={!!errors.firstName} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Apellido *" fullWidth {...register('lastName')} error={!!errors.lastName} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="DNI" fullWidth {...register('dni')} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="CUIT / CUIL" fullWidth {...register('cuit')} placeholder="20-12345678-9" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Fecha de nacimiento"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                {...register('birthDate')}
              />
            </Grid>
          </Grid>
        </>
      ) : (
        <>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Datos de la empresa
          </Typography>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={8}>
              <TextField label="Razón social *" fullWidth {...register('businessName')} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="CUIT" fullWidth {...register('cuit')} />
            </Grid>
          </Grid>
        </>
      )}

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Contacto
      </Typography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6}>
          <TextField label="Email" type="email" fullWidth {...register('email')} />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField label="Teléfono principal" fullWidth {...register('phone')} />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField label="Teléfono alternativo" fullWidth {...register('phone2')} />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Domicilio actual" fullWidth {...register('address')} />
        </Grid>
      </Grid>

      {type === 'PERSONA_FISICA' && (
        <>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Situación laboral
          </Typography>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="Situación laboral"
                fullWidth
                defaultValue=""
                {...register('employmentStatus')}
              >
                <MenuItem value=""><em>Sin especificar</em></MenuItem>
                {EMPLOYMENT_STATUS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Empleador / Empresa" fullWidth {...register('employer')} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Domicilio laboral" fullWidth {...register('workAddress')} />
            </Grid>
          </Grid>
        </>
      )}

      <Divider sx={{ mb: 3 }} />
      <TextField label="Notas internas" fullWidth multiline rows={3} {...register('notes')} />
    </Box>
  );
}
