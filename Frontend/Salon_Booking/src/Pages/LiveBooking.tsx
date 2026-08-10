import { useEffect, useState, useCallback } from "react";
import { Card, Table, Tag, Spin, message, Button } from "antd";
import { connection, startSignalR } from "../../src/Services/signalR";
import { getSalonBookingAPI } from '../api/generated';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';

const { getApiBooking, getApiAdminServices, getApiUser } = getSalonBookingAPI();

interface Booking {
  id: string;
  customerName: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

const LiveBooking = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.Role || user?.role;
  const userSalonName = user?.SalonName || user?.salonName;
  const isAdmin = userRole === "Admin" || userRole === 1 || userRole === 2;
  const isSuperAdmin = userRole === "SuperAdmin";

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  const ResponseData = (response: any) => {
    if (!response) return null;
    if (typeof response.data === 'string') {
      try { return JSON.parse(response.data); } catch { return null; }
    }
    return response.data;
  };

  const extractArray = (response: any) => {
    const parsed = ResponseData(response);
    if (!parsed) return [];
    if (parsed?.status === true && parsed?.result) {
      if (Array.isArray(parsed.result)) return parsed.result;
      if (parsed.result?.data && Array.isArray(parsed.result.data)) return parsed.result.data;
    }
    if (Array.isArray(parsed)) return parsed;
    if (parsed?.data && Array.isArray(parsed.data)) return parsed.data;
    return [];
  };

  const { data: referenceData } = useQuery({
    queryKey: ['referenceData'],
    queryFn: async () => {
      try {
        const [userRes, serviceRes] = await Promise.all([
          getApiUser({ page: 1, pageSize: 1000 }, axiosConfig),
          getApiAdminServices(axiosConfig),
        ]);

        const users = extractArray(userRes);
        const services = extractArray(serviceRes);

        const customerMap: Record<string, string> = {};
        const serviceMap: Record<string, string> = {};

        users.forEach((u: any) => {
          const id = String(u.id || u._id);
          const name = u.fullName || u.FullName || u.name || u.Name || 'Unknown Customer';
          const role = String(u.role || u.Role).toLowerCase();
          if (role === '4' || role === 'customer') {
            customerMap[id] = name;
          }
        });

        services.forEach((s: any) => {
          const id = String(s.id || s._id);
          const isActive = s.isActive !== undefined ? s.isActive : s.IsActive;
          if (isActive !== false) {
            serviceMap[id] = s.serviceName || s.ServiceName || s.name || s.Name || 'Unknown Service';
          }
        });

        return { customerMap, serviceMap };
      } catch {
        return { customerMap: {}, serviceMap: {} };
      }
    },
  });

