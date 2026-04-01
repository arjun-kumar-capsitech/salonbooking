import React, { useState, useEffect } from "react";
import { Card, Row, Col, message } from "antd";
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import { StatCard } from "../../Components/Ui/Cards";

const BOOKING_API = "http://localhost:5296/api/Booking";
const USER_API = "http://localhost:5296/api/User";
const STAFF_API = "http://localhost:5296/api/Staff";
const SERVICE_API = "http://localhost:5296/api/AdminServices";

const CustomerBookings: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInUserId = user?.id || user?._id;

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(USER_API, axiosConfig);
      const onlyCustomers = res.data.filter((u: any) => u.role === 4);
      setCustomers(onlyCustomers);
    } catch {
      message.error("Failed to load customers");
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await axios.get(STAFF_API, axiosConfig);
      setStaff(res.data);
    } catch {
      message.error("Failed to load staff");
    }
  };

  const fetchServices = async () => {
    try {
      const res = await axios.get(SERVICE_API, axiosConfig);
      setServices(res.data);
    } catch {
      message.error("Failed to load services");
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(BOOKING_API, axiosConfig);

      const filtered = res.data.filter(
        (b: any) => String(b.customerId) === String(loggedInUserId)
      );

      const mappedBookings = filtered.map((b: any, index: number) => {
        const staffMember = staff.find(
          (s) => String(s.id || s._id) === String(b.staffId)
        );
        const service = services.find(
          (s) => String(s.id || s._id) === String(b.serviceId)
        );

        const statusValue = (b.status || "").toLowerCase();

        return {
          key: b.id || b._id || index,
          id: b.id || b._id,
          salonName: b.salonName || "Unknown",
          staffName: staffMember?.name || "Unknown",
          serviceName: service?.serviceName || "Unknown",
          appointmentDate: dayjs(b.appointmentDate).format(
            "DD MMM YYYY - hh:mm A"
          ),
          amount: b.amount,
          status:
            statusValue === "completed"
              ? "completed"
              : statusValue === "confirmed"
                ? "confirmed"
                : statusValue === "cancelled"
                  ? "cancelled"
                  : "pending",
        };
      });

      setBookings(mappedBookings);
    } catch {
      message.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchStaff();
    fetchServices();
  }, []);

  useEffect(() => {
    if (customers.length && staff.length && services.length) {
      fetchBookings();
    }
  }, [customers, staff, services]);

  const stats = [
    {
      title: "Total Bookings",
      value: bookings.length,
      icon: <CalendarOutlined />,
      color: "#000000",
    },
    {
      title: "Completed",
      value: bookings.filter((b) => b.status === "completed").length,
      icon: <CheckCircleOutlined />,
      color: "#514fff",
    },
    {
      title: "Pending",
      value: bookings.filter((b) => b.status === "pending").length,
      icon: <ClockCircleOutlined />,
      color: "#37dfba",
    },
    {
      title: "Total Spent",
      value: `$${bookings.reduce(
        (sum, b) => sum + Number(b.amount || 0),
        0
      )}`,
      icon: <CalendarOutlined />,
      color: "#db5800",
    },
  ];

  const columns = [
    {
      title: "Salon Name",
      dataIndex: "salonName",
    },
    {
      title: "Service",
      dataIndex: "serviceName",
    },
    {
      title: "Date",
      dataIndex: "appointmentDate",
    },
    {
      title: "Staff",
      dataIndex: "staffName",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      render: (amount: number) => `$${amount}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => (
        <StatusBadge type="booking" value={status} />
      ),
    },
  ];

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">My Bookings</h1>
          <p className="text-gray-500">All your appointments</p>
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

        <Card className="shadow-sm border border-gray-100">
          <DataTable
            data={bookings}
            columns={columns}
            loading={loading}
            showActions={false}
          />
        </Card>
      </div>
    </>
  );
};

export default CustomerBookings;