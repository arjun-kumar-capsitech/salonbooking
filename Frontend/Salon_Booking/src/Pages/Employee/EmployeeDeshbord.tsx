import { useState, useMemo, useEffect, useRef } from "react";
import { Card, Button, Row, Col, Spin } from "antd";
import { CalendarOutlined, ClockCircleOutlined, DollarOutlined } from "@ant-design/icons";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { StatCard } from "../../Components/Ui/Cards";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const { getApiBooking, getApiStaff, getApiAdminServices } = getSalonBookingAPI();

const EmployeeDashboard = () => {
  const [activeTab, setActiveTab] = useState("today");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInUserEmail = user?.Email || user?.email;
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

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
    queryKey: ['employeeStaffDashboard'],
    enabled: !!token,
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
    queryKey: ['employeeServicesDashboard'],
    enabled: !!token,
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

  const getServiceDisplay = (booking: any): string => {
    const serviceIds = booking.serviceIds || booking.ServiceIds || [];
    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      return serviceIds.map((id: string) => serviceMap[String(id)] || 'Unknown').join(', ');
    }
    const singleId = String(booking.serviceId || booking.ServiceId || '');
    if (singleId && serviceMap[singleId]) {
      return serviceMap[singleId];
    }
    return booking.serviceName || booking.ServiceName || 'Unknown';
  };

  const { data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: loading, isFetching } = useInfiniteQuery({
    queryKey: ['employeeDashboardBookings', staffId],
    enabled: !!token && !!staffId,
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const res = await getApiBooking({ page: pageParam, pageSize: 10 }, axiosConfig);
      const parsedData = ResponseData(res);

      if (!parsedData?.status === true || !parsedData?.result?.data) {
        return {
          data: [],
          totalCount: 0,
          hasNextPage: false,
          nextPage: pageParam + 1
        };
      }

      let rawBookings = parsedData.result.data;
      const pagination = parsedData.result.pagination;

      rawBookings = rawBookings.filter((b: any) => {
        const bookingStaffId = String(b.staffId || b.StaffId);
        return bookingStaffId === String(staffId);
      });

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
          appointmentDate: dateStr,
          date: dateFormatted,
          time: timeFormatted,
          amount: b.amount || b.Amount || 0,
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

  const todayBookings = useMemo(() => {
    return bookings.filter((b: any) => dayjs(b.appointmentDate).isSame(dayjs(), "day"));
  }, [bookings]);

  const upcomingBookings = useMemo(() => {
    return bookings.filter((b: any) => dayjs(b.appointmentDate).isAfter(dayjs(), "day"));
  }, [bookings]);

  const getBookings = () => activeTab === "today" ? todayBookings : upcomingBookings;

  const revenue = useMemo(() => {
    return bookings.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
  }, [bookings]);

  const stats = [
    { title: "Total Bookings", value: bookings.length, icon: <CalendarOutlined />, color: "#21578a" },
    { title: "Today's Bookings", value: todayBookings.length, icon: <ClockCircleOutlined />, color: "#108641" },
    { title: "Upcoming", value: upcomingBookings.length, icon: <ClockCircleOutlined />, color: "#091802" },
    { title: "Revenue", value: `$${revenue}`, icon: <DollarOutlined />, color: "#4b0da1" },
  ];

  const columns = [
    {
      title: "Customer",
      dataIndex: "customerName",
      render: (text: string) => <div className="font-medium">{text || "N/A"}</div>
    },
    {
      title: "Staff",
      dataIndex: "staffName",
      render: (text: string) => <div className="text-gray-600">{text || "N/A"}</div>
    },
    { title: "Date", dataIndex: "date" },
    { title: "Time", dataIndex: "time" },
    { title: "Service", dataIndex: "serviceName" },
    { title: "Amount", render: (_: any, record: any) => `$${record.amount}` },
    { title: "Status", render: (_: any, record: any) => <StatusBadge type="booking" value={record.status} /> },
  ];

  const isLoading = (loading && !infiniteData) || staffLoading;

  if (!token) {
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'PT Serif, serif' }}>My Dashboard</h1>
        <p className="text-gray-500" style={{ fontFamily: 'Public Sans, sans-serif' }} >View your assigned appointments</p>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <StatCard title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
          </Col>
        ))}
      </Row>

      <div className="flex gap-4 mb-4 flex-wrap">
        <Button
          type={activeTab === "today" ? "primary" : "default"}
          onClick={() => setActiveTab("today")}
        >
          Today's Appointments
        </Button>
        <Button
          type={activeTab === "upcoming" ? "primary" : "default"}
          onClick={() => setActiveTab("upcoming")}
        >
          Upcoming Appointments
        </Button>
      </div>

      <Card className="shadow-sm border border-gray-100 rounded-xl">
        <div className="mb-4 flex justify-between items-center">
          <p className="p-2 font-medium">
            {activeTab === "today" ? "Today's Schedule" : "Upcoming Schedule"}
            {isFetching && !isFetchingNextPage && <Spin size="small" className="ml-2" />}
          </p>
        </div>

        <DataTable
          data={getBookings()}
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
            <div className="text-center py-8 text-gray-500">
              No bookings found
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
export default EmployeeDashboard;