import { useEffect, useMemo, useState } from "react";
import { Button, Card, Spin, Table, Tag, message } from "antd";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { getSalonBookingAPI, type Booking as ApiBooking, type AdminServices, type User } from "../api/generated";
import { connection, startSignalR } from "../Services/signalR";

const apiOptions = { withCredentials: true };

interface Booking {
  id: string;
  customerName: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

const parseResponse = <T,>(data: unknown): T | null => {
  if (data === null || data === undefined) return null;
  if (typeof data !== "string") return data as T;

  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
};

const extractResult = <T,>(data: unknown): T[] => {
  const parsed = parseResponse<{
    status?: boolean;
    result?: T[] | { data?: T[] };
    data?: T[];
  }>(data);

  if (!parsed) return [];

  if (Array.isArray(parsed)) return parsed;

  if (Array.isArray(parsed.data)) return parsed.data;

  if (Array.isArray(parsed.result)) return parsed.result;

  if (Array.isArray(parsed.result?.data)) return parsed.result.data;

  return [];
};

const LiveBooking = () => {
  const api = getSalonBookingAPI();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const user = useMemo<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null") as User | null;
    } catch {
      return null;
    }
  }, []);

  const userRole = user?.role;
  const userSalonName = user?.salonName;

  const isAdmin = userRole === 2;

  const { data: referenceData, isLoading: referenceLoading } = useQuery({
    queryKey: ["liveBookingReferenceData"],
    queryFn: async () => {
      const [userResponse, serviceResponse] = await Promise.all([
        api.getApiUser({ page: 1, pageSize: 1000 }, apiOptions),
        api.getApiAdminServices(apiOptions),
      ]);
      const users = extractResult<User>(userResponse.data);
      const services = extractResult<AdminServices>(serviceResponse.data);
      const customerMap: Record<string, string> = {};
      const serviceMap: Record<string, string> = {};
      users.forEach((item) => {
        const id = String(item.id ?? "");

        if (item.role === 4 && id) {
          customerMap[id] = item.fullName ?? "Unknown Customer";
        }
      });

      services.forEach((item) => {
        const id = String(item.id ?? "");

        if (id && item.isActive !== false) {
          serviceMap[id] = item.serviceName ?? "Unknown Service";
        }
      });

      return { customerMap, serviceMap };
    },
    staleTime: 5 * 60 * 1000,
  });

  const customerMap = referenceData?.customerMap ?? {};
  const serviceMap = referenceData?.serviceMap ?? {};

  const getServiceName = (booking: ApiBooking): string => {
    const serviceIds = booking.serviceIds?.length
      ? booking.serviceIds
      : booking.serviceId
        ? [booking.serviceId]
        : [];

    if (serviceIds.length) {
      const names = serviceIds
        .map((id) => serviceMap[String(id)])
        .filter(Boolean);

      if (names.length) return names.join(", ");
    }

    return booking.serviceName ?? "Unknown Service";
  };

  const transformBooking = (booking: ApiBooking): Booking => {
    const customerId = String(booking.customerId ?? "");

    return {
      id: String(booking.id ?? ""),
      customerName: booking.customerName ?? customerMap[customerId] ?? "Unknown Customer",
      serviceName: getServiceName(booking),
      appointmentDate: booking.appointmentDate ?? "",
      startTime: booking.startTime ?? "",
      endTime: booking.endTime ?? "",
      status: booking.status?.toLowerCase() ?? "pending",
    };
  };

  const loadBookings = async () => {
    try {
      const response = await api.getApiBooking({ page: 1, pageSize: 100 }, apiOptions);

      const parsed = parseResponse<{
        result?: {
          data?: ApiBooking[];
        };
      }>(response.data);

      let rawBookings = parsed?.result?.data ?? [];

      if (isAdmin && userSalonName) {
        rawBookings = rawBookings.filter(
          (booking) =>
            String(booking.salonName ?? "").toLowerCase() ===
            userSalonName.toLowerCase()
        );
      }

      const activeBookings = rawBookings
        .filter((booking) => {
          const status = booking.status?.toLowerCase() ?? "";

          return ["pending", "confirmed"].includes(status);
        })
        .map(transformBooking)
        .filter((booking) => booking.id);

      setBookings(activeBookings);
    } catch (error) {
      console.error("Failed to load bookings:", error);
      message.error("Failed to load bookings");
    }
  };

  useEffect(() => {
    if (!referenceData) return;

    void loadBookings();
  }, [referenceData, userSalonName, isAdmin]);

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      const result = await startSignalR();

      if (mounted) {
        setConnected(result);
      }
    };

    void connect();

    const handleReconnecting = () => {
      if (mounted) {
        setConnected(false);
      }
    };

    const handleReconnected = () => {
      if (mounted) {
        setConnected(true);
        void loadBookings();
      }
    };

    const handleClosed = () => {
      if (mounted) {
        setConnected(false);
      }
    };

    connection.onreconnecting(handleReconnecting);
    connection.onreconnected(handleReconnected);
    connection.onclose(handleClosed);

    return () => {
      mounted = false;
      connection.off("SlotBooked");
      connection.off("BookingUpdated");
      connection.off("SlotReleased");
    };
  }, [referenceData, userSalonName, isAdmin]);

  useEffect(() => {
    const handleSlotBooked = (booking: ApiBooking) => {
      const status = booking.status?.toLowerCase() ?? "pending";

      if (!["pending", "confirmed"].includes(status)) return;

      if (
        isAdmin &&
        userSalonName &&
        String(booking.salonName ?? "").toLowerCase() !==
          userSalonName.toLowerCase()
      ) {
        return;
      }

      const newBooking = transformBooking(booking);

      if (!newBooking.id) return;

      setBookings((current) => {
        const exists = current.some((item) => item.id === newBooking.id);

        if (exists) {
          return current.map((item) =>
            item.id === newBooking.id ? newBooking : item
          );
        }

        return [newBooking, ...current];
      });

      message.success(
        `${newBooking.customerName} - New booking created`
      );
    };

    const handleBookingUpdated = (booking: ApiBooking) => {
      const id = String(booking.id ?? "");

      if (!id) return;

      const status = booking.status?.toLowerCase() ?? "";

      if (["completed", "cancelled"].includes(status)) {
        setBookings((current) =>
          current.filter((item) => item.id !== id)
        );

        return;
      }

      if (!["pending", "confirmed"].includes(status)) return;

      if (
        isAdmin &&
        userSalonName &&
        String(booking.salonName ?? "").toLowerCase() !==
          userSalonName.toLowerCase()
      ) {
        return;
      }

      const updatedBooking = transformBooking(booking);

      setBookings((current) => {
        const exists = current.some((item) => item.id === id);

        if (!exists) {
          return [updatedBooking, ...current];
        }

        return current.map((item) =>
          item.id === id ? updatedBooking : item
        );
      });
    };

    const handleSlotReleased = (bookingId: string) => {
      const id = String(bookingId);

      setBookings((current) =>
        current.filter((booking) => booking.id !== id)
      );
    };

    connection.on("SlotBooked", handleSlotBooked);
    connection.on("BookingUpdated", handleBookingUpdated);
    connection.on("SlotReleased", handleSlotReleased);

    return () => {
      connection.off("SlotBooked", handleSlotBooked);
      connection.off("BookingUpdated", handleBookingUpdated);
      connection.off("SlotReleased", handleSlotReleased);
    };
  }, [isAdmin, userSalonName, customerMap, serviceMap]);

  const reconnectSignalR = async () => {
    setReconnecting(true);

    try {
      const result = await startSignalR();

      setConnected(result);

      if (result) {
        message.success("SignalR connected successfully");
        await loadBookings();
      } else {
        message.error("SignalR connection failed");
      }
    } catch (error) {
      console.error("SignalR reconnect error:", error);
      setConnected(false);
      message.error("Failed to reconnect");
    } finally {
      setReconnecting(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: {
        color: "gold",
        text: "Pending",
      },
      confirmed: {
        color: "green",
        text: "Confirmed",
      },
      completed: {
        color: "blue",
        text: "Completed",
      },
      cancelled: {
        color: "red",
        text: "Cancelled",
      },
    };

    return statusMap[status?.toLowerCase()] ?? statusMap.pending;
  };

  const columns = [
    {
      title: "Customer",
      dataIndex: "customerName",
      key: "customerName",
    },
    {
      title: "Service",
      dataIndex: "serviceName",
      key: "serviceName",
    },
    {
      title: "Date & Time",
      key: "appointmentDate",
      render: (_: unknown, record: Booking) => {
        if (!record.appointmentDate) return "-";

        const date = dayjs(record.appointmentDate);

        if (!date.isValid()) {
          return record.appointmentDate;
        }

        const time =
          record.startTime && record.endTime
            ? `${record.startTime} - ${record.endTime}`
            : record.startTime || "";

        return `${date.format("DD MMM YYYY")}${time ? `, ${time}` : ""}`;
      },
    },
    {
      title: "Status",
      key: "status",
      render: (_: unknown, record: Booking) => {
        const config = getStatusConfig(record.status);

        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
  ];

  const loading = referenceLoading;

  return (
    <div className="p-5">
      <Card
        title={<span className="text-lg font-semibold">Live Bookings</span>}
        extra={
          <div className="flex items-center gap-3">
            {loading && <Spin size="small" />}

            <span
              className={`flex items-center gap-1 ${
                connected ? "text-green-600" : "text-red-500"
              }`}
            >
              <span>{connected ? "●" : "○"}</span>
              {connected ? "Live" : "Disconnected"}
            </span>

            {!connected && (
              <Button
                size="small"
                type="primary"
                loading={reconnecting}
                onClick={reconnectSignalR}
              >
                {reconnecting ? "Connecting..." : "Reconnect"}
              </Button>
            )}
          </div>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={bookings}
          loading={loading}
          pagination={false}
          scroll={{ x: true }}
          locale={{
            emptyText: (
              <div className="py-10 text-gray-500">
                No active bookings
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};
export default LiveBooking;