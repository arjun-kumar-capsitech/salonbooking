import { Card, Button, Input, Select, Form, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Scissors } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSalonBookingAPI } from '../../api/generated';
import { DataTable, StatusBadge } from '../../Components/Ui/Table';
import { InputField, SelectField } from '../../Components/Ui/Forms';
import ModalForm from '../../Components/Ui/Modals';

const { Option } = Select;

const {getAllServices,createService,updateService,deleteService} = getSalonBookingAPI();

const Service = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ serviceName: '', price: '', duration: '' });
  const queryClient = useQueryClient();  
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : {};
  const userRole = user?.role || user?.Role;
  const userSalonName = user?.salonName || user?.SalonName;

  const isAdmin = userRole === "Admin" || userRole === 1 || userRole === 2;
  const isSuperAdmin = userRole === "SuperAdmin" || userRole === 1;
  const isCustomer = userRole === "Customer" || userRole === 4;

  const token = localStorage.getItem("authToken");
  
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
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

  const extractData = (response: any) => {
    if (!response) return [];
    const parsedData = ResponseData(response);
    if (parsedData?.status === true && parsedData?.result) {
      return Array.isArray(parsedData.result) ? parsedData.result : [parsedData.result];
    }
    return [];
  };

  const validateField = (name: string, value: any) => {
    switch (name) {
      case "serviceName":
        if (!value?.trim()) return "Service name is required";
        if (value.trim().length < 2) return "Service name must be at least 2 characters";
        if (value.trim().length > 100) return "Service name must be less than 100 characters";
        return "";
      case "price":
        if (!value && value !== 0) return "Price is required";
        if (isNaN(Number(value))) return "Price must be a number";
        if (Number(value) <= 0) return "Price must be greater than 0";
        return "";
      case "duration":
        if (!value && value !== 0) return "Duration is required";
        if (isNaN(Number(value))) return "Duration must be a number";
        if (Number(value) <= 0) return "Duration must be greater than 0";
        return "";
      default:
        return "";
    }
  };

  const resetModal = () => {
    setModalVisible(false);
    setEditingService(null);
    form.resetFields();
    setSubmitted(false);
    setFieldErrors({ serviceName: '', price: '', duration: '' });
  };

  const { data: services = [], isLoading: loading } = useQuery({
    queryKey: ['service'], staleTime: 5000, refetchOnWindowFocus: false, refetchOnMount: false,
    queryFn: async () => {
      const response = await getAllServices(axiosConfig);
      let servicesData = extractData(response);
      let filteredServices = Array.isArray(servicesData) ? servicesData : [];
      
      if (isCustomer) {
        filteredServices = filteredServices.filter((s: any) => s.isActive === true);
      } else if (isAdmin && !isSuperAdmin && userSalonName) {
        filteredServices = filteredServices.filter((s: any) =>
          (s.salonName || s.SalonName) === userSalonName
        );
      }

      return filteredServices.map((s: any, index: number) => ({
        key: s.id || s._id || index.toString(),
        id: s.id || s._id,
        serviceName: s.serviceName || s.ServiceName,
        duration: s.duration || s.Duration,
        price: s.price || s.Price,
        status: (s.isActive !== undefined ? s.isActive : s.IsActive) ? 'active' : 'inactive',
        salonName: s.salonName || s.SalonName || 'All'
      }));
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await createService(payload, axiosConfig);
      return extractData(response);
    },
    onSuccess: () => {
      message.success('Service added successfully');
      queryClient.invalidateQueries({ queryKey: ['service'] });
      resetModal();
    },
    onError: (error: any) => {
      const backendMessage = error?.response?.data?.message || '';
      if (backendMessage.toLowerCase().includes('exist')) {
        setFieldErrors(prev => ({ ...prev, serviceName: 'Service name already exists' }));
      } else {
        message.error(backendMessage || 'Something went wrong');
      }
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      await updateService(id, payload, axiosConfig);
    },
    onSuccess: () => {
      message.success('Service updated successfully');
      queryClient.invalidateQueries({ queryKey: ['service'] });
      resetModal();
    },
    onError: (error: any) => {
      const backendMessage = error?.response?.data?.message || '';
      if (backendMessage.toLowerCase().includes('exist')) {
        setFieldErrors(prev => ({ ...prev, serviceName: 'Service name already exists' }));
      } else {
        message.error(backendMessage || 'Something went wrong');
      }
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteService(id, axiosConfig);
    },
    onSuccess: () => {
      message.success('Service deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['service'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to delete service');
    },
  });

  const getFieldError = (field: string) => {
    return submitted ? fieldErrors[field as keyof typeof fieldErrors] : "";
  };

  const handleFormSubmit = (values: any) => {
    setSubmitted(true);

    const nameError = validateField("serviceName", values.serviceName);
    const priceError = validateField("price", values.price);
    const durationError = validateField("duration", values.duration);

    setFieldErrors({
      serviceName: nameError,
      price: priceError,
      duration: durationError
    });

    if (nameError || priceError || durationError) {
      return;
    }

    const payload = {
      serviceName: values.serviceName,
      duration: Number(values.duration),
      price: Number(values.price),
      isActive: values.status === 'active',
      salonName: isSuperAdmin ? values.salonName : userSalonName
    };

    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, payload });
    } else {
      addServiceMutation.mutate(payload);
    }
  };

  const handleDelete = (record: any) => {
    if (isCustomer || !record.id) return;
    deleteServiceMutation.mutate(record.id);
  };

  const filteredServices = useMemo(() => {
    return services.filter((s: any) =>
      (s.serviceName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) &&
      (statusFilter === 'all' || s.status === statusFilter)
    );
  }, [services, searchTerm, statusFilter]);

  const columns = [
    { title: 'Service Name', dataIndex: 'serviceName' },
    { title: 'Duration (mins)', dataIndex: 'duration' },
    { 
      title: 'Price', 
      dataIndex: 'price',
      render: (price: number) => `$${price}` 
    },
    ...(isAdmin || isSuperAdmin ? [{ title: 'Salon Name', dataIndex: 'salonName' }] : []),
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status: string) => <StatusBadge value={status} type="user" />
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {isCustomer ? "Available Services" : "Service Management"}
          </h1>
          <p className="text-gray-600">
            {isCustomer ? "Browse our services" : "Manage salon services"}
          </p>
        </div>
        {!isCustomer && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingService(null);
              form.resetFields();
              setSubmitted(false);
              setFieldErrors({ serviceName: '', price: '', duration: '' });
              form.setFieldsValue({ status: 'active' });
              setModalVisible(true);
            }}
          >
            Add Service
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <div className="flex gap-4">
          <Input
            placeholder="Search service..."
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
            <Option value="active">Active</Option>
            <Option value="inactive">Inactive</Option>
          </Select>
        </div>
      </Card>

      <Card>
        <p className="p-2 mb-4">
          {isCustomer ? "Available Services Data" : "All Services Data"}
        </p>
        <DataTable
          data={filteredServices}
          columns={columns}
          loading={loading || addServiceMutation.isPending || updateServiceMutation.isPending || deleteServiceMutation.isPending}
          onEdit={!isCustomer ? (record) => {
            setEditingService(record);
            form.setFieldsValue({
              serviceName: record.serviceName,
              duration: record.duration,
              price: record.price,
              status: record.status,
              ...(isSuperAdmin && { salonName: record.salonName })
            });
            setSubmitted(false);
            setFieldErrors({ serviceName: '', price: '', duration: '' });
            setModalVisible(true);
          } : undefined}
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
          title={<div className="flex items-center gap-2"><Scissors size={20} />{editingService ? 'Edit Service' : 'Add Service'}</div>}
          initialValues={editingService || { status: 'active' }}
          onSubmit={handleFormSubmit}
          submitText={editingService ? 'Update Service' : 'Add Service'}
          loading={addServiceMutation.isPending || updateServiceMutation.isPending}
        >
          <div className="mb-4">
            <InputField
              label="Service Name"
              name="serviceName"
              required
              placeholder="Enter service name"
            />
            {getFieldError("serviceName") && (
              <p className="text-red-500 text-sm mt-1">{getFieldError("serviceName")}</p>
            )}
          </div>
          <div className="mb-4">
            <InputField
              label="Duration (minutes)"
              name="duration"
              type="number"
              required
              placeholder="Enter duration in minutes"
            />
            {getFieldError("duration") && (
              <p className="text-red-500 text-sm mt-1">{getFieldError("duration")}</p>
            )}
          </div>
          <div className="mb-4">
            <InputField
              label="Price"
              name="price"
              type="number"
              required
              placeholder="Enter price"
              prefix="$"
            />
            {getFieldError("price") && (
              <p className="text-red-500 text-sm mt-1">{getFieldError("price")}</p>
            )}
          </div>
          {isSuperAdmin && (
            <div className="mb-4">
              <InputField
                label="Salon Name"
                name="salonName"
                required
                placeholder="Enter salon name"
              />
            </div>
          )}
          <div className="mb-2">
            <SelectField
              label="Status"
              name="status"
              required
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </div>
        </ModalForm>
      )}
    </div>
  );
};
export default Service;