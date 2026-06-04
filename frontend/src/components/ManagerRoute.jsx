import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ManagerRoute() {
  const { user } = useAuth();
  return user?.role === 'manager' ? <Outlet /> : <Navigate to="/tenant/home" replace />;
}
