import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '@/layouts/DashboardLayout';
import AuthLayout from '@/layouts/AuthLayout';
import { ROUTES } from './routes';

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const OwnersListPage = lazy(() => import('@/features/owners/pages/OwnersListPage'));
const OwnerDetailPage = lazy(() => import('@/features/owners/pages/OwnerDetailPage'));
const OwnerNewPage = lazy(() => import('@/features/owners/pages/OwnerNewPage'));
const PropertiesListPage = lazy(() => import('@/features/properties/pages/PropertiesListPage'));
const PropertyDetailPage = lazy(() => import('@/features/properties/pages/PropertyDetailPage'));
const PropertyNewPage = lazy(() => import('@/features/properties/pages/PropertyNewPage'));
const TenantsListPage = lazy(() => import('@/features/tenants/pages/TenantsListPage'));
const TenantDetailPage = lazy(() => import('@/features/tenants/pages/TenantDetailPage'));
const TenantNewPage = lazy(() => import('@/features/tenants/pages/TenantNewPage'));
const ContractsListPage = lazy(() => import('@/features/contracts/pages/ContractsListPage'));
const ContractDetailPage = lazy(() => import('@/features/contracts/pages/ContractDetailPage'));
const ContractNewPage = lazy(() => import('@/features/contracts/pages/ContractNewPage'));
const PaymentsListPage = lazy(() => import('@/features/payments/pages/PaymentsListPage'));
const ExpensesListPage = lazy(() => import('@/features/expenses/pages/ExpensesListPage'));
const SettlementsListPage = lazy(() => import('@/features/settlements/pages/SettlementsListPage'));
const SettlementDetailPage = lazy(() => import('@/features/settlements/pages/SettlementDetailPage'));
const SettlementsPeriodReviewPage = lazy(() => import('@/features/settlements/pages/SettlementsPeriodReviewPage'));
const SalesKanbanPage = lazy(() => import('@/features/sales/pages/SalesKanbanPage'));
const ReceiptsPage = lazy(() => import('@/features/receipts/pages/ReceiptsPage'));
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'));
const OccupationsListPage = lazy(() => import('@/features/occupations/pages/OccupationsListPage'));
const OccupationDetailPage = lazy(() => import('@/features/occupations/pages/OccupationDetailPage'));
const WhatsAppSetupPage = lazy(() => import('@/features/notifications/pages/WhatsAppSetupPage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));

function Loading() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );
}

export default function AppRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.OWNERS} element={<OwnersListPage />} />
          <Route path={ROUTES.OWNER_NEW} element={<OwnerNewPage />} />
          <Route path="/propietarios/:id" element={<OwnerDetailPage />} />
          <Route path={ROUTES.PROPERTIES} element={<PropertiesListPage />} />
          <Route path={ROUTES.PROPERTY_NEW} element={<PropertyNewPage />} />
          <Route path="/propiedades/:id" element={<PropertyDetailPage />} />
          <Route path={ROUTES.TENANTS} element={<TenantsListPage />} />
          <Route path={ROUTES.TENANT_NEW} element={<TenantNewPage />} />
          <Route path="/inquilinos/:id" element={<TenantDetailPage />} />
          <Route path={ROUTES.CONTRACTS} element={<ContractsListPage />} />
          <Route path={ROUTES.CONTRACT_NEW} element={<ContractNewPage />} />
          <Route path="/contratos/:id" element={<ContractDetailPage />} />
          <Route path={ROUTES.PAYMENTS} element={<PaymentsListPage />} />
          <Route path={ROUTES.EXPENSES} element={<ExpensesListPage />} />
          <Route path={ROUTES.SETTLEMENTS} element={<SettlementsListPage />} />
          <Route path="/liquidaciones/periodo/:year/:month" element={<SettlementsPeriodReviewPage />} />
          <Route path="/liquidaciones/:id" element={<SettlementDetailPage />} />
          <Route path={ROUTES.RECEIPTS} element={<ReceiptsPage />} />
          <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
          <Route path={ROUTES.SALES} element={<SalesKanbanPage />} />
          <Route path={ROUTES.OCCUPATIONS} element={<OccupationsListPage />} />
          <Route path="/ocupaciones/:id" element={<OccupationDetailPage />} />
          <Route path={ROUTES.WHATSAPP_SETUP} element={<WhatsAppSetupPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </Suspense>
  );
}
