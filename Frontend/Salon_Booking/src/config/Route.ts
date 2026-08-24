export const ROLE_ROUTES: Record<number, string> = {
  1: "/super-admin/deshboard",
  2: "/admin/dashboard",
  3: "/employee/deshboard",
  4: "/customer/booking",
};

export const getDashboardPath = (role?: number) => {
  if (!role) return "/";
  return ROLE_ROUTES[role] ?? "/";
};