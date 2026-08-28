import { useRef } from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import { CloudUpload, Image as ImageIcon, Videocam } from '@mui/icons-material';

export interface StagedMedia {
  file: File;
}

interface Props {
  files: StagedMedia[];
  onChange: (files: StagedMedia[]) => void;
}

export default function PropertyMediaStaging({ files, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    onChange([...files, ...Array.from(selected).map((file) => ({ file }))]);
  };

  const handleRemove = (i: number) => {
    onChange(files.filter((_, idx) => idx !== i));
  };

  return (
    <Box mt={3}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Fotos y videos de la propiedad
      </Typography>
      <Button
        size="small"
        variant="outlined"
        startIcon={<CloudUpload />}
        onClick={() => inputRef.current?.click()}
      >
        Agregar fotos o videos
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime,video/webm"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => { handleFilesSelected(e.target.files); e.target.value = ''; }}
      />

      {files.length > 0 && (
        <Box display="flex" gap={1} flexWrap="wrap" mt={1.5}>
          {files.map((sf, i) => (
            <Chip
              key={i}
              icon={sf.file.type.startsWith('video/') ? <Videocam fontSize="small" /> : <ImageIcon fontSize="small" />}
              label={sf.file.name}
              onDelete={() => handleRemove(i)}
              size="small"
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
