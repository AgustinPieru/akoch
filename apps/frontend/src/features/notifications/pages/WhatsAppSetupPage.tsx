import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Alert, CircularProgress,
  Divider, LinearProgress,
} from '@mui/material';
import { WhatsApp, Refresh } from '@mui/icons-material';
import { useWhatsAppStatus, useWhatsAppQr, useInitWhatsApp, useDisconnectWhatsApp } from '../api/useNotifications';

const STATUS_CONFIG = {
  disconnected: { label: 'Desconectado', color: 'error' as const },
  initializing: { label: 'Iniciando...', color: 'warning' as const },
  loading:      { label: 'Cargando...', color: 'warning' as const },
  qr_pending:   { label: 'Esperando escaneo', color: 'warning' as const },
  ready:        { label: 'Conectado', color: 'success' as const },
};

export default function WhatsAppSetupPage() {
  const { data: statusData } = useWhatsAppStatus();
  const { refetch: fetchQr, isFetching: fetchingQr } = useWhatsAppQr();
  const initWA = useInitWhatsApp();
  const disconnectWA = useDisconnectWhatsApp();
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const status = statusData?.status ?? 'disconnected';
  const cfg = STATUS_CONFIG[status];
  const loadingPercent = statusData?.loadingPercent ?? 0;
  const loadingMessage = statusData?.loadingMessage ?? '';

  useEffect(() => {
    if (status === 'qr_pending' && statusData?.hasQr) {
      fetchQr().then((r) => {
        if (r.data?.qr) setQrUrl(r.data.qr);
      });
    }
    if (status === 'ready') setQrUrl(null);
  }, [status, statusData?.hasQr]);

  const handleInit = () => initWA.mutate();

  return (
    <Box maxWidth={600} mx="auto">
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <WhatsApp color="success" sx={{ fontSize: 32 }} />
        <Typography variant="h5" fontWeight={700}>Configuración de WhatsApp</Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" fontWeight={600}>Estado de conexión</Typography>
          <Chip label={cfg.label} color={cfg.color} />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Desconectado y sin actividad */}
        {status === 'disconnected' && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              El servidor intenta conectar WhatsApp automáticamente al iniciar.
              Si ves este mensaje, podés forzar la reconexión manualmente.
            </Alert>
            <Button
              variant="contained"
              color="success"
              startIcon={initWA.isPending ? <CircularProgress size={16} color="inherit" /> : <WhatsApp />}
              onClick={handleInit}
              disabled={initWA.isPending}
            >
              Reintentar conexión
            </Button>
          </Box>
        )}

        {/* Iniciando Puppeteer/Chromium */}
        {status === 'initializing' && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Iniciando el navegador interno. Este proceso puede tardar entre 30 y 60 segundos la primera vez.
            </Alert>
            <Box display="flex" alignItems="center" gap={2}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                {loadingMessage || 'Iniciando navegador...'}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Cargando WhatsApp Web (post-autenticación) */}
        {status === 'loading' && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              WhatsApp Web está cargando. Ya casi está listo.
            </Alert>
            <Box mb={1}>
              <Typography variant="body2" color="text.secondary" mb={0.5}>
                {loadingMessage || 'Cargando...'}
              </Typography>
              <LinearProgress
                variant={loadingPercent > 0 ? 'determinate' : 'indeterminate'}
                value={loadingPercent}
                color="success"
                sx={{ borderRadius: 1, height: 6 }}
              />
              {loadingPercent > 0 && (
                <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                  {loadingPercent}%
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* QR listo para escanear */}
        {status === 'qr_pending' && (
          <Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Abrí WhatsApp en tu celular → Dispositivos vinculados → Vincular dispositivo → Escanear QR
            </Alert>
            {fetchingQr && <CircularProgress />}
            {qrUrl && (
              <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                <img
                  src={qrUrl}
                  alt="QR WhatsApp"
                  style={{ width: 240, height: 240, border: '1px solid #eee', borderRadius: 8 }}
                />
                <Button
                  size="small"
                  startIcon={<Refresh />}
                  onClick={() => fetchQr().then((r) => r.data?.qr && setQrUrl(r.data.qr))}
                >
                  Actualizar QR
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* Conectado */}
        {status === 'ready' && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              WhatsApp conectado correctamente. Podés enviar recibos desde la página de Recibos o desde cada cobro.
            </Alert>
            <Button
              variant="outlined"
              color="error"
              size="small"
              disabled={disconnectWA.isPending}
              onClick={() => disconnectWA.mutate()}
            >
              Desconectar
            </Button>
          </Box>
        )}

        {/* Botón de forzar reconexión en cualquier estado no-ready */}
        {status !== 'ready' && status !== 'disconnected' && (
          <Box mt={2}>
            <Button
              variant="outlined"
              color="warning"
              size="small"
              disabled={disconnectWA.isPending}
              onClick={async () => {
                await disconnectWA.mutateAsync();
                initWA.mutate();
              }}
            >
              Forzar reconexión
            </Button>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={1}>Cómo funciona</Typography>
        <Typography variant="body2" color="text.secondary" component="ol" sx={{ pl: 2 }}>
          <li>El servidor inicia la conexión automáticamente al arrancar (30–60 seg la primera vez).</li>
          <li>Escaneá el QR con tu celular una sola vez — la sesión queda guardada.</li>
          <li>Al reiniciar el servidor se reconecta solo en pocos segundos, sin necesitar nuevo QR.</li>
          <li>Desde cualquier cobro pagado podés enviar el recibo en PDF adjunto.</li>
        </Typography>
      </Paper>
    </Box>
  );
}
