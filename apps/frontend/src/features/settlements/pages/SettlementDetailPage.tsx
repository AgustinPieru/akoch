import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Paper, Grid, Divider, CircularProgress,
  Alert, Table, TableBody, TableCell, TableRow,
} from '@mui/material';
import { ArrowBack, Send, CheckCircle, PictureAsPdf, Refresh } from '@mui/icons-material';
import api from '@/lib/axios';
import { useSettlement, useMarkSettlementPaid, useGenerateSettlement } from '../api/useSettlements';
import SendSettlementDialog from '../components/SendSettlementDialog';
import { ROUTES } from '@/router/routes';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'info' | 'success' }> = {
  DRAFT: { label: 'Borrador', color: 'default' },
  SENT: { label: 'Enviada', color: 'info' },
  PAID: { label: 'Pagada', color: 'success' },
};

function SummaryRow({ label, value, highlight, negative }: { label: string; value: string; highlight?: boolean; negative?: boolean }) {
  return (
    <TableRow>
      <TableCell sx={{ fontWeight: highlight ? 700 : 400, borderBottom: highlight ? '2px solid' : undefined }}>
        {label}
      </TableCell>
      <TableCell
        align="right"
        sx={{
          fontWeight: highlight ? 700 : 400,
          color: negative ? 'error.main' : highlight ? 'success.main' : 'text.primary',
          borderBottom: highlight ? '2px solid' : undefined,
        }}
      >
        {value}
      </TableCell>
    </TableRow>
  );
}

export default function SettlementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const settlementId = Number(id);

  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  const { data: settlement, isLoading, isError } = useSettlement(settlementId);
  const markPaid = useMarkSettlementPaid();
  const regenerate = useGenerateSettlement();

  const handleDownloadPdf = async () => {
    const response = await api.get(`/settlements/${settlementId}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `liquidacion-${settlementId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = () => {
    if (!settlement) return;
    regenerate.mutate({
      contractId: settlement.contractId,
      year: settlement.periodYear,
      month: settlement.periodMonth,
      notes: settlement.notes,
    });
  };

  if (isLoading) return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  if (isError || !settlement) return <Alert severity="error">No se pudo cargar la liquidación.</Alert>;

  const st = STATUS_CONFIG[settlement.status];
  const currency = settlement.currency;

  const formatMoney = (n: number) =>
    currency === 'USD'
      ? `USD ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  const formatDate = (s: string) => new Date(s).toLocaleDateString('es-AR');

  const primaryOwner = settlement.property.owners[0]?.owner;
  const ownerName = primaryOwner
    ? primaryOwner.type === 'PERSONA_JURIDICA'
      ? primaryOwner.businessName
      : [primaryOwner.firstName, primaryOwner.lastName].filter(Boolean).join(' ')
    : '—';

  return (
    <Box maxWidth={800} mx="auto">
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(ROUTES.SETTLEMENTS)} size="small">
          Liquidaciones
        </Button>
        <Typography variant="h5" fontWeight={700} flex={1}>
          Liquidación — {MONTHS[settlement.periodMonth - 1]} {settlement.periodYear}
        </Typography>
        <Chip label={st.label} color={st.color} />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Propiedad</Typography>
            <Typography variant="body1" fontWeight={600}>
              {settlement.property.street} {settlement.property.number}, {settlement.property.city}
            </Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Propietario</Typography>
            <Typography variant="body2" fontWeight={500}>{ownerName}</Typography>
            {primaryOwner?.cbu && (
              <Typography variant="caption" color="text.secondary" display="block">
                CBU: {primaryOwner.cbu} {primaryOwner.bankName ? `— ${primaryOwner.bankName}` : ''}
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Resumen financiero</Typography>
            <Table size="small">
              <TableBody>
                <SummaryRow label="Alquiler cobrado" value={formatMoney(settlement.rentCollected)} />
                <SummaryRow
                  label={`Comisión administración (${settlement.commissionPct}%)`}
                  value={`−${formatMoney(settlement.commissionAmount)}`}
                  negative
                />
                {settlement.expensesAmount > 0 && (
                  <SummaryRow
                    label="Gastos descontados"
                    value={`−${formatMoney(settlement.expensesAmount)}`}
                    negative
                  />
                )}
                <SummaryRow
                  label="Neto a transferir"
                  value={formatMoney(settlement.netAmount)}
                  highlight
                />
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        {settlement.notes && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Notas</Typography>
              <Typography variant="body2">{settlement.notes}</Typography>
            </Paper>
          </Grid>
        )}

        {(settlement.sentAt || settlement.paidAt) && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Historial</Typography>
              {settlement.sentAt && (
                <Typography variant="body2">Enviada al propietario: {formatDate(settlement.sentAt)}</Typography>
              )}
              {settlement.paidAt && (
                <Typography variant="body2">Pagada al propietario: {formatDate(settlement.paidAt)}</Typography>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>

      <Box display="flex" gap={2} justifyContent="flex-end" mt={3}>
        <Button
          variant="outlined"
          color="error"
          startIcon={<PictureAsPdf />}
          onClick={handleDownloadPdf}
        >
          Descargar PDF
        </Button>
        {settlement.status === 'DRAFT' && (
          <Button
            variant="outlined"
            color="warning"
            startIcon={regenerate.isPending ? <CircularProgress size={16} /> : <Refresh />}
            onClick={handleRegenerate}
            disabled={regenerate.isPending}
          >
            Recalcular
          </Button>
        )}
        {settlement.status === 'DRAFT' && (
          <Button
            variant="outlined"
            startIcon={<Send />}
            onClick={() => setSendDialogOpen(true)}
          >
            Marcar como enviada
          </Button>
        )}
        {settlement.status === 'SENT' && (
          <Button
            variant="contained"
            color="success"
            startIcon={markPaid.isPending ? <CircularProgress size={16} /> : <CheckCircle />}
            onClick={() => markPaid.mutate(settlementId)}
            disabled={markPaid.isPending}
          >
            Confirmar pago al propietario
          </Button>
        )}
      </Box>

      {sendDialogOpen && (
        <SendSettlementDialog
          settlementId={settlementId}
          defaultPhone={primaryOwner?.phone ?? undefined}
          defaultEmail={primaryOwner?.email ?? undefined}
          onClose={() => setSendDialogOpen(false)}
        />
      )}
    </Box>
  );
}
