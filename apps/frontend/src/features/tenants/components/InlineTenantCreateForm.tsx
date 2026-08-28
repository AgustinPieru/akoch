import { Box, Paper, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { useForm, FormProvider } from 'react-hook-form';
import TenantForm from './TenantForm';
import { useCreateTenant } from '../api/useTenants';

interface Props {
  onCreated: (tenant: { id: number; type: string; firstName?: string; lastName?: string; businessName?: string }) => void;
  onCancel: () => void;
}

export default function InlineTenantCreateForm({ onCreated, onCancel }: Props) {
  const methods = useForm({ defaultValues: { type: 'PERSONA_FISICA' } });
  const { mutateAsync, isPending, error } = useCreateTenant();

  const onSubmit = async (data: Record<string, unknown>) => {
    const tenant = await mutateAsync(data as any);
    onCreated(tenant as any);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>Nuevo inquilino</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as any).response?.data?.error || 'Error al crear el inquilino'}
        </Alert>
      )}

      <FormProvider {...methods}>
        <TenantForm />
      </FormProvider>

      <Box display="flex" gap={2} justifyContent="flex-end" mt={2}>
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
