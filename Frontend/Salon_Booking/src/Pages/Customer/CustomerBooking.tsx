import React, { useState, useEffect } from "react";
import { Card, Row, Col, message, Modal, Button } from "antd";
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
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
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

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
          status: statusValue,
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

  // 🔥 Cancel booking function
  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    try {
      await axios.put(
        `${BOOKING_API}/${selectedBooking.id}`,
        { status: "cancelled" },
        axiosConfig
      );
      message.success("Booking cancelled successfully");
      fetchBookings();
      setCancelModalVisible(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error(error);
      message.error("Failed to cancel booking");
    }
  };

  const showCancelConfirm = (record: any) => {
    if (record.status === "cancelled") {
      message.warning("This booking is already cancelled");
      return;
    }
    if (record.status === "completed") {
      message.warning("Cannot cancel completed booking");
      return;
    }
    setSelectedBooking(record);
    setCancelModalVisible(true);
  };

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
      title: "Cancelled",
      value: bookings.filter((b) => b.status === "cancelled").length,
      icon: <CloseCircleOutlined />,
      color: "#ff4d4f",
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
    {
      title: "Action",
      key: "action",
      render: (_: any, record: any) => (
        <Button
          type="link"
          danger
          size="small"
          onClick={() => showCancelConfirm(record)}
          disabled={record.status === "cancelled" || record.status === "completed"}
          icon={<CloseCircleOutlined />}
        >
          Cancel
        </Button>
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

      <Modal
        title="Cancel Booking"
        open={cancelModalVisible}
        onOk={handleCancelBooking}
        onCancel={() => {
          setCancelModalVisible(false);
          setSelectedBooking(null);
        }}
        okText="Yes, Cancel"
        cancelText="No, Go Back"
        okButtonProps={{ danger: true }}
      >
        <div className="py-4">
          <p className="text-lg font-semibold mb-2">Are you sure you want to cancel this booking?</p>
          {selectedBooking && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p><strong>Salon:</strong> {selectedBooking.salonName}</p>
              <p><strong>Service:</strong> {selectedBooking.serviceName}</p>
              <p><strong>Date:</strong> {selectedBooking.appointmentDate}</p>
              <p><strong>Amount:</strong> ${selectedBooking.amount}</p>
            </div>
          )}
          <p className="text-red-500 text-sm mt-4">This action cannot be undone.</p>
        </div>
      </Modal>
    </>
  );
};

export default CustomerBookings;