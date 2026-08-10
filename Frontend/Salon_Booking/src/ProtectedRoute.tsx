import { type ReactNode } from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

interface Props {
  children: ReactNode;
  allowedRoles?: number[];
}

const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { token, user, isLoading } = useSelector((state: any) => state.auth);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const storedToken = localStorage.getItem("token") || 
                     localStorage.getItem("jwt_token") || 
                     localStorage.getItem("authToken");
  const storedUser = localStorage.getItem("user");

  const finalToken = token || storedToken;
  const finalUser = user || (storedUser ? JSON.parse(storedUser) : null);

  if (!finalToken || !finalUser) {
    localStorage.setItem("redirectAfterLogin", location.pathname + location.search);
    return <Navigate to="/" replace />;
  }

  const isPublicRoute = location.pathname.startsWith('/customer') || 
                        location.pathname.startsWith('/user');

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!finalUser.role || !allowedRoles.includes(finalUser.role)) {
      const roleRoutes: Record<number, string> = {
        1: "/super-admin/deshboard",
        2: "/admin/dashboard",
        3: "/employee/dashboard",
        4: "/customer/booking",
      };
      return <Navigate to={roleRoutes[finalUser.role] || "/"} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;