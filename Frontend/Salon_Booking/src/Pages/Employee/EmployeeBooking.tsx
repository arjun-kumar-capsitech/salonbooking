import React, { useState, useEffect } from "react";
import { Card, Button, Input, message } from "antd";
import Modals from "../../Components/Ui/Modals";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import axios from "axios";
import dayjs from "dayjs";

const BOOKING_API = "http://localhost:5296/api/Booking";
const USER_API = "http://localhost:5296/api/User";
const STAFF_API = "http://localhost:5296/api/Staff";
const SERVICE_API = "http://localhost:5296/api/AdminServices";

const EmployeeBooking: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
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
      const [bookingRes, userRes, staffRes, serviceRes] = await Promise.all([
        axios.get(BOOKING_API, axiosConfig),
        axios.get(USER_API, axiosConfig),
        axios.get(STAFF_API, axiosConfig),
        axios.get(SERVICE_API, axiosConfig),
      ]);

      const users = userRes.data;
      const staff = staffRes.data;
      const services = serviceRes.data;

      // ✅ IMPORTANT FIX (NO FILTER + SAFE MAPPING)
      const mapped = bookingRes.data.map((b: any, index: number) => {
        const customer = users.find(
          (u: any) => String(u.id) === String(b.customerId)
        );

        const staffMember = staff.find(
          (s: any) => String(s.id) === String(b.staffId)
        );

        const service = services.find(
          (s: any) => String(s.id) === String(b.serviceId)
        );

        return {
          key: b.id || index,
          id: b.id,
          customerName: customer?.fullName || "N/A",
          date: dayjs(b.appointmentDate).format("DD MMM YYYY"),
          time: dayjs(b.appointmentDate).format("hh:mm A"),
          services: service?.serviceName || "N/A",
          employee: staffMember?.name || "N/A",
          status: b.status,
          amount: `$${b.amount}`,
        };
      });

      setBookings(mapped);

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
      title: "Date & Time",
      render: (_: any, record: any) => (
        <div className="py-2">
          <div className="font-medium">{record.date}</div>
          <div className="text-sm text-gray-500">{record.time}</div>
        </div>
      ),
    },
    {
      title: "Services",
      dataIndex: "services",
    },
    {
      title: "Amount",
      dataIndex: "amount",
    },
    {
      title: "Status",
      render: (_: any, record: any) => (
        <StatusBadge type="booking" value={record.status} />
      ),
    },
  ];

  const filteredBookings = bookings.filter(
    (b) =>
      b.customerName?.toLowerCase().includes(searchText.toLowerCase()) ||
      String(b.id).toLowerCase().includes(searchText.toLowerCase())
  );

  const handleView = (record: any) => {
    setSelectedBooking(record);
    setModalVisible(true);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await axios.put(
        `${BOOKING_API}/${selectedBooking.id}`,
        { status: newStatus },
        axiosConfig
      );
      message.success("Booking updated");
      fetchBookings();
      setModalVisible(false);
      setSelectedBooking(null);
    } catch {
      message.error("Failed to update booking");
    }
  };

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Booking Management</h1>
          <p className="text-gray-500">Your assigned bookings</p>
        </div>

        <Card className="shadow-sm border border-gray-100">
          <div className="mb-4">
            <Input
              placeholder="Search bookings..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-64 mb-4"
            />
          </div>

          <DataTable
            data={filteredBookings}
            columns={columns}
            loading={loading}
            onView={handleView}
            showActions={true}
            rowKey="id"
          />
        </Card>

        <Modals
          onSubmit={() => {}}
          open={modalVisible}
          onClose={() => setModalVisible(false)}
          title={`Booking Details - ${selectedBooking?.customerName}`}
          width={500}
        >
          {selectedBooking && (
            <div className="space-y-4">
              <p><b>Customer:</b> {selectedBooking.customerName}</p>
              <p><b>Service:</b> {selectedBooking.services}</p>
              <p><b>Date:</b> {selectedBooking.date}</p>
              <p><b>Time:</b> {selectedBooking.time}</p>
              <p><b>Amount:</b> {selectedBooking.amount}</p>

              <div className="flex gap-2 pt-2">
                {selectedBooking.status !== "completed" && (
                  <>
                    <Button onClick={() => handleStatusUpdate("confirmed")}>
                      Confirm
                    </Button>
                    <Button onClick={() => handleStatusUpdate("pending")}>
                      Pending
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </Modals>
      </div>
    </>
  );
};
export default EmployeeBooking;