import { useState } from 'react';
import {
  Box, Typography, ImageList, ImageListItem, ImageListItemBar,
  IconButton, Chip, Dialog, DialogContent, CircularProgress, Alert, Tooltip,
} from '@mui/material';
import { Delete as DeleteIcon, ZoomIn as ZoomIcon } from '@mui/icons-material';
import { usePropertyPhotos, useUploadPhoto, useDeletePhoto } from '../api/usePhotos';
import FileUploadZone from './FileUploadZone';

const PHOTO_TYPES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'ENTRY', label: 'Entrada' },
  { value: 'EXIT', label: 'Salida' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'REPAIR', label: 'Reparación' },
  { value: 'DOCUMENT', label: 'Documento' },
];

const API_BASE = '';

interface Props {
  propertyId: number;
}

export default function PhotoGallery({ propertyId }: Props) {
  const { data: photos, isLoading, error } = usePropertyPhotos(propertyId);
  const upload = useUploadPhoto(propertyId);
  const deleteMut = useDeletePhoto(propertyId);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function handleUpload(file: File, meta: { name: string; fileType: string }) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', meta.fileType);
    fd.append('caption', meta.name);
    await upload.mutateAsync(fd);
  }

  return (
    <Box>
      <FileUploadZone
        onUpload={handleUpload}
        accept="image/*"
        label="Subir foto"
        fileTypeOptions={PHOTO_TYPES}
      />

      {isLoading && <CircularProgress size={20} sx={{ mt: 2 }} />}
      {error && <Alert severity="error" sx={{ mt: 1 }}>Error al cargar fotos</Alert>}

      {photos && photos.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No hay fotos cargadas
        </Typography>
      )}

      {photos && photos.length > 0 && (
        <ImageList cols={3} rowHeight={160} sx={{ mt: 1 }}>
          {photos.map((photo) => {
            const src = `${API_BASE}${photo.url}`;
            return (
              <ImageListItem key={photo.id}>
                <img
                  src={src}
                  alt={photo.caption ?? photo.type}
                  loading="lazy"
                  style={{ height: 160, objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => setLightbox(src)}
                />
                <ImageListItemBar
                  title={
                    <Chip
                      label={PHOTO_TYPES.find((t) => t.value === photo.type)?.label ?? photo.type}
                      size="small"
                      sx={{ fontSize: 10, height: 18 }}
                    />
                  }
                  actionIcon={
                    <Box sx={{ display: 'flex' }}>
                      <Tooltip title="Ver">
                        <IconButton size="small" sx={{ color: 'white' }} onClick={() => setLightbox(src)}>
                          <ZoomIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          sx={{ color: 'white' }}
                          onClick={() => deleteMut.mutate(photo.id)}
                          disabled={deleteMut.isPending}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                />
              </ImageListItem>
            );
          })}
        </ImageList>
      )}

      <Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="lg">
        <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
          {lightbox && (
            <img
              src={lightbox}
              alt="Foto ampliada"
              style={{ maxWidth: '90vw', maxHeight: '85vh', display: 'block' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
