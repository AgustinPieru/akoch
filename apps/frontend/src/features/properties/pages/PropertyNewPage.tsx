import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Typography, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useForm, FormProvider } from 'react-hook-form';
import PropertyForm from '../components/PropertyForm';
import PropertyMediaStaging, { StagedMedia } from '../components/PropertyMediaStaging';
import { useCreateProperty } from '../api/useProperties';
import { ROUTES } from '@/router/routes';
import api from '@/lib/axios';

export default function PropertyNewPage() {
  const navigate = useNavigate();
  const [stagedMedia, setStagedMedia] = useState<StagedMedia[]>([]);
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

  const onSubmit = async (data: any) => {
    try {
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

      navigate(ROUTES.PROPERTY_DETAIL((property as any).id));
    } catch {
      // error shown via Alert
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(ROUTES.PROPERTIES)} variant="text">
          Propiedades
        </Button>
        <Typography variant="h5">Nueva propiedad</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as any).response?.data?.error || 'Error al crear la propiedad'}
        </Alert>
      )}

      <FormProvider {...methods}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <PropertyForm />
            <PropertyMediaStaging files={stagedMedia} onChange={setStagedMedia} />
            <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
              <Button onClick={() => navigate(ROUTES.PROPERTIES)} disabled={isPending}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={methods.handleSubmit(onSubmit)}
                disabled={isPending}
              >
                {isPending ? 'Guardando...' : 'Guardar propiedad'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </FormProvider>
    </Box>
  );
}
