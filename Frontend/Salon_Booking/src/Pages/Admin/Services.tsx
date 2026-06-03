import { Card, Button, Input, Form, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Scissors } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DataTable } from '../../Components/Ui/Table';
import { InputField, SelectField } from '../../Components/Ui/Forms';
import ModalForm from '../../Components/Ui/Modals';
import { getSalonBookingAPI } from '../../api/generated';
const { getApiAdminServices,putApiAdminServicesId,postApiAdminServices,deleteApiAdminServicesId}= getSalonBookingAPI();

const Service = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [form] = Form.useForm();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');


  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
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

  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await getApiAdminServices();
      let servicesData = extractData(response);
      let filteredServices = Array.isArray(servicesData) ? servicesData : [];

      if (isCustomer) {
        filteredServices = filteredServices.filter((s: any) => s.isActive === true);
      } else if (isAdmin && !isSuperAdmin) {
        if (userSalonName) {
          filteredServices = filteredServices.filter((s: any) =>
            (s.salonName || s.SalonName) === userSalonName
          );
        }
      }

      const normalized = filteredServices.map((s: any, index: number) => ({
        key: s.id || s._id || index,
        id: s.id || s._id,
        serviceName: s.serviceName || s.ServiceName,
        duration: s.duration || s.Duration,
        price: s.price || s.Price,
        status: (s.isActive !== undefined ? s.isActive : s.IsActive) ? 'active' : 'inactive',
        salonName: s.salonName || s.SalonName || 'All'
      }));

      setServices(normalized);
    } catch (error: any) {
      console.error('Error fetching services:', error);
      message.error(error.response?.data?.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleFormSubmit = async (values: any) => {
    const payload = {
      serviceName: values.serviceName,
      duration: Number(values.duration),
      price: Number(values.price),
      isActive: values.status === 'active',
      salonName: isSuperAdmin ? values.salonName : userSalonName
    };

    try {
      if (editingService) {
        await putApiAdminServicesId(editingService.id,payload);
        message.success('Service updated successfully');
      } else {
        await postApiAdminServices(payload, axiosConfig);
        message.success('Service added successfully');
      }
      await fetchServices();
      setModalVisible(false);
      setEditingService(null);
      form.resetFields();
    } catch (error: any) {
      console.error('Error saving service:', error);
      message.error(error.response?.data?.message || error.response?.data || 'Something went wrong');
    }
  };

  const handleDelete = async (record: any) => {
    if (isCustomer) {
      message.error('You are not authorized to delete services');
      return;
    }

    try {
      await deleteApiAdminServicesId(record.id);
      message.success('Service deleted successfully');
      await fetchServices();
    } catch (error: any) {
      console.error('Error deleting service:', error);
      message.error(error.response?.data?.message || 'Failed to delete service');
    }
  };

  const filteredServices = services.filter((s) =>
    (s.serviceName ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const columns = [
    {
      title: "Service Name",
      dataIndex: "serviceName",
      key: "serviceName",
    },
    {
      title: "Duration (mins)",
      dataIndex: "duration",
      key: "duration",
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      render: (price: number) => `$${price}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          }`}>
          {status?.toUpperCase()}
        </span>
      ),
    },
  ];

  if (isAdmin || isSuperAdmin) {
    columns.splice(1, 0, {
      title: "Salon Name",
      dataIndex: "salonName",
      key: "salonName",
    });
  }

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
              // Set default values
              form.setFieldsValue({ status: 'active' });
              setModalVisible(true);
            }}
          >
            Add Service
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <Input
          placeholder="Search service..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
        />
      </Card>

      <Card>
        <div className="p-2 mb-4">
          <p className="text-gray-700 font-medium">
            {isCustomer ? "Available Services Data" : "All Services Data"}
          </p>
        </div>
        <DataTable
          data={filteredServices}
          tableType="services"
          loading={loading}
          onEdit={!isCustomer ? (record) => {
            setEditingService(record);
            form.setFieldsValue({
              serviceName: record.serviceName,
              duration: record.duration,
              price: record.price,
              status: record.status,
              ...(isSuperAdmin && { salonName: record.salonName })
            });
            setModalVisible(true);
          } : undefined}
          onDelete={!isCustomer ? handleDelete : undefined}
          showActions={!isCustomer}
        />
      </Card>

      {!isCustomer && (
        <ModalForm
          form={form}
          open={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setEditingService(null);
            form.resetFields();
          }}
          title={
            <div className="flex items-center gap-2">
              <Scissors size={20} />
              {editingService ? 'Edit Service' : 'Add Service'}
            </div>
          }
          initialValues={editingService || { status: 'active' }}
          onSubmit={handleFormSubmit}
          submitText={editingService ? 'Update Service' : 'Add Service'}
        >
          <InputField 
            label="Service Name" 
            name="serviceName" 
            required={true}
            placeholder="Enter service name"
          />
          <InputField
            label="Duration (minutes)"
            name="duration"
            type="number"
            required={true}
            placeholder="Enter duration in minutes"
          />
          <InputField 
            label="Price" 
            name="price" 
            type="number" 
            required={true}
            placeholder="Enter price"
            prefix="$"
          />
          {isSuperAdmin && (
            <InputField
              label="Salon Name"
              name="salonName"
              required={true}
              placeholder="Enter salon name"
            />
          )}
          <SelectField
            label="Status"
            name="status"
            required={true}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
          />
        </ModalForm>
      )}
    </div>
  );
};

export default Service;