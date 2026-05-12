import { type ReactNode } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

interface Props {
  children: ReactNode;
  allowedRoles?: number[];
}

const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { token, user } = useSelector((state: any) => state.auth);

  if (!token) return <Navigate to="/" replace />;

  if (allowedRoles && allowedRoles.length > 0) {
    if (!user) return <Navigate to="/" replace />;

    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;