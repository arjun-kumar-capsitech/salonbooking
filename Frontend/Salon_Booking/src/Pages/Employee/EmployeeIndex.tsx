import React, { useEffect } from 'react';
import { Calendar, LayoutDashboard, Scissors } from 'lucide-react';
import Deshbord from '../../Components/Ui/Deshbord';
import { useDispatch, useSelector } from 'react-redux';
import { setPermissionsByRole } from '../../Redux/Store/Slice/userContentSlice';
import { authData } from '../../Redux/Store/Store';

const EmployeeIndex: React.FC = () => {
  const dispatch = useDispatch();

  const { user } = useSelector((authData));

  useEffect(() => {
    if (user?.role) {
      dispatch(setPermissionsByRole({ role: user.role }));
    }
  }, [user, dispatch]);

  const menuItems = [
    { 
      key: '/employee/deshbord', icon: <LayoutDashboard className='w-5 h-5' />, label: 'Dashboard' },
    { 
      key: '/employee/booking', icon: <Calendar className='w-5 h-5' />, label: 'Bookings' },
    { 
      key: '/employee/service', icon: <Scissors className='w-5 h-5' />, label: 'Services' },
  ];

  return (
    <Deshbord
      menuItems={menuItems}
      appName="ESalon System"
    />
  );
};

export default EmployeeIndex;