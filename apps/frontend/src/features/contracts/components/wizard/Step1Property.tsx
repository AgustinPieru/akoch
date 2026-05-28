import { useState } from 'react';
import {
  Box, Typography, TextField, InputAdornment, CircularProgress,
  Card, CardActionArea, CardContent, Chip, Alert, Grid,
} from '@mui/material';
import { Search, Home } from '@mui/icons-material';
import { useProperties } from '@/features/properties/api/useProperties';

const TYPE_LABELS: Record<string, string> = {
  CASA: 'Casa', DEPARTAMENTO: 'Departamento', LOCAL_COMERCIAL: 'Local comercial',
  OFICINA: 'Oficina', TERRENO: 'Terreno', COCHERA: 'Cochera',
  DEPOSITO: 'Depósito', GALPON: 'Galpón', OTRO: 'Otro',
};

interface Props {
  value: number | null;
  onChange: (id: number) => void;
}

export default function Step1Property({ value, onChange }: Props) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useProperties({ search, status: 'AVAILABLE', limit: 50 });

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Seleccionar propiedad</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Solo se muestran propiedades disponibles.
      </Typography>

      <TextField
        placeholder="Buscar por calle o ciudad..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 3 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
      />

      {isLoading && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}

      {data?.data.length === 0 && !isLoading && (
        <Alert severity="info">No hay propiedades disponibles. Cargá una propiedad primero.</Alert>
      )}

      <Grid container spacing={2}>
        {data?.data.map((property) => {
          const selected = value === property.id;
          const address = `${property.street} ${property.number}${property.floor ? ` P${property.floor}` : ''}${property.apartment ? ` D${property.apartment}` : ''}`;
          const ownerNames = property.owners
            .map(({ owner }) => owner.type === 'PERSONA_JURIDICA' ? owner.businessName : [owner.firstName, owner.lastName].filter(Boolean).join(' '))
            .join(', ');

          return (
            <Grid item xs={12} sm={6} key={property.id}>
              <Card
                sx={{
                  border: '2px solid',
                  borderColor: selected ? 'primary.main' : 'transparent',
                  bgcolor: selected ? 'primary.50' : 'background.paper',
                }}
              >
                <CardActionArea onClick={() => onChange(property.id)} sx={{ p: 0 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Home fontSize="small" color={selected ? 'primary' : 'action'} />
                        <Typography variant="subtitle2" fontWeight={600}>{address}</Typography>
                      </Box>
                      <Chip label={TYPE_LABELS[property.type] || property.type} size="small" variant="outlined" />
                    </Box>
                    <Typography variant="body2" color="text.secondary">{property.city}</Typography>
                    {ownerNames && (
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                        Prop: {ownerNames}
                      </Typography>
                    )}
                    {property.coveredSurface && (
                      <Typography variant="caption" color="text.secondary">{property.coveredSurface} m²</Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
