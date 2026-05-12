import { Card, Button, Input, Form, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Scissors } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { DataTable, } from '../../Components/Ui/Table';  
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

  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL);
      const normalized = response.data.map((s: any, index: number) => ({
        key: s.id || index,
        id: s.id,
        serviceName: s.serviceName,
        duration: s.duration,
        price: s.price,
        status: s.isActive ? 'active' : 'inactive'
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
      isActive: values.status === 'active'
    };

    try {
      if (editingService) {
        await axios.put(
          `${API_URL}/${editingService.id}`,
          payload
        );
        message.success('Service updated successfully');
      } else {
        await axios.post(API_URL, payload);
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
    try {
      await axios.delete(`${API_URL}/${record.id}`);
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

  return (
    <>
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Service Management</h1>
          <p className="text-gray-600">Manage salon services</p>
        </div>

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
      </div>

      <div>
         <Card className="mb-6">
        <Input
          placeholder="Search service"
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Card>
      </div>
     

      <Card>
        <p className='p-2'>All Services Data</p>
        <DataTable
          data={filteredServices}
          tableType="services"
          loading={loading}
          onEdit={(record) => {
            setEditingService(record);
            form.setFieldsValue(record);
            setModalVisible(true);
          }}
          onDelete={handleDelete}
          showActions={true}
        />
      </Card>

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
            { value: 'inactive', label: 'Inactive' }
          ]}
        />
      </ModalForm>
    </div>
    </>
  );
};

export default Service;
  