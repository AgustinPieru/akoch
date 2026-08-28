import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, MenuItem, Alert, CircularProgress, Typography,
} from '@mui/material';
import { useOwners } from '@/features/owners/api/useOwners';
import { useGenerateSettlement } from '../api/useSettlements';

interface Props {
  year: number;
  month: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddOwnerToPeriodDialog({ year, month, onClose, onSuccess }: Props) {
  const [ownerId, setOwnerId] = useState<number | ''>('');
  const { data: ownersData } = useOwners({ limit: 200 });
  const generate = useGenerateSettlement();

  const handleSubmit = async () => {
    if (!ownerId) return;
    await generate.mutateAsync({ ownerId: Number(ownerId), year, month });
    onSuccess();
    onClose();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Agregar/recalcular un propietario</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Genera (o recalcula si ya existe y sigue en borrador) la liquidación de un propietario puntual
          para este período, con el detalle de todas sus propiedades.
        </Typography>
        <TextField
          select
          label="Propietario *"
          fullWidth
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value === '' ? '' : Number(e.target.value))}
        >
          {ownersData?.data.map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {o.type === 'PERSONA_JURIDICA' ? o.businessName : [o.firstName, o.lastName].filter(Boolean).join(' ')}
            </MenuItem>
          ))}
        </TextField>
        {generate.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {(generate.error as any)?.response?.data?.error ?? 'Error al generar la liquidación'}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={generate.isPending}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!ownerId || generate.isPending}
          startIcon={generate.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Agregar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
