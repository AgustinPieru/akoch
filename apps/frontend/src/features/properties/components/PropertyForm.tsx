import { useState } from 'react';
import {
  Box, Grid, TextField, MenuItem, Typography, Divider,
  IconButton, Button, Autocomplete, CircularProgress,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { useOwners } from '@/features/owners/api/useOwners';

const PROPERTY_TYPES = [
  { value: 'CASA', label: 'Casa' },
  { value: 'DEPARTAMENTO', label: 'Departamento' },
  { value: 'LOCAL_COMERCIAL', label: 'Local comercial' },
  { value: 'OFICINA', label: 'Oficina' },
  { value: 'TERRENO', label: 'Terreno' },
  { value: 'COCHERA', label: 'Cochera' },
  { value: 'DEPOSITO', label: 'Depósito' },
  { value: 'GALPON', label: 'Galpón' },
  { value: 'OTRO', label: 'Otro' },
];

const PROVINCES = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones',
  'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
];

const PAID_BY = [
  { value: 'TENANT', label: 'Inquilino' },
  { value: 'OWNER', label: 'Propietario' },
  { value: 'AGENCY', label: 'Inmobiliaria' },
  { value: 'SHARED', label: 'Compartido' },
  { value: 'N_A', label: 'No tiene' },
];

type OwnerOption = {
  id: number;
  type: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  cuit?: string;
};

function getOwnerLabel(o: OwnerOption) {
  const name = o.type === 'PERSONA_JURIDICA'
    ? (o.businessName ?? '')
    : [o.firstName, o.lastName].filter(Boolean).join(' ');
  return o.cuit ? `${name} (${o.cuit})` : name;
}

// Isolated per-row autocomplete: each row has its own search state
function OwnerAutocomplete({ value, onChange }: { value: OwnerOption | null; onChange: (v: OwnerOption | null) => void }) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useOwners({ search, limit: 30 });

  const options: OwnerOption[] = [
    ...(value ? [value] : []),
    ...(data?.data ?? []).filter((o) => !value || o.id !== value.id),
  ];

  return (
    <Autocomplete
      sx={{ flex: 1 }}
      options={options}
      value={value}
      getOptionLabel={(o) => getOwnerLabel(o as OwnerOption)}
      isOptionEqualToValue={(opt, val) => opt.id === val.id}
      loading={isLoading}
      onInputChange={(_, v) => setSearch(v)}
      onChange={(_, v) => onChange(v ? (v as OwnerOption) : null)}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Propietario *"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading && <CircularProgress size={16} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

export default function PropertyForm() {
  const { register, control, formState: { errors } } = useFormContext<Record<string, any>>();
  const { fields, append, remove } = useFieldArray({ control, name: 'owners' });

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Datos de la propiedad
      </Typography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            label="Tipo *"
            fullWidth
            defaultValue="DEPARTAMENTO"
            {...register('type', { required: 'Tipo requerido' })}
            error={!!errors.type}
          >
            {PROPERTY_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={5}>
          <TextField
            label="Calle *"
            fullWidth
            {...register('street', { required: 'Calle requerida' })}
            error={!!errors.street}
            helperText={errors.street?.message as string}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="Número *"
            fullWidth
            {...register('number', { required: 'Número requerido' })}
            error={!!errors.number}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <TextField label="Piso" fullWidth {...register('floor')} />
        </Grid>
        <Grid item xs={12} sm={2}>
          <TextField label="Departamento" fullWidth {...register('apartment')} />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField label="Ciudad / Localidad *" fullWidth {...register('city', { required: true })} error={!!errors.city} />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            select
            label="Provincia *"
            fullWidth
            defaultValue="Santa Fe"
            {...register('province', { required: 'Provincia requerida' })}
            error={!!errors.province}
          >
            {PROVINCES.map((p) => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={2}>
          <TextField label="Código postal" fullWidth {...register('zipCode')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Superficie cubierta (m²)"
            type="number"
            fullWidth
            {...register('coveredSurface', { valueAsNumber: true })}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Superficie total (m²)"
            type="number"
            fullWidth
            {...register('totalSurface', { valueAsNumber: true })}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField label="Ambientes" fullWidth {...register('rooms')} placeholder="Ej: 3 amb" />
        </Grid>
      </Grid>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        ¿Quién paga cada servicio?
      </Typography>
      <Grid container spacing={2} mb={3}>
        {[
          { field: 'ablPaidBy', label: 'TGI' },
          { field: 'ordinaryExpensesPaidBy', label: 'Expensas ordinarias' },
          { field: 'extraordinaryExpensesPaidBy', label: 'Expensas extraordinarias' },
          { field: 'apiPaidBy', label: 'API' },
          { field: 'gasPaidBy', label: 'Gas' },
          { field: 'electricityPaidBy', label: 'Electricidad' },
          { field: 'waterPaidBy', label: 'Agua' },
        ].map(({ field, label }) => (
          <Grid item xs={12} sm={4} key={field}>
            <TextField
              select
              label={label}
              fullWidth
              defaultValue="TENANT"
              {...register(field)}
            >
              {PAID_BY.map((p) => (
                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ mb: 3 }} />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle2" color="text.secondary">
          Propietarios (la suma de porcentajes debe ser 100%)
        </Typography>
        <Button size="small" startIcon={<Add />} onClick={() => append({ owner: null, percentage: 100 })}>
          Agregar
        </Button>
      </Box>

      {fields.map((field, index) => {
        return (
          <Box key={field.id} display="flex" gap={2} mb={2} alignItems="flex-start">
            <Controller
              name={`owners.${index}.owner`}
              control={control}
              render={({ field: f }) => (
                <OwnerAutocomplete
                  value={f.value ?? null}
                  onChange={(v) => f.onChange(v)}
                />
              )}
            />
            <TextField
              label="%"
              type="number"
              sx={{ width: 100 }}
              defaultValue={100}
              {...register(`owners.${index}.percentage`, { valueAsNumber: true })}
            />
            <IconButton size="small" onClick={() => remove(index)} color="error" sx={{ mt: 0.5 }}>
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        );
      })}

      {fields.length === 0 && (
        <Typography variant="caption" color="text.secondary">
          Agregue al menos un propietario
        </Typography>
      )}

      <Divider sx={{ my: 3 }} />

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
