import React, { useEffect, useState } from 'react';
import { Button, Layout, Menu, Avatar } from 'antd';
import type { MenuProps } from 'antd';
import { LogOut, User } from 'lucide-react';
import { useNavigate, Outlet } from 'react-router-dom';
import logo from '../Imeges/Copilot_20260327_173847.png';

const { Sider, Content } = Layout;

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
}

interface DeshbordProps {
  menuItems: MenuItem[];
  appName?: string;
}

interface StoredUser {
  id: string;
  fullName?: string;
  email: string;
  role?: number | string;
}

const Deshbord: React.FC<DeshbordProps> = ({
  menuItems,
  appName = "Salon Manager"
}) => {
  const navigate = useNavigate();
  const [collapsed] = useState(false);
  const [userData, setUserData] = useState<StoredUser | null>(null);

  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (userString) {
      setUserData(JSON.parse(userString));
    }
  }, []);

  const getRoleName = (role?: number | string) => {
    if (typeof role === "string") return role;
    switch (role) {
      case 1: return "Super Admin";
      case 2: return "Admin";
      case 3: return "Employee";
      case 4: return "Customer";
      default: return "User";
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/');
  };

  const menuItemsFormatted: MenuProps['items'] = menuItems.map(item => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
  }));

  return (
    <>
      <Layout style={{ height: "100vh" }}>
        <Sider trigger={null} collapsible collapsed={collapsed}>
          <div className="flex items-center justify-center pt-4 pb-4">
            <img
              src={logo}
              alt="App Logo"
              className="w-18 h-18 object-contain pt-3"
            />
            <h2 className="text-[21px]  text-white">
              {appName}
            </h2>
          </div>

          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={[menuItems[0]?.key || '']}
            items={menuItemsFormatted}
            onClick={(e) => navigate(e.key)}
          />

          <div className="p-4 absolute bottom-13">
            <div className="flex items-center">
              <Avatar
                size={collapsed ? 32 : 40}
                icon={<User className="w-5 h-5" />}
              />
              {!collapsed && userData && (
                <div className="ml-3">
                  <div className="text-white font-semibold">
                    {userData.fullName || "Guest"}
                  </div>
                  <div className="text-green-300 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    {getRoleName(userData.role)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 absolute bottom-0 left-0 right-0">
            <Button
              type="primary"
              danger
              block
              onClick={handleLogout}
              icon={<LogOut className="w-5 h-5 mt-2" />}
            >
              {!collapsed && 'Logout'}
            </Button>
          </div>
        </Sider>

        <Content>
          <div style={{ height: "100%", padding: "25px" }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </>
  );
};

export default Deshbord;