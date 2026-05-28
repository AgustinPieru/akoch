import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Typography, Grid, Chip,
  CircularProgress, Alert, Divider, Table, TableBody, TableCell,
  TableHead, TableRow, Paper,
} from '@mui/material';
import { ArrowBack, Edit } from '@mui/icons-material';
import { useTenant, useUpdateTenant, useTenantAccountStatement } from '../api/useTenants';
import { ROUTES } from '@/router/routes';
import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import TenantForm from '../components/TenantForm';
import DocumentList from '@/features/uploads/components/DocumentList';

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const PAYMENT_STATUS: Record<string, { label: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
  PENDING: { label: 'Pendiente', color: 'default' },
  PAID: { label: 'Pagado', color: 'success' },
  LATE: { label: 'Atrasado', color: 'error' },
  PARTIAL: { label: 'Parcial', color: 'warning' },
};

function AccountStatementSection({ tenantId }: { tenantId: number }) {
  const { data, isLoading, isError } = useTenantAccountStatement(tenantId);

  if (isLoading) return <CircularProgress size={24} />;
  if (isError || !data) return <Alert severity="error">Error al cargar la cuenta corriente.</Alert>;

  const { summary, payments } = data;
  const currency = payments[0]?.contract.currency ?? 'ARS';
  const formatMoney = (n: number) =>
    currency === 'USD'
      ? `USD ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  return (
    <Box>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} sm={3}>
          <Box textAlign="center" p={1.5} sx={{ bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">Total cobros</Typography>
            <Typography variant="h6" fontWeight={700}>{summary.totalPayments}</Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box textAlign="center" p={1.5} sx={{ bgcolor: 'success.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">Total pagado</Typography>
            <Typography variant="h6" fontWeight={700} color="success.main">{formatMoney(summary.totalPaid)}</Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box textAlign="center" p={1.5} sx={{ bgcolor: summary.totalDebt > 0 ? 'error.50' : 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">Deuda pendiente</Typography>
            <Typography variant="h6" fontWeight={700} color={summary.totalDebt > 0 ? 'error.main' : 'text.primary'}>
              {formatMoney(summary.totalDebt)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box textAlign="center" p={1.5} sx={{ bgcolor: summary.totalInterest > 0 ? 'warning.50' : 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">Intereses cobrados</Typography>
            <Typography variant="h6" fontWeight={700} color={summary.totalInterest > 0 ? 'warning.main' : 'text.primary'}>
              {formatMoney(summary.totalInterest)}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {summary.overdueCount > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {summary.overdueCount} cobro{summary.overdueCount > 1 ? 's' : ''} vencido{summary.overdueCount > 1 ? 's' : ''} sin pagar.
        </Alert>
      )}

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600 } }}>
              <TableCell>Período</TableCell>
              <TableCell>Propiedad</TableCell>
              <TableCell>Vencimiento</TableCell>
              <TableCell align="right">Esperado</TableCell>
              <TableCell align="right">Cobrado</TableCell>
              <TableCell align="right">Mora</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin cobros registrados.</TableCell></TableRow>
            ) : payments.map((p) => {
              const st = PAYMENT_STATUS[p.status] ?? { label: p.status, color: 'default' as const };
              const pCurrency = p.contract.currency;
              const fmt = (n: number) => pCurrency === 'USD'
                ? `USD ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                : `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
              return (
                <TableRow key={p.id} sx={{ opacity: p.status === 'PAID' ? 0.8 : 1, bgcolor: p.status === 'LATE' ? 'error.50' : undefined }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {MONTHS_SHORT[p.periodMonth - 1]} {p.periodYear}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{p.contract.property.street} {p.contract.property.number}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.contract.property.city}</Typography>
                  </TableCell>
                  <TableCell>{new Date(p.dueDate).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell align="right">{fmt(p.expectedAmount)}</TableCell>
                  <TableCell align="right">{p.paidAmount != null ? fmt(p.paidAmount) : '—'}</TableCell>
                  <TableCell align="right">
                    {p.interestAmount && Number(p.interestAmount) > 0 ? (
                      <Typography variant="body2" color="warning.main" fontWeight={600}>
                        {fmt(Number(p.interestAmount))}
                      </Typography>
                    ) : '—'}
                  </TableCell>
                  <TableCell><Chip label={st.label} color={st.color} size="small" /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  EMPLEADO_RELACION_DEPENDENCIA: 'Relación de dependencia',
  AUTONOMO: 'Autónomo / Monotributista',
  JUBILADO: 'Jubilado / Pensionado',
  OTRO: 'Otro',
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box py={0.75}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Box>
  );
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tenant, isLoading, error } = useTenant(parseInt(id!));
  const { mutateAsync: updateTenant, isPending } = useUpdateTenant(parseInt(id!));
  const [editing, setEditing] = useState(false);
  const methods = useForm();

  if (isLoading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;
  if (error || !tenant) return <Alert severity="error">Inquilino no encontrado</Alert>;

  const displayName =
    tenant.type === 'PERSONA_JURIDICA'
      ? tenant.businessName
      : [tenant.firstName, tenant.lastName].filter(Boolean).join(' ');

  const handleEdit = () => {
    methods.reset({ ...tenant, birthDate: tenant.birthDate?.split('T')[0] });
    setEditing(true);
  };

  const handleSave = async (data: Record<string, unknown>) => {
    await updateTenant(data as any);
    setEditing(false);
  };

  if (editing) {
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Button startIcon={<ArrowBack />} onClick={() => setEditing(false)} variant="text">Cancelar</Button>
          <Typography variant="h5">Editar inquilino</Typography>
        </Box>
        <FormProvider {...methods}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <TenantForm />
              <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
                <Button onClick={() => setEditing(false)} disabled={isPending}>Cancelar</Button>
                <Button variant="contained" onClick={methods.handleSubmit(handleSave)} disabled={isPending}>
                  {isPending ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </FormProvider>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate(ROUTES.TENANTS)} variant="text">
            Inquilinos
          </Button>
          <Typography variant="h5">{displayName || 'Sin nombre'}</Typography>
          <Chip
            label={tenant.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
            color={tenant.status === 'ACTIVE' ? 'success' : 'default'}
            size="small"
          />
        </Box>
        <Button startIcon={<Edit />} variant="outlined" onClick={handleEdit}>Editar</Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Datos personales</Typography>
              <Divider sx={{ mb: 2 }} />
              <InfoRow label="Tipo" value={tenant.type === 'PERSONA_JURIDICA' ? 'Persona jurídica' : 'Persona física'} />
              {tenant.type === 'PERSONA_FISICA' ? (
                <>
                  <InfoRow label="DNI" value={tenant.dni} />
                  <InfoRow label="CUIT / CUIL" value={tenant.cuit} />
                  <InfoRow label="Fecha de nacimiento" value={tenant.birthDate ? new Date(tenant.birthDate).toLocaleDateString('es-AR') : undefined} />
                </>
              ) : (
                <InfoRow label="CUIT" value={tenant.cuit} />
              )}
              <InfoRow label="Domicilio" value={tenant.address} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Contacto</Typography>
              <Divider sx={{ mb: 2 }} />
              <InfoRow label="Email" value={tenant.email} />
              <InfoRow label="Teléfono principal" value={tenant.phone} />
              <InfoRow label="Teléfono alternativo" value={tenant.phone2} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          {tenant.type === 'PERSONA_FISICA' && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Situación laboral</Typography>
                <Divider sx={{ mb: 2 }} />
                <InfoRow
                  label="Estado"
                  value={tenant.employmentStatus ? EMPLOYMENT_LABELS[tenant.employmentStatus] : undefined}
                />
                <InfoRow label="Empleador" value={tenant.employer} />
                <InfoRow label="Domicilio laboral" value={tenant.workAddress} />
              </CardContent>
            </Card>
          )}

          {tenant.notes && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Notas</Typography>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary">{tenant.notes}</Typography>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Documentos</Typography>
              <Divider sx={{ mb: 2 }} />
              <DocumentList entityType="tenant" entityId={parseInt(id!)} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Cuenta corriente</Typography>
            <Divider sx={{ mb: 2 }} />
            <AccountStatementSection tenantId={parseInt(id!)} />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
