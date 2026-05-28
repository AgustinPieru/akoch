import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Typography, Box, Alert, CircularProgress, Chip, Divider,
} from '@mui/material';
import { WhatsApp, Email, CheckCircle } from '@mui/icons-material';
import {
  useWhatsAppStatus,
  useSendReceiptWhatsApp,
  useSendReceiptEmail,
} from '../api/useNotifications';

interface Props {
  paymentId: number;
  defaultPhone?: string;
  defaultEmail?: string;
  period: string;
  onClose: () => void;
}

export default function SendReceiptDialog({ paymentId, defaultPhone, defaultEmail, period, onClose }: Props) {
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [waSent, setWaSent] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { data: waStatus } = useWhatsAppStatus();
  const sendWA = useSendReceiptWhatsApp();
  const sendEmail = useSendReceiptEmail();

  const waReady = waStatus?.status === 'ready';

  const handleSendWA = async () => {
    if (!phone.trim()) return;
    await sendWA.mutateAsync({ paymentId, phone });
    setWaSent(true);
  };

  const handleSendEmail = async () => {
    if (!email.trim()) return;
    await sendEmail.mutateAsync({ paymentId, email });
    setEmailSent(true);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Enviar recibo — {period}</DialogTitle>
      <DialogContent dividers>

        {/* WhatsApp */}
        <Box mb={3}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <WhatsApp color="success" />
            <Typography variant="subtitle2" fontWeight={600}>WhatsApp</Typography>
            {!waReady && <Chip label="No conectado" size="small" color="warning" />}
          </Box>
          {!waReady ? (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Conectá WhatsApp desde Configuración → WhatsApp para poder enviar.
            </Alert>
          ) : waSent ? (
            <Alert severity="success" icon={<CheckCircle />} sx={{ py: 0.5 }}>Enviado por WhatsApp</Alert>
          ) : (
            <Box display="flex" gap={1}>
              <TextField
                size="small"
                label="Número (ej: 1155667788)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                placeholder="1155667788"
              />
              <Button
                variant="contained"
                color="success"
                onClick={handleSendWA}
                disabled={sendWA.isPending || !phone.trim()}
                sx={{ minWidth: 80 }}
              >
                {sendWA.isPending ? <CircularProgress size={18} color="inherit" /> : 'Enviar'}
              </Button>
            </Box>
          )}
          {sendWA.isError && (
            <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
              {(sendWA.error as any)?.response?.data?.error ?? 'Error al enviar'}
            </Alert>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Email */}
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Email color="primary" />
            <Typography variant="subtitle2" fontWeight={600}>Email</Typography>
          </Box>
          {emailSent ? (
            <Alert severity="success" icon={<CheckCircle />} sx={{ py: 0.5 }}>Enviado por email</Alert>
          ) : (
            <Box display="flex" gap={1}>
              <TextField
                size="small"
                label="Email destinatario"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleSendEmail}
                disabled={sendEmail.isPending || !email.trim()}
                sx={{ minWidth: 80 }}
              >
                {sendEmail.isPending ? <CircularProgress size={18} color="inherit" /> : 'Enviar'}
              </Button>
            </Box>
          )}
          {sendEmail.isError && (
            <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
              {(sendEmail.error as any)?.response?.data?.error ?? 'Error al enviar el email'}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
