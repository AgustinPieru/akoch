import { useRef, useState } from 'react';
import {
  Box, Typography, Button, TextField, IconButton, Paper, Chip, MenuItem,
} from '@mui/material';
import { Add, Delete, Edit, AttachFile, InsertDriveFile } from '@mui/icons-material';
import type { GuarantorInput } from '../../api/useGuarantors';
import { GUARANTOR_FILE_TYPES as FILE_TYPES } from '@/features/uploads/components/DocumentList';

export interface StagedFile {
  file: File;
  fileType: string;
}

export interface WizardGuarantor extends GuarantorInput {
  files: StagedFile[];
}

interface Props {
  value: WizardGuarantor[];
  onChange: (guarantors: WizardGuarantor[]) => void;
}

const EMPTY_FORM: GuarantorInput = { fullName: '', dni: '', address: '', phone: '', email: '' };

export default function Step3Guarantors({ value, onChange }: Props) {
  const [form, setForm] = useState<GuarantorInput>(EMPTY_FORM);
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [fileType, setFileType] = useState(FILE_TYPES[0].value);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!form.fullName.trim()) return;
    const entry: WizardGuarantor = { ...form, files };
    if (editingIndex !== null) {
      const next = [...value];
      next[editingIndex] = entry;
      onChange(next);
      setEditingIndex(null);
    } else {
      onChange([...value, entry]);
    }
    setForm(EMPTY_FORM);
    setFiles([]);
    setFileType(FILE_TYPES[0].value);
  };

  const handleEdit = (i: number) => {
    const { files: existingFiles, ...rest } = value[i];
    setForm(rest);
    setFiles(existingFiles);
    setEditingIndex(i);
  };

  const handleRemove = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
    if (editingIndex === i) {
      setEditingIndex(null);
      setForm(EMPTY_FORM);
      setFiles([]);
    }
  };

  const handleFilesSelected = (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const staged = Array.from(selected).map((file) => ({ file, fileType }));
    setFiles((prev) => [...prev, ...staged]);
  };

  const handleRemoveFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Garantes</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Opcional. Podés agregar uno o más garantes y adjuntar sus documentos (recibo de sueldo, escritura,
        monotributo, etc.) ahora mismo — se cargarán apenas se guarde el contrato. También podés hacerlo
        más adelante desde el detalle.
      </Typography>

      {value.length > 0 && (
        <Box mb={3} display="flex" flexDirection="column" gap={1}>
          {value.map((g, i) => (
            <Paper
              key={i}
              variant="outlined"
              sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>{g.fullName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {[g.dni, g.phone, g.email].filter(Boolean).join(' · ')}
                </Typography>
                {g.files.length > 0 && (
                  <Chip
                    size="small"
                    icon={<InsertDriveFile fontSize="small" />}
                    label={`${g.files.length} documento${g.files.length > 1 ? 's' : ''}`}
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
              <Box>
                <IconButton size="small" onClick={() => handleEdit(i)}><Edit fontSize="small" /></IconButton>
                <IconButton size="small" color="error" onClick={() => handleRemove(i)}><Delete fontSize="small" /></IconButton>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          {editingIndex !== null ? 'Editar garante' : 'Nuevo garante'}
        </Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Nombre completo *"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            fullWidth
            size="small"
          />
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              label="DNI"
              value={form.dni}
              onChange={(e) => setForm({ ...form, dni: e.target.value })}
              size="small"
              sx={{ flex: 1, minWidth: 150 }}
            />
            <TextField
              label="Celular"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              size="small"
              sx={{ flex: 1, minWidth: 150 }}
            />
          </Box>
          <TextField
            label="Domicilio"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label="Correo"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            fullWidth
            size="small"
          />

          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Documentos del garante
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
              <TextField
                select
                size="small"
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                {FILE_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AttachFile />}
                onClick={() => fileInputRef.current?.click()}
              >
                Adjuntar archivo o imagen
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.doc,.docx"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => { handleFilesSelected(e.target.files); e.target.value = ''; }}
              />
            </Box>

            {files.length > 0 && (
              <Box display="flex" gap={1} flexWrap="wrap" mt={1.5}>
                {files.map((sf, i) => (
                  <Chip
                    key={i}
                    icon={<InsertDriveFile fontSize="small" />}
                    label={`${sf.file.name} (${FILE_TYPES.find((t) => t.value === sf.fileType)?.label ?? sf.fileType})`}
                    onDelete={() => handleRemoveFile(i)}
                    size="small"
                  />
                ))}
              </Box>
            )}
          </Box>

          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={handleAdd}
            disabled={!form.fullName.trim()}
            sx={{ alignSelf: 'flex-start' }}
          >
            {editingIndex !== null ? 'Guardar cambios' : 'Agregar garante'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
