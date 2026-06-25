import { useRef, useState, DragEvent } from 'react';
import { Box, Button, Typography, LinearProgress, Alert } from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';

interface Props {
  onUpload: (file: File, meta: { name: string; fileType: string; notes?: string }) => Promise<void>;
  accept?: string;
  label?: string;
  fileTypeOptions?: { value: string; label: string }[];
}

export default function FileUploadZone({
  onUpload,
  accept = 'image/*,application/pdf,.doc,.docx',
  label = 'Subir archivo',
  fileTypeOptions,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      await onUpload(file, { name: file.name, fileType: fileTypeOptions?.[0]?.value ?? 'otro' });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <Box>
      <Box
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        sx={{
          border: '2px dashed',
          borderColor: dragging ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: dragging ? 'action.hover' : 'transparent',
          transition: 'all 0.2s',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Arrastrá un archivo o hacé clic para seleccionar
        </Typography>
        <Typography variant="caption" color="text.disabled">
          PDF, Word, imágenes — máx. 10 MB
        </Typography>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
      </Box>
      {uploading && <LinearProgress sx={{ mt: 1 }} />}
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      <Button
        size="small"
        variant="outlined"
        startIcon={<CloudUploadIcon />}
        onClick={() => inputRef.current?.click()}
        sx={{ mt: 1 }}
        disabled={uploading}
      >
        {label}
      </Button>
    </Box>
  );
}