  const getServiceDisplay = (booking: any): string => {
    const serviceIds = booking.serviceIds || booking.ServiceIds || [];
    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      return serviceIds.map((id: string) => referenceData?.serviceMap?.[String(id)] || 'Unknown Service').join(', ');
    }
    const singleId = String(booking.serviceId || booking.ServiceId || '');
    if (singleId && referenceData?.serviceMap?.[singleId]) {
      return referenceData.serviceMap[singleId];
    }
    return booking.serviceName || booking.ServiceName || 'Unknown Service';
  };

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getApiBooking({ page: 1, pageSize: 100 }, axiosConfig);
      const parsedData = ResponseData(response);

      if (!parsedData?.status === true || !parsedData?.result?.data) {
        setBookings([]);
        return;
      }

      let rawBookings = parsedData.result.data;

      if (isAdmin && !isSuperAdmin && userSalonName) {
        rawBookings = rawBookings.filter((b: any) => (b.salonName || b.SalonName) === userSalonName);
      }

      const transformed = rawBookings
        .filter((b: any) => {
          const status = (b.status || b.Status || '').toLowerCase();
          return status === 'pending' || status === 'confirmed';
        })
        .map((b: any) => {
          const customerId = String(b.customerId || b.CustomerId);
          return {
            id: b.id || b._id || b.bookingId || '',
            customerName: referenceData?.customerMap?.[customerId] || b.customerName || b.CustomerName || b.name || 'Unknown Customer',
            serviceName: getServiceDisplay(b),
            appointmentDate: b.appointmentDate || b.AppointmentDate || b.appointment_date || b.date || new Date().toISOString(),
            startTime: b.startTime || b.StartTime || '',
            endTime: b.endTime || b.EndTime || '',
            status: (b.status || b.Status || 'pending').toLowerCase(),
          };
        })
        .filter((b: Booking) => b.customerName !== 'Unknown Customer' && b.serviceName !== 'Unknown Service')
        .sort((a: Booking, b: Booking) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());

      setBookings(transformed);
    } catch {
      message.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [token, isAdmin, isSuperAdmin, userSalonName, referenceData]);

  useEffect(() => {
    if (referenceData) fetchBookings();
  }, [fetchBookings, referenceData]);

  const reconnectSignalR = async () => {
    setReconnecting(true);
    try {
      if (connection.state === "Connected") {
        setConnected(true);
        message.success('Already connected');
      } else {
        const result = await startSignalR();
        setConnected(result);
        result ? message.success('Connected successfully!') : message.error('Failed to connect');
      }
    } catch {
      setConnected(false);
      message.error('Failed to reconnect');
    } finally {
      setReconnecting(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const initSignalR = async () => {
      try {
        const connected = await startSignalR();
        if (isMounted) {
          setConnected(connected);
          if (!connected && retryCount < maxRetries) {
            retryCount++;
            setTimeout(initSignalR, 3000);
          }
        }
      } catch {
        if (isMounted && retryCount < maxRetries) {
          retryCount++;
          setTimeout(initSignalR, 3000);
        }
      }
    };

    initSignalR();

    const onConnected = () => {
      if (isMounted) {
        setConnected(true);
        console.log(' SignalR Connected');
      }
    };

    const onDisconnected = () => {
      if (isMounted) {
        setConnected(false);
        console.log(' SignalR Disconnected');
      }
    };

    const onSlotBooked = (booking: any) => {
      const status = (booking.status || booking.Status || 'pending').toLowerCase();
      if (status !== 'pending' && status !== 'confirmed') return;

      if (isAdmin && !isSuperAdmin && userSalonName) {
        if ((booking.salonName || booking.SalonName || booking.salon_name) !== userSalonName) return;
      }

      const customerId = String(booking.customerId || booking.CustomerId);
      const newBooking: Booking = {
        id: booking.id || booking._id || booking.bookingId || '',
        customerName: referenceData?.customerMap?.[customerId] || booking.customerName || booking.CustomerName || 'Unknown Customer',
        serviceName: getServiceDisplay(booking),
        appointmentDate: booking.appointmentDate || booking.AppointmentDate || booking.appointment_date || new Date().toISOString(),
        startTime: booking.startTime || booking.StartTime || '',
        endTime: booking.endTime || booking.EndTime || '',
        status: status,
      };

      setBookings((prev) => {
        if (prev.find(b => b.id === newBooking.id)) return prev;
        return [newBooking, ...prev];
      });
      message.success(`${newBooking.customerName} - New booking for ${newBooking.serviceName}`);
    };

    const onBookingUpdated = (updatedBooking: any) => {
      const bookingId = updatedBooking.id || updatedBooking._id || updatedBooking.bookingId || updatedBooking.Id;
      const newStatus = (updatedBooking.status || updatedBooking.Status || '').toLowerCase();

      if (!bookingId) return;

      if (newStatus === 'completed' || newStatus === 'cancelled') {
        setBookings((prev) => {
          const removed = prev.find(b => b.id === bookingId);
          if (removed) {
            message.info(`${removed.customerName} - ${removed.serviceName} is now ${newStatus}`);
          }
          return prev.filter((b) => b.id !== bookingId);
        });
      } else if (newStatus === 'pending' || newStatus === 'confirmed') {
        setBookings((prev) => {
          const exists = prev.find(b => b.id === bookingId);
          if (exists) {
            return prev.map((b) => {
              if (b.id === bookingId) {
                const customerId = String(updatedBooking.customerId || updatedBooking.CustomerId);
                return {
                  ...b,
                  status: newStatus,
                  customerName: referenceData?.customerMap?.[customerId] || updatedBooking.customerName || updatedBooking.CustomerName || b.customerName,
                  serviceName: getServiceDisplay(updatedBooking),
                  startTime: updatedBooking.startTime || updatedBooking.StartTime || b.startTime,
                  endTime: updatedBooking.endTime || updatedBooking.EndTime || b.endTime,
                };
              }
              return b;
            });
          } else {
            const newBooking: Booking = {
              id: bookingId,
              customerName: updatedBooking.customerName || updatedBooking.CustomerName || 'Unknown Customer',
              serviceName: getServiceDisplay(updatedBooking),
              appointmentDate: updatedBooking.appointmentDate || updatedBooking.AppointmentDate || new Date().toISOString(),
              startTime: updatedBooking.startTime || updatedBooking.StartTime || '',
              endTime: updatedBooking.endTime || updatedBooking.EndTime || '',
              status: newStatus,
            };
            return [newBooking, ...prev];
          }
        });
      }
    };

    const onSlotReleased = (bookingId: string) => {
      setBookings((prev) => {
        const deleted = prev.find(b => b.id === bookingId);
        if (deleted) {
          message.info(`${deleted.customerName} - ${deleted.serviceName} cancelled`);
        }
        return prev.filter((b) => b.id !== bookingId);
      });
    };

    connection.on("connected", onConnected);
    connection.on("disconnected", onDisconnected);
    connection.on("slotbooked", onSlotBooked);
    connection.on("bookingupdated", onBookingUpdated);
    connection.on("slotreleased", onSlotReleased);

    return () => {
      isMounted = false;
      connection.off("connected", onConnected);
      connection.off("disconnected", onDisconnected);
      connection.off("slotbooked", onSlotBooked);
      connection.off("bookingupdated", onBookingUpdated);
      connection.off("slotreleased", onSlotReleased);
    };
  }, [isAdmin, isSuperAdmin, userSalonName, referenceData]);

  const getStatusConfig = (status: string) => {
    const map: Record<string, { color: string; text: string }> = {
      pending: { color: 'gold', text: 'Pending' },
      confirmed: { color: 'green', text: 'Confirmed' },
      completed: { color: 'blue', text: 'Completed' },
      cancelled: { color: 'red', text: 'Cancelled' },
    };
    return map[status?.toLowerCase()] || map.pending;
  };

  const columns = [
    { title: 'Customer', dataIndex: 'customerName', key: 'customerName' },
    { title: 'Service', dataIndex: 'serviceName', key: 'serviceName' },
    {
      title: 'Date & Time',
      key: 'appointmentDate',
      render: (_: any, record: Booking) => {
        try {
          const date = dayjs(record.appointmentDate);
          if (!date.isValid()) return record.appointmentDate;
          let timeStr = '';
          if (record.startTime && record.endTime) {
            timeStr = `${record.startTime} - ${record.endTime}`;
          } else if (record.startTime) {
            timeStr = record.startTime;
          } else {
            timeStr = date.format('hh:mm A');
          }
          return `${date.format('DD MMM YYYY')}${timeStr ? `, ${timeStr}` : ''}`;
        } catch {
          return record.appointmentDate;
        }
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: Booking) => {
        const config = getStatusConfig(record.status);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <Card
        title={<span style={{ fontSize: 18, fontWeight: 600 }}>Live Bookings</span>}
        extra={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {loading && <Spin size="small" />}
            <span style={{ marginLeft: 8, color: connected ? '#52c41a' : '#ff4d4f', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{connected ? '●' : '○'}</span>
              <span>{connected ? 'Live' : 'Disconnected'}</span>
            </span>
            {!connected && !loading && (
              <Button size="small" type="primary" onClick={reconnectSignalR} loading={reconnecting}>
                {reconnecting ? 'Connecting...' : 'Reconnect'}
              </Button>
            )}
          </span>
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
              <div style={{ padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}></div>
                <div style={{ color: '#999' }}>No active bookings</div>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};
export default LiveBooking;