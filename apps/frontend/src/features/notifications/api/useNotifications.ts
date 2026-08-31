import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface WhatsAppStatus {
  status: 'disconnected' | 'initializing' | 'loading' | 'qr_pending' | 'ready';
  hasQr: boolean;
  loadingPercent: number;
  loadingMessage: string;
}

const TRANSITIONAL = new Set(['initializing', 'loading', 'qr_pending']);

export function useWhatsAppStatus() {
  const { data } = useQuery<WhatsAppStatus>({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/notifications/whatsapp/status').then((r) => r.data),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    // Polling de respaldo cuando está en transición (SSE puede caerse)
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TRANSITIONAL.has(status) ? 4000 : false;
    },
  });
  return { data };
}

export function useWhatsAppQr() {
  return useQuery<{ qr: string }>({
    queryKey: ['whatsapp-qr'],
    queryFn: () => api.get('/notifications/whatsapp/qr').then((r) => r.data),
    enabled: false,
  });
}

export function useInitWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/notifications/whatsapp/init').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });
}

export function useDisconnectWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/notifications/whatsapp/disconnect').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });
}

export function useResetWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/notifications/whatsapp/reset').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });
}

export function useSendReceiptWhatsApp() {
  return useMutation({
    mutationFn: ({ paymentId, phone }: { paymentId: number; phone: string }) =>
      api.post('/notifications/send/whatsapp', { paymentId, phone }).then((r) => r.data),
  });
}

export function useSendReceiptEmail() {
  return useMutation({
    mutationFn: ({ paymentId, email }: { paymentId: number; email: string }) =>
      api.post('/notifications/send/email', { paymentId, email }).then((r) => r.data),
  });
}
