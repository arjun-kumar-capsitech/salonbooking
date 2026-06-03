import React, { useState, useEffect } from "react";
import { Card, Button, Row, Col, message } from "antd";
import { CalendarOutlined, ClockCircleOutlined, DollarOutlined } from "@ant-design/icons";
import { StatCard } from "../../Components/Ui/Cards";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const { getApiBooking, getApiUser, getApiStaff, getApiAdminServices } = getSalonBookingAPI();

const EmployeeDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"today" | "upcoming">("today");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInUserEmail = user?.Email || user?.email;

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const extractData = (response: any) => {
    if (!response || !response.data) return [];
    if (response.data?.status === true && response.data?.result) {
      return response.data.result;
    }
    if (response.data?.result) {
      return response.data.result;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const staffRes = await getApiStaff(axiosConfig);
      const staffList = extractData(staffRes);

      const currentStaff = staffList.find((s: any) =>
        (s.email || s.Email) === loggedInUserEmail
      );

      if (!currentStaff) {
        setLoading(false);
        return;
      }

      const staffId = currentStaff.id || currentStaff._id;

      const [bookingRes, userRes, serviceRes] = await Promise.all([
        getApiBooking(axiosConfig),
        getApiUser(axiosConfig),
        getApiAdminServices(axiosConfig),
      ]);

      const users = extractData(userRes);
      const services = extractData(serviceRes);
      const bookingsData = extractData(bookingRes);

      const filteredBookings = bookingsData.filter((b: any) => {
        const bookingStaffId = b.staffId || b.StaffId;
        return String(bookingStaffId) === String(staffId);
      });

      const mapped = filteredBookings.map((b: any, index: number) => {
        const customer = users.find(
          (u: any) => String(u.id || u._id) === String(b.customerId || b.CustomerId)
        );

        const service = services.find(
          (s: any) => String(s.id || s._id) === String(b.serviceId || b.ServiceId)
        );

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

      setBookings(mapped);
    } catch (err) {
      message.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loggedInUserEmail) {
      fetchBookings();
    }
  }, []);

  const todayBookings = bookings.filter((b) =>
    dayjs(b.appointmentDate).isSame(dayjs(), "day")
  );

  const upcomingBookings = bookings.filter((b) =>
    dayjs(b.appointmentDate).isAfter(dayjs(), "day")
  );

  const getBookings = () =>
    activeTab === "today" ? todayBookings : upcomingBookings;

  const revenue = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);

  const stats = [
    {
      title: "Total Bookings",
      value: bookings.length,
      icon: <CalendarOutlined />,
      color: "#1890ff",
    },
    {
      title: "Today's Bookings",
      value: todayBookings.length,
      icon: <ClockCircleOutlined />,
      color: "#52c41a",
    },
    {
      title: "Upcoming",
      value: upcomingBookings.length,
      icon: <ClockCircleOutlined />,
      color: "#fa8c16",
    },
    {
      title: "Revenue",
      value: `$${revenue}`,
      icon: <DollarOutlined />,
      color: "#722ed1",
    },
  ];

  const columns = [
    {
      title: "Customer",
      dataIndex: "customerName",
    },
    {
      title: "Date",
      dataIndex: "date",
    },
    {
      title: "Time",
      dataIndex: "time",
    },
    {
      title: "Service",
      dataIndex: "serviceName",
    },
    {
      title: "Amount",
      render: (_: any, record: any) => `$${record.amount}`,
    },
    {
      title: "Status",
      render: (_: any, record: any) => <StatusBadge type="booking" value={record.status} />,
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <p className="text-gray-500">View your assigned appointments</p>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <StatCard title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
          </Col>
        ))}
      </Row>

      <div className="flex gap-4 mb-4">
        <Button type={activeTab === "today" ? "primary" : "default"} onClick={() => setActiveTab("today")}>
          Today's Appointments
        </Button>
        <Button type={activeTab === "upcoming" ? "primary" : "default"} onClick={() => setActiveTab("upcoming")}>
          Upcoming Appointments
        </Button>
      </div>

      <Card className="shadow-sm border border-gray-100 rounded-xl">
        <p className="p-2 font-medium">
          {activeTab === "today" ? "Today's Schedule" : "Upcoming Schedule"}
        </p>
        <DataTable data={getBookings()} columns={columns} loading={loading} showActions={false} rowKey="id" />
      </Card>
    </div>
  );
};

export default EmployeeDashboard;