import { Card, Button, Input, Select, Form, message, Spin, DatePicker, Row, Col, Alert, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Scissors } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { getSalonBookingAPI } from '../../api/generated';
import { DataTable } from '../../Components/Ui/Table';
import { InputField, SelectField } from '../../Components/Ui/Forms';
import ModalForm from '../../Components/Ui/Modals';
import { useSearch } from '../../utils/FilterData';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from "react-router-dom";
import { connection, startSignalR } from '../../Services/signalR';
import axios from 'axios';

const { Option } = Select;
const { getApiBooking, getApiUser, getApiStaff, getApiAdminServices, putApiBookingId, postApiBooking, deleteApiBookingId, postApiSlotAvailableSlots } = getSalonBookingAPI();

interface SlotDto {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

const Bookings = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [form] = Form.useForm();
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
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

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotDto | null>(null);
  const [customerName, setCustomerName] = useState('');

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  connection.on("SlotBooked", () => {
    queryClient.invalidateQueries({ queryKey: ["availableSlots"] });
  });

  useEffect(() => {
    connection.on("SlotBooked", (booking) => {
      console.log(" NEW BOOKING", booking);
    });
    return () => {
      connection.off("SlotBooked");
    };
  }, []);

  useEffect(() => {
    startSignalR();
  }, []);

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
    queryKey: ['referenceData', userSalonName],
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

        const customerMap: Record<string, { id: string; name: string; salonName: string }> = {};
        const staffMap: Record<string, { id: string; name: string; salonName: string }> = {};
        const serviceMap: Record<string, { id: string; name: string; duration: number; price: number; salonName: string }> = {};
        const adminMap: Record<string, string> = {};

        users.forEach((u: any) => {
          const id = String(u.id || u._id);
          const name = u.fullName || u.FullName || u.name || u.Name || 'Unknown Customer';
          const userSalon = u.salonName || u.SalonName || u.salon || u.Salon;
          const role = u.role || u.Role;
          const roleStr = String(role).toLowerCase();

          if (roleStr === '1' || roleStr === '2' || roleStr === 'admin') {
            if (userSalon) {
              adminMap[userSalon] = id;
            }
          }

          if (roleStr === '4' || roleStr === 'customer') {
            customerMap[id] = { id, name, salonName: userSalon || 'Unknown' };
          }
          if (roleStr === '3' || roleStr === 'employee') {
            const employeeProfileId = u.employeeProfileId || u.EmployeeProfileId;
            if (employeeProfileId) {
              const employeeSalon = u.salonName || u.SalonName || u.salon || u.Salon;
              staffMap[String(employeeProfileId)] = {
                id: String(employeeProfileId),
                name,
                salonName: employeeSalon || 'Unknown'
              };
            }
          }
        });

        staff.forEach((s: any) => {
          const id = String(s.id || s._id);
          const name = s.name || s.Name || s.fullName || s.FullName || 'Unknown Staff';
          const staffSalon = s.salonName || s.SalonName || s.salon || s.Salon;
          staffMap[id] = { id, name, salonName: staffSalon || 'Unknown' };
        });

        services.forEach((s: any) => {
          const id = String(s.id || s._id);
          const name = s.serviceName || s.ServiceName || s.name || s.Name || 'Unknown Service';
          const duration = s.duration || s.Duration || 30;
          const price = s.price || s.Price || 0;
          const serviceSalon = s.salonName || s.SalonName || s.salon || s.Salon;
          const isActive = s.isActive !== undefined ? s.isActive : s.IsActive;
          if (isActive !== false) {
            serviceMap[id] = { id, name, duration, price, salonName: serviceSalon || 'All' };
          }
        });

