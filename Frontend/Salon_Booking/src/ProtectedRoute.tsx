import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[]; 
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const token = localStorage.getItem("authToken");
  const rawRole = localStorage.getItem("userRole"); 
  const getRoleName = (roleString: string | null) => {
    switch (roleString) {
      case "1": return "SuperAdmin";
      case "2": return "Admin";
      case "3": return "Employee";
      case "4": return "Customer";
      default: return null;
    }
  };

  const userRole = getRoleName(rawRole);
  if (!token) return <Navigate to="/" replace />;

  if (allowedRoles && userRole !== null && !allowedRoles.includes(userRole)) {
    const dashboardMap: Record<string, string> = {
      SuperAdmin: "/super-admin/deshbord",
      Admin: "/admin/dashboard",
      Employee: "/employee/deshbord",
      Customer: "/customer/booking",
    };
    return <Navigate to={dashboardMap[userRole] || "/"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
