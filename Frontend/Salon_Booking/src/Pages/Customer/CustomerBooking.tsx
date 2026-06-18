import React, { useMemo, useState, useEffect, useRef } from "react";
import { Card, Row, Col, message, Modal, Button, Spin } from "antd";
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import { StatCard } from "../../Components/Ui/Cards";
import { getSalonBookingAPI } from '../../api/generated';

const { getAllBooking: getApiBooking, getAllStaff: getApiStaff, getAllServices: getApiAdminServices, getAllUsers: getApiUser, updateStatus: putApiBookingId } = getSalonBookingAPI();

const CustomerBookings: React.FC = () => {
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInUserId = user?.id || user?._id;
  const loggedInUserName = user?.fullName || user?.FullName || user?.name || user?.Name || 'Customer';

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
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

  const extractArray = (response: any) => {
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

  const { data: referenceData, isLoading: referenceLoading } = useQuery({
    queryKey: ['customerReferenceData'],
    staleTime: 30000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        let users: any[] = [];
        try {
          const userRes = await getApiUser({ page: 1, pageSize: 1000 }, axiosConfig);
          users = extractArray(userRes);
        } catch (error) {}

        const staffRes = await getApiStaff({ page: 1, pageSize: 1000 }, axiosConfig);
        const staff = extractArray(staffRes);

        const serviceRes = await getApiAdminServices(axiosConfig);
        const services = extractArray(serviceRes);

        const staffMap: Record<string, string> = {};
        const serviceMap: Record<string, string> = {};

        staff.forEach((s: any) => {
          const id = String(s.id || s._id);
          const name = s.name || s.Name || s.fullName || s.FullName || 'Unknown Staff';
          staffMap[id] = name;
        });

        if (users.length > 0) {
          users.forEach((u: any) => {
            const role = u.role || u.Role;
            const roleStr = String(role).toLowerCase();
            if (roleStr === '3' || roleStr === 'employee') {
              const employeeProfileId = u.employeeProfileId || u.EmployeeProfileId;
              if (employeeProfileId) {
                const name = u.fullName || u.FullName || u.name || u.Name || 'Unknown Staff';
                staffMap[String(employeeProfileId)] = name;
              }
            }
          });
        }

        const hardcodedStaff: Record<string, string> = {
          '6a0c27e6e4598fcfa3d4d72d': 'Jayesh',
        };

        Object.entries(hardcodedStaff).forEach(([id, name]) => {
          if (!staffMap[id]) {
            staffMap[id] = name;
          }
        });

        services.forEach((s: any) => {
          const id = String(s.id || s._id);
          const name = s.serviceName || s.ServiceName || s.name || s.Name || 'Unknown Service';
          serviceMap[id] = name;
        });

        return { staffMap, serviceMap };
      } catch (error) {
        return { staffMap: {}, serviceMap: {} };
      }
    },
  });

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['customerBookingsList'],
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    enabled: !!token && !!referenceData,
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const res = await getApiBooking({ page: pageParam, pageSize: 10 }, axiosConfig);
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

        rawBookings = rawBookings.filter((b: any) =>
          String(b.customerId || b.CustomerId) === String(loggedInUserId)
        );

        const transformedBookings = rawBookings.map((b: any, index: number) => {
          const staffId = String(b.staffId || b.StaffId);
          const serviceId = String(b.serviceId || b.ServiceId);

          let status = (b.status || b.Status || "pending").toLowerCase();
          if (status === "complete") status = "completed";

          const customerName = loggedInUserName;
          const staffName = referenceData?.staffMap?.[staffId] || 'Unknown Staff';
          const serviceName = referenceData?.serviceMap?.[serviceId] || 'Unknown Service';

          return {
            key: b.id || b._id || `${pageParam}-${index}`,
            id: b.id || b._id || '',
            customerName: customerName,
            salonName: b.salonName || b.SalonName || 'Unknown',
            serviceName: serviceName,
            staffName: staffName,
            appointmentDate: dayjs(b.appointmentDate || b.AppointmentDate).format("DD MMM YYYY - hh:mm A"),
            amount: b.amount || b.Amount || 0,
            status: status,
          };
        });

        return {
          data: transformedBookings,
          totalCount: pagination?.totalCount || transformedBookings.length,
          hasNextPage: pagination?.hasNextPage || false,
          nextPage: pageParam + 1,
        };
      } catch (error) {
        return {
          data: [],
          totalCount: 0,
          hasNextPage: false,
          nextPage: pageParam + 1,
        };
      }
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

  const cancelBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      await putApiBookingId(id, { status: "cancelled" }, axiosConfig);
    },
    onSuccess: () => {
      message.success("Booking cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ['customerBookingsList'] });
      setCancelModalVisible(false);
      setSelectedBooking(null);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to cancel booking");
    },
  });

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

  const handleCancelBooking = () => {
    if (selectedBooking) {
      cancelBookingMutation.mutate(selectedBooking.id);
    }
  };

  const stats = useMemo(() => [
    {
      title: "Total Bookings",
      value: bookings.length,
      icon: <CalendarOutlined />,
      color: "#000000",
    },
    {
      title: "Completed",
      value: bookings.filter((b: any) => b.status === "completed").length,
      icon: <CheckCircleOutlined />,
      color: "#514fff",
    },
    {
      title: "Pending",
      value: bookings.filter((b: any) => b.status === "pending").length,
      icon: <ClockCircleOutlined />,
      color: "#37dfba",
    },
    {
      title: "Cancelled",
      value: bookings.filter((b: any) => b.status === "cancelled").length,
      icon: <CloseCircleOutlined />,
      color: "#ff4d4f",
    },
    {
      title: "Total Spent",
      value: `$${bookings.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0)}`,
      icon: <CalendarOutlined />,
      color: "#db5800",
    },
  ], [bookings]);

  const columns = [
    {
      title: "Customer Name",
      dataIndex: "customerName",
    },
    {
      title: "Salon Name",
      dataIndex: "salonName",
    },
    {
      title: "Service",
      dataIndex: "serviceName",
    },
    {
      title: "Date & Time",
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
      render: (status: string) => <StatusBadge type="booking" value={status} />,
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

  if (!token) {
    return (
      <div className="p-6 text-center">
        <Card>
          <p>Please login to view your bookings</p>
        </Card>
      </div>
    );
  }

  const isLoading = (loading && !infiniteData) || referenceLoading;

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">My Bookings</h1>
          <p className="text-gray-500">All your appointments</p>
          {totalCount > 0 && (
            <p className="text-sm text-gray-400 mt-1">
              Showing {bookings.length} of {totalCount} bookings
            </p>
          )}
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
          <div className="mb-4 flex justify-between items-center">
            <p className="p-2">
              My Bookings
              {isFetching && !isFetchingNextPage && <Spin size="small" className="ml-2" />}
            </p>
          </div>

          <DataTable
            data={bookings}
            columns={columns}
            loading={isLoading}
            showActions={false}
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
        okButtonProps={{ danger: true, loading: cancelBookingMutation.isPending }}
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