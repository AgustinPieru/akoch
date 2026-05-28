import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AppRouter from './router';
import type { WhatsAppStatus } from './features/notifications/api/useNotifications';
import { useAuth } from './features/auth/hooks/useAuthContext';

function WhatsAppEventSource() {
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const es = new EventSource(`/api/v1/notifications/whatsapp/events?token=${encodeURIComponent(token)}`);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as WhatsAppStatus;
        qc.setQueryData(['whatsapp-status'], data);
      } catch {}
    };

    es.onerror = () => { es.close(); };

    return () => { es.close(); };
  }, [qc, isAuthenticated]);

  return null;
}

export default function App() {
  return (
    <>
      <WhatsAppEventSource />
      <AppRouter />
    </>
  );
}
