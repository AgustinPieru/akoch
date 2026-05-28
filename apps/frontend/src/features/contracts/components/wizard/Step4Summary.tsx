import { Box, Grid, Typography, Divider, Chip, Alert } from '@mui/material';
import { useProperty } from '@/features/properties/api/useProperties';
import { SelectedTenant } from './Step2Tenants';

const INDEX_LABELS: Record<string, string> = {
  ICL_BCRA: 'ICL — Banco Central',
  IPC_INDEC: 'IPC — INDEC',
  FREE: 'Porcentaje libre',
  NONE: 'Sin ajuste',
};

const FREQ_LABELS: Record<string, string> = {
  MONTHLY: 'Mensual', QUARTERLY: 'Trimestral', FOUR_MONTHLY: 'Cuatrimestral',
  SEMI_ANNUAL: 'Semestral', ANNUAL: 'Anual',
};

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
  specialClauses?: string;
}

interface Props {
  propertyId: number;
  tenants: SelectedTenant[];
  formValues: FormValues;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box display="flex" justifyContent="space-between" py={0.75}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value}</Typography>
    </Box>
  );
}

export default function Step4Summary({ propertyId, tenants, formValues }: Props) {
  const { data: property } = useProperty(propertyId);

  const endDate = (() => {
    if (!formValues.startDate || !formValues.durationMonths) return '—';
    const d = new Date(formValues.startDate);
    d.setMonth(d.getMonth() + Number(formValues.durationMonths));
    return d.toLocaleDateString('es-AR');
  })();

  const formatMoney = (n: number, currency: string) =>
    currency === 'USD'
      ? `USD ${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Resumen del contrato</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Revisá los datos antes de guardar. El contrato se crea en estado <strong>Borrador</strong> y podés activarlo desde el detalle.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Propiedad</Typography>
          {property ? (
            <Box>
              <Typography variant="body1" fontWeight={600}>
                {property.street} {property.number}, {property.city}
              </Typography>
              <Typography variant="body2" color="text.secondary">{property.province}</Typography>
            </Box>
          ) : <Typography variant="body2">Cargando...</Typography>}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Inquilinos</Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {tenants.map((t) => (
              <Chip
                key={t.tenantId}
                label={`${t.isPrimary ? '★ ' : ''}${t.name}`}
                color={t.isPrimary ? 'primary' : 'default'}
                size="small"
              />
            ))}
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Condiciones</Typography>
          <Row label="Inicio" value={formValues.startDate ? new Date(formValues.startDate).toLocaleDateString('es-AR') : '—'} />
          <Row label="Vencimiento" value={endDate} />
          <Row label="Duración" value={`${formValues.durationMonths} meses`} />
          <Divider sx={{ my: 1 }} />
          <Row label="Monto inicial" value={formValues.initialAmount ? formatMoney(Number(formValues.initialAmount), formValues.currency) : '—'} />
          <Row label="Índice" value={INDEX_LABELS[formValues.indexType] || formValues.indexType} />
          {formValues.indexType !== 'NONE' && (
            <Row label="Periodicidad" value={FREQ_LABELS[formValues.updateFrequency] || formValues.updateFrequency} />
          )}
          {formValues.indexType === 'FREE' && formValues.freePercentage && (
            <Row label="Porcentaje pactado" value={`${formValues.freePercentage}%`} />
          )}
          <Divider sx={{ my: 1 }} />
          <Row label="Comisión administración" value={`${formValues.adminCommissionPct}%`} />
          {formValues.initialCommission && (
            <Row label="Comisión inicial" value={formatMoney(Number(formValues.initialCommission), formValues.currency)} />
          )}
        </Grid>
      </Grid>

      {formValues.specialClauses && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Cláusulas especiales</Typography>
          <Typography variant="body2">{formValues.specialClauses}</Typography>
        </>
      )}

      <Alert severity="warning" sx={{ mt: 3 }}>
        El contrato se guardará como <strong>Borrador</strong>. Para que tenga efecto y la propiedad pase a "Alquilada", activalo desde la pantalla de detalle.
      </Alert>
    </Box>
  );
}
