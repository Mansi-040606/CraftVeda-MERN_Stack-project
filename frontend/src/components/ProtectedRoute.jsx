import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-amber-900 text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectPath = getDashboardPath(user.role);
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

const getDashboardPath = (role) => {
  switch (role) {
    case 'CUSTOMER':
      return '/customer/dashboard';
    case 'ARTISAN':
      return '/artisan/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    default:
      return '/';
  }
};

export default ProtectedRoute;