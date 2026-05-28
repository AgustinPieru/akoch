import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface Owner {
  id: number;
  type: 'PERSONA_FISICA' | 'PERSONA_JURIDICA';
  firstName?: string;
  lastName?: string;
  businessName?: string;
  cuit: string;
  taxStatus: string;
  address?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  email2?: string;
  cbu?: string;
  bankName?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  createdAt: string;
  properties: { property: { id: number; street: string; number: string; city: string; status: string } }[];
}

export interface OwnersResponse {
  data: Owner[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useOwners(params?: Record<string, string | number>) {
  return useQuery<OwnersResponse>({
    queryKey: ['owners', params],
    queryFn: () => api.get('/owners', { params }).then((r) => r.data),
  });
}

export function useOwner(id: number) {
  return useQuery<Owner>({
    queryKey: ['owners', id],
    queryFn: () => api.get(`/owners/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Owner>) => api.post('/owners', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owners'] }),
  });
}

export function useUpdateOwner(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Owner>) => api.patch(`/owners/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owners'] });
      qc.invalidateQueries({ queryKey: ['owners', id] });
    },
  });
}

export function useDeleteOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/owners/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owners'] }),
  });
}
