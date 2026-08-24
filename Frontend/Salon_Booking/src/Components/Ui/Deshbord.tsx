import React from "react";
import { Button, Layout, Menu, Avatar } from "antd";
import type { MenuProps } from "antd";
import { LogOut } from "lucide-react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
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
}

const Deshbord: React.FC<DeshbordProps> = ({ menuItems }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const auth = useSelector((state: any) => state.auth);
  const authUser = auth?.user;
  const [collapsed, setCollapsed] = React.useState(false);
  const api = getSalonBookingAPI();
  const displayName = authUser?.fullName || "Guest";
  const displayRole = authUser?.role;
  const getRoleName = (role?: number | string) => {
    const roleNumber = Number(role);

    switch (roleNumber) {
      case 1:
        return "Super Admin";
      case 2:
        return "Admin";
      case 3:
        return "Employee";
      case 4:
        return "Customer";
      default:
        return "User";
    }
  };
  const getFirstLetter = () => {
    return displayName !== "Guest"
      ? displayName.charAt(0).toUpperCase()
      : "U";
  };
  const handleLogout = async () => {
    try {
      await api.postApiUserLogout({
        withCredentials: true,
      });
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      dispatch(setLogout());
      dispatch(resetUserData());
      dispatch(resetUserContent());
      navigate("/login", {
        replace: true,
      });
    }
  };
  const menuItemsFormatted: MenuProps["items"] = menuItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
  }));
  const getSelectedKey = () => {
    const currentPath = location.pathname;
    const matchedItem = menuItems.find((item) =>
      currentPath.includes(item.key)
    );
    return matchedItem?.key || menuItems[0]?.key || "";
  };

  return (
    <Layout className="h-screen overflow-hidden">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        className="h-screen relative"
      >
        <div className="flex items-center justify-center py-5">
          {!collapsed && (
            <h2
              className="text-2xl font-extrabold tracking-wider"
              style={{ fontFamily: "'Abril Fatface', serif" }}
            >
              <span className="text-white">Salon</span>{" "}
              <span className="text-[#00A5A7]">Verse</span>
            </h2>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItemsFormatted}
          onClick={(e) => navigate(e.key)}
          className="border-r-0"
        />
        <div className="absolute left-0 right-0 bottom-20 px-4">
          <div className="flex items-center">
            <Avatar
              size={40}
              className="flex items-center justify-center"
              style={{ backgroundColor: "#001d3d" }}
            >
              {getFirstLetter()}
            </Avatar>

            {!collapsed && (
              <div className="ml-3 overflow-hidden">
                <div className="text-white font-semibold truncate">
                  {displayName}
                </div>

                <div className="text-green-300 flex items-center gap-1 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  {getRoleName(displayRole)}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="absolute left-0 right-0 bottom-5 px-4">
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
      <Layout>
        <Content className="h-screen overflow-y-auto bg-gray-100">
          <div className="p-4 sm:p-6 min-h-full bg-[#FAFAFA]">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};
export default Deshbord;