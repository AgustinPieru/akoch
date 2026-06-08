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

interface Props {
  existingOwners?: OwnerOption[];
}

export default function PropertyForm({ existingOwners = [] }: Props) {
  const { register, control, watch, formState: { errors } } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: 'owners' });
  const [ownerSearch, setOwnerSearch] = useState('');

  const { data: ownersData, isLoading: loadingOwners } = useOwners({ search: ownerSearch, limit: 30 });
  const searchResults = ownersData?.data ?? [];

  // Merge search results with pre-loaded owners (deduplicate by id)
  const allOwners: OwnerOption[] = [
    ...existingOwners,
    ...searchResults.filter((o) => !existingOwners.some((e) => e.id === o.id)),
  ];

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
        <Grid item xs={12} sm={3}>
          <TextField label="Piso" fullWidth {...register('floor')} />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField label="Departamento" fullWidth {...register('apartment')} />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField label="Ciudad *" fullWidth {...register('city', { required: true })} error={!!errors.city} />
        </Grid>
        <Grid item xs={12} sm={3}>
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
        <Button size="small" startIcon={<Add />} onClick={() => append({ ownerId: null, percentage: 100 })}>
          Agregar
        </Button>
      </Box>

      {fields.map((field, index) => {
        const currentId = watch(`owners.${index}.ownerId`);
        const currentValue = allOwners.find((o) => o.id === currentId) ?? null;

        return (
          <Box key={field.id} display="flex" gap={2} mb={2} alignItems="flex-start">
            <Controller
              name={`owners.${index}.ownerId`}
              control={control}
              render={({ field: f }) => (
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={allOwners}
                  value={currentValue}
                  getOptionLabel={(o) => getOwnerLabel(o as OwnerOption)}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  loading={loadingOwners}
                  onInputChange={(_, v) => setOwnerSearch(v)}
                  onChange={(_, v) => f.onChange(v ? (v as OwnerOption).id : null)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Propietario *"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingOwners && <CircularProgress size={16} />}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
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
