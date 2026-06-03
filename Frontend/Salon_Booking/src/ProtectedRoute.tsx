import { type ReactNode } from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { authData } from "./Redux/Store/Store";

interface Props {
  children: ReactNode;
  allowedRoles?: number[];
}

const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { isAuth, token, user } = useSelector(authData);
  const location = useLocation();

  if (!isAuth || !token) {
    localStorage.setItem("redirectAfterLogin", location.pathname + location.search);
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!user || !user.role) {
      localStorage.setItem("redirectAfterLogin", location.pathname + location.search);
      return <Navigate to="/" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
      const roleRoutes: Record<number, string> = {
        1: "/super-admin/deshboard",
        2: "/admin/dashboard",
        3: "/employee/deshbord",
        4: "/customer/booking",
      };
      return <Navigate to={roleRoutes[user.role] || "/"} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;