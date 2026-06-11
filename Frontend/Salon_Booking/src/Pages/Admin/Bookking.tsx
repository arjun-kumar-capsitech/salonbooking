import { Card,Input, Select, Form, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Scissors } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, StatusBadge } from '../../Components/Ui/Table';
import { SelectField } from '../../Components/Ui/Forms';
import ModalForm from '../../Components/Ui/Modals';
import dayjs from 'dayjs';
import { getSalonBookingAPI } from '../../api/generated';

const { Option } = Select;
const { getApiBooking, getApiUser, getApiStaff, getApiAdminServices, putApiBookingId, deleteApiBookingId } = getSalonBookingAPI();
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
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();
  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInUserId = user?.id || user?._id;
  const userRole = user?.Role || user?.role;
  const userSalonName = user?.SalonName || user?.salonName;

  const isAdmin = userRole === "Admin" || userRole === 1 || userRole === 2;
  const isSuperAdmin = userRole === "SuperAdmin";
  const isCustomer = userRole === "Customer" || userRole === 4;

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  const extractData = (response: any) => {
    if (!response) return [];
    const data = response.data;
    if (data?.status === true && data?.result) return data.result;
    if (data?.result) return data.result;
    if (Array.isArray(data)) return data;
    return [];
  };

  const resetModal = () => {
    setModalVisible(false);
    setEditingBooking(null);
    form.resetFields();
  };

  const { data: bookings = [], isLoading: loading } = useQuery({
    queryKey: ['booking'], staleTime: 5000, refetchOnWindowFocus: false, refetchOnMount: false,
    queryFn: async () => {
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
      } else if (isAdmin && !isSuperAdmin && userSalonName) {
        filteredData = filteredData.filter(
          (b: any) => (b.salonName || b.SalonName) === userSalonName
        );
      }

      const normalized = filteredData
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
            salonName: b.salonName || b.SalonName || 'All'
          };
        })
        .filter(Boolean) as Booking[];

      return normalized;
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await putApiBookingId(id, { status }, axiosConfig);
    },
    onSuccess: () => {
      message.success('Booking status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['booking'] });
      resetModal();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to update status');
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteApiBookingId(id, axiosConfig);
    },
    onSuccess: () => {
      message.success('Booking deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['booking'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to delete booking');
    },
  });

  const handleFormSubmit = (values: any) => {
    if (editingBooking) {
      updateBookingMutation.mutate({ id: editingBooking.id, status: values.status });
    }
  };

  const handleDelete = (record: any) => {
    if (isCustomer || !record.id) return;
    deleteBookingMutation.mutate(record.id);
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b: any) =>
      (b.customerName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) &&
      (statusFilter === 'all' || b.status === statusFilter)
    );
  }, [bookings, searchTerm, statusFilter]);

  const columns = [
    { title: 'Customer Name', dataIndex: 'customerName' },
    { title: 'Service Name', dataIndex: 'serviceName' },
    { title: 'Staff Name', dataIndex: 'staffName' },
    { title: 'Appointment Date', dataIndex: 'appointmentDate' },
    { title: 'Amount', dataIndex: 'amount', render: (amount: number) => `$${amount}` },
    ...(isAdmin || isSuperAdmin ? [{ title: 'Salon Name', dataIndex: 'salonName' }] : []),
    { 
      title: 'Status', 
      dataIndex: 'status', 
      render: (status: string) => <StatusBadge value={status} type={'booking'} /> 
    }
  ];
  const canEdit = (record: any) => {
    return record.status !== 'completed' && record.status !== 'cancelled';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Booking Management</h1>
          <p className="text-gray-600">Manage salon bookings</p>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex gap-4">
          <Input
            placeholder="Search customer..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
          />
          <Select
            style={{ width: 120 }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="all">All Status</Option>
            <Option value="confirmed">Confirmed</Option>
            <Option value="completed">Completed</Option>
            <Option value="cancelled">Cancelled</Option>
          </Select>
        </div>
      </Card>

      <Card>
        <p className="p-2 mb-4">All Bookings Data</p>
        <DataTable
          data={filteredBookings}
          columns={columns}
          loading={loading || updateBookingMutation.isPending || deleteBookingMutation.isPending}
          onEdit={(record) => {
            if (!canEdit(record)) {
              message.warning(`Cannot edit a ${record.status} booking`);
              return;
            }
            setEditingBooking(record);
            form.setFieldsValue({ status: record.status });
            setModalVisible(true);
          }}
          onDelete={!isCustomer ? handleDelete : undefined}
          showActions={!isCustomer}
          rowKey="key"
        />
      </Card>

      {!isCustomer && (
        <ModalForm
          form={form}
          open={modalVisible}
          onClose={resetModal}
          title={<div className="flex items-center gap-2"><Scissors size={20} />Update Booking Status</div>}
          initialValues={editingBooking || { status: 'confirmed' }}
          onSubmit={handleFormSubmit}
          submitText="Update Booking"
          loading={updateBookingMutation.isPending}
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name
            </label>
            <div className="p-2 bg-gray-50 rounded border">
              {editingBooking?.customerName}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Name
            </label>
            <div className="p-2 bg-gray-50 rounded border">
              {editingBooking?.serviceName}
            </div>
          </div>

          <div className="mb-4">
            <SelectField
              label="Status"
              name="status"
              required
              options={[
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
            />
          </div>
        </ModalForm>
      )}
    </div>
  );
};
export default Bookings;