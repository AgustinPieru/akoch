import {
  Box, Typography, List, ListItem, ListItemIcon, ListItemText,
  IconButton, Chip, Tooltip, CircularProgress, Alert,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import type { EntityType } from '../api/useDocuments';
import { useDocuments, useDeleteDocument, useUploadDocument } from '../api/useDocuments';
import FileUploadZone from './FileUploadZone';

export const FILE_TYPES = [
  { value: 'dni', label: 'DNI' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'escritura', label: 'Escritura de propiedad' },
  { value: 'garantia', label: 'Garantía' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'recibo_sueldo', label: 'Recibo de sueldo' },
  { value: 'monotributo', label: 'Monotributo' },
  { value: 'otro', label: 'Otro' },
];

export const GUARANTOR_FILE_TYPES = [
  { value: 'escritura', label: 'Escritura de propiedad' },
  { value: 'monotributo', label: 'Monotributo' },
  { value: 'recibo_sueldo', label: 'Recibo de sueldo' },
];

function fileIcon(mimeType?: string) {
  if (mimeType?.startsWith('image/')) return <ImageIcon />;
  if (mimeType === 'application/pdf') return <PdfIcon color="error" />;
  return <DocIcon />;
}

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const API_BASE = '';

interface Props {
  entityType: EntityType;
  entityId: number;
  fileTypeOptions?: { value: string; label: string }[];
}

export default function DocumentList({ entityType, entityId, fileTypeOptions = FILE_TYPES }: Props) {
  const { data: docs, isLoading, error } = useDocuments(entityType, entityId);
  const upload = useUploadDocument(entityType, entityId);
  const deleteMut = useDeleteDocument(entityType, entityId);

  async function handleUpload(file: File, meta: { name: string; fileType: string }) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', meta.name);
    fd.append('fileType', meta.fileType);
    await upload.mutateAsync(fd);
  }

  return (
    <Box>
      <FileUploadZone
        onUpload={handleUpload}
        accept=".pdf,.doc,.docx,image/*"
        label="Subir documento"
        fileTypeOptions={fileTypeOptions}
      />

      {isLoading && <CircularProgress size={20} sx={{ mt: 2 }} />}
      {error && <Alert severity="error" sx={{ mt: 1 }}>Error al cargar documentos</Alert>}

      {docs && docs.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No hay documentos cargados
        </Typography>
      )}

      {docs && docs.length > 0 && (
        <List dense sx={{ mt: 1 }}>
          {docs.map((doc) => (
            <ListItem
              key={doc.id}
              secondaryAction={
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Abrir">
                    <IconButton
                      size="small"
                      component="a"
                      href={`${API_BASE}${doc.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <OpenIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => deleteMut.mutate(doc.id)}
                      disabled={deleteMut.isPending}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
              sx={{ borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{fileIcon(doc.mimeType)}</ListItemIcon>
              <ListItemText
                primary={doc.name}
                secondary={
                  <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                    <Chip label={doc.fileType} size="small" />
                    <Typography variant="caption" color="text.secondary">
                      {formatBytes(doc.sizeBytes)}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
