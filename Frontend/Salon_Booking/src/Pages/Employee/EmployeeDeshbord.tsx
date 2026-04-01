import React, { useState, useEffect } from "react";
import { Card, Button, Row, Col, message } from "antd";
import { CalendarOutlined, ClockCircleOutlined, DollarOutlined,} from "@ant-design/icons";
import { StatCard } from "../../Components/Ui/Cards";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import axios from "axios";
import dayjs from "dayjs";

const BOOKING_API = "http://localhost:5296/api/Booking";
const USER_API = "http://localhost:5296/api/User";
const STAFF_API = "http://localhost:5296/api/Staff";
const SERVICE_API = "http://localhost:5296/api/AdminServices";

const EmployeeDeshbord: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"today" | "upcoming">("today");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("authToken");

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const [bookingRes, userRes, staffRes, serviceRes] = await Promise.all([
        axios.get(BOOKING_API, axiosConfig),
        axios.get(USER_API, axiosConfig),
        axios.get(STAFF_API, axiosConfig),
        axios.get(SERVICE_API, axiosConfig),
      ]);

      const users = userRes.data || [];
      const staff = staffRes.data || [];
      const services = serviceRes.data || [];

      const mapped = bookingRes.data.map((b: any, index: number) => {
        const customer = users.find(
          (u: any) => String(u.id || u._id) === String(b.customerId)
        );

        const staffMember = staff.find(
          (s: any) => String(s.id || s._id) === String(b.staffId)
        );

        const service = services.find(
          (s: any) => String(s.id || s._id) === String(b.serviceId)
        );

        return {
          key: b.id || b._id || index,
          id: b.id || b._id,
          customerName: customer?.fullName || customer?.name || "N/A",
          serviceName:
            service?.serviceName ||
            service?.name ||
            service?.title ||
            "N/A",
          appointmentDate: b.appointmentDate,
          time: dayjs(b.appointmentDate).format("hh:mm A"),
          amount: b.amount || 0,
          status: b.status,
          employee: staffMember?.name || "N/A",
        };
      });

      setBookings(mapped);
    } catch (err) {
      console.error(err);
      message.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const todayBookings = bookings.filter((b) =>
    dayjs(b.appointmentDate).isSame(dayjs(), "day")
  );

  const upcomingBookings = bookings.filter((b) =>
    dayjs(b.appointmentDate).isAfter(dayjs(), "day")
  );

  const getBookings = () =>
    activeTab === "today" ? todayBookings : upcomingBookings;

  const revenue = bookings.reduce((sum, b) => sum + b.amount, 0);

  const stats = [
    {
      title: "Total Bookings",
      value: bookings.length,
      icon: <CalendarOutlined />,
      color: "#1890ff",
    },
    {
      title: "Today",
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
      render: (_: any, record: any) => (
        <StatusBadge type="booking" value={record.status} />
      ),
    },
  ];

  return (
    <>
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Employee Dashboard</h1>
        <p className="text-gray-500">View all bookings</p>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <StatCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          </Col>
        ))}
      </Row>

      <div className="flex gap-4 mb-4">
        <Button
          type={activeTab === "today" ? "primary" : "default"}
          onClick={() => setActiveTab("today")}
        >
          Today
        </Button>

        <Button
          type={activeTab === "upcoming" ? "primary" : "default"}
          onClick={() => setActiveTab("upcoming")}
        >
          Upcoming
        </Button>
      </div>

      <Card>
        <DataTable
          data={getBookings()}
          columns={columns}
          loading={loading}
          showActions={false}
          rowKey="id"
        />
      </Card>
    </div>
    </>
  );
};

export default EmployeeDeshbord;