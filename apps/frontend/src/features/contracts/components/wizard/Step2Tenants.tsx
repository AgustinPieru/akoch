import { useState } from 'react';
import {
  Box, Typography, TextField, InputAdornment, CircularProgress,
  List, ListItem, ListItemText, ListItemSecondaryAction, Checkbox,
  Chip, IconButton, Alert, Divider, Tooltip, Button,
} from '@mui/material';
import { Search, Star, StarBorder, Add } from '@mui/icons-material';
import { useTenants } from '@/features/tenants/api/useTenants';
import InlineTenantCreateForm from '@/features/tenants/components/InlineTenantCreateForm';

export interface SelectedTenant {
  tenantId: number;
  isPrimary: boolean;
  name: string;
}

interface Props {
  value: SelectedTenant[];
  onChange: (tenants: SelectedTenant[]) => void;
}

export default function Step2Tenants({ value, onChange }: Props) {
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useTenants({ search, status: 'ACTIVE', limit: 50 });

  const selectedIds = value.map((t) => t.tenantId);
  const primaryId = value.find((t) => t.isPrimary)?.tenantId ?? null;

  const getDisplayName = (t: { type: string; firstName?: string; lastName?: string; businessName?: string }) =>
    t.type === 'PERSONA_JURIDICA'
      ? t.businessName || '—'
      : [t.firstName, t.lastName].filter(Boolean).join(' ') || '—';

  const toggleTenant = (tenant: { id: number; type: string; firstName?: string; lastName?: string; businessName?: string }) => {
    const isSelected = selectedIds.includes(tenant.id);
    if (isSelected) {
      const next = value.filter((t) => t.tenantId !== tenant.id);
      // Si se quita el titular, promover al primero que quede
      if (primaryId === tenant.id && next.length > 0) {
        next[0].isPrimary = true;
      }
      onChange(next);
    } else {
      const isFirst = value.length === 0;
      onChange([...value, { tenantId: tenant.id, isPrimary: isFirst, name: getDisplayName(tenant) }]);
    }
  };

  const setPrimary = (tenantId: number) => {
    onChange(value.map((t) => ({ ...t, isPrimary: t.tenantId === tenantId })));
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Seleccionar inquilino/s</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        El inquilino marcado con ★ es el titular principal. Podés agregar co-inquilinos.
      </Typography>

      {value.length > 0 && (
        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Seleccionados</Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {value.map((t) => (
              <Chip
                key={t.tenantId}
                label={`${t.isPrimary ? '★ ' : ''}${t.name}`}
                color={t.isPrimary ? 'primary' : 'default'}
                onDelete={() => toggleTenant({ id: t.tenantId, type: '', firstName: t.name })}
              />
            ))}
          </Box>
          <Divider sx={{ mt: 2 }} />
        </Box>
      )}

      {creating ? (
        <InlineTenantCreateForm
          onCreated={(tenant) => { toggleTenant(tenant); setSearch(''); setCreating(false); }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <>
          <Box display="flex" gap={2} mb={2}>
            <TextField
              placeholder="Buscar por nombre, DNI o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              fullWidth
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setCreating(true)}
              sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Crear inquilino
            </Button>
          </Box>

          {isLoading && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}

          {data?.data.length === 0 && !isLoading && (
            <Alert severity="info">No se encontraron inquilinos activos.</Alert>
          )}

          <List disablePadding>
            {data?.data.map((tenant) => {
              const isSelected = selectedIds.includes(tenant.id);
              const isPrimary = primaryId === tenant.id;
              const name = getDisplayName(tenant);

              return (
                <ListItem
                  key={tenant.id}
                  divider
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() => toggleTenant(tenant)}
                >
                  <Checkbox checked={isSelected} size="small" sx={{ mr: 1 }} />
                  <ListItemText
                    primary={name}
                    secondary={[tenant.dni || tenant.cuit, tenant.email, tenant.phone].filter(Boolean).join(' · ')}
                    primaryTypographyProps={{ fontWeight: isSelected ? 600 : 400 }}
                  />
                  <ListItemSecondaryAction>
                    {isSelected && (
                      <Tooltip title={isPrimary ? 'Titular principal' : 'Marcar como titular'}>
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); setPrimary(tenant.id); }}
                          color={isPrimary ? 'warning' : 'default'}
                        >
                          {isPrimary ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        </>
      )}
    </Box>
  );
}
