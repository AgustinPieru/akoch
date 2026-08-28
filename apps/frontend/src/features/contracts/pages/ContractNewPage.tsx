import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Stepper, Step, StepLabel, Button, Paper, Typography, CircularProgress,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useForm, FormProvider } from 'react-hook-form';
import Step1Property from '../components/wizard/Step1Property';
import Step2Tenants from '../components/wizard/Step2Tenants';
import Step3Guarantors from '../components/wizard/Step3Guarantors';
import Step3Economics from '../components/wizard/Step3Economics';
import Step4Summary from '../components/wizard/Step4Summary';
import { useCreateContract } from '../api/useContracts';
import { SelectedTenant } from '../components/wizard/Step2Tenants';
import { WizardGuarantor } from '../components/wizard/Step3Guarantors';
import { ROUTES } from '@/router/routes';
import api from '@/lib/axios';

const STEPS = ['Propiedad', 'Inquilinos', 'Garantes', 'Condiciones', 'Resumen'];

interface FormValues {
  startDate: string;
  durationMonths: number;
  initialAmount: number;
  currency: string;
  indexType: string;
  updateFrequency: string;
  freePercentage?: number;
  adminCommissionPct: number;
  initialCommission?: number;
  initialCommissionInstallments?: number;
  specialClauses?: string;
}

export default function ContractNewPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeStep, setActiveStep] = useState(0);
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [tenants, setTenants] = useState<SelectedTenant[]>([]);
  const [guarantors, setGuarantors] = useState<WizardGuarantor[]>([]);

  const todayLocal = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const methods = useForm<FormValues>({
    defaultValues: {
      currency: 'ARS',
      indexType: 'ICL_BCRA',
      updateFrequency: 'QUARTERLY',
      adminCommissionPct: 10,
      durationMonths: 24,
      startDate: todayLocal,
    },
  });

  const createContract = useCreateContract();

  const canAdvance = () => {
    if (activeStep === 0) return propertyId !== null;
    if (activeStep === 1) return tenants.length > 0 && tenants.some((t) => t.isPrimary);
    if (activeStep === 3) {
      const v = methods.getValues();
      return !!v.startDate && !!v.durationMonths && !!v.initialAmount;
    }
    return true;
  };

  const handleNext = () => {
    if (activeStep === 3) {
      methods.trigger().then((valid) => {
        if (valid) setActiveStep((s) => s + 1);
      });
    } else {
      setActiveStep((s) => s + 1);
    }
  };

  const handleBack = () => setActiveStep((s) => s - 1);

  const handleSubmit = async () => {
    const values = methods.getValues();
    const payload = {
      propertyId,
      tenants: tenants.map(({ tenantId, isPrimary }) => ({ tenantId, isPrimary })),
      guarantors: guarantors.length > 0
        ? guarantors.map(({ files, ...g }) => g)
        : undefined,
      startDate: values.startDate,
      durationMonths: Number(values.durationMonths),
      initialAmount: Number(values.initialAmount),
      currency: values.currency,
      indexType: values.indexType,
      updateFrequency: values.indexType !== 'NONE' ? values.updateFrequency : undefined,
      freePercentage: values.indexType === 'FREE' && values.freePercentage ? Number(values.freePercentage) : undefined,
      adminCommissionPct: Number(values.adminCommissionPct),
      initialCommission: values.initialCommission ? Number(values.initialCommission) : undefined,
      initialCommissionInstallments: values.initialCommission && values.initialCommissionInstallments
        ? Number(values.initialCommissionInstallments)
        : undefined,
      specialClauses: values.specialClauses || undefined,
    };

    try {
      const contract = await createContract.mutateAsync(payload);
      await uploadStagedGuarantorFiles(contract.guarantors ?? []);
      navigate(ROUTES.CONTRACT_DETAIL(contract.id));
    } catch {
      // errors surface via mutation state
    }
  };

  // Los garantes recién obtienen un id real al crear el contrato; los archivos
  // adjuntados en el wizard quedan en memoria hasta este punto.
  const uploadStagedGuarantorFiles = async (createdGuarantors: { id: number }[]) => {
    for (let i = 0; i < guarantors.length; i++) {
      const created = createdGuarantors[i];
      if (!created) continue;
      for (const staged of guarantors[i].files) {
        const fd = new FormData();
        fd.append('file', staged.file);
        fd.append('name', staged.file.name);
        fd.append('fileType', staged.fileType);
        try {
          await api.post(`/documents/guarantor/${created.id}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          // El contrato ya quedó creado; el documento se puede reintentar desde el detalle.
        }
      }
    }
  };

  return (
    <Box maxWidth={900} mx="auto">
      <Typography variant="h5" fontWeight={700} mb={3}>Nuevo contrato</Typography>

      <Stepper activeStep={activeStep} orientation={isMobile ? 'vertical' : 'horizontal'} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <FormProvider {...methods}>
          {activeStep === 0 && (
            <Step1Property value={propertyId} onChange={setPropertyId} />
          )}
          {activeStep === 1 && (
            <Step2Tenants value={tenants} onChange={setTenants} />
          )}
          {activeStep === 2 && (
            <Step3Guarantors value={guarantors} onChange={setGuarantors} />
          )}
          {activeStep === 3 && <Step3Economics />}
          {activeStep === 4 && propertyId && (
            <Step4Summary
              propertyId={propertyId}
              tenants={tenants}
              guarantors={guarantors}
              formValues={methods.getValues()}
            />
          )}
        </FormProvider>
      </Paper>

      <Box display="flex" justifyContent="space-between">
        <Button
          variant="outlined"
          onClick={activeStep === 0 ? () => navigate(ROUTES.CONTRACTS) : handleBack}
        >
          {activeStep === 0 ? 'Cancelar' : 'Atrás'}
        </Button>

        {activeStep < STEPS.length - 1 ? (
          <Button variant="contained" onClick={handleNext} disabled={!canAdvance()}>
            Siguiente
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createContract.isPending}
            startIcon={createContract.isPending ? <CircularProgress size={16} /> : undefined}
          >
            Guardar borrador
          </Button>
        )}
      </Box>

      {createContract.isError && (
        <Typography color="error" mt={2} variant="body2">
          Error al crear el contrato. Verificá los datos e intentá de nuevo.
        </Typography>
      )}
    </Box>
  );
}
