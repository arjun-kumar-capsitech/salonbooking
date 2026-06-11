import React, { useState, useMemo } from "react";
import { Card, Button, Input, message, Tag } from "antd";
import { SearchOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Modals from "../../Components/Ui/Modals";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const { getApiBooking, getApiUser, getApiStaff, getApiAdminServices, putApiBookingId } = getSalonBookingAPI();
interface BookingType {
  key: string;
  id: string;
  customerName: string;
  serviceName: string;
  appointmentDate: string;
  date: string;
  time: string;
  amount: number;
  status: string;
  salonName: string;
}

const EmployeeBooking: React.FC = () => {
  const [selectedBooking, setSelectedBooking] = useState<BookingType | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");
  const queryClient = useQueryClient();
  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInUserEmail: string = user?.Email || user?.email;

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const extractData = (response: any): any[] => {
    if (!response || !response.data) return [];
    if (response.data?.status === true && response.data?.result) return response.data.result;
    if (response.data?.result) return response.data.result;
    if (Array.isArray(response.data)) return response.data;
    return [];
  };

  const { data: staffList = [], isLoading: staffLoading } = useQuery({
    queryKey: ['employeeStaffList'],
    enabled: !!token,staleTime: 5000,refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await getApiStaff(axiosConfig);
      return extractData(res);
    }
  });

  const currentStaff = staffList?.find((s: any) => (s.email || s.Email) === loggedInUserEmail);
  const staffId: string = currentStaff?.id || currentStaff?._id;
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['employeeBookingsList'],
    enabled: !!token && !!staffId,
    staleTime: 5000,
    refetchOnWindowFocus: false,
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
      
      return filtered.map((b: any, index: number): BookingType => {
        const customer = users.find((u: any) => String(u.id || u._id) === String(b.customerId || b.CustomerId));
        const service = services.find((s: any) => String(s.id || s._id) === String(b.serviceId || b.ServiceId));
        return {
          key: b._id || b.id || String(index),
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
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await putApiBookingId(id, { status }, axiosConfig);
    },
    onSuccess: (_, { status }) => {
      message.success(`Booking ${status} successfully`);
      queryClient.invalidateQueries({ queryKey: ['employeeBookingsList'] });
      setModalVisible(false);
      setSelectedBooking(null);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to update booking");
    }
  });

  const handleStatusUpdate = (newStatus: string): void => {
    if (selectedBooking) {
      updateStatusMutation.mutate({ id: selectedBooking.id, status: newStatus });
    }
  };
  const filteredBookings = useMemo((): BookingType[] => {
    if (!bookings || bookings.length === 0) return [];
    return bookings.filter((b: BookingType) =>
      b.customerName?.toLowerCase().includes(searchText.toLowerCase()) ||
      b.serviceName?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [bookings, searchText]);
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "completed": return "green";
      case "confirmed": return "blue";
      case "cancelled": return "red";
      default: return "orange";
    }
  };

  const columns = [
    {
      title: "Customer",
      dataIndex: "customerName",
      render: (text: string) => <div className="font-medium text-gray-800">{text || "N/A"}</div>,
    },
    {
      title: "Date & Time",
      render: (_: any, record: BookingType) => (
        <div>
          <div className="font-medium">{record.date || "N/A"}</div>
          <div className="text-xs text-gray-500">{record.time || "N/A"}</div>
        </div>
      ),
    },
    {
      title: "Service",
      dataIndex: "serviceName",
      render: (text: string) => text || "N/A",
    },
    {
      title: "Amount",
      render: (_: any, record: BookingType) => <span>${record.amount || 0}</span>,
    },
    {
      title: "Status",
      render: (_: any, record: BookingType) => <StatusBadge type="booking" value={record.status || "pending"} />,
    },
  ];

  const isLoading: boolean = staffLoading || bookingsLoading;

  if (!token) {
    return (
      <div className="p-6 text-center">
        <Card>Please login to view bookings</Card>
      </div>
    );
  }

  if (!currentStaff && !staffLoading) {
    return (
      <div className="p-6 text-center">
        <Card>No staff record found</Card>
      </div>
    );
  }

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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
      </Card>

      <Card className="shadow-sm border border-gray-100 rounded-xl">
        <p className="p-2 font-medium">My Bookings ({bookings?.length || 0})</p>
        <DataTable
          data={filteredBookings}
          columns={columns}
          loading={isLoading}
          onView={(record: BookingType) => {
            setSelectedBooking(record);
            setModalVisible(true);
          }}
          showActions={true}
          rowKey="key"
        />
      </Card>

      <Modals
        open={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedBooking(null);
        }}
        title={`Booking Details - ${selectedBooking?.customerName || ""}`}
        onSubmit={() => {}}
        submitText="Close"
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
                {selectedBooking.status?.toUpperCase() || "PENDING"}
              </Tag>
            </div>

            {selectedBooking.status !== "completed" && selectedBooking.status !== "cancelled" && (
              <div className="flex gap-3 pt-3">
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleStatusUpdate("confirmed")}
                  loading={updateStatusMutation.isPending}
                >
                  Confirm
                </Button>
                <Button
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleStatusUpdate("completed")}
                  loading={updateStatusMutation.isPending}
                >
                  Complete
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleStatusUpdate("cancelled")}
                  loading={updateStatusMutation.isPending}
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