        return { customerMap, staffMap, serviceMap, adminMap };
      } catch (error) {
        console.error('Error fetching reference data:', error);
        return { customerMap: {}, staffMap: {}, serviceMap: {}, adminMap: {} };
      }
    },
  });

  const { data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: loading, isFetching } = useInfiniteQuery({
    queryKey: ['bookings', statusFilter, userSalonName],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const response = await getApiBooking({ page: pageParam, pageSize: 10 }, axiosConfig);
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

        rawBookings.sort((a: any, b: any) => {
          const dateA = dayjs(a.appointmentDate || a.AppointmentDate);
          const dateB = dayjs(b.appointmentDate || b.AppointmentDate);
          if (dateA.isSame(dateB)) {
            const idA = a.id || a._id || '';
            const idB = b.id || b._id || '';
            return idB.localeCompare(idA);
          }
          return dateB.valueOf() - dateA.valueOf();
        });

        if (isAdmin && !isSuperAdmin && userSalonName) {
          rawBookings = rawBookings.filter((b: any) => {
            const bookingSalon = b.salonName || b.SalonName;
            return bookingSalon === userSalonName;
          });
        }
        if (isCustomer) {
          rawBookings = rawBookings.filter((b: any) =>
            String(b.customerId || b.CustomerId) === String(loggedInUserId)
          );
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
          
          let serviceNames: string[] = [];
          const serviceIdsArray = b.serviceIds || b.ServiceIds || [];
          if (Array.isArray(serviceIdsArray) && serviceIdsArray.length > 0) {
            serviceNames = serviceIdsArray.map((id: string) => {
              const svc = referenceData?.serviceMap?.[String(id)];
              return svc?.name || 'Unknown';
            });
          } else {
            const singleId = String(b.serviceId || b.ServiceId || '');
            if (singleId && referenceData?.serviceMap?.[singleId]) {
              serviceNames = [referenceData.serviceMap[singleId].name];
            } else {
              serviceNames = ['Unknown Service'];
            }
          }
          const serviceDisplay = serviceNames.join(', ');

          let customerName = 'Unknown Customer';
          if (customerId && customerId !== 'undefined' && customerId !== 'null' && customerId !== '') {
            const customer = referenceData?.customerMap?.[customerId];
            if (customer && customer.name) {
              customerName = customer.name;
            } else {
              customerName = b.customerName || b.CustomerName || b.name || b.Name || b.fullName || b.FullName || 'Unknown Customer';
            }
          } else {
            customerName = b.customerName || b.CustomerName || b.name || b.Name || b.fullName || b.FullName || 'Unknown Customer';
          }
          let staffName = 'Unknown Staff';
          if (staffId && staffId !== 'undefined' && staffId !== 'null' && staffId !== '') {
            const staff = referenceData?.staffMap?.[staffId];
            if (staff && staff.name) {
              staffName = staff.name;
            } else {
              staffName = b.staffName || b.StaffName || 'Unknown Staff';
            }
          } else {
            staffName = b.staffName || b.StaffName || 'Unknown Staff';
          }

          let status = (b.status || b.Status || "pending").toLowerCase();
          if (status === "complete") status = "completed";

          let dateStr = b.appointmentDate || b.AppointmentDate || '';
          const startTime = b.startTime || b.StartTime || '';
          const endTime = b.endTime || b.EndTime || '';
          let displayDateTime = '';
          if (dateStr && startTime && endTime) {
            const formattedDate = dayjs(dateStr).format('DD MMM YYYY');
            displayDateTime = `${formattedDate} - ${startTime} to ${endTime}`;
          } else if (dateStr) {
            displayDateTime = dayjs(dateStr).format('DD MMM YYYY hh:mm A');
          } else {
            displayDateTime = 'Invalid Date';
          }

          return {
            key: b.id || b._id || `${pageParam}-${index}`,
            id: b.id || b._id || '',
            customerName: customerName,
            serviceName: serviceDisplay,
            staffName: staffName,
            appointmentDate: displayDateTime,
            amount: b.amount || b.Amount || 0,
            status: status,
            salonName: b.salonName || b.SalonName || 'All',
            customerId: customerId,
            staffId: staffId,
            serviceIds: serviceIdsArray,
            serviceId: b.serviceId || b.ServiceId || '',
            startTime: startTime,
            endTime: endTime,
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

  const { searchText, setSearchText, filteredData: searchFilteredData } = useSearch(
    allBookings,
    ['customerName'],
    500
  );

  const filteredBookings = useMemo(() => {
    return searchFilteredData || [];
  }, [searchFilteredData]);

  const totalCount = infiniteData?.pages?.[0]?.totalCount || 0;

  const { data: existingBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['staffBookings', selectedStaffId, selectedDate],
    enabled: !!selectedStaffId && !!selectedDate && !!token,
    queryFn: async () => {
      const dateStr = selectedDate!.format('YYYY-MM-DD');
      const response = await axios.get(`http://localhost:5296/api/Booking/staff/${selectedStaffId}/date/${dateStr}`, axiosConfig);
      const data = extractArray(response);
      return data.filter((b: any) =>
        b.status && ['pending', 'confirmed', 'inprogress'].includes(b.status.toLowerCase())
      );
    },
    staleTime: 0,
  });

  const {
    data: slotsResponse,
    isLoading: slotsLoading,
    isError: slotsError,
  } = useQuery({
    queryKey: ['availableSlots', selectedStaffId, selectedDate, selectedServices],
    queryFn: async () => {
      if (!selectedStaffId || !selectedDate || selectedServices.length === 0) {
        return null;
      }
      const staff = referenceData?.staffMap?.[selectedStaffId];
      if (!staff) {
        throw new Error('Selected staff not found in reference data');
      }
      const staffSalon = staff.salonName;
      const adminId = referenceData?.adminMap?.[staffSalon];
      if (!adminId) {
        throw new Error(`No admin found for salon: ${staffSalon}`);
      }
      const payload = {
        userId: adminId,
        staffId: selectedStaffId,
        date: selectedDate.toISOString(),
        serviceIds: selectedServices,
      };
      const response = await postApiSlotAvailableSlots(payload, axiosConfig);
      return ResponseData(response);
    },
    enabled: !!selectedStaffId && !!selectedDate && selectedServices.length > 0 && !!referenceData,
    staleTime: 0,
  });

  const availableSlots: SlotDto[] = useMemo(() => {
    if (!slotsResponse || !slotsResponse.status) return [];
    const slots = slotsResponse.slots || [];
    if (!selectedDate) return slots;

    const now = dayjs();
    const isToday = selectedDate.isSame(now, 'day');

    const isOverlapping = (slot: SlotDto, booking: any) => {
      const slotStart = dayjs(selectedDate.format('YYYY-MM-DD') + 'T' + slot.startTime);
      const slotEnd = dayjs(selectedDate.format('YYYY-MM-DD') + 'T' + slot.endTime);
      const bookStart = dayjs(booking.startTime);
      const bookEnd = dayjs(booking.endTime);
      const bufferEnd = bookEnd.add(15, 'minute');
      return slotStart.isBefore(bufferEnd) && slotEnd.isAfter(bookStart);
    };

    return slots.filter((slot: SlotDto) => {
      if (!slot.isAvailable) return false;
      if (isToday) {
        const slotStart = dayjs(selectedDate.format('YYYY-MM-DD') + 'T' + slot.startTime);
        if (slotStart.isBefore(now)) return false;
      }
      const conflict = existingBookings.some((b: any) => isOverlapping(slot, b));
      return !conflict;
    });
  }, [slotsResponse, existingBookings, selectedDate]);

  const totalDuration = useMemo(() => {
    if (!referenceData || selectedServices.length === 0) return 0;
    return selectedServices.reduce((acc, id) => {
      const svc = referenceData.serviceMap[id];
      return acc + (svc?.duration || 0);
    }, 0);
  }, [selectedServices, referenceData]);

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

  const createBookingMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await postApiBooking(payload, axiosConfig);
      return response;
    },
    onSuccess: () => {
      message.success('Booking created successfully');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      resetCreateModal();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to create booking');
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteApiBookingId(id, axiosConfig);
    },
    onSuccess: () => {
      message.success('Booking deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
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

  const navigate = useNavigate();

  const handleCreateBooking = (values: any) => {
    if (!selectedSlot) {
      message.warning('Please select a time slot');
      return;
    }
    if (!customerName.trim()) {
      message.warning('Please enter customer name');
      return;
    }
    const selectedStaff = referenceData?.staffMap?.[selectedStaffId!];
    if (isAdmin && !isSuperAdmin) {
      if (selectedStaff?.salonName !== userSalonName) {
        message.error('Selected staff does not belong to your salon');
        return;
      }
    }
    const amount = selectedServices.reduce((acc, id) => {
      const svc = referenceData?.serviceMap?.[id];
      return acc + (svc?.price || 0);
    }, 0);

    const payload = {
      customerName: customerName.trim(),
      staffId: selectedStaffId,
      serviceIds: selectedServices,
      appointmentDate: selectedDate?.toISOString(),
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      amount: amount,
      status: 'pending',
      salonName: isSuperAdmin ? values.salonName : (userSalonName || 'Default Salon')
    };
    createBookingMutation.mutate(payload);
  };

  const handleDelete = (record: any) => {
    if (isCustomer) return;
    deleteBookingMutation.mutate(record.id);
  };

  const resetModal = () => {
    setModalVisible(false);
    setEditingBooking(null);
    form.resetFields();
  };

  const resetCreateModal = () => {
    setCreateModalVisible(false);
    createForm.resetFields();
    setSelectedServices([]);
    setSelectedStaffId(undefined);
    setSelectedDate(null);
    setSelectedSlot(null);
    setCustomerName('');
  };

  const canEdit = (record: any) => {
    return record.status !== 'completed' && record.status !== 'cancelled';
  };

  const staffOptions = useMemo(() => {
    if (!referenceData?.staffMap) return [];
    let staffList = Object.values(referenceData.staffMap);
    if (isAdmin && !isSuperAdmin && userSalonName) {
      staffList = staffList.filter((s: any) => s.salonName === userSalonName);
    }
    return staffList.map((staff: any) => ({
      value: staff.id,
      label: staff.name
    }));
  }, [referenceData, isAdmin, isSuperAdmin, userSalonName]);

  const serviceOptions = useMemo(() => {
    if (!referenceData?.serviceMap) return [];
    let services = Object.values(referenceData.serviceMap);
    if (isAdmin && !isSuperAdmin && userSalonName) {
      services = services.filter((s: any) => s.salonName === userSalonName);
    }
    return services.map((service: any) => ({
      value: service.id,
      label: `${service.name} (${service.duration}min - $${service.price})`
    }));
  }, [referenceData, isAdmin, isSuperAdmin, userSalonName]);

  const isLoading = (loading && !infiniteData) || referenceLoading || bookingsLoading;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'PT Serif, serif' }}>Booking Management</h1>
          <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Public Sans, sans-serif' }}>Manage All Bookings</p>
          {totalCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Showing {filteredBookings.length} of {totalCount} bookings
            </p>
          )}
        </div>
        <div>
          <Button onClick={() => navigate("/live-booking")}>Live Booking</Button>
        </div>
        {!isCustomer && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setCreateModalVisible(true);
              createForm.resetFields();
              setSelectedServices([]);
              setSelectedStaffId(undefined);
              setSelectedDate(null);
              setSelectedSlot(null);
              setCustomerName('');
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Create Booking
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <div className="flex gap-4">
          <Input
            placeholder="Search customer..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
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
          data={filteredBookings}
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
          onDelete={!isCustomer ? handleDelete : undefined}
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
          {!hasNextPage && filteredBookings.length === 0 && !isLoading && (
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <div className="p-2 bg-gray-50 rounded border">{editingBooking?.customerName}</div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
            <div className="p-2 bg-gray-50 rounded border">{editingBooking?.serviceName}</div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
            <div className="p-2 bg-gray-50 rounded border">{editingBooking?.staffName}</div>
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

      {!isCustomer && (
        <ModalForm
          form={createForm}
          open={createModalVisible}
          onClose={resetCreateModal}
          title={<div className="flex items-center gap-2"><CalendarOutlined className="text-blue-600" />Create New Booking</div>}
          onSubmit={handleCreateBooking}
          submitText="Create Booking"
          loading={createBookingMutation.isPending}
          width={700}
          initialValues={{}}
        >
          <Row gutter={16}>
            <Col span={24}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full"
                />
              </div>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Services <span className="text-red-500">*</span>
                </label>
                <Select
                  mode="multiple"
                  placeholder="Select services"
                  value={selectedServices}
                  onChange={(values) => {
                    setSelectedServices(values);
                    setSelectedSlot(null);
                  }}
                  style={{ width: '100%' }}
                  optionLabelProp="label"
                >
                  {serviceOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value} label={opt.label}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
                {totalDuration > 0 && (
                  <div className="mt-1 text-sm text-gray-600">
                    Total duration: <strong>{totalDuration} min</strong>
                  </div>
                )}
              </div>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Staff <span className="text-red-500">*</span>
                </label>
                <Select
                  placeholder="Select staff"
                  value={selectedStaffId}
                  onChange={(val) => {
                    setSelectedStaffId(val);
                    setSelectedSlot(null);
                  }}
                  style={{ width: '100%' }}
                >
                  {staffOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col span={12}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  className="w-full"
                  format="YYYY-MM-DD"
                  value={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </div>
            </Col>
          </Row>

          {selectedServices.length > 0 && selectedStaffId && selectedDate && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Available Time Slots</span>
                {slotsLoading && <Spin size="small" />}
                {slotsError && <span className="text-red-500 text-sm">Error loading slots</span>}
              </div>
              {slotsLoading ? (
                <div className="text-center py-4">Loading slots...</div>
              ) : slotsError ? (
                <Alert message="Failed to load slots" type="error" showIcon />
              ) : availableSlots.length === 0 ? (
                <Alert message="No available slots for the selected criteria" type="info" showIcon />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot) => (
                    <Card
                      key={`${slot.startTime}-${slot.endTime}`}
                      className={`cursor-pointer transition-all hover:shadow-md ${selectedSlot && selectedSlot.startTime === slot.startTime && selectedSlot.endTime === slot.endTime
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                        }`}
                      onClick={() => setSelectedSlot(slot)}
                      size="small"
                    >
                      <div className="text-center">
                        <ClockCircleOutlined className="text-blue-500 mr-1" />
                        <span className="font-medium">{slot.startTime}</span>
                        <span className="mx-1">-</span>
                        <span className="font-medium">{slot.endTime}</span>
                        {selectedSlot && selectedSlot.startTime === slot.startTime && selectedSlot.endTime === slot.endTime && (
                          <Tag color="blue" className="mt-1 block">Selected</Tag>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {isSuperAdmin && (
            <Row gutter={16}>
              <Col span={24}>
                <div className="mb-4">
                  <InputField
                    label="Salon Name"
                    name="salonName"
                    required
                    placeholder="Enter salon name"
                  />
                </div>
              </Col>
            </Row>
          )}

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-2">
            <p className="text-sm text-blue-700">
              <CalendarOutlined className="mr-1" />
              {isAdmin && !isSuperAdmin ? (
                `Booking will be created for ${userSalonName} salon with "Pending" status.`
              ) : (
                'Booking will be created with "Pending" status.'
              )}
            </p>
          </div>
        </ModalForm>
      )}
    </div>
  );
};
export default Bookings;