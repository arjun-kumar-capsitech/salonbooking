import { useState, useMemo, useEffect, useRef } from "react";
import { Card, Button, Row, Col, Spin } from "antd";
import { CalendarOutlined, ClockCircleOutlined, DollarOutlined } from "@ant-design/icons";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import { StatCard } from "../../Components/Ui/Cards";
import dayjs from "dayjs";
import { getSalonBookingAPI, type Staff, type AdminServices, type Booking } from "../../api/generated";

const { getApiBooking, getApiStaff, getApiAdminServices } = getSalonBookingAPI();
const axiosConfig = { withCredentials: true };

interface StaffRow {
  id: string;
  name: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  salonName: string;
}

interface ServiceRow {
  id: string;
  name: string;
  serviceName: string;
  duration: number;
  price: number;
  status: string;
}

interface BookingRow {
  key: string;
  id: string;
  customerName: string;
  staffName: string;
  serviceName: string;
  appointmentDate: string;
  date: string;
  time: string;
  amount: number;
  status: string;
  salonName: string;
}

interface ApiPagination {
  totalCount?: number;
  hasNextPage?: boolean;
}

interface BookingPage {
  data: BookingRow[];
  totalCount: number;
  hasNextPage: boolean;
  nextPage: number;
}

const parseResponse = <T,>(data: unknown): T | null => {
  if (!data) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }
  return data as T;
};

