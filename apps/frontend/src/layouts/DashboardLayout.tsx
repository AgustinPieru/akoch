import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Home as HomeIcon,
  PersonPin as PersonPinIcon,
  Description as DescriptionIcon,
  Payments as PaymentsIcon,
  Receipt as ReceiptIcon,
  AccountBalance as AccountBalanceIcon,
  ReceiptLong as ReceiptLongIcon,
  Assessment as AssessmentIcon,
  Storefront as StorefrontIcon,
  ChevronLeft as ChevronLeftIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  WhatsApp as WhatsAppIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '@/features/auth/hooks/useAuthContext';
import { ROUTES } from '@/router/routes';

const DRAWER_WIDTH = 240;

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: ROUTES.DASHBOARD },
  { label: 'Propietarios', icon: <PeopleIcon />, path: ROUTES.OWNERS },
  { label: 'Inquilinos', icon: <PersonPinIcon />, path: ROUTES.TENANTS },
  { label: 'Propiedades', icon: <HomeIcon />, path: ROUTES.PROPERTIES },
  { label: 'Contratos', icon: <DescriptionIcon />, path: ROUTES.CONTRACTS },
  { label: 'Cobros', icon: <PaymentsIcon />, path: ROUTES.PAYMENTS },
  { label: 'Gastos', icon: <ReceiptIcon />, path: ROUTES.EXPENSES },
  { label: 'Liquidaciones', icon: <AccountBalanceIcon />, path: ROUTES.SETTLEMENTS },
  { label: 'Recibos', icon: <ReceiptLongIcon />, path: ROUTES.RECEIPTS },
  { label: 'Reportes', icon: <AssessmentIcon />, path: ROUTES.REPORTS },
  { label: 'Ventas', icon: <StorefrontIcon />, path: ROUTES.SALES },
  { label: 'WhatsApp', icon: <WhatsAppIcon />, path: ROUTES.WHATSAPP_SETUP },
  { label: 'Configuración', icon: <SettingsIcon />, path: ROUTES.SETTINGS },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const qc = useQueryClient();

  const handleNavClick = (path: string) => {
    if (path === ROUTES.DASHBOARD) {
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      qc.invalidateQueries({ queryKey: ['dashboard-earnings'] });
      qc.invalidateQueries({ queryKey: ['dashboard-alerts'] });
    }
    navigate(path);
    if (isMobile) setDrawerOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const drawerContent = (
    <>
      <Toolbar />
      <Box sx={{ overflow: 'auto', mt: 1 }}>
        <List>
          {navItems.map((item) => {
            const isActive = item.path === ROUTES.DASHBOARD
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <ListItemButton
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                selected={isActive}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.light' },
                  },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                <ListItemIcon sx={{ color: isActive ? 'white' : 'rgba(255,255,255,0.6)', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: isActive ? 600 : 400, color: 'white' }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'primary.main',
          width: { md: drawerOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          ml: { md: drawerOpen ? `${DRAWER_WIDTH}px` : 0 },
          transition: (theme) =>
            theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            onClick={() => setDrawerOpen(!drawerOpen)}
            edge="start"
            sx={{ mr: 2 }}
          >
            {drawerOpen && !isMobile ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 700 }}>
            Akoch Inmobiliaria
          </Typography>
          <Tooltip title={user?.name ?? 'Usuario'}>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} color="inherit">
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14 }}>
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled>
              <AccountCircleIcon sx={{ mr: 1 }} fontSize="small" />
              {user?.email}
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
              Cerrar sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Mobile: temporary drawer */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              bgcolor: '#0F2338',
              color: 'white',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        /* Desktop: persistent drawer */
        <Drawer
          variant="persistent"
          open={drawerOpen}
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              bgcolor: '#0F2338',
              color: 'white',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          bgcolor: 'background.default',
          minHeight: '100vh',
          transition: (theme) =>
            theme.transitions.create('margin', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
