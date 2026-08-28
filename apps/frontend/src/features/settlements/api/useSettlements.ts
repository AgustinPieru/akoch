import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface SettlementProperty {
  id: number;
  propertyId: number;
  contractId?: number | null;
  sharePercentage: number;
  rentCollected: number;
  commissionPct: number;
  commissionAmount: number;
  expensesAmount: number;
  subtotal: number;
  property: { id: number; street: string; number: string; city: string };
}

export type ChargeCategory = 'IMPUESTO' | 'SERVICIO' | 'TASA' | 'OTRO';
export type ChargePaidBy = 'AGENCY' | 'OWNER' | 'TENANT' | 'SHARED' | 'N_A';

export interface SettlementCharge {
  id: number;
  propertyId?: number | null;
  category: ChargeCategory;
  description: string;
  amount: number;
  paidBy: ChargePaidBy;
}

export interface Settlement {
  id: number;
  ownerId: number;
  periodYear: number;
  periodMonth: number;
  status: 'DRAFT' | 'SENT' | 'PAID';
  currency: string;
  totalRent: number;
  totalCommission: number;
  totalExpenses: number;
  totalCharges: number;
  netAmount: number;
  notes?: string;
  sentAt?: string;
  paidAt?: string;
  createdAt: string;
  owner: {
    id: number; firstName?: string; lastName?: string; businessName?: string; type: string;
    cbu?: string; bankName?: string; phone?: string | null; email?: string | null;
  };
  properties: SettlementProperty[];
  charges: SettlementCharge[];
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
    mutationFn: (data: { ownerId: number; year: number; month: number; notes?: string }) =>
      api.post('/settlements/generate', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settlements'] }),
  });
}

export interface GenerateAllResult {
  settlements: Settlement[];
  lockedOwnerIds: number[];
}

export function useGenerateAllSettlements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { year: number; month: number }) =>
      api.post<GenerateAllResult>('/settlements/generate-all', data).then((r) => r.data),
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

// ─── Cargos ad-hoc (impuestos, servicios, tasas, otros) ───────────────────────

export interface ChargeInput {
  propertyId?: number;
  category: ChargeCategory;
  description: string;
  amount: number;
  paidBy?: ChargePaidBy;
}

export function useAddCharge(settlementId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ChargeInput) => api.post(`/settlements/${settlementId}/charges`, data).then((r) => r.data),
    // Invalida también el listado por período (usado en la revisión masiva), no solo esta liquidación puntual.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settlements'] }),
  });
}

export function useUpdateCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chargeId, data }: { chargeId: number; data: Partial<ChargeInput> }) =>
      api.patch(`/settlements/charges/${chargeId}`, data).then((r) => r.data),
    // Invalida también el listado por período (usado en la revisión masiva), no solo esta liquidación puntual.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settlements'] }),
  });
}

export function useDeleteCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chargeId: number) => api.delete(`/settlements/charges/${chargeId}`).then((r) => r.data),
    // Invalida también el listado por período (usado en la revisión masiva), no solo esta liquidación puntual.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settlements'] }),
  });
}
