import { useState } from 'react';
import { Box, Paper, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { useForm, FormProvider } from 'react-hook-form';
import PropertyForm from './PropertyForm';
import PropertyMediaStaging, { StagedMedia } from './PropertyMediaStaging';
import { useCreateProperty } from '../api/useProperties';
import api from '@/lib/axios';

interface Props {
  onCreated: (propertyId: number) => void;
  onCancel: () => void;
}

export default function InlinePropertyCreateForm({ onCreated, onCancel }: Props) {
  const methods = useForm({
    defaultValues: {
      type: 'DEPARTAMENTO',
      province: 'Santa Fe',
      ablPaidBy: 'TENANT',
      ordinaryExpensesPaidBy: 'TENANT',
      extraordinaryExpensesPaidBy: 'TENANT',
      apiPaidBy: 'TENANT',
      gasPaidBy: 'TENANT',
      electricityPaidBy: 'TENANT',
      waterPaidBy: 'TENANT',
      owners: [],
    },
  });
  const { mutateAsync, isPending, error } = useCreateProperty();
  const [stagedMedia, setStagedMedia] = useState<StagedMedia[]>([]);

  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      owners: (data.owners ?? []).map(({ owner, percentage }: any) => ({
        ownerId: owner?.id,
        percentage,
      })),
    };
    const property = await mutateAsync(payload);

    for (const sf of stagedMedia) {
      const fd = new FormData();
      fd.append('file', sf.file);
      fd.append('type', 'GENERAL');
      try {
        await api.post(`/properties/${(property as any).id}/photos`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } catch {
        // La propiedad ya quedó creada; las fotos que fallen se pueden reintentar desde el detalle.
      }
    }

    onCreated((property as any).id);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>Nueva propiedad</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as any).response?.data?.error || 'Error al crear la propiedad'}
        </Alert>
      )}

      <FormProvider {...methods}>
        <PropertyForm />
      </FormProvider>

      <PropertyMediaStaging files={stagedMedia} onChange={setStagedMedia} />

      <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
        <Button onClick={onCancel} disabled={isPending}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={methods.handleSubmit(onSubmit)}
          disabled={isPending}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Guardar y seleccionar
        </Button>
      </Box>
    </Paper>
  );
}
