import React, { useEffect, useState } from "react";
import { Button, Layout, Menu, Avatar, Drawer } from "antd";
import type { MenuProps } from "antd";
import { LogOut } from "lucide-react";
import { MenuOutlined } from "@ant-design/icons";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import logo from "../Imeges/Copilot_20260327_173847.png";
import { setLogout } from "../../Redux/Store/Slice/authSlice";
import { resetUserData } from "../../Redux/Store/Slice/userslice";
import { resetUserContent } from "../../Redux/Store/Slice/userContentSlice";
import { getSalonBookingAPI } from "../../api/generated";

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
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const auth = useSelector((state: any) => state.auth);
  const user = useSelector((state: any) => state.user);

  const authUser = auth?.user;
  const { name, role: userRole } = user || {};

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const api = getSalonBookingAPI();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth >= 768 && window.innerWidth < 1024) {
      setCollapsed(true);
    } else if (window.innerWidth >= 1024) {
      setCollapsed(false);
    }
  }, []);

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

  const handleLogout = async () => {
    try {
      const response = await api.postApiUserLogout({
        withCredentials: true
      });

      console.log("Logout successful:", response.data);

    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      localStorage.removeItem("userRole");
      localStorage.removeItem("lastVisitedPath");
      localStorage.removeItem("redirectAfterLogin");
      localStorage.removeItem("jwt_token");
      dispatch(setLogout());
      dispatch(resetUserData());
      dispatch(resetUserContent());
      navigate("/");
    }
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

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-center pt-2 pb-2">
        <img
          src={logo}
          alt="App Logo"
          className="w-30 h-22 pt-3"
        />
        <h2
          className="text-3xl font-extrabold tracking-wider"
          style={{ fontFamily: "'Abril Fatface', serif" }}
        >
          <span className="text-white">Salon</span>{" "}
          <span className="text-[#00A5A7]">Verse</span>
        </h2>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        items={menuItemsFormatted}
        onClick={(e) => {
          navigate(e.key);
          if (isMobile) {
            setMobileMenuOpen(false);
          }
        }}
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
    </>
  );

  const MobileSidebarContent = () => (
    <>
      <div className="flex items-center justify-center pt-4 pb-2">
        <h2
          className="text-xl font-extrabold tracking-wider"
          style={{ fontFamily: "'Abril Fatface', serif" }}
        >
          <span className="text-white">Salon</span>{" "}
          <span className="text-[#00A5A7]">Verse</span>
        </h2>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        items={menuItemsFormatted}
        onClick={(e) => {
          navigate(e.key);
          if (isMobile) {
            setMobileMenuOpen(false);
          }
        }}
        className="border-r-0 overflow-y-auto"
        style={{ height: "calc(100% - 180px)" }}
      />

      <div className="absolute left-0 right-0 bottom-20 p-4">
        <div className="flex items-center">
          <Avatar
            size={40}
            className="flex items-center justify-center"
            style={{ backgroundColor: '#001d3d' }}
          >
            {getFirstLetter()}
          </Avatar>
          <div className="ml-3">
            <div className="text-white font-semibold text-sm">
              {displayName}
            </div>
            <div className="text-green-300 flex items-center gap-1 text-xs">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              {getRoleName(displayRole)}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-0 right-0 bottom-5 p-4">
        <Button
          type="primary"
          danger
          block
          onClick={handleLogout}
          icon={<LogOut className="w-4 h-4" />}
          className="flex items-center justify-center gap-2 text-sm"
        >
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <Layout className="h-screen overflow-hidden">
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#001529] h-16 px-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center">
            <Button
              type="text"
              icon={<MenuOutlined style={{ color: 'white', fontSize: '20px' }} />}
              onClick={() => setMobileMenuOpen(true)}
            />
            <h2
              className="text-xl font-extrabold tracking-wider ml-2"
              style={{ fontFamily: "'Abril Fatface', serif" }}
            >
              <span className="text-white">Salon</span>{" "}
              <span className="text-[#00A5A7]">Verse</span>
            </h2>
          </div>
          <Avatar
            size={36}
            style={{ backgroundColor: '#08223d' }}
          >
            {getFirstLetter()}
          </Avatar>
        </div>
      )}

      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          className="h-screen relative"
        >
          <SidebarContent />
        </Sider>
      )}

      {isMobile && (
        <Drawer
          placement="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          closable={false}
          bodyStyle={{
            padding: 0,
            background: '#001529',
            height: '100vh'
          }}
          width={240}
          className="mobile-drawer"
        >
          <div className="h-full w-full relative">
            <MobileSidebarContent />
          </div>
        </Drawer>
      )}

      <Content className={`h-screen overflow-y-auto bg-gray-100 ${isMobile ? 'mt-16' : ''}`}>
        <div className="p-4 sm:p-6 min-h-full bg-[#FAFAFA]">
          <Outlet />
        </div>
      </Content>

      <style>{`
        .mobile-drawer .ant-drawer-body {
          padding: 0;
          height: 100vh;
        }
        .mobile-drawer .ant-drawer-content {
          background: #001529;
        }
        .mobile-drawer .ant-drawer-content-wrapper {
          height: 100vh !important;
          width: 240px !important;
        }
      `}</style>
    </Layout>
  );
};

export default Deshbord;