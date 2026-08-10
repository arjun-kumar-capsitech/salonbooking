import { useMemo, useState, useEffect, useRef } from "react";
import { Card, Button, Input, message, Select, Spin } from "antd";
import { SearchOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import Modals from "../../Components/Ui/Modals";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';
import { useSearch } from '../../utils/FilterData';

const { Option } = Select;
const { getApiBooking, getApiStaff, getApiAdminServices, putApiBookingId } = getSalonBookingAPI();

const EmployeeService = () => {
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
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

  const staffMap = useMemo(() => {
    const map: Record<string, string> = {};
    staffList.forEach((s: any) => {
      const id = String(s.id || s._id);
      const name = s.fullName || s.FullName || s.name || s.Name || s.staffName || 'Unknown Staff';
      map[id] = name;
    });
    return map;
  }, [staffList]);

  const { data: servicesData = [] } = useQuery({
    queryKey: ['employeeServiceServices'],
    enabled: !!token,
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

  const getServiceDisplay = (booking: any): string => {
    const serviceIds = booking.serviceIds || booking.ServiceIds || [];
    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      return serviceIds.map((id: string) => serviceMap[String(id)]?.name || 'Unknown').join(', ');
    }
    const singleId = String(booking.serviceId || booking.ServiceId || '');
    if (singleId && serviceMap[singleId]) {
      return serviceMap[singleId].name;
    }
    return booking.serviceName || booking.ServiceName || 'Unknown';
  };

  const getTotalDuration = (booking: any): number => {
    const serviceIds = booking.serviceIds || booking.ServiceIds || [];
    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      return serviceIds.reduce((sum: number, id: string) => {
        const info = serviceMap[String(id)];
        return sum + (info?.duration || 30);
      }, 0);
    }
    const singleId = String(booking.serviceId || booking.ServiceId || '');
    if (singleId && serviceMap[singleId]) {
      return serviceMap[singleId].duration || 30;
    }
    return 30;
  };

  const { data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: loading, isFetching } = useInfiniteQuery({
    queryKey: ['employeeServicesList', staffId, statusFilter],
    enabled: !!token && !!staffId,
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

      const transformedBookings = rawBookings.map((b: any, index: number) => {
        const bookingStaffId = String(b.staffId || b.StaffId);
        const customerName = b.customerName || b.CustomerName || b.customer?.name || b.customer?.Name || "Customer";
        const staffName = staffMap[bookingStaffId] || "Staff";
        
        let status = (b.status || b.Status || "pending").toLowerCase();
        if (status === "complete") status = "completed";

        const dateStr = b.appointmentDate || b.AppointmentDate || '';
        const startTime = b.startTime || b.StartTime || '';
        const endTime = b.endTime || b.EndTime || '';

        const dateFormatted = dayjs(dateStr).format("DD MMM YYYY");
        let timeFormatted = '';
        if (startTime && endTime) {
          timeFormatted = `${startTime} - ${endTime}`;
        } else if (startTime) {
          timeFormatted = startTime;
        } else if (endTime) {
          timeFormatted = endTime;
        } else {
          timeFormatted = dayjs(dateStr).format("hh:mm A");
        }

        return {
          key: b._id || b.id || `${pageParam}-${index}`,
          id: b._id || b.id,
          customerName: customerName,
          staffName: staffName,
          serviceName: getServiceDisplay(b),
          duration: getTotalDuration(b),
          appointmentDate: dateStr,
          date: dateFormatted,
          time: timeFormatted,
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

  const allBookings = useMemo(() => {
    return infiniteData?.pages?.flatMap((page) => page.data) || [];
  }, [infiniteData]);

  const { searchText, setSearchText, filteredData: searchFilteredData } = useSearch(
    allBookings,
    ['customerName', 'serviceName'],
    500
  );

  const filteredBookings = useMemo(() => {
    return searchFilteredData || [];
  }, [searchFilteredData]);

  const completeServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await putApiBookingId(id, { status: "completed" }, axiosConfig);
    },
    onSuccess: () => {
      message.success("Service completed successfully!");
      queryClient.invalidateQueries({ queryKey: ['employeeServicesList'] });
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to complete service");
    }
  });

  const handleStartService = (record: any) => {
    setSelectedBooking(record);
    setModalVisible(true);
  };

  const handleCompleteService = () => {
    if (!selectedBooking) return;
    completeServiceMutation.mutate(selectedBooking.id);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedBooking(null);
  };

  const columns = [
    { 
      title: "Customer", 
      dataIndex: "customerName", 
      render: (text: string) => <div className="font-medium text-gray-800">{text || "N/A"}</div> 
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
          disabled={record.status === "completed" || record.status === "cancelled" || record.status === "pending"} 
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'PT Serif, serif' }}>My Service Tasks</h1>
          <p className="text-gray-600" style={{ fontFamily: 'Public Sans, sans-serif' }}>Manage your assigned service tasks</p>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex gap-4 flex-wrap">
          <Input 
            placeholder="Search by customer or service..." 
            prefix={<SearchOutlined />} 
            style={{ width: 300 }}
            value={searchText} 
            onChange={(e) => setSearchText(e.target.value)} 
            allowClear
          />
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
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex justify-between items-center">
          <div className="p-2">
            My Tasks
            {isFetching && !isFetchingNextPage && <Spin size="small" className="ml-2" />}
          </div>
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
          {!hasNextPage && filteredBookings.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              No tasks found
            </div>
          )}
        </div>
      </Card>

      <Modals 
        open={modalVisible} 
        onClose={handleCloseModal} 
        title={`Service - ${selectedBooking?.customerName || ""}`} 
        onSubmit={handleCompleteService} 
        submitText="Complete Service"
        loading={completeServiceMutation.isPending}
        cancelText="Close"
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-semibold text-lg">{selectedBooking.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Service</p>
              <p className="font-medium">{selectedBooking.serviceName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-medium">{selectedBooking.duration} minutes</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date & Time</p>
              <p className="font-medium">{selectedBooking.date} at {selectedBooking.time}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium capitalize">{selectedBooking.status}</p>
            </div>
          </div>
        )}
      </Modals>
    </div>
  );
};
export default EmployeeService;