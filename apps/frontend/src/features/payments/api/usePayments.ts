import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface Payment {
  id: number;
  contractId: number;
  periodYear: number;
  periodMonth: number;
  expectedAmount: number;
  paidAmount?: number;
  status: 'PENDING' | 'PAID' | 'LATE' | 'PARTIAL';
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  notes?: string;
  interestAmount?: number;
  interestRate?: number;
  interestDays?: number;
  createdAt: string;
  contract: {
    id: number;
    currentAmount: number;
    currency: string;
    property: { street: string; number: string; city: string };
    tenants: { isPrimary: boolean; tenant: { firstName?: string; lastName?: string; businessName?: string; type: string; phone?: string | null; email?: string | null } }[];
  };
}

export interface PaymentsResponse {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function usePayments(params?: Record<string, string | number>) {
  return useQuery<PaymentsResponse>({
    queryKey: ['payments', params],
    queryFn: () => api.get('/payments', { params }).then((r) => r.data),
  });
}

export function usePayment(id: number) {
  return useQuery<Payment>({
    queryKey: ['payments', id],
    queryFn: () => api.get(`/payments/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useGeneratePayments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: number) =>
      api.post(`/payments/contract/${contractId}/generate`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}

export function useRegisterPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.post(`/payments/${id}/register`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useMarkPaymentLate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/payments/${id}/late`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}
