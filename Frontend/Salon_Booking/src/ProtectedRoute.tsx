import { type ReactNode } from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

interface Props {
  children: ReactNode;
  allowedRoles?: number[];
}

const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { user, isLoading } = useSelector(
    (state: any) => state.auth
  );

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

  const storedUser = localStorage.getItem("user");
  const finalUser =
    user ||
    (storedUser ? JSON.parse(storedUser) : null);
  if (!finalUser) {
    localStorage.setItem(
      "redirectAfterLogin",
      location.pathname + location.search
    );
    return <Navigate to="/" replace />;
  }
  const getRoleNumber = (role: any) => {
    if (typeof role === "number") {
      return role;
    }

    switch (String(role).toLowerCase()) {
      case "superadmin":
        return 1;

      case "admin":
        return 2;

      case "employee":
        return 3;

      case "customer":
        return 4;

      default:
        return 0;
    }
  };

  const userRole = getRoleNumber(
    finalUser.role ?? finalUser.Role
  );

  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(userRole)
  ) {
    const roleRoutes: Record<number, string> = {
      1: "/super-admin/deshboard",
      2: "/admin/dashboard",
      3: "/employee/deshbord",
      4: "/customer/booking",
    };
    return (
      <Navigate
        to={roleRoutes[userRole] || "/"}
        replace
      />
    );
  }
  return <>{children}</>;
};
export default ProtectedRoute;