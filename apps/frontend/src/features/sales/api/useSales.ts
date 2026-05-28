import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export type SaleStage = 'PROSPECTING' | 'VISIT_SCHEDULED' | 'OFFER_MADE' | 'NEGOTIATING' | 'SIGNED' | 'CLOSED' | 'CANCELLED';

export interface Sale {
  id: number;
  propertyId: number;
  askingPrice: number;
  currency: string;
  stage: SaleStage;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  offerAmount?: number;
  closingDate?: string;
  commissionPct: number;
  commissionAmount?: number;
  notes?: string;
  createdAt: string;
  property: {
    id: number;
    street: string;
    number: string;
    city: string;
    type: string;
    coveredSurface?: number;
    owners: Array<{
      owner: { id: number; firstName?: string; lastName?: string; businessName?: string; type: string };
    }>;
  };
}

export interface SalesResponse {
  data: Sale[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SaleInput {
  propertyId: number;
  askingPrice: number;
  currency?: string;
  stage?: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  offerAmount?: number;
  closingDate?: string;
  commissionPct?: number;
  notes?: string;
}

export function useSales(params?: { stage?: SaleStage; search?: string; page?: number; limit?: number }) {
  return useQuery<SalesResponse>({
    queryKey: ['sales', params],
    queryFn: async () => {
      const { data } = await api.get('/sales', { params });
      return data;
    },
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaleInput) => api.post('/sales', input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  });
}

export function useUpdateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<SaleInput> & { id: number }) =>
      api.patch(`/sales/${id}`, input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/sales/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  });
}
