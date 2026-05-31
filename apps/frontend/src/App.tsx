import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AppRouter from './router';
import type { WhatsAppStatus } from './features/notifications/api/useNotifications';
import { useAuth } from './features/auth/hooks/useAuthContext';
import { BASE_URL } from './lib/axios';

function WhatsAppEventSource() {
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let destroyed = false;
    let retryDelay = 3000;

    function connect() {
      if (destroyed) return;

      const token = localStorage.getItem('access_token');
      if (!token) return;

      const es = new EventSource(`${BASE_URL}/notifications/whatsapp/events?token=${encodeURIComponent(token)}`);
      esRef.current = es;

      es.onmessage = (e) => {
        retryDelay = 3000; // reset backoff on success
        try {
          const data = JSON.parse(e.data) as WhatsAppStatus;
          qc.setQueryData(['whatsapp-status'], data);
        } catch {}
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (!destroyed) {
          retryTimeout.current = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 30000); // backoff hasta 30s
            connect();
          }, retryDelay);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
      esRef.current?.close();
    };
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
