import React, { useEffect } from "react";
import { Button, Layout, Menu, Avatar } from "antd";
import type { MenuProps } from "antd";
import { LogOut } from "lucide-react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import logo from "../Imeges/Copilot_20260327_173847.png";
import { setLogout } from "../../Redux/Store/Slice/authSlice";
import { resetUserData } from "../../Redux/Store/Slice/userslice";
import { resetUserContent } from "../../Redux/Store/Slice/userContentSlice";
import { authData, userData } from "../../Redux/Store/Store";

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

const Deshbord: React.FC<DeshbordProps> = ({
  menuItems,
  appName = "Salon Manager",
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const { user: authUser } = useSelector(authData);
  const { name, role: userRole } = useSelector(userData);
  
  const [collapsed] = React.useState(false);

  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath && 
        currentPath !== '/admin' && 
        currentPath !== '/super-admin' &&
        currentPath !== '/employee' &&
        currentPath !== '/customer') {
      localStorage.setItem('lastVisitedPath', currentPath);
    }
  }, [location.pathname]);

  useEffect(() => {
    const lastPath = localStorage.getItem('lastVisitedPath');
    const currentPath = location.pathname;
    
    if ((currentPath === '/admin' || currentPath === '/super-admin' || 
         currentPath === '/employee' || currentPath === '/customer') && lastPath) {
      navigate(lastPath);
    }
  }, []);

  const displayName = name || authUser?.fullName || authUser?.name || "Guest";
  const displayRole = userRole || authUser?.role;

  const getRoleName = (role?: number) => {
    switch (role) {
      case 1: return "Super Admin";
      case 2: return "Admin";
      case 3: return "Employee";
      case 4: return "Customer";
      default: return "User";
    }
  };

  const getFirstLetter = () => {
    if (displayName && displayName !== "Guest") {
      return displayName.charAt(0).toUpperCase();
    }
    return "U";
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    localStorage.removeItem("lastVisitedPath");
    localStorage.removeItem("redirectAfterLogin");
    
    dispatch(setLogout());
    dispatch(resetUserData());
    dispatch(resetUserContent());
    
    navigate("/");
  };

  const menuItemsFormatted: MenuProps["items"] = menuItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
  }));

  const getSelectedKey = () => {
    const currentPath = location.pathname;
    const matchedItem = menuItems.find(item => currentPath.includes(item.key));
    return matchedItem?.key || menuItems[0]?.key || "";
  };

  return (
    <Layout className="h-screen overflow-hidden">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="h-screen relative"
      >
        <div className="flex items-center justify-center pt-4 pb-4">
          <img
            src={logo}
            alt="App Logo"
            className="w-18 h-18 object-contain pt-3"
          />
          <h2 className="text-[21px] text-white">{appName}</h2>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItemsFormatted}
          onClick={(e) => navigate(e.key)}
          className="border-r-0 overflow-y-auto"
          style={{ height: "calc(100% - 180px)" }}
        />

        <div className="absolute left-0 right-0 bottom-20 p-4">
          <div className="flex items-center">
            <Avatar
              size={collapsed ? 32 : 40}
              className="flex items-center justify-center"
              style={{ backgroundColor: '#001d3d' }}
            >
              {getFirstLetter()}
            </Avatar>
            {!collapsed && (
              <div className="ml-3">
                <div className="text-white font-semibold">
                  {displayName}
                </div>
                <div className="text-green-300 flex items-center gap-1 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  {getRoleName(displayRole)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="absolute left-0 right-0 bottom-5 p-4">
          <Button
            type="primary"
            danger
            block
            onClick={handleLogout}
            icon={<LogOut className="w-4 h-4" />}
            className="flex items-center justify-center gap-2"
          >
            {!collapsed && "Logout"}
          </Button>
        </div>
      </Sider>

      <Content className="h-screen overflow-y-auto bg-gray-100">
        <div className="p-6 min-h-full">
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
};

export default Deshbord;