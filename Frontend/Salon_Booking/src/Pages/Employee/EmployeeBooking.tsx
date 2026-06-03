import React, { useEffect, useState } from "react";
import { Card, Button, Input, message, Tag } from "antd";
import { SearchOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import Modals from "../../Components/Ui/Modals";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const { getApiBooking, getApiUser, getApiStaff, getApiAdminServices, putApiBookingId } = getSalonBookingAPI();

const EmployeeBooking: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
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
          salonName: b.salonName || b.SalonName || "N/A",
        };
      });

      setBookings(mapped);
    } catch (err) {
      message.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loggedInUserEmail) {
      fetchBookings();
    }
  }, []);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedBooking) return;
    try {
      await putApiBookingId(selectedBooking.id, { status: newStatus }, axiosConfig);
      message.success(`Booking ${newStatus} successfully`);
      fetchBookings();
      setModalVisible(false);
      setSelectedBooking(null);
    } catch (error) {
      message.error("Failed to update booking");
    }
  };

  const filteredBookings = bookings.filter(
    (b) =>
      b.customerName?.toLowerCase().includes(searchText.toLowerCase()) ||
      b.serviceName?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: "Customer",
      dataIndex: "customerName",
      render: (text: string) => <div className="font-medium text-gray-800">{text}</div>,
    },
    {
      title: "Date & Time",
      render: (_: any, record: any) => (
        <div>
          <div className="font-medium">{record.date}</div>
          <div className="text-xs text-gray-500">{record.time}</div>
        </div>
      ),
    },
    {
      title: "Service",
      dataIndex: "serviceName",
    },
    {
      title: "Amount",
      render: (_: any, record: any) => <span>${record.amount}</span>,
    },
    {
      title: "Status",
      render: (_: any, record: any) => <StatusBadge type="booking" value={record.status} />,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "green";
      case "confirmed": return "blue";
      case "cancelled": return "red";
      default: return "orange";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Assigned Bookings</h1>
        <p className="text-gray-500">View and manage your assigned appointments</p>
      </div>

      <Card className="shadow-sm border border-gray-100 rounded-xl mb-6">
        <Input
          placeholder="Search by customer or service..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />
      </Card>

      <Card className="shadow-sm border border-gray-100 rounded-xl">
        <p className="p-2 font-medium">My Bookings ({bookings.length})</p>
        <DataTable
          data={filteredBookings}
          columns={columns}
          loading={loading}
          onView={(record) => {
            setSelectedBooking(record);
            setModalVisible(true);
          }}
          showActions={true}
          rowKey="id"
        />
      </Card>

      <Modals
        open={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedBooking(null);
        }}
        title={`Booking Details - ${selectedBooking?.customerName}`}
        onSubmit={() => { }}
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="border-b pb-3">
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium text-lg">{selectedBooking.customerName}</p>
            </div>
            <div className="border-b pb-3">
              <p className="text-sm text-gray-500">Service</p>
              <p className="font-medium">{selectedBooking.serviceName}</p>
            </div>
            <div className="border-b pb-3">
              <p className="text-sm text-gray-500">Date & Time</p>
              <p className="font-medium">{selectedBooking.date} at {selectedBooking.time}</p>
            </div>
            <div className="border-b pb-3">
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-medium text-lg text-green-600">${selectedBooking.amount}</p>
            </div>
            <div className="border-b pb-3">
              <p className="text-sm text-gray-500">Status</p>
              <Tag color={getStatusColor(selectedBooking.status)}>
                {selectedBooking.status.toUpperCase()}
              </Tag>
            </div>

            {selectedBooking.status !== "completed" && selectedBooking.status !== "cancelled" && (
              <div className="flex gap-3 pt-3">
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleStatusUpdate("confirmed")}
                >
                  Confirm
                </Button>
                <Button
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleStatusUpdate("completed")}
                >
                  Complete
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleStatusUpdate("cancelled")}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </Modals>
    </div>
  );
};

export default EmployeeBooking;