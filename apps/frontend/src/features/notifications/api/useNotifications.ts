import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface WhatsAppStatus {
  status: 'disconnected' | 'initializing' | 'loading' | 'qr_pending' | 'ready';
  hasQr: boolean;
  loadingPercent: number;
  loadingMessage: string;
}

// Solo lee el cache — el SSE en App.tsx lo mantiene actualizado sin polling
export function useWhatsAppStatus() {
  return useQuery<WhatsAppStatus>({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/notifications/whatsapp/status').then((r) => r.data),
    staleTime: Infinity,   // nunca re-fetches por cuenta propia
    refetchOnWindowFocus: false,
    refetchOnMount: false, // si el cache existe, no vuelve a pedir
  });
}

export function useWhatsAppQr() {
  return useQuery<{ qr: string }>({
    queryKey: ['whatsapp-qr'],
    queryFn: () => api.get('/notifications/whatsapp/qr').then((r) => r.data),
    enabled: false,
  });
}

export function useInitWhatsApp() {
  return useMutation({
    mutationFn: () => api.post('/notifications/whatsapp/init').then((r) => r.data),
  });
}

export function useDisconnectWhatsApp() {
  return useMutation({
    mutationFn: () => api.post('/notifications/whatsapp/disconnect').then((r) => r.data),
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
