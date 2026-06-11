import { useMemo, useState,} from "react";
import { Card, Button, Input, message, Progress } from "antd";
import { SearchOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Modals from "../../Components/Ui/Modals";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const { getApiBooking, getApiUser, getApiStaff, getApiAdminServices, putApiBookingId } = getSalonBookingAPI();
const EmployeeService = () => {
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [serviceProgress, setServiceProgress] = useState(0);
  const [progressInterval, setProgressInterval] = useState<number | null>(null);
  const queryClient = useQueryClient();
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
    queryKey: ['employeeServiceStaff'],
    enabled: !!token,
    queryFn: async () => {
      const res = await getApiStaff(axiosConfig);
      return extractData(res);
    }
  });

  const currentStaff = staffList.find((s: any) => (s.email || s.Email) === loggedInUserEmail);
  const staffId = currentStaff?.id || currentStaff?._id;
  const { data: bookings = [], isLoading,} = useQuery({
    queryKey: ['employeeServicesList'],
    enabled: !!token && !!staffId,staleTime: 5000,refetchOnWindowFocus: false,
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
          duration: service?.duration || 30,
          appointmentDate: b.appointmentDate || b.AppointmentDate,
          date: dayjs(b.appointmentDate || b.AppointmentDate).format("DD MMM YYYY"),
          time: dayjs(b.appointmentDate || b.AppointmentDate).format("hh:mm A"),
          status: (b.status || b.Status || "pending").toLowerCase(),
        };
      });
    }
  });

  const completeServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await putApiBookingId(id, { status: "completed" }, axiosConfig);
    },
    onSuccess: () => {
      message.success("Service completed successfully!");
      if (progressInterval) clearInterval(progressInterval);
      queryClient.invalidateQueries({ queryKey: ['employeeServicesList'] });
      setModalVisible(false);
      setSelectedBooking(null);
      setServiceProgress(0);
    },
    onError: () => {
      message.error("Failed to complete service");
    }
  });

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

  const handleCompleteService = () => {
    if (!selectedBooking) return;
    if (serviceProgress < 100) {
      message.warning("Please wait for service to complete");
      return;
    }
    completeServiceMutation.mutate(selectedBooking.id);
  };

  const handleCloseModal = () => {
    if (progressInterval) clearInterval(progressInterval);
    setModalVisible(false);
    setSelectedBooking(null);
    setServiceProgress(0);
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b: any) =>
      b.customerName?.toLowerCase().includes(searchText.toLowerCase()) ||
      b.serviceName?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [bookings, searchText]);

  const columns = [
    { title: "Customer", dataIndex: "customerName", render: (text: string) => <div className="font-medium text-gray-800">{text}</div> },
    { title: "Date & Time", render: (_: any, record: any) => (<div><div className="font-medium">{record.date}</div><div className="text-xs text-gray-500">{record.time}</div></div>) },
    { title: "Service", dataIndex: "serviceName" },
    { title: "Duration", dataIndex: "duration", render: (duration: number) => <span>{duration} min</span> },
    { title: "Status", render: (_: any, record: any) => <StatusBadge type="booking" value={record.status} /> },
    { title: "Action", render: (_: any, record: any) => (<Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => handleStartService(record)} disabled={record.status === "completed" || record.status === "cancelled"}>Start Service</Button>) },
  ];

  if (!currentStaff) return <div className="p-6 text-center"><Card>No staff record found</Card></div>;

  return (
    <div className="p-6">
      <div className="mb-6"><h1 className="text-2xl font-bold">My Service Tasks</h1><p className="text-gray-500">Manage your assigned service tasks</p></div>
      <Card className="shadow-sm border border-gray-100 rounded-xl mb-6">
        <Input placeholder="Search by customer or service..." prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 300 }} />
      </Card>
      <Card className="shadow-sm border border-gray-100 rounded-xl">
        <p className="p-2 font-medium">My Tasks ({bookings.length})</p>
        <DataTable data={filteredBookings} columns={columns} loading={isLoading} showActions={false} rowKey="id" />
      </Card>
      <Modals open={modalVisible} onClose={handleCloseModal} title={`Service in Progress - ${selectedBooking?.customerName}`} onSubmit={handleCompleteService} submitText={serviceProgress >= 100 ? "Complete Service" : "Please Wait..."}>
        {selectedBooking && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Customer</p><p className="font-semibold text-lg">{selectedBooking.customerName}</p>
              <p className="text-sm text-gray-500 mt-2">Service</p><p className="font-medium">{selectedBooking.serviceName}</p>
              <p className="text-sm text-gray-500 mt-2">Duration</p><p className="font-medium">{selectedBooking.duration} minutes</p>
            </div>
            <div className="text-center"><Progress type="circle" percent={serviceProgress} strokeColor="#52c41a" /><p className="mt-2 text-gray-500">{serviceProgress < 100 ? "Service in progress..." : "Service completed!"}</p></div>
          </div>
        )}
      </Modals>
    </div>
  );
};
export default EmployeeService;