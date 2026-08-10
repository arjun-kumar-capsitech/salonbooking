import React, { useMemo, useState, useEffect, useRef } from "react";
import { Card, Row, Col, message, Modal, Button, Spin, Input, Space, Divider, Select, Tag } from "antd";
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, FileTextOutlined, DollarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import { StatCard } from "../../Components/Ui/Cards";
import { getSalonBookingAPI } from '../../api/generated';

const { getApiBooking, getApiStaff, getApiAdminServices, getApiUser, putApiBookingId } = getSalonBookingAPI();

const CustomerBookings: React.FC = () => {
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelMessage, setCancelMessage] = useState<string>("");
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

  const cancellationReasons = [
    { value: "schedule_conflict", label: "Schedule Conflict" },
    { value: "change_of_plans", label: "Change of Plans" },
    { value: "emergency", label: "Emergency" },
    { value: "illness", label: "Illness" },
    { value: "weather", label: "Weather Conditions" },
    { value: "transportation", label: "Transportation Issues" },
    { value: "financial", label: "Financial Constraints" },
    { value: "found_better", label: "Found Better Option" },
    { value: "staff_unavailable", label: "Staff Unavailable" },
    { value: "service_change", label: "Service Change" },
    { value: "salon_location", label: "Location Issues" },
    { value: "quality_concern", label: "Quality Concern" },
    { value: "pricing", label: "Pricing Issues" },
    { value: "appointment_time", label: "Time Slot Issue" },
    { value: "other", label: "Other Reason" }
  ];

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
          // ✅ service names from serviceIds array
          let serviceNames: string[] = [];
          const serviceIdsArray = b.serviceIds || b.ServiceIds || [];
          if (Array.isArray(serviceIdsArray) && serviceIdsArray.length > 0) {
            serviceNames = serviceIdsArray.map((id: string) => {
              const name = referenceData?.serviceMap?.[String(id)] || 'Unknown Service';
              return name;
            });
          } else {
            const singleId = String(b.serviceId || b.ServiceId || '');
            if (singleId && referenceData?.serviceMap?.[singleId]) {
              serviceNames = [referenceData.serviceMap[singleId]];
            } else {
              serviceNames = ['Unknown Service'];
            }
          }
          const serviceDisplay = serviceNames.join(', ');

          let dateStr = b.appointmentDate || b.AppointmentDate || '';
          const startTime = b.startTime || b.StartTime || '';
          const endTime = b.endTime || b.EndTime || '';

          let displayDateTime = 'Invalid Date';
          if (dateStr && startTime && endTime) {
            const formattedDate = dayjs(dateStr).format('DD MMM YYYY');
            displayDateTime = `${formattedDate} - ${startTime} to ${endTime}`;
          } else if (dateStr) {
            displayDateTime = dayjs(dateStr).format('DD MMM YYYY - hh:mm A');
          }

          let status = (b.status || b.Status || "pending").toLowerCase();
          if (status === "complete") status = "completed";

          const customerName = loggedInUserName;
          const staffId = String(b.staffId || b.StaffId || '');
          const staffName = referenceData?.staffMap?.[staffId] || 'Unknown Staff';

          return {
            key: b.id || b._id || `${pageParam}-${index}`,
            id: b.id || b._id || '',
            customerName: customerName,
            salonName: b.salonName || b.SalonName || 'Unknown',
            serviceName: serviceDisplay,
            staffName: staffName,
            appointmentDate: displayDateTime,
            amount: b.amount || b.Amount || 0,
            status: status,
            originalData: b,
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

  const activeBookings = useMemo(() => {
    return bookings.filter((b: any) => b.status !== "cancelled");
  }, [bookings]);

  const cancelBookingMutation = useMutation({
    mutationFn: async ({ id, reason, message: cancelMsg }: { id: string; reason: string; message: string }) => {
      const payload = {
        status: "cancelled",
        cancellationReason: reason,
        cancellationMessage: cancelMsg,
        cancelledAt: new Date().toISOString(),
      };
      await putApiBookingId(id, payload, axiosConfig);
    },
    onSuccess: () => {
      message.success({
        content: "Booking cancelled successfully",
        icon: <CheckCircleOutlined />,
        duration: 3,
      });
      queryClient.invalidateQueries({ queryKey: ['customerBookingsList'] });
      setCancelModalVisible(false);
      setSelectedBooking(null);
      setCancelReason("");
      setCancelMessage("");
    },
    onError: (error: any) => {
      message.error({
        content: error?.response?.data?.message || "Failed to cancel booking",
        duration: 3,
      });
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
    setCancelReason("");
    setCancelMessage("");
    setCancelModalVisible(true);
  };

  const handleCancelBooking = () => {
    if (selectedBooking) {
      if (!cancelReason) {
        message.warning("Please select a reason for cancellation");
        return;
      }
      cancelBookingMutation.mutate({
        id: selectedBooking.id,
        reason: cancelReason,
        message: cancelMessage || "No additional message provided",
      });
    }
  };

  const stats = useMemo(() => [
    {
      title: "Total Bookings",
      value: bookings.length,
      icon: <CalendarOutlined />,
      color: "#da5d09",
    },
    {
      title: "Active Bookings",
      value: activeBookings.length,
      icon: <ClockCircleOutlined />,
      color: "#11a52a",
    },
    {
      title: "Completed",
      value: bookings.filter((b: any) => b.status === "completed").length,
      icon: <CheckCircleOutlined />,
      color: "#1f096e",
    },
    {
      title: "Cancelled",
      value: bookings.filter((b: any) => b.status === "cancelled").length,
      icon: <CloseCircleOutlined />,
      color: "#ee0a0a",
    },
    {
      title: "Total Spent",
      value: `$${bookings
        .filter((b: any) => b.status !== "cancelled")
        .reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0)}`,
      icon: <DollarOutlined />,
      color: "#a01299",
    },
  ], [bookings, activeBookings]);

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
      render: (amount: number) => (
        <span className="font-semibold">${amount}</span>
      ),
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
          className="hover:scale-105 transition-transform"
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
        <Card className="shadow-sm">
          <ExclamationCircleOutlined className="text-4xl text-blue-500 mb-4" />
          <p className="text-lg">Please login to view your bookings</p>
        </Card>
      </div>
    );
  }

  const isLoading = (loading && !infiniteData) || referenceLoading;

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'PT Serif, serif' }}>My Bookings</h1>
          <p className="text-gray-500" style={{ fontFamily: 'Public Sans, sans-serif' }}>Manage all your appointments</p>
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
            <div className="p-2 font-medium">
              Booking List
              {isFetching && !isFetchingNextPage && <Spin size="small" className="ml-2" />}
            </div>
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
            {!hasNextPage && bookings.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <FileTextOutlined className="text-4xl text-gray-300 mb-3" />
                <p className="text-gray-500">No bookings found</p>
                <p className="text-sm text-gray-400">Book your first appointment now!</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <CloseCircleOutlined className="text-red-500 text-xl" />
            </div>
            <span className="text-lg font-semibold">Cancel Booking</span>
          </div>
        }
        open={cancelModalVisible}
        onOk={handleCancelBooking}
        onCancel={() => {
          setCancelModalVisible(false);
          setSelectedBooking(null);
          setCancelReason("");
          setCancelMessage("");
        }}
        okText="Yes, Cancel Booking"
        cancelText="Keep Booking"
        okButtonProps={{
          danger: true,
          loading: cancelBookingMutation.isPending,
          disabled: !cancelReason,
          className: "hover:scale-105 transition-transform"
        }}
        cancelButtonProps={{
          className: "hover:scale-105 transition-transform"
        }}
        width={600}
        className="cancel-modal"
      >
        <div className="py-2">
          <div className="mb-5 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <ExclamationCircleOutlined className="text-red-500 text-xl mt-0.5" />
              <div>
                <p className="text-red-600 font-semibold">This action cannot be undone!</p>
                <p className="text-gray-600 text-sm mt-1">
                  Your booking slot will be released immediately.
                </p>
              </div>
            </div>
          </div>

          {selectedBooking && (
            <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileTextOutlined className="text-blue-500" />
                Booking Details
              </h4>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <span>Salon:</span>
                </div>
                <div className="font-medium text-gray-800">{selectedBooking.salonName}</div>

                <div className="flex items-center gap-2 text-gray-600">
                  <span>Service:</span>
                </div>
                <div className="font-medium text-gray-800">{selectedBooking.serviceName}</div>

                <div className="flex items-center gap-2 text-gray-600">
                  <span>Staff:</span>
                </div>
                <div className="font-medium text-gray-800">{selectedBooking.staffName}</div>

                <div className="flex items-center gap-2 text-gray-600">
                  <span>Date:</span>
                </div>
                <div className="font-medium text-gray-800">{selectedBooking.appointmentDate}</div>

                <div className="flex items-center gap-2 text-gray-600">
                  <span>Amount:</span>
                </div>
                <div className="font-medium text-green-600">${selectedBooking.amount}</div>
              </div>
            </div>
          )}

          <Divider className="my-4" />

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason for Cancellation <span className="text-red-500">*</span>
            </label>
            <Select
              placeholder="Select a reason for cancellation"
              value={cancelReason || undefined}
              onChange={(value) => setCancelReason(value)}
              style={{ width: '100%' }}
              className="rounded-lg"
              size="large"
              showSearch
              optionFilterProp="label"
              options={cancellationReasons.map(reason => ({
                value: reason.value,
                label: reason.label
              }))}
            />
            {cancelReason && (
              <div className="mt-2">
                <Tag color="blue" className="text-sm">
                  {cancellationReasons.find(r => r.value === cancelReason)?.label}
                </Tag>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Space size={4}>
                Additional Message <span className="text-gray-400 font-normal">(Optional)</span>
              </Space>
            </label>
            <Input.TextArea
              placeholder="Any additional comments or feedback..."
              value={cancelMessage}
              onChange={(e) => setCancelMessage(e.target.value)}
              rows={2}
              maxLength={300}
              showCount
              className="rounded-lg hover:border-blue-400 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CustomerBookings;