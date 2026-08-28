import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion, AccordionSummary, AccordionDetails, Box, Typography, Chip, Grid,
  Button, CircularProgress,
} from '@mui/material';
import { ExpandMore, Send, CheckCircle, PictureAsPdf, OpenInNew } from '@mui/icons-material';
import api from '@/lib/axios';
import { Settlement, useMarkSettlementPaid } from '../api/useSettlements';
import SendSettlementDialog from './SendSettlementDialog';
import SettlementChargesSection from './SettlementChargesSection';
import SettlementSummaryTable from './SettlementSummaryTable';
import SettlementPropertiesTable from './SettlementPropertiesTable';
import SettlementStatusGuidance from './SettlementStatusGuidance';
import { ROUTES } from '@/router/routes';

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'info' | 'success' }> = {
  DRAFT: { label: 'Borrador', color: 'default' },
  SENT: { label: 'Enviada', color: 'info' },
  PAID: { label: 'Pagada', color: 'success' },
};

function partyName(p: { type: string; firstName?: string; lastName?: string; businessName?: string }) {
  return p.type === 'PERSONA_JURIDICA'
    ? (p.businessName || '—')
    : [p.firstName, p.lastName].filter(Boolean).join(' ') || '—';
}

export default function SettlementCard({ settlement }: { settlement: Settlement }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const markPaid = useMarkSettlementPaid();

  const owner = settlement.owner;
  const ownerName = partyName(owner);
  const st = STATUS_CONFIG[settlement.status];

  const formatMoney = (n: number) =>
    settlement.currency === 'USD'
      ? `USD ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  const handleDownloadPdf = async () => {
    const response = await api.get(`/settlements/${settlement.id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `liquidacion-${settlement.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Accordion expanded={expanded} onChange={(_, exp) => setExpanded(exp)} sx={{ mb: 1.5, '&:before': { display: 'none' } }} variant="outlined">
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%" pr={1} flexWrap="wrap" gap={1}>
          <Box>
            <Typography fontWeight={600}>{ownerName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {settlement.properties.length} propiedad{settlement.properties.length !== 1 ? 'es' : ''}
              {settlement.totalCharges > 0 && ` · ${settlement.charges.length} cargo${settlement.charges.length !== 1 ? 's' : ''} adicional${settlement.charges.length !== 1 ? 'es' : ''}`}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography fontWeight={700} color={settlement.netAmount >= 0 ? 'success.main' : 'error.main'}>
              {formatMoney(settlement.netAmount)}
            </Typography>
            <Chip label={st.label} color={st.color} size="small" />
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <SettlementStatusGuidance settlement={settlement} />
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Propiedades</Typography>
            <SettlementPropertiesTable settlement={settlement} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Resumen</Typography>
            <SettlementSummaryTable settlement={settlement} />
          </Grid>
          <Grid item xs={12}>
            <SettlementChargesSection settlement={settlement} />
          </Grid>
        </Grid>

        <Box display="flex" gap={1} justifyContent="flex-end" mt={2} flexWrap="wrap">
          <Button size="small" startIcon={<OpenInNew />} onClick={() => navigate(ROUTES.SETTLEMENT_DETAIL(settlement.id))}>
            Ver detalle completo
          </Button>
          <Button size="small" variant="outlined" color="error" startIcon={<PictureAsPdf />} onClick={handleDownloadPdf}>
            PDF
          </Button>
          {settlement.status === 'DRAFT' && (
            <Button size="small" variant="outlined" startIcon={<Send />} onClick={() => setSendDialogOpen(true)}>
              Marcar como enviada
            </Button>
          )}
          {settlement.status === 'SENT' && (
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={markPaid.isPending ? <CircularProgress size={14} /> : <CheckCircle />}
              onClick={() => markPaid.mutate(settlement.id)}
              disabled={markPaid.isPending}
            >
              Confirmar pago
            </Button>
          )}
        </Box>
      </AccordionDetails>

      {sendDialogOpen && (
        <SendSettlementDialog
          settlementId={settlement.id}
          defaultPhone={owner.phone ?? undefined}
          defaultEmail={owner.email ?? undefined}
          onClose={() => setSendDialogOpen(false)}
        />
      )}
    </Accordion>
  );
}
