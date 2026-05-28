import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Typography, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useForm, FormProvider } from 'react-hook-form';
import OwnerForm from '../components/OwnerForm';
import { useCreateOwner } from '../api/useOwners';
import { ROUTES } from '@/router/routes';

export default function OwnerNewPage() {
  const navigate = useNavigate();
  const methods = useForm({ defaultValues: { type: 'PERSONA_FISICA', taxStatus: 'MONOTRIBUTISTA' } });
  const { mutateAsync, isPending, error } = useCreateOwner();

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      const owner = await mutateAsync(data as any);
      navigate(ROUTES.OWNER_DETAIL((owner as any).id));
    } catch {
      // error shown via Alert
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(ROUTES.OWNERS)} variant="text">
          Propietarios
        </Button>
        <Typography variant="h5">Nuevo propietario</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as any).response?.data?.error || 'Error al crear el propietario'}
        </Alert>
      )}

      <FormProvider {...methods}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <OwnerForm />
            <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
              <Button onClick={() => navigate(ROUTES.OWNERS)} disabled={isPending}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={methods.handleSubmit(onSubmit)}
                disabled={isPending}
              >
                {isPending ? 'Guardando...' : 'Guardar propietario'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </FormProvider>
    </Box>
  );
}
