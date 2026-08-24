import { useMemo, useState, useEffect, useRef } from "react";
import { Card, Button, message, Spin } from "antd";
import { PlayCircleOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import Modals from "../../Components/Ui/Modals";
import SearchInput from "../../Components/Ui/SearchInput";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import dayjs from "dayjs";
import { getSalonBookingAPI } from "../../api/generated";
import { useSearch } from "../../utils/FilterData";

const { getApiBooking, getApiStaff, getApiAdminServices, putApiBookingId } = getSalonBookingAPI();
const axiosConfig = { withCredentials: true };

interface StaffItem {
  id?: string;
  _id?: string;
  name?: string;
  fullName?: string;
  Name?: string;
  FullName?: string;
  staffName?: string;
  email?: string;
  Email?: string;
}

interface ServiceItem {
  id?: string;
  _id?: string;
  name?: string;
  serviceName?: string;
  Name?: string;
  ServiceName?: string;
  duration?: number;
  Duration?: number;
}

interface BookingItem {
  id?: string;
  _id?: string;
  customerName?: string;
  CustomerName?: string;
  customer?: { name?: string; Name?: string };
  staffId?: string;
  StaffId?: string;
  serviceId?: string;
  ServiceId?: string;
  serviceIds?: string[];
  ServiceIds?: string[];
  serviceName?: string;
  ServiceName?: string;
  appointmentDate?: string;
  AppointmentDate?: string;
  startTime?: string;
  StartTime?: string;
  endTime?: string;
  EndTime?: string;
  status?: string;
  Status?: string;
  salonName?: string;
  SalonName?: string;
}

interface ServiceMapItem {
  name: string;
  duration: number;
}

interface BookingRow {
  key: string;
  id: string;
  customerName: string;
  staffName: string;
  serviceName: string;
  duration: number;
  appointmentDate: string;
  date: string;
  time: string;
  status: string;
  salonName: string;
}

interface ApiResponse<T> {
  status?: boolean;
  result?: T;
}

interface BookingResult {
  data?: BookingItem[];
  pagination?: {
    totalCount?: number;
    hasNextPage?: boolean;
  };
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

const EmployeeService = () => {
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

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

  const { data: staffList = [], isLoading: staffLoading } = useQuery<StaffItem[]>({
    queryKey: ["employee-service-staff"],
    queryFn: async () => {
      const response = await getApiStaff(
        { page: 1, pageSize: 1000 },
        axiosConfig
      );

      const data = parseResponse<ApiResponse<BookingResult>>(response.data);

      return Array.isArray(data?.result?.data)
        ? (data.result.data as unknown as StaffItem[])
        : [];
    },
  });

  const currentStaff = useMemo(() => {
    if (!loggedInUserEmail) return undefined;

    return staffList.find(
      (staff) =>
        String(staff.email ?? staff.Email ?? "").toLowerCase() ===
        loggedInUserEmail
    );
  }, [staffList, loggedInUserEmail]);

  const staffId = String(currentStaff?.id ?? currentStaff?._id ?? "");

  const staffMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};

    staffList.forEach((staff) => {
      const id = String(staff.id ?? staff._id ?? "");

      if (!id) return;

      map[id] =
        staff.fullName ??
        staff.FullName ??
        staff.name ??
        staff.Name ??
        staff.staffName ??
        "Unknown Staff";
    });

    return map;
  }, [staffList]);

  const { data: servicesData = [], isLoading: servicesLoading } =
    useQuery<ServiceItem[]>({
      queryKey: ["employee-service-services"],
      queryFn: async () => {
        const response = await getApiAdminServices(axiosConfig);

        const data = parseResponse<
          ApiResponse<ServiceItem[] | { data?: ServiceItem[] }>
        >(response.data);

        const result = data?.result;

        if (Array.isArray(result)) return result;

        if (result && Array.isArray(result.data)) {
          return result.data;
        }

        return [];
      },
    });

  const serviceMap = useMemo<Record<string, ServiceMapItem>>(() => {
    const map: Record<string, ServiceMapItem> = {};

    servicesData.forEach((service) => {
      const id = String(service.id ?? service._id ?? "");

      if (!id) return;

      map[id] = {
        name:
          service.serviceName ??
          service.ServiceName ??
          service.name ??
          service.Name ??
          "Unknown",
        duration: Number(
          service.duration ?? service.Duration ?? 30
        ),
      };
    });

    return map;
  }, [servicesData]);

  const getServiceDisplay = (booking: BookingItem): string => {
    const serviceIds = booking.serviceIds ?? booking.ServiceIds ?? [];

    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      return serviceIds
        .map((id) => serviceMap[String(id)]?.name ?? "Unknown")
        .join(", ");
    }

    const serviceId = String(
      booking.serviceId ?? booking.ServiceId ?? ""
    );

    if (serviceId && serviceMap[serviceId]) {
      return serviceMap[serviceId].name;
    }

    return booking.serviceName ?? booking.ServiceName ?? "Unknown";
  };

  const getTotalDuration = (booking: BookingItem): number => {
    const serviceIds = booking.serviceIds ?? booking.ServiceIds ?? [];

    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      return serviceIds.reduce(
        (total, id) =>
          total + Number(serviceMap[String(id)]?.duration ?? 30),
        0
      );
    }

    const serviceId = String(
      booking.serviceId ?? booking.ServiceId ?? ""
    );

    if (serviceId && serviceMap[serviceId]) {
      return Number(serviceMap[serviceId].duration ?? 30);
    }

    return 30;
  };

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: bookingsLoading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["employee-service-bookings", staffId, statusFilter],
    enabled: Boolean(staffId),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await getApiBooking(
        { page: pageParam, pageSize: 5 },
        axiosConfig
      );

      const data = parseResponse<ApiResponse<BookingResult>>(response.data);

      if (
        data?.status !== true ||
        !Array.isArray(data.result?.data)
      ) {
        return {
          data: [] as BookingRow[],
          totalCount: 0,
          hasNextPage: false,
          nextPage: pageParam + 1,
        };
      }

      let bookings = data.result.data;

      bookings = bookings.filter(
        (booking) =>
          String(
            booking.staffId ?? booking.StaffId ?? ""
          ) === staffId
      );

      if (statusFilter !== "all") {
        bookings = bookings.filter((booking) => {
          let status = String(
            booking.status ??
            booking.Status ??
            "pending"
          ).toLowerCase();

          if (status === "complete") {
            status = "completed";
          }

          return status === statusFilter;
        });
      }

      const transformedBookings: BookingRow[] = bookings.map(
        (booking, index) => {
          const id = String(
            booking.id ??
            booking._id ??
            `${pageParam}-${index}`
          );

          const dateStr =
            booking.appointmentDate ??
            booking.AppointmentDate ??
            "";

          const startTime =
            booking.startTime ??
            booking.StartTime ??
            "";

          const endTime =
            booking.endTime ??
            booking.EndTime ??
            "";

          let status = String(
            booking.status ??
            booking.Status ??
            "pending"
          ).toLowerCase();

          if (status === "complete") {
            status = "completed";
          }

          let time = "N/A";

          if (startTime && endTime) {
            time = `${startTime} - ${endTime}`;
          } else if (startTime) {
            time = startTime;
          } else if (endTime) {
            time = endTime;
          } else if (dayjs(dateStr).isValid()) {
            time = dayjs(dateStr).format("hh:mm A");
          }

          return {
            key: id,
            id,
            customerName:
              booking.customerName ??
              booking.CustomerName ??
              booking.customer?.name ??
              booking.customer?.Name ??
              "Customer",
            staffName:
              staffMap[
                String(
                  booking.staffId ??
                  booking.StaffId ??
                  ""
                )
              ] ?? "Staff",
            serviceName: getServiceDisplay(booking),
            duration: getTotalDuration(booking),
            appointmentDate: dateStr,
            date: dayjs(dateStr).isValid()
              ? dayjs(dateStr).format("DD MMM YYYY")
              : "N/A",
            time,
            status,
            salonName:
              booking.salonName ??
              booking.SalonName ??
              "N/A",
          };
        }
      );

      return {
        data: transformedBookings,
        totalCount:
          data.result.pagination?.totalCount ??
          transformedBookings.length,
        hasNextPage:
          data.result.pagination?.hasNextPage ?? false,
        nextPage: pageParam + 1,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage
        ? lastPage.nextPage
        : undefined,
  });

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
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
  }, [
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  const allBookings = useMemo(
    () =>
      infiniteData?.pages.flatMap(
        (page) => page.data
      ) ?? [],
    [infiniteData]
  );

  const {
    searchText,
    setSearchText,
    filteredData,
  } = useSearch(
    allBookings,
    ["customerName", "serviceName"],
    500
  );

  const completeServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await putApiBookingId(
        id,
        { status: "completed" },
        axiosConfig
      );
    },
    onSuccess: () => {
      message.success(
        "Service completed successfully!"
      );

      queryClient.invalidateQueries({
        queryKey: ["employee-service-bookings"],
      });

      handleCloseModal();
    },
    onError: () => {
      message.error("Failed to complete service");
    },
  });

  const handleStartService = (record: BookingRow) => {
    setSelectedBooking(record);
    setModalVisible(true);
  };

  const handleCompleteService = () => {
    if (
      selectedBooking?.id &&
      !completeServiceMutation.isPending
    ) {
      completeServiceMutation.mutate(
        selectedBooking.id
      );
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedBooking(null);
  };

  const columns = [
    {
      title: "Customer",
      dataIndex: "customerName",
      render: (text: string) => (
        <div className="font-medium text-gray-800">
          {text || "N/A"}
        </div>
      ),
    },
    {
      title: "Date & Time",
      render: (
        _: unknown,
        record: BookingRow
      ) => (
        <div>
          <div className="font-medium">
            {record.date}
          </div>
          <div className="text-xs text-gray-500">
            {record.time}
          </div>
        </div>
      ),
    },
    {
      title: "Service",
      dataIndex: "serviceName",
      render: (text: string) =>
        text || "N/A",
    },
    {
      title: "Duration",
      dataIndex: "duration",
      render: (duration: number) => (
        <span>{duration} min</span>
      ),
    },
    {
      title: "Status",
      render: (
        _: unknown,
        record: BookingRow
      ) => (
        <StatusBadge
          type="booking"
          value={record.status}
        />
      ),
    },
    {
      title: "Action",
      render: (
        _: unknown,
        record: BookingRow
      ) => (
        <Button
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() =>
            handleStartService(record)
          }
          disabled={record.status !== "confirmed"}
        >
          Start Service
        </Button>
      ),
    },
  ];

  const isLoading =
    (bookingsLoading && !infiniteData) ||
    staffLoading ||
    servicesLoading;

  if (!loggedInUserEmail) {
    return (
      <div className="p-6 text-center">
        <Card>
          Please login to view services
        </Card>
      </div>
    );
  }

  if (!currentStaff && !staffLoading) {
    return (
      <div className="p-6 text-center">
        <Card>
          No staff record found for this account
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{
            fontFamily: "PT Serif, serif",
          }}
        >
          My Service Tasks
        </h1>

        <p
          className="text-gray-600"
          style={{
            fontFamily:
              "Public Sans, sans-serif",
          }}
        >
          Manage your assigned service tasks
        </p>
      </div>

      <Card className="mb-6">
        <SearchInput
          searchText={searchText}
          onSearchChange={setSearchText}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={[
            {
              value: "all",
              label: "All Status",
            },
            {
              value: "confirmed",
              label: "Confirmed",
            },
            {
              value: "completed",
              label: "Completed",
            },
            {
              value: "cancelled",
              label: "Cancelled",
            },
            {
              value: "pending",
              label: "Pending",
            },
          ]}
          placeholder="Search by customer or service..."
          width={300}
        />
      </Card>

      <Card>
        <div className="mb-4 flex justify-between items-center">
          <div className="p-2 font-medium">
            My Tasks
            {isFetching &&
              !isFetchingNextPage && (
                <Spin
                  size="small"
                  className="ml-2"
                />
              )}
          </div>
        </div>

        <DataTable
          data={filteredData ?? []}
          columns={columns}
          loading={isLoading}
          showActions={false}
          rowKey="key"
        />

        <div
          ref={loadMoreRef}
          className="py-4"
        >
          {isFetchingNextPage && (
            <div className="text-center py-4">
              <Spin size="large" />
              <p className="mt-2 text-gray-500">
                Loading more tasks...
              </p>
            </div>
          )}

          {!hasNextPage &&
            allBookings.length === 0 &&
            !isLoading && (
              <div className="text-center py-8 text-gray-500">
                No tasks found
              </div>
            )}
        </div>
      </Card>

      <Modals
        open={modalVisible}
        onClose={handleCloseModal}
        title={`Service - ${
          selectedBooking?.customerName ?? ""
        }`}
        onSubmit={handleCompleteService}
        submitText="Complete Service"
        loading={completeServiceMutation.isPending}
        cancelText="Close"
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">
                Customer
              </p>
              <p className="font-semibold text-lg">
                {selectedBooking.customerName}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Service
              </p>
              <p className="font-medium">
                {selectedBooking.serviceName}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Duration
              </p>
              <p className="font-medium">
                {selectedBooking.duration} minutes
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Date & Time
              </p>
              <p className="font-medium">
                {selectedBooking.date} at{" "}
                {selectedBooking.time}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Status
              </p>
              <p className="font-medium capitalize">
                {selectedBooking.status}
              </p>
            </div>
          </div>
        )}
      </Modals>
    </div>
  );
};
export default EmployeeService;