import React, { useEffect } from 'react';
import { LayoutDashboard, Users, Building2, BarChart3 } from 'lucide-react';
import Deshbord from '../../Components/Ui/Deshbord';
import { useDispatch, useSelector } from 'react-redux';
import { setPermissionsByRole } from '../../Redux/Store/Slice/userContentSlice';

const Index: React.FC = () => {
  const dispatch = useDispatch();

  const { user } = useSelector((state: any) => state.auth);

  useEffect(() => {
    if (user?.role) {
      dispatch(setPermissionsByRole({ role: user.role }));
    }
  }, [user, dispatch]);

  const superAdminMenuItems = [
    {
      key: '/super-admin/deshboard',icon: <LayoutDashboard className='w-5 h-5' />,label: 'Dashboard',
    },
    {
      key: '/super-admin/compani',icon: <Building2 className='w-5 h-5' />,label: 'Companies',
    },
    {
      key: '/super-admin/user',icon: <Users className='w-5 h-5' />,label: 'Users',
    },
    {
      key: '/super-admin/request', icon: <BarChart3 className='w-5 h-5' />, label: 'Request',
    },
  ];

  return (
    <Deshbord   menuItems={superAdminMenuItems}   appName="Salon Master Control" />
  );
};

export default Index;