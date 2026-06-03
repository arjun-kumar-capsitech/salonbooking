import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "../ProtectedRoute";

import AdminDashboard from "../Pages/Admin/AdminDeshbord";
import AdminIndex from "../Pages/Admin/AdminIndex";
import Booking from "../Pages/Admin/Bookking";
import Services from "../Pages/Admin/Services";
import StaffManagement from "../Pages/Admin/Staff";
import Setting from "../Pages/Admin/Setting";
import User from "../Pages/Admin/User";

import SuperAdminIndex from "../Pages/Superadmin/Index";
import Compani from "../Pages/Superadmin/Compani";
import Request from "../Pages/Superadmin/Request";
import SuperadminUser from "../Pages/Superadmin/SuperadminUser";

import EmployeeIndex from "../Pages/Employee/EmployeeIndex";
import EmployeeService from "../Pages/Employee/EmployeeService";
import EmployeeBooking from "../Pages/Employee/EmployeeBooking";

import CustomerIndex from "../Pages/Customer/CustomerIndex";
import CustomerAppointment from "../Pages/Customer/CustomerAppointment";
import CustomerBookings from "../Pages/Customer/CustomerBooking";

import EmployeeDeshbord from "../Pages/Employee/EmployeeDeshbord";
import SuperAdminDeshbord from "../Pages/Superadmin/SuperadminDeshbord";
import NotFound from "../Components/NotFound ";

const Allrouts = () => {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={[2]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminIndex />} />
        <Route path="booking" element={<Booking />} />
        <Route path="services" element={<Services />} />
        <Route path="staff" element={<StaffManagement />} />
        <Route path="setting" element={<Setting />} />
        <Route path="user" element={<User />} />
      </Route>

      <Route
        path="/super-admin/*"
        element={
          <ProtectedRoute allowedRoles={[1]}>
            <SuperAdminIndex />
          </ProtectedRoute>
        }
      >
        <Route path="deshboard" element={<SuperAdminDeshbord />} />
        <Route path="compani" element={<Compani />} />
        <Route path="request" element={<Request />} />
        <Route path="user" element={<SuperadminUser />} />
      </Route>

      <Route
        path="/employee/*"
        element={
          <ProtectedRoute allowedRoles={[3]}>
            <EmployeeIndex />
          </ProtectedRoute>
        }
      >
        <Route path="deshbord" element={<EmployeeDeshbord />} />
        <Route path="service" element={<EmployeeService />} />
        <Route path="booking" element={<EmployeeBooking />} />
      </Route>

      <Route
        path="/customer/*"
        element={
          <ProtectedRoute allowedRoles={[4]}>
            <CustomerIndex />
          </ProtectedRoute>
        }
      >
        <Route path="booking" element={<CustomerBookings />} />
        <Route path="appointment" element={<CustomerAppointment />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default Allrouts;