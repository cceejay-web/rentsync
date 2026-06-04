import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function TenantRoute() {
  const { user } = useAuth();
  return user?.role === 'tenant' ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
