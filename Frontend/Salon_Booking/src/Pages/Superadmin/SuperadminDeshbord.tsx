import { TeamOutlined, ShopOutlined, DollarOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { DataTable } from "../../Components/Ui/Table";
import { StatCard } from "../../Components/Ui/Cards";
import { useQuery } from "@tanstack/react-query";
import { Card, Button, Row, Col } from "antd";
import { getSalonBookingAPI, UserRole, type User, type Booking } from "../../api/generated";
import type { BookingResponse, DashboardCompany, UserResponse } from "../../Types/Alltypes";

const { getApiUser, getApiBooking } = getSalonBookingAPI();
const axiosConfig = { withCredentials: true,};
const parseResponse = <T,>(data: unknown): T | null => {
  if (!data) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  return data as T;
};

const SuperAdminDashboard = () => {
  const navigate = useNavigate();

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["super-admin-users"],
    queryFn: async () => {
      const response = await getApiUser(
        { page: 1, pageSize: 1000 },
        axiosConfig
      );
      const data = parseResponse<UserResponse>(response.data);
      return data?.status && Array.isArray(data.result?.data)
        ? data.result.data
        : [];
    },
  });

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["super-admin-bookings"],
    queryFn: async () => {
      const response = await getApiBooking(
        { page: 1, pageSize: 1000 },
        axiosConfig
      );
      const data = parseResponse<BookingResponse>(response.data);
      return data?.status && Array.isArray(data.result?.data)
        ? data.result.data
        : [];
    },
  });

  const companies: DashboardCompany[] = users
    .filter((user) => user.role === UserRole.NUMBER_2)
    .map((user, index) => ({
      id: user.id ?? index,
      salonName: user.salonName ?? "N/A",
      owner: user.fullName ?? user.name ?? "N/A",
      email: user.email ?? "N/A",
      phone: user.phoneNumber ?? "N/A",
      status: user.isActive ? "active" : "inactive",
    }));

  const employees = users.filter(
    (user) => user.role === UserRole.NUMBER_3
  );
  const customers = users.filter(
    (user) => user.role === UserRole.NUMBER_4
  );

  const getBookingAmount = (booking: Booking) => {
    const status = String(booking.status ?? "").toLowerCase();
    if (status === "cancelled") {
      return 0;
    }
    const amount = Number(booking.amount ?? 0);
    return Number.isNaN(amount) ? 0 : amount;
  };

  const revenue = bookings.reduce(
    (sum, booking) => sum + getBookingAmount(booking),
    0
  );
  const months = [ "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug", "Sep", "Oct", "Nov", "Dec",];
  const revenueByMonth = new Array<number>(12).fill(0);
  bookings.forEach((booking) => {
    const date = new Date(booking.appointmentDate ?? "");
    if (!Number.isNaN(date.getTime())) {
      revenueByMonth[date.getMonth()] += getBookingAmount(booking);
    }
  });

  const monthlyData = months.map((month, index) => ({
    month,
    revenue: revenueByMonth[index],
  }));

  const maxYValue = Math.max(
    ...monthlyData.map((item) => item.revenue),
    5000
  );

  const yAxisLabels = [
    maxYValue,
    maxYValue * 0.75,
    maxYValue * 0.5,
    maxYValue * 0.25,
    0,
  ];

  const stats = [
    {
      title: "Total Companies",
      value: companies.length.toString(),
      icon: <ShopOutlined />,
      color: "#087e8b",
    },
    {
      title: "Total Employees",
      value: employees.length.toString(),
      icon: <TeamOutlined />,
      color: "#003049",
    },
    {
      title: "Total Customers",
      value: customers.length.toString(),
      icon: <TeamOutlined />,
      color: "#ff7b00",
    },
    {
      title: "Total Revenue",
      value: `$${revenue.toLocaleString()}`,
      icon: <DollarOutlined />,
      color: "#6f1d1b",
    },
  ];

  return (
    <div className="p-6" style={{ fontFamily: "Public Sans, sans-serif" }}>
      <h1
        className="text-2xl font-bold mb-2"
        style={{ fontFamily: "PT Serif, serif" }}
      >
        Super Admin Dashboard
      </h1>
      <p className="text-gray-600 mb-6">
        System overview and analytics.
      </p>

      <Row gutter={[16, 16]} className="mb-6">
        {stats.map((stat) => (
          <Col xs={24} sm={12} md={6} key={stat.title}>
            <StatCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          </Col>
        ))}
      </Row>
      <Card
        className="mb-6"
        title={
          <span style={{ fontFamily: "PT Serif, serif" }}>
            Revenue Trend (Monthly)
          </span>
        }
      >
        <div className="flex h-80">
          <div className="flex flex-col justify-between pr-4 text-right text-sm text-gray-500 w-24">
            {yAxisLabels.map((label, index) => (
              <div key={index}>
                ${Math.round(label).toLocaleString()}
              </div>
            ))}
          </div>
          <div className="flex-1 flex flex-col">
            <div className="relative flex-1">
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className="border-t border-gray-300 w-full"
                  />
                ))}
              </div>
              <div className="relative h-full flex items-end gap-2">
                {monthlyData.map((data, index) => {
                  const barHeight =
                    maxYValue > 0
                      ? (data.revenue / maxYValue) * 100
                      : 0;
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center h-full justify-end"
                    >
                      <div
                        className="w-full bg-gradient-to-t from-[#023e7d] to-[#0466c8] rounded-lg transition-all duration-500 hover:from-[#0466c8] hover:to-[#035c9e] cursor-pointer relative group"
                        style={{
                          height: `${barHeight}%`,
                          minHeight: data.revenue > 0 ? "4px" : "0px",
                        }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                          ${data.revenue.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center mt-2">
                        <div className="text-xs font-medium text-gray-700">
                          {data.month}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 text-center text-gray-500 text-sm">
          Monthly revenue performance
        </div>
      </Card>
      <Card
        title={
          <span style={{ fontFamily: "PT Serif, serif" }}>
            Registered Companies
          </span>
        }
        extra={
          <Button
            type="primary"
            size="small"
            onClick={() => navigate("/Super-admin/compani")}
          >
            View All
          </Button>
        }
      >
        <DataTable
          data={companies.slice(0, 5)}
          tableType="companies"
          loading={usersLoading}
          rowKey="id"
          showActions={false}
        />
        {companies.length > 5 && (
          <div className="text-center mt-4">
            <Button
              type="link"
              onClick={() => navigate("/Super-admin/compani")}
            >
              + {companies.length - 5} more companies
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
export default SuperAdminDashboard;