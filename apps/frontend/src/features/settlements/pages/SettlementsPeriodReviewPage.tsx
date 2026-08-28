import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, Grid, CircularProgress, Alert,
} from '@mui/material';
import { ArrowBack, Refresh, PersonAdd } from '@mui/icons-material';
import { useSettlements, useGenerateAllSettlements } from '../api/useSettlements';
import SettlementCard from '../components/SettlementCard';
import AddOwnerToPeriodDialog from '../components/AddOwnerToPeriodDialog';
import { ROUTES } from '@/router/routes';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function SettlementsPeriodReviewPage() {
  const { year, month } = useParams<{ year: string; month: string }>();
  const navigate = useNavigate();
  const y = Number(year);
  const m = Number(month);

  const { data, isLoading, isError } = useSettlements({ year: y, month: m, limit: 200 });
  const generateAll = useGenerateAllSettlements();
  const [addOwnerOpen, setAddOwnerOpen] = useState(false);

  const handleRegenerateAll = () => {
    generateAll.mutate({ year: y, month: m });
  };

  const settlements = data?.data ?? [];
  const totalNetArs = settlements.filter((s) => s.currency === 'ARS').reduce((sum, s) => sum + s.netAmount, 0);
  const totalNetUsd = settlements.filter((s) => s.currency === 'USD').reduce((sum, s) => sum + s.netAmount, 0);
  const pendingCount = settlements.filter((s) => s.status === 'DRAFT').length;

  const formatMoney = (n: number) => `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  return (
    <Box maxWidth={1000} mx="auto">
      <Box display="flex" alignItems="center" gap={2} mb={3} flexWrap="wrap">
        <Button startIcon={<ArrowBack />} onClick={() => navigate(ROUTES.SETTLEMENTS)} size="small">
          Liquidaciones
        </Button>
        <Typography variant="h5" fontWeight={700} flex={1}>
          Liquidaciones — {MONTHS[m - 1]} {y}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<PersonAdd />}
          onClick={() => setAddOwnerOpen(true)}
        >
          Agregar propietario
        </Button>
        <Button
          variant="outlined"
          startIcon={generateAll.isPending ? <CircularProgress size={16} /> : <Refresh />}
          onClick={handleRegenerateAll}
          disabled={generateAll.isPending}
        >
          Recalcular todas
        </Button>
      </Box>

      {isLoading && <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error al cargar las liquidaciones del período.</Alert>}

      {generateAll.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>No se pudieron generar las liquidaciones.</Alert>
      )}
      {generateAll.data && generateAll.data.lockedOwnerIds.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {generateAll.data.lockedOwnerIds.length} propietario{generateAll.data.lockedOwnerIds.length !== 1 ? 's' : ''} ya tenía{generateAll.data.lockedOwnerIds.length !== 1 ? 'n' : ''} una liquidación enviada o pagada para este período — no se modificaron.
        </Alert>
      )}

      {data && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">Propietarios</Typography>
                <Typography variant="h5" fontWeight={700}>{settlements.length}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">Sin enviar</Typography>
                <Typography variant="h5" fontWeight={700} color={pendingCount > 0 ? 'warning.dark' : 'text.primary'}>{pendingCount}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">Neto total</Typography>
                <Typography variant="h5" fontWeight={700} color="success.main">{formatMoney(totalNetArs)}</Typography>
                {totalNetUsd !== 0 && (
                  <Typography variant="body2" fontWeight={600} color="success.main">+ USD {totalNetUsd.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</Typography>
                )}
              </Paper>
            </Grid>
          </Grid>

          {settlements.length === 0 ? (
            <Alert severity="info">
              Todavía no hay liquidaciones generadas para este período. Usá "Recalcular todas" para generarlas.
            </Alert>
          ) : (
            settlements.map((s) => <SettlementCard key={s.id} settlement={s} />)
          )}
        </>
      )}

      {addOwnerOpen && (
        <AddOwnerToPeriodDialog
          year={y}
          month={m}
          onClose={() => setAddOwnerOpen(false)}
          onSuccess={() => {}}
        />
      )}
    </Box>
  );
}
