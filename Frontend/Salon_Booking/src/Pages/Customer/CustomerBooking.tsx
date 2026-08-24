import { Card, Row, Col, message, Modal, Spin, Input, Space, Divider, Select, Tag } from "antd";
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, FileTextOutlined, DollarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useMemo, useState, useEffect, useRef } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DataTable, } from "../../Components/Ui/Table";
import { StatCard } from "../../Components/Ui/Cards";
import { getSalonBookingAPI, type AdminServices, type Booking, type Staff, type User } from "../../api/generated";
import type { BookingRow, CancellationReason, ReferenceData, BookingPage } from "../../Types/Alltypes";
const api = getSalonBookingAPI();
const apiOptions = { withCredentials: true };

const parseResponse = <T,>(data: unknown): T | null => {
  if (typeof data !== "string") return data as T;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
};

const CustomerBookings = () => {
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelMessage, setCancelMessage] = useState("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const queryClient = useQueryClient();
  const user = useMemo<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null") as User | null;
    } catch {
      return null;
    }
  }, []);

  const loggedInUserId = user?.id;
  const loggedInUserName = user?.fullName ?? user?.name ?? "Customer";

  const cancellationReasons: CancellationReason[] = [
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
    { value: "other", label: "Other Reason" },
  ];

  const { data: referenceData, isLoading: referenceLoading } = useQuery<ReferenceData>({
    queryKey: ["customerBookingReferenceData"],
    enabled: Boolean(loggedInUserId),
    queryFn: async () => {
      const [staffResponse, serviceResponse] = await Promise.all([
        api.getApiStaff({ page: 1, pageSize: 1000 }, apiOptions),
        api.getApiAdminServices(apiOptions),
      ]);
      const staffResponseData = parseResponse<{ result?: { data?: Staff[] } }>(staffResponse.data);
      const serviceResponseData = parseResponse<{ result?: AdminServices[] }>(serviceResponse.data);
      const staffList = staffResponseData?.result?.data ?? [];
      const serviceList = serviceResponseData?.result ?? [];
      const staffMap: Record<string, Staff> = {};
      const serviceMap: Record<string, AdminServices> = {};
      staffList.forEach((staff) => {
        if (staff.id) staffMap[String(staff.id)] = staff;
      });
      serviceList.forEach((service) => {
        if (service.id && service.isActive !== false) serviceMap[String(service.id)] = service;
      });
      return { staffMap, serviceMap };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching } =
    useInfiniteQuery<BookingPage>({
      queryKey: ["customerBookings", loggedInUserId],
      initialPageParam: 1,
      enabled: Boolean(loggedInUserId && referenceData),
      queryFn: async ({ pageParam }) => {
        const page = Number(pageParam);
        try {
          const response = await api.getApiBooking({ page, pageSize: 10 }, apiOptions);
          const responseData = parseResponse<{ status?: boolean; result?: { data?: Booking[]; totalCount?: number; hasNextPage?: boolean } }>(response.data);
          const result = responseData?.result;
          if (!result) {
            return { data: [], totalCount: 0, hasNextPage: false, nextPage: page + 1 };
          }
          const rawBookings = result.data ?? [];
          const customerBookings = rawBookings.filter((booking) => String(booking.customerId ?? "") === String(loggedInUserId));

          const transformedBookings: BookingRow[] = customerBookings.map((booking, index) => {
            const serviceIds = booking.serviceIds?.length
              ? booking.serviceIds
              : booking.serviceId
                ? [booking.serviceId]
                : [];
            const serviceNames = serviceIds
              .map((serviceId) => referenceData?.serviceMap[String(serviceId)]?.serviceName)
              .filter(Boolean);
            const staff = referenceData?.staffMap[String(booking.staffId ?? "")];
            const staffName = staff?.fullName ?? staff?.name ?? "Unknown Staff";
            const serviceName =
              serviceNames.length > 0
                ? serviceNames.join(", ")
                : "Unknown Service";
            const appointmentDate = booking.appointmentDate
              ? dayjs(booking.appointmentDate).format("DD MMM YYYY")
              : "Invalid Date";
            const startTime = booking.startTime ?? "";
            const endTime = booking.endTime ?? "";
            const displayDateTime =
              startTime && endTime
                ? `${appointmentDate} - ${startTime} to ${endTime}`
                : appointmentDate;

            let status = String(booking.status ?? "pending").toLowerCase();
            if (status === "complete") {
              status = "completed";
            }

            return {
              key: String(booking.id ?? `${page}-${index}`),
              id: String(booking.id ?? ""),
              customerId: String(booking.customerId ?? loggedInUserId ?? ""),
              staffId: String(booking.staffId ?? ""),
              serviceId: String(
                booking.serviceId ??
                booking.serviceIds?.[0] ??
                ""
              ),
              date: booking.appointmentDate
                ? dayjs(booking.appointmentDate).format("YYYY-MM-DD")
                : "",
              time:
                startTime && endTime
                  ? `${startTime} - ${endTime}`
                  : startTime || endTime || "",
              customerName: booking.customerName ?? loggedInUserName,
              salonName: booking.salonName ?? "Unknown Salon",
              serviceName,
              staffName,
              appointmentDate: displayDateTime,
              amount: Number(booking.amount ?? 0),
              status,

              originalData: booking,
            };
          });

          return {
            data: transformedBookings,
            totalCount: result.totalCount ?? customerBookings.length,
            hasNextPage: result.hasNextPage ?? false,
            nextPage: page + 1,
          };
        } catch (error) {
          console.error("Customer bookings error:", error);
          return { data: [], totalCount: 0, hasNextPage: false, nextPage: page + 1 };
        }
      },
      getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextPage : undefined,
    });

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || !loadMoreRef.current) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    }, { threshold: 0.1 });
    observerRef.current.observe(loadMoreRef.current);
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const bookings = useMemo<BookingRow[]>(() => infiniteData?.pages.flatMap((page) => page.data) ?? [], [infiniteData]);
  const activeBookings = useMemo(() => bookings.filter((booking) => !["cancelled", "completed"].includes(booking.status)), [bookings]);
  const completedBookings = useMemo(() => bookings.filter((booking) => booking.status === "completed"), [bookings]);
  const cancelledBookings = useMemo(() => bookings.filter((booking) => booking.status === "cancelled"), [bookings]);
  const totalSpent = useMemo(() => bookings.filter((booking) => booking.status
    !== "cancelled").reduce((sum, booking) => sum + Number(booking.amount || 0), 0), [bookings]);
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => api.putApiBookingId(bookingId, { status: "cancelled" }, apiOptions),
    onSuccess: () => {
      message.success({ content: "Booking cancelled successfully", icon: <CheckCircleOutlined />, duration: 3 });
      void queryClient.invalidateQueries({ queryKey: ["customerBookings", loggedInUserId] });
      setCancelModalVisible(false);
      setSelectedBooking(null);
      setCancelReason("");
      setCancelMessage("");
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { message?: string } } };
      message.error(axiosError.response?.data?.message ?? "Failed to cancel booking");
    },
  });
  const showCancelConfirm = (record: BookingRow) => {
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
    if (!selectedBooking) return;
    if (!cancelReason) {
      message.warning("Please select a reason for cancellation");
      return;
    }
    cancelBookingMutation.mutate(selectedBooking.id);
  };

  const closeCancelModal = () => {
    setCancelModalVisible(false);
    setSelectedBooking(null);
    setCancelReason("");
    setCancelMessage("");
  };

  const stats = useMemo(() => [
    { title: "Total Bookings", value: bookings.length, icon: <CalendarOutlined />, color: "#da5d09" },
    { title: "Active Bookings", value: activeBookings.length, icon: <ClockCircleOutlined />, color: "#11a52a" },
    { title: "Completed", value: completedBookings.length, icon: <CheckCircleOutlined />, color: "#1f096e" },
    { title: "Cancelled", value: cancelledBookings.length, icon: <CloseCircleOutlined />, color: "#ee0a0a" },
    { title: "Total Spent", value: `$${totalSpent.toFixed(2)}`, icon: <DollarOutlined />, color: "#a01299" },
  ], [bookings.length, activeBookings.length, completedBookings.length, cancelledBookings.length, totalSpent]);

  const isInitialLoading = referenceLoading || (isLoading && !infiniteData);

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "PT Serif, serif" }}>My Bookings</h1>
          <p className="text-gray-500" style={{ fontFamily: "Public Sans, sans-serif" }}>Manage all your appointments</p>
        </div>
        <Row gutter={[16, 16]} className="mb-6">
          {stats.map((stat) => (
            <Col xs={24} sm={12} lg={6} key={stat.title}>
              <StatCard title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
            </Col>
          ))}
        </Row>
        <Card className="shadow-sm border border-gray-100">
          <div className="mb-4 flex justify-between items-center">
            <div className="p-2 font-medium flex items-center gap-2">
              <span>Booking List</span>
              {isFetching && !isFetchingNextPage && <Spin size="small" />}
            </div>
          </div>
          <DataTable data={bookings} tableType="bookings" loading={isInitialLoading} showActions={false} onCancel={showCancelConfirm} rowKey="key" />
          <div ref={loadMoreRef} className="py-4">
            {isFetchingNextPage && (
              <div className="text-center py-4">
                <Spin size="large" />
                <p className="mt-2 text-gray-500">Loading more bookings...</p>
              </div>
            )}
            {!hasNextPage && bookings.length > 0 && (
              <div className="text-center py-4 text-sm text-gray-400">All bookings loaded</div>
            )}
            {!hasNextPage && bookings.length === 0 && !isInitialLoading && (
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
        onCancel={closeCancelModal}
        okText="Yes, Cancel Booking"
        cancelText="Keep Booking"
        okButtonProps={{ danger: true, loading: cancelBookingMutation.isPending, disabled: !cancelReason, className: "hover:scale-105 transition-transform" }}
        cancelButtonProps={{ className: "hover:scale-105 transition-transform" }}
        width={600}
        className="cancel-modal"
      >
        <div className="py-2">
          <div className="mb-5 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <ExclamationCircleOutlined className="text-red-500 text-xl mt-0.5" />
              <div>
                <p className="text-red-600 font-semibold">This action cannot be undone!</p>
                <p className="text-gray-600 text-sm mt-1">Your booking slot will be released immediately.</p>
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
                <div className="text-gray-600">Salon:</div>
                <div className="font-medium text-gray-800">{selectedBooking.salonName}</div>
                <div className="text-gray-600">Service:</div>
                <div className="font-medium text-gray-800">{selectedBooking.serviceName}</div>
                <div className="text-gray-600">Staff:</div>
                <div className="font-medium text-gray-800">{selectedBooking.staffName}</div>
                <div className="text-gray-600">Date:</div>
                <div className="font-medium text-gray-800">{selectedBooking.appointmentDate}</div>
                <div className="text-gray-600">Amount:</div>
                <div className="font-medium text-green-600">${selectedBooking.amount.toFixed(2)}</div>
              </div>
            </div>
          )}
          <Divider className="my-4" />
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason for Cancellation <span className="text-red-500">*</span>
            </label>
            <Select placeholder="Select a reason for cancellation" value={cancelReason || undefined} onChange={setCancelReason}
              style={{ width: "100%" }} size="large" showSearch optionFilterProp="label" options={cancellationReasons} />
            {cancelReason && (
              <div className="mt-2">
                <Tag color="blue" className="text-sm">
                  {cancellationReasons.find((reason) => reason.value === cancelReason)?.label}
                </Tag>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Space size={4}>
                Additional Message
                <span className="text-gray-400 font-normal">(Optional)</span>
              </Space>
            </label>
            <Input.TextArea placeholder="Any additional comments or feedback..." value={cancelMessage}
              onChange={(event) => setCancelMessage(event.target.value)} rows={2} maxLength={300} showCount className="rounded-lg hover:border-blue-400 focus:border-blue-500 transition-colors" />
          </div>
        </div>
      </Modal>
    </>
  );
};
export default CustomerBookings;