import { useState } from 'react';
import {
  Box, Typography, Button, IconButton, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Accordion, AccordionSummary, AccordionDetails,
  CircularProgress, Alert, Divider,
} from '@mui/material';
import { Add, ExpandMore, Edit, Delete } from '@mui/icons-material';
import DocumentList, { GUARANTOR_FILE_TYPES } from '@/features/uploads/components/DocumentList';
import {
  useGuarantors, useCreateGuarantor, useUpdateGuarantor, useDeleteGuarantor,
  type Guarantor, type GuarantorInput,
} from '../api/useGuarantors';

interface Props {
  contractId: number;
}

const EMPTY_FORM: GuarantorInput = { fullName: '', dni: '', address: '', phone: '', email: '' };

export default function GuarantorsSection({ contractId }: Props) {
  const { data: guarantors, isLoading, isError } = useGuarantors(contractId);
  const createMut = useCreateGuarantor(contractId);
  const updateMut = useUpdateGuarantor(contractId);
  const deleteMut = useDeleteGuarantor(contractId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Guarantor | null>(null);
  const [form, setForm] = useState<GuarantorInput>(EMPTY_FORM);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (g: Guarantor) => {
    setEditing(g);
    setForm({ fullName: g.fullName, dni: g.dni ?? '', address: g.address ?? '', phone: g.phone ?? '', email: g.email ?? '' });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) return;
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, data: form });
    } else {
      await createMut.mutateAsync(form);
    }
    setFormOpen(false);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('¿Eliminar este garante? También se perderá el acceso a sus documentos.')) {
      deleteMut.mutate(id);
    }
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle2" color="text.secondary">Garantes</Typography>
        <Button size="small" startIcon={<Add />} onClick={openNew}>Agregar garante</Button>
      </Box>

      {isLoading && <CircularProgress size={20} />}
      {isError && <Alert severity="error">Error al cargar los garantes.</Alert>}

      {guarantors && guarantors.length === 0 && (
        <Typography variant="body2" color="text.secondary">No hay garantes cargados.</Typography>
      )}

      {guarantors?.map((g) => (
        <Accordion key={g.id} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" justifyContent="space-between" alignItems="center" width="100%" pr={1}>
              <Typography variant="body2" fontWeight={600}>{g.fullName}</Typography>
              <Box display="flex" gap={0.5} onClick={(e) => e.stopPropagation()}>
                <IconButton size="small" onClick={() => openEdit(g)}><Edit fontSize="small" /></IconButton>
                <IconButton size="small" color="error" onClick={() => handleDelete(g.id)}><Delete fontSize="small" /></IconButton>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="flex" flexDirection="column" gap={0.5} mb={2}>
              {g.dni && <Typography variant="body2"><strong>DNI:</strong> {g.dni}</Typography>}
              {g.address && <Typography variant="body2"><strong>Domicilio:</strong> {g.address}</Typography>}
              {g.phone && <Typography variant="body2"><strong>Celular:</strong> {g.phone}</Typography>}
              {g.email && <Typography variant="body2"><strong>Correo:</strong> {g.email}</Typography>}
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Documentos (recibo de sueldo, escritura, monotributo, etc.)
            </Typography>
            <DocumentList entityType="guarantor" entityId={g.id} fileTypeOptions={GUARANTOR_FILE_TYPES} />
          </AccordionDetails>
        </Accordion>
      ))}

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar garante' : 'Nuevo garante'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Nombre completo *"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              autoFocus
              fullWidth
            />
            <TextField label="DNI" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} fullWidth />
            <TextField label="Domicilio" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} fullWidth />
            <TextField label="Celular" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth />
            <TextField label="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.fullName.trim() || saving}>
            {saving ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
