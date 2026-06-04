import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ManagerRoute   from './components/ManagerRoute.jsx';
import TenantRoute    from './components/TenantRoute.jsx';
import Layout         from './components/Layout.jsx';
import TenantLayout   from './components/TenantLayout.jsx';
import Login          from './pages/Login';
import Signup         from './pages/Signup';
import Dashboard      from './pages/Dashboard';
import Properties     from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Tenants        from './pages/Tenants';
import Payments       from './pages/Payments';
import Reports        from './pages/Reports';
import TenantHome     from './pages/TenantHome.jsx';
import TenantLease    from './pages/TenantLease.jsx';
import TenantPayments  from './pages/TenantPayments.jsx';
import TenantRequests   from './pages/TenantRequests.jsx';
import TenantAvailable      from './pages/TenantAvailable.jsx';
import TenantHelp           from './pages/TenantHelp.jsx';
import TenantApplications   from './pages/TenantApplications.jsx';
import ManagerRequests      from './pages/ManagerRequests.jsx';
import ManagerApplications  from './pages/ManagerApplications.jsx';

const theme = {
  token: {
    colorPrimary:        '#0F5D4E',
    colorBgLayout:       '#F8F5F0',
    colorBgContainer:    '#FFFFFF',
    colorText:           '#14161A',
    colorTextSecondary:  '#5C6069',
    colorBorder:         '#EFF0F2',
    borderRadius:        8,
    fontFamily:          'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  components: {
    Menu: {
      itemColor:         '#5C6069',
      itemHoverColor:    '#0F5D4E',
      itemHoverBg:       '#F4FAF7',
      itemSelectedColor: '#0F5D4E',
      itemSelectedBg:    '#E8F4EF',
    },
  },
};

export default function App() {
  return (
    <ConfigProvider theme={theme}>
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<Navigate to="/login" replace />} />
        <Route path="/login"  element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route element={<ManagerRoute />}>
              <Route path="/dashboard"      element={<Dashboard />} />
              <Route path="/properties"     element={<Properties />} />
              <Route path="/properties/:id" element={<PropertyDetail />} />
              <Route path="/tenants"    element={<Tenants />} />
              <Route path="/payments"   element={<Payments />} />
              <Route path="/reports"    element={<Reports />} />
              <Route path="/requests"      element={<ManagerRequests />} />
              <Route path="/applications"  element={<ManagerApplications />} />
            </Route>
          </Route>

          <Route element={<TenantRoute />}>
            <Route element={<TenantLayout />}>
              <Route path="/tenant/home"      element={<TenantHome />} />
              <Route path="/tenant/lease"     element={<TenantLease />} />
              <Route path="/tenant/payments"  element={<TenantPayments />} />
              <Route path="/tenant/requests"  element={<TenantRequests />} />
              <Route path="/tenant/available"     element={<TenantAvailable />} />
              <Route path="/tenant/applications"  element={<TenantApplications />} />
              <Route path="/tenant/help"          element={<TenantHelp />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
    </ConfigProvider>
  );
}
