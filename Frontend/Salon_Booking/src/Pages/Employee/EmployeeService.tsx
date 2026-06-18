import { useMemo, useState, useEffect, useRef } from "react";
import { Card, Button, Input, message, Progress, Select, Spin } from "antd";
import { SearchOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import Modals from "../../Components/Ui/Modals";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const { Option } = Select;

const { 
  getAllBooking: getApiBooking, 
  getAllStaff: getApiStaff, 
  getAllServices: getApiAdminServices, 
  updateStatus: putApiBookingId 
} = getSalonBookingAPI();

const EmployeeService = () => {
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceProgress, setServiceProgress] = useState(0);
  const [progressInterval, setProgressInterval] = useState<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInUserEmail = user?.Email || user?.email;

  const axiosConfig = {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  };

  const ResponseData = (response: any) => {
    if (!response) return null;
    if (typeof response.data === 'string') {
      try {
        return JSON.parse(response.data);
      } catch {
        return null;
      }
    }
    return response.data;
  };

  const extractData = (response: any) => {
    const parsed = ResponseData(response);
    if (!parsed) return [];
    if (parsed?.status === true && parsed?.result) {
      if (Array.isArray(parsed.result)) {
        return parsed.result;
      }
      if (parsed.result?.data && Array.isArray(parsed.result.data)) {
        return parsed.result.data;
      }
    }
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed?.data && Array.isArray(parsed.data)) {
      return parsed.data;
    }
    return [];
  };

  const { data: staffList = [], isLoading: staffLoading } = useQuery({
    queryKey: ['employeeServiceStaff'],
    enabled: !!token,
    staleTime: 5000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await getApiStaff({ page: 1, pageSize: 1000 }, axiosConfig);
      return extractData(res);
    }
  });

  const currentStaff = staffList.find((s: any) => {
    const staffEmail = s.email || s.Email || s.Email;
    return staffEmail?.toLowerCase() === loggedInUserEmail?.toLowerCase();
  });

  const staffId = currentStaff?.id || currentStaff?._id;

  const { data: servicesData = [] } = useQuery({
    queryKey: ['employeeServiceServices'],
    enabled: !!token,
    staleTime: 5000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await getApiAdminServices(axiosConfig);
      return extractData(res);
    }
  });

  const serviceMap = useMemo(() => {
    const map: Record<string, any> = {};
    servicesData.forEach((s: any) => {
      const id = String(s.id || s._id);
      map[id] = {
        name: s.serviceName || s.ServiceName || s.name || s.Name || 'Unknown',
        duration: s.duration || s.Duration || 30
      };
    });
    return map;
  }, [servicesData]);

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['employeeServicesList', staffId, statusFilter, searchInput],
    enabled: !!token && !!staffId,
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const res = await getApiBooking({ page: pageParam, pageSize: 5 }, axiosConfig);
      const parsedData = ResponseData(res);

      if (!parsedData?.status === true || !parsedData?.result?.data) {
        return {
          data: [],
          totalCount: 0,
          hasNextPage: false,
          nextPage: pageParam + 1,
        };
      }

      let rawBookings = parsedData.result.data;
      const pagination = parsedData.result.pagination;

      rawBookings = rawBookings.filter((b: any) => {
        const bookingStaffId = String(b.staffId || b.StaffId);
        return bookingStaffId === String(staffId);
      });

      if (statusFilter !== 'all') {
        rawBookings = rawBookings.filter((b: any) => {
          const status = (b.status || b.Status || "").toLowerCase();
          return status === statusFilter.toLowerCase();
        });
      }

      if (searchInput) {
        const searchLower = searchInput.toLowerCase();
        rawBookings = rawBookings.filter((b: any) => {
          const customerName = user?.fullName || user?.FullName || user?.name || user?.Name || '';
          const serviceId = String(b.serviceId || b.ServiceId);
          const serviceName = serviceMap[serviceId]?.name || '';
          return customerName.toLowerCase().includes(searchLower) ||
            serviceName.toLowerCase().includes(searchLower);
        });
      }

      const transformedBookings = rawBookings.map((b: any, index: number) => {
        const serviceId = String(b.serviceId || b.ServiceId);
        const customerName = user?.fullName || user?.FullName || user?.name || user?.Name || "Customer";
        const serviceInfo = serviceMap[serviceId] || { name: "N/A", duration: 30 };

        let status = (b.status || b.Status || "pending").toLowerCase();
        if (status === "complete") status = "completed";

        return {
          key: b._id || b.id || `${pageParam}-${index}`,
          id: b._id || b.id,
          customerName: customerName,
          serviceName: serviceInfo.name,
          duration: serviceInfo.duration,
          appointmentDate: b.appointmentDate || b.AppointmentDate,
          date: dayjs(b.appointmentDate || b.AppointmentDate).format("DD MMM YYYY"),
          time: dayjs(b.appointmentDate || b.AppointmentDate).format("hh:mm A"),
          status: status,
          salonName: b.salonName || b.SalonName || "N/A",
        };
      });

      return {
        data: transformedBookings,
        totalCount: pagination?.totalCount || transformedBookings.length,
        hasNextPage: pagination?.hasNextPage || false,
        nextPage: pageParam + 1,
      };
    },
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextPage : undefined,
  });

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const bookings = useMemo(() => {
    return infiniteData?.pages?.flatMap((page) => page.data) || [];
  }, [infiniteData]);

  const totalCount = infiniteData?.pages?.[0]?.totalCount || 0;

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
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to complete service");
    }
  });

  const handleStartService = (record: any) => {
    setSelectedBooking(record);
    setServiceProgress(0);
    setModalVisible(true);
    const interval = window.setInterval(() => {
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

  const handleSearch = () => {
    setSearchInput(searchText);
  };

  const filteredBookings = useMemo(() => {
    return bookings;
  }, [bookings]);

  const columns = [
    { 
      title: "Customer", 
      dataIndex: "customerName", 
      render: (text: string) => <div className="font-medium text-gray-800">{text}</div> 
    },
    { 
      title: "Date & Time", 
      render: (_: any, record: any) => (
        <div>
          <div className="font-medium">{record.date}</div>
          <div className="text-xs text-gray-500">{record.time}</div>
        </div>
      ) 
    },
    { title: "Service", dataIndex: "serviceName" },
    { 
      title: "Duration", 
      dataIndex: "duration", 
      render: (duration: number) => <span>{duration} min</span> 
    },
    { 
      title: "Status", 
      render: (_: any, record: any) => <StatusBadge type="booking" value={record.status} /> 
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
      ) 
    },
  ];

  const isLoading = (loading && !infiniteData) || staffLoading;

  if (!token) {
    return (
      <div className="p-6 text-center">
        <Card>Please login to view services</Card>
      </div>
    );
  }

  if (!currentStaff && !staffLoading) {
    return (
      <div className="p-6 text-center">
        <Card>No staff record found for this account</Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Service Tasks</h1>
        <p className="text-gray-500">Manage your assigned service tasks</p>
        {totalCount > 0 && (
          <p className="text-sm text-gray-400 mt-1">
            Showing {bookings.length} of {totalCount} tasks
          </p>
        )}
      </div>

      <Card className="shadow-sm border border-gray-100 rounded-xl mb-6">
        <div className="flex gap-4 flex-wrap">
          <Input 
            placeholder="Search by customer or service..." 
            prefix={<SearchOutlined />} 
            value={searchText} 
            onChange={(e) => setSearchText(e.target.value)} 
            onPressEnter={handleSearch}
            style={{ width: 300 }} 
            allowClear
          />
          <Button type="primary" onClick={handleSearch}>
            Search
          </Button>
          <Select
            style={{ width: 140 }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="all">All Status</Option>
            <Option value="confirmed">Confirmed</Option>
            <Option value="completed">Completed</Option>
            <Option value="cancelled">Cancelled</Option>
            <Option value="pending">Pending</Option>
          </Select>
          <div className="text-gray-500 flex items-center">
            Showing {filteredBookings.length} tasks
          </div>
        </div>
      </Card>

      <Card className="shadow-sm border border-gray-100 rounded-xl">
        <div className="mb-4 flex justify-between items-center">
          <p className="p-2 font-medium">
            My Tasks
            {isFetching && !isFetchingNextPage && <Spin size="small" className="ml-2" />}
          </p>
        </div>

        <DataTable 
          data={filteredBookings} 
          columns={columns} 
          loading={isLoading} 
          showActions={false} 
          rowKey="key" 
        />

        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="text-center py-4">
              <Spin size="large" />
              <p className="mt-2 text-gray-500">Loading more tasks...</p>
            </div>
          )}

          {!hasNextPage && bookings.length > 0 && bookings.length === totalCount && (
            <div className="text-center py-4 text-green-600">
              All {totalCount} tasks loaded successfully!
            </div>
          )}

          {!hasNextPage && bookings.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              No tasks found
            </div>
          )}
        </div>
      </Card>

      <Modals 
        open={modalVisible} 
        onClose={handleCloseModal} 
        title={`Service in Progress - ${selectedBooking?.customerName || ""}`} 
        onSubmit={handleCompleteService} 
        submitText={serviceProgress >= 100 ? "Complete Service" : "Please Wait..."}
        loading={completeServiceMutation.isPending}
        // submitDisabled={serviceProgress < 100}
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
              <Progress 
                type="circle" 
                percent={serviceProgress} 
                strokeColor={serviceProgress === 100 ? "#52c41a" : "#1890ff"} 
              />
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