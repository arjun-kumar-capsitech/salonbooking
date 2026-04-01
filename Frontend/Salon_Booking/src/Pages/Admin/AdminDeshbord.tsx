import React from "react";
import { LayoutDashboard, Users, Calendar, Scissors, UsersRound, Settings } from "lucide-react";
import Deshbord from "../../Components/Ui/Deshbord";

const AdminDashboard: React.FC = () => {
  const menuItems = [
    { key: "/admin/dashboard", icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard" },
    { key: "/admin/user", icon: <Users className="w-5 h-5" />, label: "User" },
    { key: "/admin/booking", icon: <Calendar className="w-5 h-5" />, label: "Bookings" },
    { key: "/admin/services", icon: <Scissors className="w-5 h-5" />, label: "Services" },
    { key: "/admin/staff", icon: <UsersRound className="w-5 h-5" />, label: "Staffs" },
    { key: "/admin/setting", icon: <Settings className="w-5 h-5" />, label: "Settings" },
  ];

  return (
    <>
      <Deshbord
        menuItems={menuItems}
        appName="Salon Manager"
      />
    </>
  );
};

export default AdminDashboard;
