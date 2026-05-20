import { Card, Button, Input, Form, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Scissors } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { DataTable } from '../../Components/Ui/Table';
import { InputField, SelectField } from '../../Components/Ui/Forms';
import ModalForm from '../../Components/Ui/Modals';

const Service = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [form] = Form.useForm();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = 'http://localhost:5296/api/AdminServices';

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
    },
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL, axiosConfig);
      let filteredServices = response.data;

      if (isCustomer) {
        filteredServices = response.data.filter((s: any) => s.isActive === true);
      } else if (isAdmin) {
        if (userSalonName) {
          filteredServices = response.data.filter((s: any) =>
            (s.SalonName || s.salonName) === userSalonName
          );
        }
      }

      const normalized = filteredServices.map((s: any, index: number) => ({
        key: s.id || s._id || index,
        id: s.id || s._id,
        serviceName: s.serviceName || s.ServiceName,
        duration: s.duration || s.Duration,
        price: s.price || s.Price,
        status: s.isActive ? 'active' : 'inactive',
        salonName: s.SalonName || s.salonName || 'All'
      }));

      setServices(normalized);
    } catch (error) {
      console.error('Error fetching services:', error);
      message.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleFormSubmit = async (values: any) => {
    const payload = {
      id: editingService?.id || undefined,
      serviceName: values.serviceName,
      duration: Number(values.duration),
      price: Number(values.price),
      isActive: values.status === 'active',
      salonName: userSalonName
    };

    try {
      if (editingService) {
        await axios.put(
          `${API_URL}/${editingService.id}`,
          payload,
          axiosConfig
        );
        message.success('Service updated successfully');
      } else {
        await axios.post(API_URL, payload, axiosConfig);
        message.success('Service added successfully');
      }

      await fetchServices();
      setModalVisible(false);
      setEditingService(null);
      form.resetFields();
    } catch (error: any) {
      console.error('Error saving service:', error);
      message.error(error.response?.data || 'Something went wrong');
    }
  };

  const handleDelete = async (record: any) => {
    if (isCustomer) {
      message.error('You are not authorized to delete services');
      return;
    }

    try {
      await axios.delete(`${API_URL}/${record.id}`, axiosConfig);
      message.success('Service deleted successfully');
      await fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      message.error('Failed to delete service');
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
    <div>
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
              setModalVisible(true);
            }}
          >
            Add Service
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <Input
          placeholder="Search service"
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Card>

      <Card>
        <p className='p-2'>
          {isCustomer ? "Available Services Data" : "All Services Data"}
        </p>
        <DataTable
          data={filteredServices}
          tableType="services"
          loading={loading}
          onEdit={!isCustomer ? (record) => {
            setEditingService(record);
            form.setFieldsValue({
              ...record,
              status: record.status
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
          <InputField label="Service Name" name="serviceName" required={true} />
          <InputField
            label="Duration (minutes)"
            name="duration"
            type="number"
            required={true}
          />
          <InputField label="Price" name="price" type="number" required={true} />
          <SelectField
            label="Status"
            name="status"
            required={true}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'inactive' }
            ]}
          />
        </ModalForm>
      )}
    </div>
  );
};

export default Service;