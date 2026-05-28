import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface Settlement {
  id: number;
  propertyId: number;
  contractId: number;
  periodYear: number;
  periodMonth: number;
  status: 'DRAFT' | 'SENT' | 'PAID';
  rentCollected: number;
  commissionPct: number;
  commissionAmount: number;
  expensesAmount: number;
  netAmount: number;
  currency: string;
  sentAt?: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  property: {
    id: number; street: string; number: string; city: string;
    owners: { owner: { id: number; firstName?: string; lastName?: string; businessName?: string; type: string; cbu?: string; bankName?: string; phone?: string | null; email?: string | null } }[];
  };
  contract: {
    id: number; adminCommissionPct: number; currency: string;
    tenants: { isPrimary: boolean; tenant: { firstName?: string; lastName?: string; businessName?: string; type: string } }[];
  };
}

export interface SettlementsResponse {
  data: Settlement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useSettlements(params?: Record<string, string | number>) {
  return useQuery<SettlementsResponse>({
    queryKey: ['settlements', params],
    queryFn: () => api.get('/settlements', { params }).then((r) => r.data),
  });
}

export function useSettlement(id: number) {
  return useQuery<Settlement>({
    queryKey: ['settlements', id],
    queryFn: () => api.get(`/settlements/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useGenerateSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { contractId: number; year: number; month: number; notes?: string }) =>
      api.post('/settlements/generate', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settlements'] }),
  });
}

export function useMarkSettlementSent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/settlements/${id}/send`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settlements'] }),
  });
}

export function useMarkSettlementPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/settlements/${id}/pay`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settlements'] }),
  });
}

export function useSendSettlementWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, phone }: { id: number; phone: string }) =>
      api.post(`/settlements/${id}/send/whatsapp`, { phone }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settlements'] }),
  });
}

export function useSendSettlementEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, email }: { id: number; email: string }) =>
      api.post(`/settlements/${id}/send/email`, { email }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settlements'] }),
  });
}
