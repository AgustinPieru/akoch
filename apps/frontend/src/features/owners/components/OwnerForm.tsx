import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Typography,
  Divider,
} from '@mui/material';
import { useFormContext } from 'react-hook-form';

const OWNER_TYPES = [
  { value: 'PERSONA_FISICA', label: 'Persona física' },
  { value: 'PERSONA_JURIDICA', label: 'Persona jurídica' },
];

const TAX_STATUS = [
  { value: 'MONOTRIBUTISTA', label: 'Monotributista' },
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Responsable inscripto' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'CONSUMIDOR_FINAL', label: 'Consumidor final' },
];

export default function OwnerForm() {
  const { register, watch, formState: { errors } } = useFormContext();
  const type = watch('type');

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Tipo de propietario
      </Typography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="Tipo"
            fullWidth
            defaultValue="PERSONA_FISICA"
            {...register('type')}
            error={!!errors.type}
          >
            {OWNER_TYPES.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="Condición impositiva"
            fullWidth
            defaultValue="MONOTRIBUTISTA"
            {...register('taxStatus')}
          >
            {TAX_STATUS.map((o) => (
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
              <TextField
                label="Nombre"
                fullWidth
                {...register('firstName')}
                error={!!errors.firstName}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Apellido"
                fullWidth
                {...register('lastName')}
                error={!!errors.lastName}
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
            <Grid item xs={12}>
              <TextField
                label="Razón social"
                fullWidth
                {...register('businessName')}
                error={!!errors.businessName}
              />
            </Grid>
          </Grid>
        </>
      )}

      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Datos fiscales y de contacto
      </Typography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="CUIT / CUIL"
            fullWidth
            required
            {...register('cuit', { required: 'CUIT requerido' })}
            error={!!errors.cuit}
            helperText={errors.cuit?.message as string}
            placeholder="20-12345678-9"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Domicilio fiscal"
            fullWidth
            {...register('address')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Email principal"
            type="email"
            fullWidth
            {...register('email')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Email alternativo"
            type="email"
            fullWidth
            {...register('email2')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Teléfono principal"
            fullWidth
            {...register('phone')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Teléfono alternativo"
            fullWidth
            {...register('phone2')}
          />
        </Grid>
      </Grid>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Datos bancarios (para liquidaciones)
      </Typography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="CBU / Alias"
            fullWidth
            {...register('cbu')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Banco"
            fullWidth
            {...register('bankName')}
          />
        </Grid>
      </Grid>

      <TextField
        label="Notas internas"
        fullWidth
        multiline
        rows={3}
        {...register('notes')}
      />
    </Box>
  );
}
