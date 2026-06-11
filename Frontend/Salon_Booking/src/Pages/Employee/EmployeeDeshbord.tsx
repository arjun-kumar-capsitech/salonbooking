import { useState,} from "react";
import { Card, Button, Row, Col,} from "antd";
import { CalendarOutlined, ClockCircleOutlined, DollarOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "../../Components/Ui/Cards";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const { getApiBooking, getApiUser, getApiStaff, getApiAdminServices } = getSalonBookingAPI();

const EmployeeDashboard = () => {
  const [activeTab, setActiveTab] = useState("today");
  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInUserEmail = user?.Email || user?.email;
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  const extractData = (response: any) => {
    if (!response || !response.data) return [];
    if (response.data?.status === true && response.data?.result) return response.data.result;
    if (response.data?.result) return response.data.result;
    if (Array.isArray(response.data)) return response.data;
    return [];
  };

  const { data: staffList = [] } = useQuery({
    queryKey: ['employeeStaff'],
    enabled: !!token, 
    queryFn: async () => {
      const res = await getApiStaff(axiosConfig);
      return extractData(res);
    }
  });
  const currentStaff = staffList.find((s: any) => (s.email || s.Email) === loggedInUserEmail);
  const staffId = currentStaff?.id || currentStaff?._id;
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['employeeBookings'],
    enabled: !!token && !!staffId, staleTime: 5000, refetchOnWindowFocus: false,
    queryFn: async () => {
      const [bookingRes, userRes, serviceRes] = await Promise.all([
        getApiBooking(axiosConfig),
        getApiUser(axiosConfig),
        getApiAdminServices(axiosConfig),
      ]);
      const users = extractData(userRes);
      const services = extractData(serviceRes);
      const bookingsData = extractData(bookingRes);
      
      const filtered = bookingsData.filter((b: any) => String(b.staffId || b.StaffId) === String(staffId));
      
      return filtered.map((b: any, index: number) => {
        const customer = users.find((u: any) => String(u.id || u._id) === String(b.customerId || b.CustomerId));
        const service = services.find((s: any) => String(s.id || s._id) === String(b.serviceId || b.ServiceId));
        return {
          key: b._id || b.id || index,
          id: b._id || b.id,
          customerName: customer?.fullName || customer?.FullName || "N/A",
          serviceName: service?.serviceName || "N/A",
          appointmentDate: b.appointmentDate || b.AppointmentDate,
          date: dayjs(b.appointmentDate || b.AppointmentDate).format("DD MMM YYYY"),
          time: dayjs(b.appointmentDate || b.AppointmentDate).format("hh:mm A"),
          amount: b.amount || b.Amount || 0,
          status: (b.status || b.Status || "pending").toLowerCase(),
        };
      });
    }
  });

  const todayBookings = bookings.filter((b: any) => dayjs(b.appointmentDate).isSame(dayjs(), "day"));
  const upcomingBookings = bookings.filter((b: any) => dayjs(b.appointmentDate).isAfter(dayjs(), "day"));
  const getBookings = () => activeTab === "today" ? todayBookings : upcomingBookings;
  const revenue = bookings.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
  const stats = [
    { title: "Total Bookings", value: bookings.length, icon: <CalendarOutlined />, color: "#1890ff" },
    { title: "Today's Bookings", value: todayBookings.length, icon: <ClockCircleOutlined />, color: "#52c41a" },
    { title: "Upcoming", value: upcomingBookings.length, icon: <ClockCircleOutlined />, color: "#fa8c16" },
    { title: "Revenue", value: `$${revenue}`, icon: <DollarOutlined />, color: "#722ed1" },
  ];

  const columns = [
    { title: "Customer", dataIndex: "customerName" },
    { title: "Date", dataIndex: "date" },
    { title: "Time", dataIndex: "time" },
    { title: "Service", dataIndex: "serviceName" },
    { title: "Amount", render: (_: any, record: any) => `$${record.amount}` },
    { title: "Status", render: (_: any, record: any) => <StatusBadge type="booking" value={record.status} /> },
  ];

  if (!currentStaff) return <div className="p-6 text-center"><Card>No staff record found</Card></div>;

  return (
    <div className="p-6">
      <div className="mb-6"><h1 className="text-2xl font-bold">My Dashboard</h1><p className="text-gray-500">View your assigned appointments</p></div>
      <Row gutter={[16, 16]} className="mb-6">
        {stats.map((stat, index) => (<Col xs={24} sm={12} lg={6} key={index}><StatCard title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} /></Col>))}
      </Row>
      <div className="flex gap-4 mb-4">
        <Button type={activeTab === "today" ? "primary" : "default"} onClick={() => setActiveTab("today")}>Today's Appointments</Button>
        <Button type={activeTab === "upcoming" ? "primary" : "default"} onClick={() => setActiveTab("upcoming")}>Upcoming Appointments</Button>
      </div>
      <Card className="shadow-sm border border-gray-100 rounded-xl">
        <p className="p-2 font-medium">{activeTab === "today" ? "Today's Schedule" : "Upcoming Schedule"}</p>
        <DataTable data={getBookings()} columns={columns} loading={isLoading} showActions={false} rowKey="id" />
      </Card>
    </div>
  );
};
export default EmployeeDashboard;