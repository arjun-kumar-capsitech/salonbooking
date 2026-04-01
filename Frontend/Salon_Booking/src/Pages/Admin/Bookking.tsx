import { Card, Input, Form, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { Scissors } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import { InputField, SelectField } from "../../Components/Ui/Forms";
import ModalForm from "../../Components/Ui/Modals";

const BOOKING_API = "http://localhost:5296/api/Booking";
const USER_API = "http://localhost:5296/api/User";
const STAFF_API = "http://localhost:5296/api/Staff";
const SERVICE_API = "http://localhost:5296/api/AdminServices";

const Bookings = () => {

  const [form] = Form.useForm();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

      const users = userRes.data.filter((u: any) => u.role === 4);
      const staff = staffRes.data;
      const services = serviceRes.data;

      const mapped = bookingRes.data
        .map((b: any, index: number) => {

          const customer = users.find((u: any) => u.id === b.customerId);
          if (!customer) return null;
          const staffMember = staff.find((s: any) => s.id === b.staffId);
          const service = services.find((s: any) => s.id === b.serviceId);

          return {
            key: b.id || index,
            id: b.id,
            customerName: customer.fullName,
            serviceName: service?.serviceName || "N/A",
            staffName: staffMember?.name || "N/A",
            appointmentDate: dayjs(b.appointmentDate).format("DD MMM YYYY  hh:mm A"),
            amount: b.amount,
            status: b.status,
          };
        })
        .filter(Boolean);

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

    try {
      await axios.put(
        `${BOOKING_API}/${selectedBooking.id}`,
        { status: values.status },
        axiosConfig
      );

      message.success("Booking updated");

      fetchBookings();
      setModalVisible(false);
      form.resetFields();

    } catch (error) {

      console.error(error);
      message.error("Failed to update booking");

    }
  };
  const handleDelete = async (record: any) => {

    try {
      await axios.delete(`${BOOKING_API}/${record.id}`, axiosConfig);
      message.success("Booking deleted");
      fetchBookings();
    } catch (error) {
      console.error(error);
      message.error("Delete failed");
    }
  };
  const columns = [

    { title: "Customer", dataIndex: "customerName" },
    { title: "Service", dataIndex: "serviceName" },
    { title: "Staff", dataIndex: "staffName" },
    { title: "Appointment", dataIndex: "appointmentDate" },
    {
      title: "Amount",
      dataIndex: "amount",
      render: (value: number) => `$${value}`
    },

    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => (
       <StatusBadge type="booking" value={status} />
      )
    }
  ];

  const filteredBookings = bookings.filter((b) =>
    (b.customerName ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <>
      <div>
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
          <p className='p-2'>All Booking Data</p>
          <DataTable
            data={filteredBookings}
            columns={columns}
            loading={loading}
            showActions={true}
            rowKey="key"
            onEdit={(record: any) => {
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
          <InputField
            label="Customer Name"
            name="customerName"
            required
          />
          <SelectField
            label="Status"
            name="status"
            required
            options={[
              { value: "pending", label: "Pending" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </ModalForm>
      </div>
    </>
  );
};

export default Bookings;