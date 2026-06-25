import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, Alert, Tabs, Tab,
} from '@mui/material';
import { useForm, FormProvider } from 'react-hook-form';
import Step3Economics from './wizard/Step3Economics';
import Step2Tenants, { SelectedTenant } from './wizard/Step2Tenants';
import { Contract, useUpdateContract } from '../api/useContracts';

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

interface Props {
  contract: Contract;
  onClose: () => void;
}

function getTenantName(t: Contract['tenants'][0]['tenant']) {
  return t.type === 'PERSONA_JURIDICA'
    ? t.businessName || '—'
    : [t.firstName, t.lastName].filter(Boolean).join(' ') || '—';
}

export default function EditContractDialog({ contract, onClose }: Props) {
  const update = useUpdateContract();
  const [tab, setTab] = useState(0);
  const [tenants, setTenants] = useState<SelectedTenant[]>(
    contract.tenants.map((ct) => ({
      tenantId: ct.tenant.id,
      isPrimary: ct.isPrimary,
      name: getTenantName(ct.tenant),
    })),
  );

  const methods = useForm<FormValues>({
    defaultValues: {
      startDate: contract.startDate.substring(0, 10),
      durationMonths: contract.durationMonths,
      initialAmount: contract.initialAmount,
      currency: contract.currency,
      indexType: contract.indexType,
      updateFrequency: contract.updateFrequency ?? 'QUARTERLY',
      freePercentage: contract.freePercentage ?? undefined,
      adminCommissionPct: contract.adminCommissionPct,
      initialCommission: contract.initialCommission ?? undefined,
      initialCommissionInstallments: contract.initialCommissionInstallments ?? 1,
      specialClauses: contract.specialClauses ?? '',
    },
  });

  const handleSubmit = async () => {
    const valid = await methods.trigger();
    if (!valid) return;

    const values = methods.getValues();
    try {
      await update.mutateAsync({
        id: contract.id,
        data: {
          startDate: values.startDate,
          durationMonths: Number(values.durationMonths),
          initialAmount: Number(values.initialAmount),
          currency: values.currency,
          indexType: values.indexType,
          updateFrequency: values.indexType !== 'NONE' ? values.updateFrequency : undefined,
          freePercentage: values.indexType === 'FREE' && values.freePercentage ? Number(values.freePercentage) : null,
          adminCommissionPct: Number(values.adminCommissionPct),
          initialCommission: values.initialCommission ? Number(values.initialCommission) : null,
          initialCommissionInstallments: values.initialCommission && values.initialCommissionInstallments
            ? Number(values.initialCommissionInstallments)
            : 1,
          specialClauses: values.specialClauses || null,
          tenants: tenants.map(({ tenantId, isPrimary }) => ({ tenantId, isPrimary })),
        },
      });
      onClose();
    } catch {
      // error shown inline
    }
  };

  const canSave = tenants.length > 0 && tenants.some((t) => t.isPrimary);

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Editar contrato (Borrador)</DialogTitle>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Condiciones económicas" />
        <Tab label="Inquilinos" />
      </Tabs>
      <DialogContent dividers sx={{ pt: 3 }}>
        <FormProvider {...methods}>
          {tab === 0 && <Step3Economics />}
        </FormProvider>
        {tab === 1 && <Step2Tenants value={tenants} onChange={setTenants} />}
        {update.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {(update.error as any)?.response?.data?.error ?? 'Error al guardar los cambios.'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={update.isPending || !canSave}
          startIcon={update.isPending ? <CircularProgress size={16} /> : undefined}
        >
          Guardar cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
}
