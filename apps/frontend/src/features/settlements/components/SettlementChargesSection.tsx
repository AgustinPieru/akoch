import { useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, MenuItem, Button, IconButton, Chip, Tooltip, Alert,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import {
  Settlement, ChargeCategory, ChargePaidBy, useAddCharge, useDeleteCharge,
} from '../api/useSettlements';

const CATEGORY_OPTIONS: { value: ChargeCategory; label: string }[] = [
  { value: 'IMPUESTO', label: 'Impuesto' },
  { value: 'SERVICIO', label: 'Servicio' },
  { value: 'TASA', label: 'Tasa' },
  { value: 'OTRO', label: 'Otro' },
];

const CATEGORY_COLOR: Record<ChargeCategory, 'warning' | 'info' | 'secondary' | 'default'> = {
  IMPUESTO: 'warning', SERVICIO: 'info', TASA: 'secondary', OTRO: 'default',
};

const PAID_BY_OPTIONS: { value: ChargePaidBy; label: string }[] = [
  { value: 'AGENCY', label: 'Inmobiliaria' },
  { value: 'OWNER', label: 'Propietario' },
  { value: 'TENANT', label: 'Inquilino' },
];

const PAID_BY_LABELS: Record<ChargePaidBy, { label: string; color: 'warning' | 'info' | 'success' | 'default' }> = {
  AGENCY: { label: 'Inmobiliaria', color: 'warning' },
  OWNER: { label: 'Propietario', color: 'info' },
  TENANT: { label: 'Inquilino', color: 'success' },
  SHARED: { label: 'Compartido', color: 'default' },
  N_A: { label: 'No aplica', color: 'default' },
};

interface Props {
  settlement: Settlement;
}

export default function SettlementChargesSection({ settlement }: Props) {
  const editable = settlement.status !== 'PAID';
  const [category, setCategory] = useState<ChargeCategory>('IMPUESTO');
  const [paidBy, setPaidBy] = useState<ChargePaidBy>('AGENCY');
  const [propertyId, setPropertyId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const addCharge = useAddCharge(settlement.id);
  const deleteCharge = useDeleteCharge();

  const formatMoney = (n: number) =>
    settlement.currency === 'USD'
      ? `USD ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      : `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  const handleAdd = async () => {
    if (!description.trim() || !amount || Number(amount) <= 0) return;
    await addCharge.mutateAsync({
      category,
      description: description.trim(),
      amount: Number(amount),
      propertyId: propertyId || undefined,
      paidBy,
    });
    setDescription('');
    setAmount('');
  };

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Impuestos, servicios, tasas y otros cargos
      </Typography>

      {settlement.charges.length > 0 && (
        <TableContainer sx={{ mb: editable ? 2 : 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600 } }}>
              <TableCell>Categoría</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Propiedad</TableCell>
              <TableCell>Paga</TableCell>
              <TableCell align="right">Monto</TableCell>
              {editable && <TableCell align="center">Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {settlement.charges.map((c) => {
              const prop = settlement.properties.find((p) => p.propertyId === c.propertyId)?.property;
              const payer = PAID_BY_LABELS[c.paidBy] ?? PAID_BY_LABELS.AGENCY;
              const deducts = c.paidBy !== 'OWNER';
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Chip label={CATEGORY_OPTIONS.find((o) => o.value === c.category)?.label ?? c.category} color={CATEGORY_COLOR[c.category]} size="small" />
                  </TableCell>
                  <TableCell>{c.description}</TableCell>
                  <TableCell>{prop ? `${prop.street} ${prop.number}` : '—'}</TableCell>
                  <TableCell>
                    <Tooltip title={deducts ? 'Se descuenta del neto a transferir' : 'A cargo del propietario — no se descuenta'}>
                      <Chip label={payer.label} color={payer.color} size="small" variant={deducts ? 'filled' : 'outlined'} />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right" sx={{ color: deducts ? 'error.main' : 'text.disabled' }}>
                    {deducts ? '-' : ''}{formatMoney(c.amount)}
                  </TableCell>
                  {editable && (
                    <TableCell align="center">
                      <IconButton size="small" color="error" onClick={() => deleteCharge.mutate(c.id)} disabled={deleteCharge.isPending}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </TableContainer>
      )}

      {settlement.charges.length === 0 && (
        <Typography variant="body2" color="text.secondary" mb={editable ? 2 : 0}>
          Sin cargos adicionales cargados.
        </Typography>
      )}

      {editable && (
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="flex-start">
          <TextField select size="small" label="Categoría" value={category} onChange={(e) => setCategory(e.target.value as ChargeCategory)} sx={{ minWidth: 130 }}>
            {CATEGORY_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Paga" value={paidBy} onChange={(e) => setPaidBy(e.target.value as ChargePaidBy)} sx={{ minWidth: 150 }}>
            {PAID_BY_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          {settlement.properties.length > 1 && (
            <TextField
              select size="small" label="Propiedad" value={propertyId}
              onChange={(e) => setPropertyId(e.target.value === '' ? '' : Number(e.target.value))}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">General</MenuItem>
              {settlement.properties.map((p) => (
                <MenuItem key={p.propertyId} value={p.propertyId}>{p.property.street} {p.property.number}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            size="small" label="Descripción" value={description}
            onChange={(e) => setDescription(e.target.value)} sx={{ flex: 1, minWidth: 180 }}
          />
          <TextField
            size="small" label="Monto" type="number" value={amount}
            onChange={(e) => setAmount(e.target.value)} sx={{ width: 130 }}
            inputProps={{ min: 0, step: '0.01' }}
          />
          <Button
            variant="outlined" startIcon={<Add />} onClick={handleAdd}
            disabled={addCharge.isPending || !description.trim() || !amount}
          >
            Agregar
          </Button>
        </Box>
      )}

      {(addCharge.isError || deleteCharge.isError) && (
        <Alert severity="error" sx={{ mt: 1 }}>Error al guardar el cargo.</Alert>
      )}
    </Box>
  );
}
