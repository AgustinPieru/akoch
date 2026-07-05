import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Typography, Grid, Chip,
  CircularProgress, Alert, Divider, List, ListItem, LinearProgress,
} from '@mui/material';
import { ArrowBack, Edit } from '@mui/icons-material';
import { useForm, FormProvider } from 'react-hook-form';
import { useProperty, useUpdateProperty, Property } from '../api/useProperties';
import PropertyForm from '../components/PropertyForm';
import DocumentList from '@/features/uploads/components/DocumentList';
import PhotoGallery from '@/features/uploads/components/PhotoGallery';
import { ROUTES } from '@/router/routes';

const STATUS_MAP: Record<string, { label: string; color: 'success' | 'default' | 'warning' | 'error' | 'info' }> = {
  AVAILABLE: { label: 'Disponible', color: 'success' },
  RENTED: { label: 'Alquilada', color: 'info' },
  FOR_SALE: { label: 'En venta', color: 'warning' },
  SOLD: { label: 'Vendida', color: 'default' },
  OCCUPIED_WITHOUT_CONTRACT: { label: 'Ocupada sin contrato', color: 'error' },
  UNDER_RENOVATION: { label: 'En refacción', color: 'warning' },
  BLOCKED: { label: 'Bloqueada', color: 'error' },
};

const TYPE_LABELS: Record<string, string> = {
  CASA: 'Casa', DEPARTAMENTO: 'Departamento', LOCAL_COMERCIAL: 'Local comercial',
  OFICINA: 'Oficina', TERRENO: 'Terreno', COCHERA: 'Cochera',
  DEPOSITO: 'Depósito', GALPON: 'Galpón', OTRO: 'Otro',
};

const PAID_BY_LABELS: Record<string, string> = {
  TENANT: 'Inquilino', OWNER: 'Propietario', AGENCY: 'Inmobiliaria', SHARED: 'Compartido', N_A: 'No tiene',
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box py={0.75}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Box>
  );
}

function PropertyEditForm({ property, onSave, onCancel, isPending }: {
  property: Property;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
}) {
  const methods = useForm({
    defaultValues: {
      ablPaidBy: 'TENANT',
      ordinaryExpensesPaidBy: 'TENANT',
      extraordinaryExpensesPaidBy: 'TENANT',
      apiPaidBy: 'TENANT',
      gasPaidBy: 'TENANT',
      electricityPaidBy: 'TENANT',
      waterPaidBy: 'TENANT',
      ...property,
      owners: property.owners.map(({ owner, percentage }: { owner: any; percentage: number }) => ({
        owner,
        percentage,
      })),
    },
  });
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<ArrowBack />} onClick={onCancel} variant="text">Cancelar</Button>
        <Typography variant="h5">Editar propiedad</Typography>
      </Box>
      <FormProvider {...methods}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <PropertyForm />
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

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const propertyId = parseInt(id!);
  const { data: property, isLoading, error } = useProperty(propertyId);
  const { mutateAsync: updateProperty, isPending } = useUpdateProperty(propertyId);
  const [editing, setEditing] = useState(false);

  if (isLoading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;
  if (error || !property) return <Alert severity="error">Propiedad no encontrada</Alert>;

  const address = [
    `${property.street} ${property.number}`,
    property.floor && `Piso ${property.floor}`,
    property.apartment && `Dto ${property.apartment}`,
  ].filter(Boolean).join(' ');

  const handleSave = async (data: any) => {
    const payload = {
      ...data,
      owners: (data.owners ?? []).map(({ owner, percentage }: any) => ({
        ownerId: owner?.id,
        percentage,
      })),
    };
    await updateProperty(payload as any);
    setEditing(false);
  };

  if (editing) {
    return (
      <PropertyEditForm
        property={property}
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
          <Button startIcon={<ArrowBack />} onClick={() => navigate(ROUTES.PROPERTIES)} variant="text">
            Propiedades
          </Button>
          <Typography variant="h5">{address}</Typography>
          <Chip
            label={STATUS_MAP[property.status]?.label || property.status}
            color={STATUS_MAP[property.status]?.color || 'default'}
            size="small"
          />
        </Box>
        <Button startIcon={<Edit />} variant="outlined" onClick={() => setEditing(true)}>Editar</Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Datos generales</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={0} columns={12}>
                <Grid item xs={12} sm={6}>
                  <InfoRow label="Tipo" value={TYPE_LABELS[property.type] || property.type} />
                  <InfoRow label="Dirección completa" value={`${address}, ${property.city}, ${property.province}`} />
                  <InfoRow label="Código postal" value={property.zipCode} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoRow label="Superficie cubierta" value={property.coveredSurface ? `${property.coveredSurface} m²` : undefined} />
                  <InfoRow label="Superficie total" value={property.totalSurface ? `${property.totalSurface} m²` : undefined} />
                  <InfoRow label="Ambientes" value={property.rooms} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Responsabilidades de pago</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={0}>
                {[
                  { label: 'TGI', value: property.ablPaidBy },
                  { label: 'Expensas ordinarias', value: property.ordinaryExpensesPaidBy },
                  { label: 'Expensas extraordinarias', value: property.extraordinaryExpensesPaidBy },
                  { label: 'API', value: property.apiPaidBy },
                  { label: 'Gas', value: property.gasPaidBy },
                  { label: 'Electricidad', value: property.electricityPaidBy },
                  { label: 'Agua', value: property.waterPaidBy },
                ].map(({ label, value }) => (
                  <Grid item xs={12} sm={6} key={label}>
                    <InfoRow label={label} value={PAID_BY_LABELS[value] || value} />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Titulares ({property.owners.length})</Typography>
              <Divider sx={{ mb: 1 }} />
              <List disablePadding>
                {property.owners.map(({ owner, percentage }) => {
                  const name = owner.type === 'PERSONA_JURIDICA'
                    ? owner.businessName
                    : [owner.firstName, owner.lastName].filter(Boolean).join(' ');
                  return (
                    <ListItem
                      key={owner.id}
                      disablePadding
                      sx={{ py: 1, flexDirection: 'column', alignItems: 'flex-start' }}
                    >
                      <Box width="100%" display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                          onClick={() => navigate(ROUTES.OWNER_DETAIL(owner.id))}
                        >
                          {name || '—'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">{percentage}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{ width: '100%', borderRadius: 1, height: 4 }}
                      />
                    </ListItem>
                  );
                })}
                {property.owners.length === 0 && (
                  <Typography variant="body2" color="text.secondary" py={1}>Sin propietarios vinculados</Typography>
                )}
              </List>
            </CardContent>
          </Card>

          {property.notes && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Notas</Typography>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary">{property.notes}</Typography>
              </CardContent>
            </Card>
          )}

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Fotos</Typography>
              <Divider sx={{ mb: 2 }} />
              <PhotoGallery propertyId={propertyId} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Documentos</Typography>
              <Divider sx={{ mb: 2 }} />
              <DocumentList entityType="property" entityId={propertyId} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
