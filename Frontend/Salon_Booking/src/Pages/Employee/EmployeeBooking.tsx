import React, { useState, useMemo, useEffect, useRef } from "react";
import { Card, Button, Input, message, Tag, Spin } from "antd";
import { SearchOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import Modals from "../../Components/Ui/Modals";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const { getAllBooking: getApiBooking, getAllStaff: getApiStaff, getAllServices: getApiAdminServices, updateStatus: putApiBookingId } = getSalonBookingAPI();

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
  const [searchInput, setSearchInput] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInUserEmail: string = user?.Email || user?.email || user?.Email;

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
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

  const extractData = (response: any): any[] => {
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
    queryKey: ['employeeStaffList'],
    enabled: !!token,
    staleTime: 5000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await getApiStaff({ page: 1, pageSize: 1000 }, axiosConfig);
      return extractData(res);
    }
  });

  const currentStaff = staffList?.find((s: any) => {
    const staffEmail = s.email || s.Email || s.Email;
    return staffEmail?.toLowerCase() === loggedInUserEmail?.toLowerCase();
  });

  const staffId: string = currentStaff?.id || currentStaff?._id;

  const { data: servicesData = [] } = useQuery({
    queryKey: ['employeeServices'],
    enabled: !!token,
    staleTime: 5000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await getApiAdminServices(axiosConfig);
      return extractData(res);
    }
  });

  const serviceMap = useMemo(() => {
    const map: Record<string, string> = {};
    servicesData.forEach((s: any) => {
      const id = String(s.id || s._id);
      const name = s.serviceName || s.ServiceName || s.name || s.Name || 'Unknown';
      map[id] = name;
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
    queryKey: ['employeeBookingsList', staffId, searchInput],
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

      if (searchInput) {
        const searchLower = searchInput.toLowerCase();
        rawBookings = rawBookings.filter((b: any) => {
          const customerName = user?.fullName || user?.FullName || user?.name || user?.Name || '';
          const serviceId = String(b.serviceId || b.ServiceId);
          const serviceName = serviceMap[serviceId] || '';
          return customerName.toLowerCase().includes(searchLower) ||
            serviceName.toLowerCase().includes(searchLower);
        });
      }

      const transformedBookings = rawBookings.map((b: any, index: number): BookingType => {
        const serviceId = String(b.serviceId || b.ServiceId);
        const customerName = user?.fullName || user?.FullName || user?.name || user?.Name || "Customer";

        return {
          key: b._id || b.id || `${pageParam}-${index}`,
          id: b._id || b.id,
          customerName: customerName,
          serviceName: serviceMap[serviceId] || "N/A",
          appointmentDate: b.appointmentDate || b.AppointmentDate,
          date: dayjs(b.appointmentDate || b.AppointmentDate).format("DD MMM YYYY"),
          time: dayjs(b.appointmentDate || b.AppointmentDate).format("hh:mm A"),
          amount: b.amount || b.Amount || 0,
          status: (b.status || b.Status || "pending").toLowerCase(),
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

  const handleSearch = () => {
    setSearchInput(searchText);
  };

  const filteredBookings = useMemo((): BookingType[] => {
    return bookings;
  }, [bookings]);

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

  const isLoading = (loading && !infiniteData) || staffLoading;

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
        <Card>No staff record found for this account</Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Assigned Bookings</h1>
        <p className="text-gray-500">View and manage your assigned appointments</p>
        {totalCount > 0 && (
          <p className="text-sm text-gray-400 mt-1">
            Showing {bookings.length} of {totalCount} bookings
          </p>
        )}
      </div>

      <Card className="shadow-sm border border-gray-100 rounded-xl mb-6">
        <div className="flex gap-4">
          <Input
            placeholder="Search by customer or service..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 300 }}
            allowClear
          />
          <Button type="primary" onClick={handleSearch}>
            Search
          </Button>
        </div>
      </Card>

      <Card className="shadow-sm border border-gray-100 rounded-xl">
        <div className="mb-4 flex justify-between items-center">
          <p className="p-2 font-medium">
            My Bookings
            {isFetching && !isFetchingNextPage && <Spin size="small" className="ml-2" />}
          </p>
        </div>

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

        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="text-center py-4">
              <Spin size="large" />
              <p className="mt-2 text-gray-500">Loading more bookings...</p>
            </div>
          )}

          {!hasNextPage && bookings.length > 0 && bookings.length === totalCount && (
            <div className="text-center py-4 text-green-600">
              All {totalCount} bookings loaded successfully!
            </div>
          )}

          {!hasNextPage && bookings.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              No bookings found
            </div>
          )}
        </div>
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
              <p className="text-sm text-gray-500">Salon</p>
              <p className="font-medium">{selectedBooking.salonName}</p>
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
              <div className="flex gap-3 pt-3 flex-wrap">
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
                  type="primary"
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