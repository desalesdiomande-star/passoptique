import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/contexts/PermissionsContext';

interface PermissionGuardProps {
  module: string;
  children: React.ReactNode;
}

const PermissionGuard = ({ module, children }: PermissionGuardProps) => {
  const { can, loading } = usePermissions();
  if (loading) return null;
  if (!can(module)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default PermissionGuard;