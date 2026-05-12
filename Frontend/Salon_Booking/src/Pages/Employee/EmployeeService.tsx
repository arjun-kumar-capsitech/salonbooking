import React, { useState, useEffect } from "react";
import { Card, Tag, Button, Progress, message } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import Modals from "../../Components/Ui/Modals";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import axios from "axios";

const BOOKING_API = "http://localhost:5296/api/Booking";
const USER_API = "http://localhost:5296/api/User";
const SERVICE_API = "http://localhost:5296/api/AdminServices";

interface Booking {
  id: string;
  customerName: string;
  time: string;
  services: string;
  status: string;
}

const ServicePage: React.FC = () => {
  const [bookingsData, setBookingsData] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("authToken");

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const [bookingRes, userRes, serviceRes] = await Promise.all([
        axios.get(BOOKING_API, axiosConfig),
        axios.get(USER_API, axiosConfig),
        axios.get(SERVICE_API, axiosConfig),
      ]);

      const users = userRes.data;
      const servicesList = serviceRes.data;

      const mapped = bookingRes.data.map((b: any) => {

        const customer = users.find(
          (u: any) =>
            String(u.id || u._id) ===
            String(b.customerId || b.CustomerId)
        );

        const service = servicesList.find(
          (s: any) =>
            String(s.id || s._id) ===
            String(b.serviceId || b.ServiceId)
        );

        return {
          id: b.id || b._id,
          customerName: customer?.fullName || customer?.FullName || "N/A",
          time: new Date(b.appointmentDate || b.AppointmentDate)
            .toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          services: service?.serviceName || service?.ServiceName || "Service",
          status: b.status || b.Status || "assigned",
        };
      });

      setBookingsData(mapped);

    } catch (err) {
      console.error(err);
      message.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const columns = [
    {
      title: "Customer",
      dataIndex: "customerName",
    },
    {
      title: "Time",
      dataIndex: "time",
      render: (text: string) => (
        <div className="flex items-center">
          <CalendarOutlined className="mr-2 text-gray-400" />
          <span className="font-medium">{text}</span>
        </div>
      ),
    },
    {
      title: "Services",
      dataIndex: "services",
    },
    {
      title: "Status",
      render: (_: any, record: any) => (
        <StatusBadge
          type="booking"
          value={record.status === "complete" ? "Complete" : record.status}
        />
      ),
    },
  ];

  const handleViewBooking = (record: Booking) => {
    setSelectedBooking(record);

    setServices([
      {
        id: "1",
        name: record.services,
        duration: "30 min",
        status: "not_started",
      },
    ]);

    setProgressModalVisible(true);
  };

  const handleServiceAction = (serviceId: string, action: string) => {
    setServices((prev) =>
      prev.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              status: action === "start" ? "in_progress" : "complete",
            }
          : service
      )
    );
  };

  const handleSaveProgress = async () => {
    if (!selectedBooking) return;

    const completedServices = services.filter(
      (s) => s.status === "complete"
    ).length;

    if (completedServices !== services.length) {
      message.warning("Please complete all services first");
      return;
    }

    try {
      await axios.put(
        `${BOOKING_API}/${selectedBooking.id}`,
        { status: "complete" },
        axiosConfig
      );

      message.success("Booking Complete");
      fetchBookings();
      setProgressModalVisible(false);
      setSelectedBooking(null);
      setServices([]);

    } catch {
      message.error("Failed to update booking");
    }
  };

  const completedServices = services.filter(
    (s) => s.status === "complete"
  ).length;

  const progressPercent =
    services.length > 0 ? (completedServices / services.length) * 100 : 0;

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Service Management</h1>
          <p className="text-gray-500">Manage and execute services</p>
        </div>

        <Card className="shadow-sm border border-gray-100">
          <p className="p-2">Manage All Services</p>

          <DataTable
            data={bookingsData}
            columns={columns}
            loading={loading}
            onView={handleViewBooking}
            showActions={true}
            rowKey="id"
          />
        </Card>

        <Modals
          open={progressModalVisible}
          onClose={() => setProgressModalVisible(false)}
          title={`Service - ${selectedBooking?.customerName}`}
          width={500}
          submitText="Complete Booking"
          onSubmit={handleSaveProgress}
        >
          {selectedBooking && (
            <div className="space-y-6">
              <Card>
                <div className="font-medium text-lg">
                  {selectedBooking.customerName}
                </div>
                <div className="text-gray-600 text-sm">
                  {selectedBooking.time}
                </div>
                <div className="text-gray-600 mt-2">
                  Service: {selectedBooking.services}
                </div>
              </Card>

              <Progress percent={progressPercent} strokeColor="#52c41a" />

              {services.map((service) => (
                <Card key={service.id}>
                  <div className="flex justify-between mb-2">
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-gray-500">
                        {service.duration}
                      </div>
                    </div>

                    <Tag>{service.status}</Tag>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="small"
                      onClick={() =>
                        handleServiceAction(service.id, "start")
                      }
                      disabled={service.status !== "not_started"}
                    >
                      Start
                    </Button>

                    <Button
                      size="small"
                      onClick={() =>
                        handleServiceAction(service.id, "complete")
                      }
                      disabled={service.status !== "in_progress"}
                    >
                      Complete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Modals>
      </div>
    </>
  );
};

export default ServicePage;