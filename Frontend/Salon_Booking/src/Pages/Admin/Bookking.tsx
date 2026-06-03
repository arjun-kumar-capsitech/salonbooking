import { Card, Input, Form, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Scissors } from 'lucide-react';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { DataTable } from '../../Components/Ui/Table';
import { SelectField } from '../../Components/Ui/Forms';
import ModalForm from '../../Components/Ui/Modals';
import { getSalonBookingAPI } from '../../api/generated';

const { getApiBooking,getApiUser, getApiStaff,getApiAdminServices,putApiBookingId,deleteApiBookingId} = getSalonBookingAPI();

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
  
  const axiosConfig = { 
    headers: { 
      Authorization: `Bearer ${token}` 
    } 
  };

  const extractData = (response: any) => {
    if (!response) return [];
    const data = response.data;
    if (data?.status === true && data?.result) return data.result;
    if (data?.result) return data.result;
    if (Array.isArray(data)) return data;
    return [];
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const [bookingRes, userRes, staffRes, serviceRes] = await Promise.all([
        getApiBooking(axiosConfig),
        getApiUser(axiosConfig),
        getApiStaff(axiosConfig),
        getApiAdminServices(axiosConfig),
      ]);

      const bookingsData = extractData(bookingRes);
      const usersData = extractData(userRes);
      const staffData = extractData(staffRes);
      const servicesData = extractData(serviceRes);

      const customers = Array.isArray(usersData) ? usersData.filter((u: any) => u.role === 4) : [];
      const staff = Array.isArray(staffData) ? staffData : [];
      const services = Array.isArray(servicesData) ? servicesData : [];

      let filteredData = Array.isArray(bookingsData) ? bookingsData : [];

      if (isCustomer) {
        filteredData = filteredData.filter(
          (b: any) => String(b.customerId || b.CustomerId) === String(loggedInUserId)
        );
      } else if (isAdmin) {
        filteredData = filteredData.filter(
          (b: any) => (b.salonName || b.SalonName) === userSalonName
        );
      }

      const mapped: Booking[] = filteredData
        .map((b: any, index: number) => {
          const customer = customers.find(
            (c: any) => String(c.id || c._id) === String(b.customerId || b.CustomerId)
          );
          const staffMember = staff.find(
            (s: any) => String(s.id || s._id) === String(b.staffId || b.StaffId)
          );
          const service = services.find(
            (s: any) => String(s.id || s._id) === String(b.serviceId || b.ServiceId)
          );

          let status = (b.status || b.Status || "pending").toLowerCase();
          if (status === "complete") status = "completed";

          return {
            key: b._id || b.id || index,
            id: b._id || b.id,
            customerName: customer?.fullName || customer?.FullName || customer?.name || "Unknown Customer",
            serviceName: service?.serviceName || service?.ServiceName || service?.name || "Unknown Service",
            staffName: staffMember?.name || staffMember?.Name || staffMember?.fullName || "Unknown Staff",
            appointmentDate: dayjs(b.appointmentDate || b.AppointmentDate).format("DD MMM YYYY hh:mm A"),
            amount: b.amount || b.Amount || 0,
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
      await putApiBookingId(selectedBooking.id, { status: values.status }, axiosConfig);
      message.success("Booking updated successfully");
      fetchBookings();
      setModalVisible(false);
      form.resetFields();
      setSelectedBooking(null);
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
      await deleteApiBookingId(record.id, axiosConfig);
      message.success("Booking deleted successfully");
      fetchBookings();
    } catch (error) {
      console.error(error);
      message.error("Delete failed");
    }
  };

  const handleEdit = (record: Booking) => {
    if (record.status === "completed") {
      message.warning("Cannot edit a completed booking");
      return;
    }

    if (record.status === "cancelled") {
      message.warning("Cannot edit a cancelled booking");
      return;
    }
    
    setSelectedBooking(record);
    form.setFieldsValue({ status: record.status });
    setModalVisible(true);
  };

  const filteredBookings = bookings.filter((b) =>
    b.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
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
          allowClear
        />
      </Card>

      <Card>
        <p className="p-2 mb-4">All Booking Data</p>
        <DataTable
          data={filteredBookings}
          loading={loading}
          showActions
          rowKey="key"
          tableType="bookings"
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Card>

      <ModalForm
        form={form}
        open={modalVisible}
        onClose={() => {
          setModalVisible(false);
          form.resetFields();
          setSelectedBooking(null);
        }}
        title={
          <div className="flex items-center gap-2">
            <Scissors size={20} />
            Update Booking Status
          </div>
        }
        onSubmit={handleFormSubmit}
        submitText="Update Booking"
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Name
          </label>
          <div className="p-2 bg-gray-50 rounded border">
            {selectedBooking?.customerName}
          </div>
        </div>
        
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
    </div>
  );
};

export default Bookings;