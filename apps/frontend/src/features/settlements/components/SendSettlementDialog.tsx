import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Divider, Alert, CircularProgress, Box,
} from '@mui/material';
import { WhatsApp, Email, Send } from '@mui/icons-material';
import { useSendSettlementWhatsApp, useSendSettlementEmail, useMarkSettlementSent } from '../api/useSettlements';

interface Props {
  settlementId: number;
  defaultPhone?: string | null;
  defaultEmail?: string | null;
  onClose: () => void;
}

export default function SendSettlementDialog({ settlementId, defaultPhone, defaultEmail, onClose }: Props) {
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [successMsg, setSuccessMsg] = useState('');

  const sendWa = useSendSettlementWhatsApp();
  const sendEmailMutation = useSendSettlementEmail();
  const markSent = useMarkSettlementSent();

  const isPending = sendWa.isPending || sendEmailMutation.isPending || markSent.isPending;
  const error = (sendWa.error || sendEmailMutation.error || markSent.error) as { message?: string } | null;

  const handleWhatsApp = async () => {
    if (!phone.trim()) return;
    await sendWa.mutateAsync({ id: settlementId, phone: phone.trim() });
    setSuccessMsg('Liquidación enviada por WhatsApp y marcada como enviada.');
  };

  const handleEmail = async () => {
    if (!email.trim()) return;
    await sendEmailMutation.mutateAsync({ id: settlementId, email: email.trim() });
    setSuccessMsg('Liquidación enviada por email y marcada como enviada.');
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Enviar liquidación al propietario</DialogTitle>
      <DialogContent>
        {successMsg ? (
          <Alert severity="success" sx={{ mt: 1 }}>{successMsg}</Alert>
        ) : (
          <>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{(error as { message?: string }).message ?? 'Error al enviar'}</Alert>}

            <Typography variant="subtitle2" color="text.secondary" mb={1}>
              Al enviar, la liquidación quedará marcada como <strong>Enviada</strong>.
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>WhatsApp</Typography>
            <Box display="flex" gap={1} alignItems="flex-start">
              <TextField
                size="small"
                label="Teléfono del propietario"
                placeholder="Ej: 1123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                sx={{ flex: 1 }}
                disabled={isPending}
              />
              <Button
                variant="contained"
                color="success"
                startIcon={isPending && sendWa.isPending ? <CircularProgress size={16} color="inherit" /> : <WhatsApp />}
                onClick={handleWhatsApp}
                disabled={isPending || !phone.trim()}
              >
                Enviar
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>Email</Typography>
            <Box display="flex" gap={1} alignItems="flex-start">
              <TextField
                size="small"
                label="Email del propietario"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ flex: 1 }}
                disabled={isPending}
              />
              <Button
                variant="contained"
                startIcon={isPending && sendEmailMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <Email />}
                onClick={handleEmail}
                disabled={isPending || !email.trim()}
              >
                Enviar
              </Button>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {successMsg ? (
          <Button onClick={onClose} variant="contained">Cerrar</Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button
              variant="outlined"
              startIcon={markSent.isPending ? <CircularProgress size={16} /> : <Send />}
              onClick={async () => {
                await markSent.mutateAsync(settlementId);
                setSuccessMsg('Liquidación marcada como enviada (sin comprobante adjunto).');
              }}
              disabled={isPending}
            >
              Solo marcar como enviada
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
