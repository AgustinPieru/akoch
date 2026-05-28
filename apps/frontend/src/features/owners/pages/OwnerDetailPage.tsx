import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Typography, Grid, Chip,
  CircularProgress, Alert, Divider, List, ListItem, ListItemText,
} from '@mui/material';
import { ArrowBack, Edit } from '@mui/icons-material';
import { useForm, FormProvider } from 'react-hook-form';
import { useOwner, useUpdateOwner, Owner } from '../api/useOwners';
import OwnerForm from '../components/OwnerForm';
import DocumentList from '@/features/uploads/components/DocumentList';
import { ROUTES } from '@/router/routes';

const TAX_STATUS_LABELS: Record<string, string> = {
  MONOTRIBUTISTA: 'Monotributista',
  RESPONSABLE_INSCRIPTO: 'Responsable inscripto',
  EXENTO: 'Exento',
  CONSUMIDOR_FINAL: 'Consumidor final',
};

const STATUS_MAP: Record<string, { label: string; color: 'success' | 'default' | 'error' }> = {
  ACTIVE: { label: 'Activo', color: 'success' },
  INACTIVE: { label: 'Inactivo', color: 'default' },
  BLOCKED: { label: 'Bloqueado', color: 'error' },
};

const PROP_STATUS_MAP: Record<string, string> = {
  AVAILABLE: 'Disponible', RENTED: 'Alquilada', FOR_SALE: 'En venta',
  SOLD: 'Vendida', UNDER_RENOVATION: 'En refacción', BLOCKED: 'Bloqueada',
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box py={0.75}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Box>
  );
}

function OwnerEditForm({ owner, onSave, onCancel, isPending }: {
  owner: Owner;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
}) {
  const methods = useForm({ defaultValues: { ...owner } });
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<ArrowBack />} onClick={onCancel} variant="text">Cancelar</Button>
        <Typography variant="h5">Editar propietario</Typography>
      </Box>
      <FormProvider {...methods}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <OwnerForm />
            <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
              <Button onClick={onCancel} disabled={isPending}>Cancelar</Button>
              <Button variant="contained" onClick={methods.handleSubmit(onSave)} disabled={isPending}>
                {isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </FormProvider>
    </Box>
  );
}

export default function OwnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ownerId = parseInt(id!);
  const { data: owner, isLoading, error } = useOwner(ownerId);
  const { mutateAsync: updateOwner, isPending } = useUpdateOwner(ownerId);
  const [editing, setEditing] = useState(false);

  if (isLoading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;
  if (error || !owner) return <Alert severity="error">Propietario no encontrado</Alert>;

  const displayName = owner.type === 'PERSONA_JURIDICA'
    ? owner.businessName
    : [owner.firstName, owner.lastName].filter(Boolean).join(' ');

  const handleSave = async (data: Record<string, unknown>) => {
    await updateOwner(data as any);
    setEditing(false);
  };

  if (editing) {
    return (
      <OwnerEditForm
        owner={owner}
        onSave={handleSave}
        onCancel={() => setEditing(false)}
        isPending={isPending}
      />
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate(ROUTES.OWNERS)} variant="text">
            Propietarios
          </Button>
          <Typography variant="h5">{displayName || 'Sin nombre'}</Typography>
          <Chip label={STATUS_MAP[owner.status]?.label} color={STATUS_MAP[owner.status]?.color} size="small" />
        </Box>
        <Button startIcon={<Edit />} variant="outlined" onClick={() => setEditing(true)}>Editar</Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Datos personales y fiscales</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={0} columns={12}>
                <Grid item xs={12} sm={6}>
                  <InfoRow label="Tipo" value={owner.type === 'PERSONA_JURIDICA' ? 'Persona jurídica' : 'Persona física'} />
                  <InfoRow label="CUIT / CUIL" value={owner.cuit} />
                  <InfoRow label="Condición impositiva" value={TAX_STATUS_LABELS[owner.taxStatus] || owner.taxStatus} />
                  <InfoRow label="Domicilio" value={owner.address} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoRow label="Email principal" value={owner.email} />
                  <InfoRow label="Email alternativo" value={owner.email2} />
                  <InfoRow label="Teléfono principal" value={owner.phone} />
                  <InfoRow label="Teléfono alternativo" value={owner.phone2} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Datos bancarios</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container>
                <Grid item xs={12} sm={6}>
                  <InfoRow label="CBU / Alias" value={owner.cbu} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoRow label="Banco" value={owner.bankName} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Propiedades ({owner.properties.length})</Typography>
              <Divider sx={{ mb: 1 }} />
              <List disablePadding>
                {owner.properties.map(({ property }) => (
                  <ListItem
                    key={property.id}
                    disablePadding
                    sx={{ py: 0.5, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                    onClick={() => navigate(ROUTES.PROPERTY_DETAIL(property.id))}
                  >
                    <ListItemText
                      primary={`${property.street} ${property.number}`}
                      secondary={property.city}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <Chip label={PROP_STATUS_MAP[property.status] || property.status} size="small" variant="outlined" />
                  </ListItem>
                ))}
                {owner.properties.length === 0 && (
                  <Typography variant="body2" color="text.secondary" py={1}>Sin propiedades vinculadas</Typography>
                )}
              </List>
            </CardContent>
          </Card>

          {owner.notes && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Notas</Typography>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary">{owner.notes}</Typography>
              </CardContent>
            </Card>
          )}

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Documentos</Typography>
              <Divider sx={{ mb: 2 }} />
              <DocumentList entityType="owner" entityId={ownerId} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
