import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Paper, Grid, Divider, CircularProgress,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import { ArrowBack, PlayArrow, Stop, EventNote, TrendingUp, CheckCircleOutline, Autorenew } from '@mui/icons-material';
import { useContract, useActivateContract, useTerminateContract, useFinalizeContract } from '../api/useContracts';
import AdjustContractDialog from '../components/AdjustContractDialog';
import RenewContractDialog from '../components/RenewContractDialog';
import { usePayments, useGeneratePayments } from '@/features/payments/api/usePayments';
import PaymentsTable from '@/features/payments/components/PaymentsTable';
import DocumentList from '@/features/uploads/components/DocumentList';
import { ROUTES } from '@/router/routes';

const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  DRAFT: { label: 'Borrador', color: 'default' },
  ACTIVE: { label: 'Activo', color: 'success' },
  EXPIRED: { label: 'Vencido', color: 'warning' },
  TERMINATED: { label: 'Rescindido', color: 'error' },
  RENEWED: { label: 'Renovado', color: 'info' },
};

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box display="flex" justifyContent="space-between" py={0.75}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value}</Typography>
    </Box>
  );
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contractId = Number(id);

  const { data: contract, isLoading, isError } = useContract(contractId);
  const activate = useActivateContract();
  const terminate = useTerminateContract();
  const finalize = useFinalizeContract();

  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);

  const { data: paymentsData } = usePayments({ contractId: contractId, limit: 200 });
  const generatePayments = useGeneratePayments();

  if (isLoading) return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  if (isError || !contract) return <Alert severity="error">No se pudo cargar el contrato.</Alert>;

  const st = STATUS_LABELS[contract.status] || { label: contract.status, color: 'default' as const };
  const formatDate = (s: string) => new Date(s).toLocaleDateString('es-AR');
  const formatMoney = (n: number) =>
    contract.currency === 'USD'
      ? `USD ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  const getTenantName = (t: { firstName?: string; lastName?: string; businessName?: string; type: string }) =>
    t.type === 'PERSONA_JURIDICA'
      ? t.businessName || '—'
      : [t.firstName, t.lastName].filter(Boolean).join(' ') || '—';

  const handleActivate = async () => {
    await activate.mutateAsync(contractId);
  };

  const handleTerminate = async () => {
    if (!terminateReason.trim()) return;
    await terminate.mutateAsync({ id: contractId, reason: terminateReason });
    setTerminateOpen(false);
    setTerminateReason('');
  };

  const handleFinalize = async () => {
    await finalize.mutateAsync(contractId);
    setFinalizeOpen(false);
  };

  return (
    <Box maxWidth={900} mx="auto">
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(ROUTES.CONTRACTS)} size="small">
          Contratos
        </Button>
        <Typography variant="h5" fontWeight={700} flex={1}>
          {contract.property.street} {contract.property.number}, {contract.property.city}
        </Typography>
        <Chip label={st.label} color={st.color} />
      </Box>

      {contract.status === 'DRAFT' && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button
              size="small"
              color="warning"
              variant="contained"
              startIcon={activate.isPending ? <CircularProgress size={14} /> : <PlayArrow />}
              onClick={handleActivate}
              disabled={activate.isPending}
            >
              Activar contrato
            </Button>
          }
        >
          Este contrato está en borrador. Al activarlo, la propiedad pasará a estado "Alquilada".
        </Alert>
      )}

      {activate.isError && <Alert severity="error" sx={{ mb: 2 }}>Error al activar el contrato.</Alert>}

      {contract.status === 'EXPIRED' && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Box display="flex" gap={1}>
              <Button
                size="small"
                color="primary"
                variant="outlined"
                startIcon={<Autorenew />}
                onClick={() => setRenewOpen(true)}
              >
                Renovar
              </Button>
              <Button
                size="small"
                color="error"
                variant="contained"
                startIcon={finalize.isPending ? <CircularProgress size={14} /> : <CheckCircleOutline />}
                onClick={() => setFinalizeOpen(true)}
                disabled={finalize.isPending}
              >
                Finalizar
              </Button>
            </Box>
          }
        >
          Este contrato venció y el inquilino permanece en la propiedad. Renovar o finalizar el contrato.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Inquilinos</Typography>
            {contract.tenants.map((ct) => (
              <Box key={ct.tenant.id} display="flex" alignItems="center" gap={1} py={0.5}>
                <Typography variant="body2" fontWeight={ct.isPrimary ? 600 : 400}>
                  {ct.isPrimary ? '★ ' : ''}{getTenantName(ct.tenant)}
                </Typography>
                {ct.isPrimary && <Chip label="Titular" size="small" color="primary" />}
              </Box>
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Período</Typography>
            <Row label="Inicio" value={formatDate(contract.startDate)} />
            <Row label="Vencimiento" value={formatDate(contract.endDate)} />
            <Row label="Duración" value={`${contract.durationMonths} meses`} />
            {contract.nextAdjustmentDate && (
              <Row label="Próximo ajuste" value={formatDate(contract.nextAdjustmentDate)} />
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={contract.specialClauses ? 6 : 12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Condiciones económicas</Typography>
            <Row label="Monto inicial" value={formatMoney(contract.initialAmount)} />
            <Row label="Monto actual" value={formatMoney(contract.currentAmount)} />
            <Divider sx={{ my: 1 }} />
            <Row label="Índice" value={INDEX_LABELS[contract.indexType] || contract.indexType} />
            {contract.indexType !== 'NONE' && contract.updateFrequency && (
              <Row label="Periodicidad" value={FREQ_LABELS[contract.updateFrequency] || contract.updateFrequency} />
            )}
            {contract.freePercentage && (
              <Row label="Porcentaje pactado" value={`${contract.freePercentage}%`} />
            )}
            <Divider sx={{ my: 1 }} />
            <Row label="Comisión administración" value={`${contract.adminCommissionPct}%`} />
            {contract.initialCommission && (
              <Row label="Comisión inicial" value={formatMoney(contract.initialCommission)} />
            )}
          </Paper>
        </Grid>

        {contract.specialClauses && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Cláusulas especiales</Typography>
              <Typography variant="body2">{contract.specialClauses}</Typography>
            </Paper>
          </Grid>
        )}

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle2" color="text.secondary">Cobros</Typography>
              {contract.status === 'ACTIVE' && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={generatePayments.isPending ? <CircularProgress size={14} /> : <EventNote />}
                  onClick={() => generatePayments.mutate(contractId)}
                  disabled={generatePayments.isPending}
                >
                  Generar períodos
                </Button>
              )}
            </Box>
            <PaymentsTable
              payments={paymentsData?.data ?? []}
              currency={contract.currency}
              hideContext
            />
          </Paper>
        </Grid>

        {contract.adjustments.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Historial de ajustes</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell align="right">Monto anterior</TableCell>
                    <TableCell align="right">Monto nuevo</TableCell>
                    <TableCell align="right">Variación</TableCell>
                    <TableCell>Índice</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contract.adjustments.map((adj) => (
                    <TableRow key={adj.id}>
                      <TableCell>{formatDate(adj.appliedAt)}</TableCell>
                      <TableCell align="right">{formatMoney(adj.previousAmount)}</TableCell>
                      <TableCell align="right">{formatMoney(adj.newAmount)}</TableCell>
                      <TableCell align="right">+{adj.percentage.toFixed(2)}%</TableCell>
                      <TableCell>{INDEX_LABELS[adj.indexType] || adj.indexType}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        )}
      </Grid>

      {contract.status === 'ACTIVE' && (
        <Box mt={3} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          {contract.indexType !== 'NONE' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<TrendingUp />}
              onClick={() => setAdjustOpen(true)}
            >
              Aplicar ajuste de índice
            </Button>
          )}
          <Box display="flex" gap={1} ml="auto">
            <Button
              variant="outlined"
              color="primary"
              startIcon={<Autorenew />}
              onClick={() => setRenewOpen(true)}
            >
              Renovar contrato
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Stop />}
              onClick={() => setTerminateOpen(true)}
            >
              Rescindir contrato
            </Button>
          </Box>
        </Box>
      )}

      {contract.terminationDate && (
        <Alert severity="error" sx={{ mt: 3 }}>
          <strong>Rescindido el {formatDate(contract.terminationDate)}</strong>
          {contract.terminationReason && ` — ${contract.terminationReason}`}
        </Alert>
      )}

      <Box mt={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Documentos del contrato</Typography>
          <DocumentList entityType="contract" entityId={parseInt(id!)} />
        </Paper>
      </Box>

      {adjustOpen && (
        <AdjustContractDialog contract={contract} onClose={() => setAdjustOpen(false)} />
      )}

      {renewOpen && (
        <RenewContractDialog contract={contract} onClose={() => setRenewOpen(false)} />
      )}

      <Dialog open={finalizeOpen} onClose={() => setFinalizeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Finalizar contrato vencido</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Confirmás que el inquilino desocupó la propiedad. El contrato pasará a estado "Rescindido" y la propiedad quedará disponible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFinalizeOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleFinalize}
            disabled={finalize.isPending}
          >
            {finalize.isPending ? <CircularProgress size={20} /> : 'Confirmar finalización'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={terminateOpen} onClose={() => setTerminateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rescindir contrato</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Esta acción rescinde el contrato y libera la propiedad. No se puede deshacer.
          </Typography>
          <TextField
            label="Motivo de rescisión *"
            fullWidth
            multiline
            rows={3}
            value={terminateReason}
            onChange={(e) => setTerminateReason(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerminateOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleTerminate}
            disabled={!terminateReason.trim() || terminate.isPending}
          >
            {terminate.isPending ? <CircularProgress size={20} /> : 'Rescindir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
