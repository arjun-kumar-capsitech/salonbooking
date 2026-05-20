import { Card, Input, Form, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { Scissors } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { DataTable } from "../../Components/Ui/Table";
import { InputField, SelectField } from "../../Components/Ui/Forms";
import ModalForm from "../../Components/Ui/Modals";

const BOOKING_API = "http://localhost:5296/api/Booking";
const USER_API = "http://localhost:5296/api/User";
const STAFF_API = "http://localhost:5296/api/Staff";
const SERVICE_API = "http://localhost:5296/api/AdminServices";

interface Booking {
  key: string | number;
  id: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  appointmentDate: string;
  amount: number;
  status: string;
}

const Bookings = () => {
  const [form] = Form.useForm();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInUserId = user?.id || user?._id;
  const userRole = user?.Role || user?.role;
  const userSalonName = user?.SalonName || user?.salonName;
  const isAdmin = userRole === "Admin" || userRole === 1 || userRole === 2;
  const isCustomer = userRole === "Customer" || userRole === 4;
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const [bookingRes, userRes, staffRes, serviceRes] = await Promise.all([
        axios.get(BOOKING_API, axiosConfig),
        axios.get(USER_API, axiosConfig),
        axios.get(STAFF_API, axiosConfig),
        axios.get(SERVICE_API, axiosConfig),
      ]);

      const customers = userRes.data.filter((u: any) => u.role === 4);
      const staff = staffRes.data;
      const services = serviceRes.data;

      let filteredData = bookingRes.data;

      if (isCustomer) {
        filteredData = bookingRes.data.filter(
          (b: any) => String(b.CustomerId || b.customerId) === String(loggedInUserId)
        );
      } else if (isAdmin) {
        filteredData = bookingRes.data.filter(
          (b: any) => (b.SalonName || b.salonName) === userSalonName
        );
      }

      const mapped: Booking[] = filteredData
        .map((b: any, index: number) => {
          const customer = customers.find(
            (c: any) => String(c.id || c._id) === String(b.CustomerId || b.customerId)
          );
          const staffMember = staff.find(
            (s: any) => String(s.id || s._id) === String(b.StaffId || b.staffId)
          );
          const service = services.find(
            (s: any) => String(s.id || s._id) === String(b.ServiceId || b.serviceId)
          );

          let status = (b.Status || b.status || "pending").toLowerCase();
          if (status === "complete") status = "completed";

          return {
            key: b._id || b.id || index,
            id: b._id || b.id,
            customerName: customer?.FullName || customer?.fullName || customer?.name || "Unknown Customer",
            serviceName: service?.serviceName || service?.name || "Unknown Service",
            staffName: staffMember?.FullName || staffMember?.fullName || staffMember?.name || "Unknown Staff",
            appointmentDate: dayjs(b.AppointmentDate || b.appointmentDate).format("DD MMM YYYY hh:mm A"),
            amount: b.Amount || b.amount || 0,
            status: status,
          };
        })
        .filter(Boolean) as Booking[];

      setBookings(mapped);
    } catch (error) {
      console.error(error);
      message.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleFormSubmit = async (values: any) => {
    if (!selectedBooking) return;

    if (selectedBooking.status === "completed") {
      message.error("Cannot update a completed booking");
      setModalVisible(false);
      return;
    }

    if (selectedBooking.status === "cancelled") {
      message.error("Cannot update a cancelled booking");
      setModalVisible(false);
      return;
    }

    try {
      await axios.put(
        `${BOOKING_API}/${selectedBooking.id}`,
        { Status: values.status },
        axiosConfig
      );
      message.success("Booking updated successfully");
      fetchBookings();
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error(error);
      message.error("Failed to update booking");
    }
  };

  const handleDelete = async (record: Booking) => {
    if (record.status === "completed") {
      message.error("Cannot delete a completed booking");
      return;
    }

    if (record.status === "cancelled") {
      message.error("Cannot delete a cancelled booking");
      return;
    }

    try {
      await axios.delete(`${BOOKING_API}/${record.id}`, axiosConfig);
      message.success("Booking deleted successfully");
      fetchBookings();
    } catch (error) {
      console.error(error);
      message.error("Delete failed");
    }
  };

  const filteredBookings = bookings.filter((b) =>
    b.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canEdit = (record: Booking) => {
    return record.status !== "completed" && record.status !== "cancelled";
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Booking Management</h1>
          <p className="text-gray-600">Manage salon bookings</p>
        </div>
      </div>

      <Card className="mb-6">
        <Input
          placeholder="Search customer"
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Card>

      <Card>
        <p className="p-2">All Booking Data</p>
        <DataTable
          data={filteredBookings}
          loading={loading}
          showActions
          rowKey="key"
          tableType="bookings"
          onEdit={(record: Booking) => {
            if (!canEdit(record)) {
              message.warning(`Cannot edit a ${record.status} booking`);
              return;
            }
            setSelectedBooking(record);
            form.setFieldsValue(record);
            setModalVisible(true);
          }}
          onDelete={handleDelete}
        />
      </Card>

      <ModalForm
        form={form}
        open={modalVisible}
        onClose={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        title={
          <div className="flex items-center gap-2">
            <Scissors size={20} />
            Update Booking
          </div>
        }
        onSubmit={handleFormSubmit}
        submitText="Update Booking"
      >
        <InputField label="Customer Name" name="customerName" required />
        <SelectField
          label="Status"
          name="status"
          required
          options={[
            { value: "confirmed", label: "Confirmed" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      </ModalForm>
    </>
  );
};

export default Bookings;