import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Typography, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useForm, FormProvider } from 'react-hook-form';
import TenantForm from '../components/TenantForm';
import { useCreateTenant } from '../api/useTenants';
import { ROUTES } from '@/router/routes';

export default function TenantNewPage() {
  const navigate = useNavigate();
  const methods = useForm({ defaultValues: { type: 'PERSONA_FISICA' } });
  const { mutateAsync, isPending, error } = useCreateTenant();

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      const tenant = await mutateAsync(data as any);
      navigate(ROUTES.TENANT_DETAIL((tenant as any).id));
    } catch {
      // error shown via Alert
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(ROUTES.TENANTS)} variant="text">
          Inquilinos
        </Button>
        <Typography variant="h5">Nuevo inquilino</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as any).response?.data?.error || 'Error al crear el inquilino'}
        </Alert>
      )}

      <FormProvider {...methods}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <TenantForm />
            <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
              <Button onClick={() => navigate(ROUTES.TENANTS)} disabled={isPending}>Cancelar</Button>
              <Button variant="contained" onClick={methods.handleSubmit(onSubmit)} disabled={isPending}>
                {isPending ? 'Guardando...' : 'Guardar inquilino'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </FormProvider>
    </Box>
  );
}
