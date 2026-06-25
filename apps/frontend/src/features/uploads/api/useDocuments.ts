import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export type EntityType = 'owner' | 'tenant' | 'property' | 'contract' | 'guarantor';

export interface Document {
  id: number;
  entityType: string;
  entityId: number;
  name: string;
  fileType: string;
  url: string;
  sizeBytes?: number;
  mimeType?: string;
  notes?: string;
  createdAt: string;
}

export function useDocuments(entityType: EntityType, entityId: number) {
  return useQuery<Document[]>({
    queryKey: ['documents', entityType, entityId],
    queryFn: () => api.get(`/documents/${entityType}/${entityId}`).then((r) => r.data),
    enabled: !!entityId,
  });
}

export function useUploadDocument(entityType: EntityType, entityId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.post(`/documents/${entityType}/${entityId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', entityType, entityId] }),
  });
}

export function useDeleteDocument(entityType: EntityType, entityId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/documents/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', entityType, entityId] }),
  });
}