const EmployeeDashboard = () => {
  const [activeTab, setActiveTab] = useState<"today" | "upcoming">("today");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const user = useMemo(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return {};
    try {
      return JSON.parse(storedUser);
    } catch {
      return {};
    }
  }, []);

  const loggedInUserEmail = String(user?.Email ?? user?.email ?? "").toLowerCase();
  const { data: staffList = [], isLoading: staffLoading } = useQuery<StaffRow[]>({
    queryKey: ["employee-dashboard-staff"],
    queryFn: async () => {
      const response = await getApiStaff({ page: 1, pageSize: 1000 }, axiosConfig);
      const data = parseResponse<{ result?: { data?: Staff[] } }>(response.data);
      const staffData = Array.isArray(data?.result?.data) ? data.result.data : [];
      return staffData.map((item, index): StaffRow => ({
        id: String(item.id ?? index),
        name: String(item.name ?? item.fullName ?? "N/A"),
        fullName: String(item.fullName ?? item.name ?? "N/A"),
        email: String(item.email ?? ""),
        role: String(item.role ?? "Employee"),
        status: item.isActive ? "active" : "inactive",
        salonName: String(item.salonName ?? "N/A"),
      }));
    },
  });
  const currentStaff = useMemo(() => {
    return staffList.find((staff) => staff.email.toLowerCase() === loggedInUserEmail);
  }, [staffList, loggedInUserEmail]);

  const staffId = currentStaff?.id ?? "";
  const staffMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    staffList.forEach((staff) => {
      if (staff.id) map[staff.id] = staff.name;
    });
    return map;
  }, [staffList]);

  const { data: services = [], isLoading: servicesLoading } = useQuery<ServiceRow[]>({
    queryKey: ["employee-dashboard-services"],
    queryFn: async () => {
      const response = await getApiAdminServices(axiosConfig);
      const data = parseResponse<{ result?: AdminServices[] | { data?: AdminServices[] } }>(response.data);
      const result = data?.result;
      const serviceData = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      return serviceData.map((item, index): ServiceRow => ({
        id: String(item.id ?? index),
        name: String(item.serviceName ?? item.name ?? "N/A"),
        serviceName: String(item.serviceName ?? item.name ?? "N/A"),
        duration: Number(item.duration ?? 0),
        price: Number(item.price ?? 0),
        status: item.isActive ? "active" : "inactive",
      }));
    },
  });

  const serviceMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    services.forEach((service) => {
      if (service.id) map[service.id] = service.name;
    });
    return map;
  }, [services]);
  const getServiceDisplay = (booking: Booking): string => {
    const serviceIds = booking.serviceIds ?? [];
    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      return serviceIds.map((id) => serviceMap[String(id)] ?? "Unknown").join(", ");
    }
    const serviceId = booking.serviceId ? String(booking.serviceId) : "";
    if (serviceId && serviceMap[serviceId]) {
      return serviceMap[serviceId];
    }
    return String(booking.serviceName ?? "Unknown");
  };

  const { data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: bookingsLoading, isFetching } = useInfiniteQuery<BookingPage>({
    queryKey: ["employee-dashboard-bookings", staffId],
    enabled: Boolean(staffId),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = Number(pageParam);
      const response = await getApiBooking({ page, pageSize: 10 }, axiosConfig);
      const data = parseResponse<{ result?: { data?: Booking[]; pagination?: ApiPagination } }>(response.data);
      const bookingData = Array.isArray(data?.result?.data) ? data.result.data : [];
      const filteredBookings = bookingData.filter((booking) => String(booking.staffId ?? "") === staffId);
      const transformedBookings = filteredBookings.map((booking, index): BookingRow => {
        const id = String(booking.id ?? `${page}-${index}`);
        const appointmentDate = String(booking.appointmentDate ?? "");
        const startTime = String(booking.startTime ?? "");
        const endTime = String(booking.endTime ?? "");
        const bookingStaffId = String(booking.staffId ?? "");
        let status = String(booking.status ?? "pending").toLowerCase();
        if (status === "complete") status = "completed";
        let time = "N/A";
        if (startTime && endTime) {
          time = `${startTime} - ${endTime}`;
        } else if (startTime) {
          time = startTime;
        } else if (endTime) {
          time = endTime;
        } else if (dayjs(appointmentDate).isValid()) {
          time = dayjs(appointmentDate).format("hh:mm A");
        }
        const amount = Number(booking.amount ?? 0);
        return {
          key: id,
          id,
          customerName: String(booking.customerName ?? "Customer"),
          staffName: staffMap[bookingStaffId] ?? "Staff",
          serviceName: getServiceDisplay(booking),
          appointmentDate,
          date: dayjs(appointmentDate).isValid() ? dayjs(appointmentDate).format("DD MMM YYYY") : "N/A",
          time,
          amount: Number.isNaN(amount) || status === "cancelled" ? 0 : amount,
          status,
          salonName: String(booking.salonName ?? "N/A"),
        };
      });

      return {
        data: transformedBookings,
        totalCount: data?.result?.pagination?.totalCount ?? transformedBookings.length,
        hasNextPage: data?.result?.pagination?.hasNextPage ?? false,
        nextPage: page + 1,
      };
    },
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextPage : undefined,
  });

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const bookings = useMemo(() => {
    return infiniteData?.pages.flatMap((page) => page.data) ?? [];
  }, [infiniteData]);
  const todayBookings = useMemo(() => {
    return bookings.filter((booking) => dayjs(booking.appointmentDate).isSame(dayjs(), "day"));
  }, [bookings]);
  const upcomingBookings = useMemo(() => {
    return bookings.filter((booking) => dayjs(booking.appointmentDate).isAfter(dayjs(), "day"));
  }, [bookings]);
  const displayedBookings = activeTab === "today" ? todayBookings : upcomingBookings;
  const revenue = useMemo(() => {
    return bookings.reduce((sum, booking) => sum + Number(booking.amount ?? 0), 0);
  }, [bookings]);
  const stats = [
    { title: "Total Bookings", value: bookings.length.toString(), icon: <CalendarOutlined />, color: "#21578a" },
    { title: "Today's Bookings", value: todayBookings.length.toString(), icon: <ClockCircleOutlined />, color: "#108641" },
    { title: "Upcoming", value: upcomingBookings.length.toString(), icon: <ClockCircleOutlined />, color: "#091802" },
    { title: "Revenue", value: `$${revenue.toLocaleString()}`, icon: <DollarOutlined />, color: "#4b0da1" },
  ];

  const columns = [
    {
      title: "Customer",
      dataIndex: "customerName",
      render: (text: string) => <div className="font-medium">{text || "N/A"}</div>,
    },
    {
      title: "Staff",
      dataIndex: "staffName",
      render: (text: string) => <div className="text-gray-600">{text || "N/A"}</div>,
    },
    { title: "Date", dataIndex: "date" },
    { title: "Time", dataIndex: "time" },
    { title: "Service", dataIndex: "serviceName" },
    {
      title: "Amount",
      render: (_: unknown, record: BookingRow) => `$${Number(record.amount ?? 0).toFixed(2)}`,
    },
    {
      title: "Status",
      render: (_: unknown, record: BookingRow) => <StatusBadge type="booking" value={record.status} />,
    },
  ];
  const isLoading = staffLoading || (bookingsLoading && !infiniteData) || servicesLoading;
  if (!loggedInUserEmail) {
    return (
      <div className="p-6 text-center">
        <Card>Please login to view dashboard</Card>
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
    <div className="p-6" style={{ fontFamily: "Public Sans, sans-serif" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "PT Serif, serif" }}>My Dashboard</h1>
        <p className="text-gray-500">View your assigned appointments</p>
      </div>
      <Row gutter={[16, 16]} className="mb-6">
        {stats.map((stat) => (
          <Col xs={24} sm={12} lg={6} key={stat.title}>
            <StatCard title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
          </Col>
        ))}
      </Row>
      <div className="flex gap-4 mb-4 flex-wrap">
        <Button type={activeTab === "today" ? "primary" : "default"} onClick={() => setActiveTab("today")}>Today's Appointments</Button>
        <Button type={activeTab === "upcoming" ? "primary" : "default"} onClick={() => setActiveTab("upcoming")}>Upcoming Appointments</Button>
      </div>
      <Card className="shadow-sm border border-gray-100 rounded-xl">
        <div className="mb-4 flex justify-between items-center">
          <p className="p-2 font-medium">
            {activeTab === "today" ? "Today's Schedule" : "Upcoming Schedule"}
            {isFetching && !isFetchingNextPage && <Spin size="small" className="ml-2" />}
          </p>
        </div>
        <DataTable data={displayedBookings} columns={columns} loading={isLoading} showActions={false} rowKey="key" />
        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="text-center py-4">
              <Spin size="large" />
              <p className="mt-2 text-gray-500">Loading more bookings...</p>
            </div>
          )}
          {!hasNextPage && bookings.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">No bookings found</div>
          )}
        </div>
      </Card>
    </div>
  );
};
export default EmployeeDashboard;