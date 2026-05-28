import { Outlet, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from '@/features/auth/hooks/useAuthContext';
import { ROUTES } from '@/router/routes';

export default function AuthLayout() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Outlet />
    </Box>
  );
}
