import React, { useEffect } from "react";
import { Calendar } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import Deshbord from "../../Components/Ui/Deshbord";
import { setPermissionsByRole } from "../../Redux/Store/Slice/userContentSlice";

const EmployeeIndex: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: any) => state.auth);
  useEffect(() => {
    if (user?.role) {
      dispatch(setPermissionsByRole({ role: user.role }));
    }
  }, [user, dispatch]);

  const menuItems = [
    {
      key: "/customer/booking",icon: <Calendar className="w-5 h-5" />,label: "My Bookings",
    },
    {
        key: "/customer/appointment",icon: <Calendar className="w-5 h-5" />,label: "Book Appointment",
    },
  ];

  return (
    <Deshbord
      menuItems={menuItems}
      appName="Salon Booking Portal"
    />
  );
};

export default EmployeeIndex;