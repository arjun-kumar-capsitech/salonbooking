import React from 'react';
import { Calendar, LayoutDashboard, Scissors, } from 'lucide-react';
import Deshbord from '../../Components/Ui/Deshbord';


const EmployeeIndex: React.FC = () => {
  const superAdminMenuItems = [
    { key: '/employee/deshbord', icon: <LayoutDashboard className='w-5 h-5' />, label: 'Dashboard' },
    { key: '/employee/booking', icon: <Calendar className='w-5 h-5' />, label: 'Bookings' },
    { key: '/employee/service', icon: <Scissors className='w-5 h-5' />, label: 'Services' },
  ];

  return (
    <>
      <Deshbord
        menuItems={superAdminMenuItems}
        appName="ESalon System"
      />
    </>
  );
};

export default EmployeeIndex;