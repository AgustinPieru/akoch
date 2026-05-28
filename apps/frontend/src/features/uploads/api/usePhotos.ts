import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface PropertyPhoto {
  id: number;
  propertyId: number;
  url: string;
  type: string;
  caption?: string;
  takenAt: string;
  createdAt: string;
}

export function usePropertyPhotos(propertyId: number) {
  return useQuery<PropertyPhoto[]>({
    queryKey: ['property-photos', propertyId],
    queryFn: () => api.get(`/properties/${propertyId}/photos`).then((r) => r.data),
    enabled: !!propertyId,
  });
}

export function useUploadPhoto(propertyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.post(`/properties/${propertyId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['property-photos', propertyId] }),
  });
}

export function useDeletePhoto(propertyId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId: number) =>
      api.delete(`/properties/${propertyId}/photos/${photoId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['property-photos', propertyId] }),
  });
}
