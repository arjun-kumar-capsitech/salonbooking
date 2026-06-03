import React, { useState, useEffect } from "react";
import { Card, Button, Input, message, Progress } from "antd";
import { SearchOutlined, PlayCircleOutlined } from "@ant-design/icons";
import Modals from "../../Components/Ui/Modals";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const { getApiBooking, getApiUser, getApiStaff, getApiAdminServices, putApiBookingId } = getSalonBookingAPI();

const EmployeeService: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [serviceProgress, setServiceProgress] = useState(0);
  const [progressInterval, setProgressInterval] = useState<any>(null);

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
          duration: service?.duration || 30,
          appointmentDate: b.appointmentDate || b.AppointmentDate,
          date: dayjs(b.appointmentDate || b.AppointmentDate).format("DD MMM YYYY"),
          time: dayjs(b.appointmentDate || b.AppointmentDate).format("hh:mm A"),
          status: (b.status || b.Status || "pending").toLowerCase(),
        };
      });

      setBookings(mapped);
    } catch (err) {
      message.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loggedInUserEmail) {
      fetchBookings();
    }
    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, []);

  const handleStartService = (record: any) => {
    setSelectedBooking(record);
    setServiceProgress(0);
    setModalVisible(true);

    const interval = setInterval(() => {
      setServiceProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
    setProgressInterval(interval);
  };

  const handleCompleteService = async () => {
    if (!selectedBooking) return;

    if (serviceProgress < 100) {
      message.warning("Please wait for service to complete");
      return;
    }

    try {
      await putApiBookingId(selectedBooking.id, { status: "completed" }, axiosConfig);
      message.success("Service completed successfully!");
      if (progressInterval) clearInterval(progressInterval);
      fetchBookings();
      setModalVisible(false);
      setSelectedBooking(null);
      setServiceProgress(0);
    } catch (error) {
      message.error("Failed to complete service");
    }
  };

  const handleCloseModal = () => {
    if (progressInterval) clearInterval(progressInterval);
    setModalVisible(false);
    setSelectedBooking(null);
    setServiceProgress(0);
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
      title: "Duration",
      dataIndex: "duration",
      render: (duration: number) => <span>{duration} min</span>,
    },
    {
      title: "Status",
      render: (_: any, record: any) => <StatusBadge type="booking" value={record.status} />,
    },
    {
      title: "Action",
      render: (_: any, record: any) => (
        <Button
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => handleStartService(record)}
          disabled={record.status === "completed" || record.status === "cancelled"}
        >
          Start Service
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Service Tasks</h1>
        <p className="text-gray-500">Manage your assigned service tasks</p>
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
        <p className="p-2 font-medium">My Tasks ({bookings.length})</p>
        <DataTable
          data={filteredBookings}
          columns={columns}
          loading={loading}
          showActions={false}
          rowKey="id"
        />
      </Card>

      <Modals
        open={modalVisible}
        onClose={handleCloseModal}
        title={`Service in Progress - ${selectedBooking?.customerName}`}
        onSubmit={handleCompleteService}
        submitText={serviceProgress >= 100 ? "Complete Service" : "Please Wait..."}
      >
        {selectedBooking && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-semibold text-lg">{selectedBooking.customerName}</p>
              <p className="text-sm text-gray-500 mt-2">Service</p>
              <p className="font-medium">{selectedBooking.serviceName}</p>
              <p className="text-sm text-gray-500 mt-2">Duration</p>
              <p className="font-medium">{selectedBooking.duration} minutes</p>
            </div>

            <div className="text-center">
              <Progress type="circle" percent={serviceProgress} strokeColor="#52c41a" />
              <p className="mt-2 text-gray-500">
                {serviceProgress < 100 ? "Service in progress..." : "Service completed!"}
              </p>
            </div>
          </div>
        )}
      </Modals>
    </div>
  );
};

export default EmployeeService;