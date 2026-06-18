import { Card, Input, Select, Form, message, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Scissors } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { DataTable, StatusBadge } from '../../Components/Ui/Table';
import { SelectField } from '../../Components/Ui/Forms';
import ModalForm from '../../Components/Ui/Modals';
import dayjs from 'dayjs';
import { getSalonBookingAPI } from '../../api/generated';

const { Option } = Select;
const {
  getAllBooking: getApiBooking,
  getAllUsers: getApiUser,
  getAllStaff: getApiStaff,
  getAllServices: getApiAdminServices,
  updateStatus: putApiBookingId
} = getSalonBookingAPI();

const Bookings = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
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

  const extractArray = (response: any) => {
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

  const { data: referenceData, isLoading: referenceLoading } = useQuery({
    queryKey: ['referenceData'], staleTime: 30000, refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        const [userRes, staffRes, serviceRes] = await Promise.all([
          getApiUser({ page: 1, pageSize: 1000 }, axiosConfig),
          getApiStaff({ page: 1, pageSize: 1000 }, axiosConfig),
          getApiAdminServices(axiosConfig),
        ]);

        const users = extractArray(userRes);
        const staff = extractArray(staffRes);
        const services = extractArray(serviceRes);

        const customerMap: Record<string, string> = {};
        const staffMap: Record<string, string> = {};
        const serviceMap: Record<string, string> = {};

        users.forEach((u: any) => {
          const role = u.role || u.Role;
          const roleStr = String(role).toLowerCase();
          if (roleStr === '4' || roleStr === 'customer') {
            const id = String(u.id || u._id);
            const name = u.fullName || u.FullName || u.name || u.Name || 'Unknown Customer';
            customerMap[id] = name;
          }
        });

        staff.forEach((s: any) => {
          const id = String(s.id || s._id);
          const name = s.name || s.Name || s.fullName || s.FullName || 'Unknown Staff';
          staffMap[id] = name;
        });

        users.forEach((u: any) => {
          const role = u.role || u.Role;
          const roleStr = String(role).toLowerCase();
          if (roleStr === '3' || roleStr === 'employee') {
            const employeeProfileId = u.employeeProfileId || u.EmployeeProfileId;
            if (employeeProfileId) {
              const name = u.fullName || u.FullName || u.name || u.Name || 'Unknown Staff';
              staffMap[String(employeeProfileId)] = name;
            }
          }
        });

        services.forEach((s: any) => {
          const id = String(s.id || s._id);
          const name = s.serviceName || s.ServiceName || s.name || s.Name || 'Unknown Service';
          serviceMap[id] = name;
        });

        return { customerMap, staffMap, serviceMap };
      } catch (error) {
        console.error('Error fetching reference data:', error);
        return { customerMap: {}, staffMap: {}, serviceMap: {} };
      }
    },
  });

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['bookings', statusFilter, searchInput],
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const response = await getApiBooking({ page: pageParam, pageSize: 4 }, axiosConfig);
        const parsedData = ResponseData(response);

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

        if (isCustomer) {
          rawBookings = rawBookings.filter((b: any) =>
            String(b.customerId || b.CustomerId) === String(loggedInUserId)
          );
        } else if (isAdmin && !isSuperAdmin && userSalonName) {
          rawBookings = rawBookings.filter((b: any) =>
            (b.salonName || b.SalonName) === userSalonName
          );
        }

        if (searchInput) {
          const searchLower = searchInput.toLowerCase();
          rawBookings = rawBookings.filter((b: any) => {
            const customerId = String(b.customerId || b.CustomerId);
            const customerName = referenceData?.customerMap?.[customerId] || '';
            return customerName.toLowerCase().includes(searchLower);
          });
        }

        if (statusFilter !== 'all') {
          rawBookings = rawBookings.filter((b: any) => {
            const status = (b.status || b.Status || "").toLowerCase();
            return status === statusFilter.toLowerCase();
          });
        }

        const transformedBookings = rawBookings.map((b: any, index: number) => {
          const customerId = String(b.customerId || b.CustomerId);
          const staffId = String(b.staffId || b.StaffId);
          const serviceId = String(b.serviceId || b.ServiceId);

          const customerName = referenceData?.customerMap?.[customerId] || 'Unknown Customer';
          const staffName = referenceData?.staffMap?.[staffId] || 'Unknown Staff';
          const serviceName = referenceData?.serviceMap?.[serviceId] || 'Unknown Service';

          let status = (b.status || b.Status || "pending").toLowerCase();
          if (status === "complete") status = "completed";

          return {
            key: b.id || b._id || `${pageParam}-${index}`,
            id: b.id || b._id || '',
            customerName: customerName,
            serviceName: serviceName,
            staffName: staffName,
            appointmentDate: dayjs(b.appointmentDate || b.AppointmentDate).format("DD MMM YYYY hh:mm A"),
            amount: b.amount || b.Amount || 0,
            status: status,
            salonName: b.salonName || b.SalonName || 'All',
          };
        });

        return {
          data: transformedBookings,
          totalCount: pagination?.totalCount || transformedBookings.length,
          hasNextPage: pagination?.hasNextPage || false,
          nextPage: pageParam + 1,
        };
      } catch (error) {
        console.error('Error fetching bookings:', error);
        return {
          data: [],
          totalCount: 0,
          hasNextPage: false,
          nextPage: pageParam + 1,
        };
      }
    },
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextPage : undefined,
    enabled: !!referenceData,
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

  const allBookings = useMemo(() => {
    return infiniteData?.pages?.flatMap((page) => page.data) || [];
  }, [infiniteData]);

  const totalCount = infiniteData?.pages?.[0]?.totalCount || 0;

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await putApiBookingId(id, { status }, axiosConfig);
    },
    onSuccess: () => {
      message.success('Booking status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      resetModal();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to update status');
    },
  });

  const handleFormSubmit = (values: any) => {
    if (editingBooking) {
      updateBookingMutation.mutate({ id: editingBooking.id, status: values.status });
    }
  };

  const resetModal = () => {
    setModalVisible(false);
    setEditingBooking(null);
    form.resetFields();
  };

  const canEdit = (record: any) => {
    return record.status !== 'completed' && record.status !== 'cancelled';
  };

  const handleSearch = () => {
    setSearchInput(searchTerm);
  };

  const columns = [
    { title: 'Customer Name', dataIndex: 'customerName' },
    { title: 'Service Name', dataIndex: 'serviceName' },
    { title: 'Staff Name', dataIndex: 'staffName' },
    { title: 'Appointment Date', dataIndex: 'appointmentDate' },
    { title: 'Amount', dataIndex: 'amount', render: (amount: number) => `$${amount}` },
    ...(isAdmin || isSuperAdmin ? [{ title: 'Salon Name', dataIndex: 'salonName' }] : []),
    { title: 'Status', dataIndex: 'status', render: (status: string) => <StatusBadge value={status} type="booking" /> }
  ];

  const isLoading = (loading && !infiniteData) || referenceLoading;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Booking Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage All Bookings</p>
          {totalCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Showing {allBookings.length} of {totalCount} bookings
            </p>
          )}
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
            onPressEnter={handleSearch}
            allowClear
          />
          <Select
            style={{ width: 120 }}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
          >
            <Option value="all">All Status</Option>
            <Option value="confirmed">Confirmed</Option>
            <Option value="completed">Completed</Option>
            <Option value="cancelled">Cancelled</Option>
          </Select>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex justify-between items-center">
          <div className="p-2">
            All Bookings Data
            {isFetching && !isFetchingNextPage && <Spin size="small" className="ml-2" />}
          </div>
        </div>

        <DataTable
          data={allBookings}
          columns={columns}
          loading={isLoading}
          onEdit={(record: any) => {
            if (!canEdit(record)) {
              message.warning(`Cannot edit a ${record.status} booking`);
              return;
            }
            setEditingBooking(record);
            form.setFieldsValue({ status: record.status });
            setModalVisible(true);
          }}
          showActions={!isCustomer}
          rowKey="key"
        />

        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="text-center py-4">
              <Spin size="large" />
              <p className="mt-2 text-gray-500">Loading more bookings...</p>
            </div>
          )}

          {!hasNextPage && allBookings.length > 0 && allBookings.length === totalCount && (
            <div className="text-center py-4 text-green-600">
              All {totalCount} bookings loaded successfully!
            </div>
          )}

          {!hasNextPage && allBookings.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              No bookings found
            </div>
          )}
        </div>
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