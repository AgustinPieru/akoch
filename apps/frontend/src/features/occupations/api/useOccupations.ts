import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface OccupationProperty {
  id: number; street: string; number: string; floor?: string; apartment?: string; city: string; status: string;
  owners: { owner: { id: number; firstName?: string; lastName?: string; businessName?: string; type: string } }[];
}

export interface OccupationTenant {
  id: number; firstName?: string; lastName?: string; businessName?: string; type: string; phone?: string; email?: string;
}

export interface Occupation {
  id: number;
  propertyId: number;
  occupantName: string;
  occupantPhone?: string;
  occupantTenantId?: number;
  startDate: string;
  reason: string;
  informalAmount?: number;
  currency: string;
  status: string;
  endDate?: string;
  convertedToContractId?: number;
  alertActive: boolean;
  notes?: string;
  createdAt: string;
  property: OccupationProperty;
  occupantTenant?: OccupationTenant;
  convertedToContract?: { id: number; status: string; startDate: string; endDate: string };
}

export interface OccupationsResponse {
  data: Occupation[];
  total: number;
  page: number;
  limit: number;
}

export interface OccupationFilters {
  status?: string;
  propertyId?: number;
  page?: number;
  limit?: number;
}

export function useOccupations(filters: OccupationFilters = {}) {
  return useQuery<OccupationsResponse>({
    queryKey: ['occupations', filters],
    queryFn: () => api.get('/ocupaciones', { params: filters }).then((r) => r.data),
  });
}

export function useOccupation(id: number) {
  return useQuery<Occupation>({
    queryKey: ['occupation', id],
    queryFn: () => api.get(`/ocupaciones/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateOccupation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Occupation>) => api.post('/ocupaciones', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['occupations'] }),
  });
}

export function useUpdateOccupation(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Occupation>) => api.patch(`/ocupaciones/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['occupations'] });
      qc.invalidateQueries({ queryKey: ['occupation', id] });
    },
  });
}

export function useCloseOccupation(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { status: 'VACATED' | 'REGULARIZED'; endDate?: string }) =>
      api.post(`/ocupaciones/${id}/close`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['occupations'] });
      qc.invalidateQueries({ queryKey: ['occupation', id] });
      qc.invalidateQueries({ queryKey: ['dashboard-alerts'] });
    },
  });
}

export function useConvertOccupation(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: number) =>
      api.post(`/ocupaciones/${id}/convert`, { contractId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['occupations'] });
      qc.invalidateQueries({ queryKey: ['occupation', id] });
      qc.invalidateQueries({ queryKey: ['dashboard-alerts'] });
    },
  });
}
