import { Card, Button, Input, Select, Form, message } from 'antd';
import { PlusOutlined, SearchOutlined, MailOutlined } from '@ant-design/icons';
import { Scissors } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { DataTable, StatusBadge } from '../../Components/Ui/Table';
import { InputField, SelectField } from '../../Components/Ui/Forms';
import ModalForm from '../../Components/Ui/Modals';
import dayjs from "dayjs";

const { Option } = Select;

const STAFF_API = 'http://localhost:5296/api/Staff';
const USER_API = 'http://localhost:5296/api/User/register/employee';

const Staff = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [form] = Form.useForm();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [emailError, setEmailError] = useState('');
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

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await axios.get(STAFF_API, axiosConfig);
      let filteredStaff = response.data;

      if (isCustomer) {
        filteredStaff = [];
      } else if (isAdmin) {
        if (userSalonName) {
          filteredStaff = response.data.filter((s: any) =>
            (s.SalonName || s.salonName) === userSalonName
          );
        }
      }
      const normalized = filteredStaff.map((s: any, index: number) => ({
        key: s.id || s._id || index,
        id: s.id || s._id,
        Password: s.password,
        name: s.FullName || s.fullName || s.name,
        email: s.email,
        role: s.Role || s.role,
        status: s.isActive ? 'active' : 'inactive',
        joined: s.CreatedAt || s.createdAt || s.joinedDate || new Date().toISOString(),
        salonName: s.SalonName || s.salonName || 'Unknown'
      }));

      setStaff(normalized);
    } catch (error) {
      console.error('Error fetching staff:', error);
      message.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const columns = [
    {
      title: 'Staff Member',
      dataIndex: 'name',
      render: (text: string, record: any) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-gray-500 text-sm">
            <MailOutlined className="mr-1" /> {record.email}
          </div>
        </div>
      )
    },
    { title: 'Role', dataIndex: 'role' },
    {
      title: 'Joined Date',
      dataIndex: 'joined',
      render: (date: any) => date ? dayjs(date).format("DD MMM YYYY hh:mm A") : 'N/A'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status: string) => <StatusBadge type="user" value={status} />
    }
  ];

  if (isAdmin || isSuperAdmin) {
    columns.splice(1, 0, {
      title: 'Salon Name',
      dataIndex: 'salonName',
      render: (text: string) => <span>{text}</span>
    });
  }

  const handleFormSubmit = async (values: any) => {
    setEmailError('');

    const payload = {
      name: values.name,
      password: values.Password,
      email: values.email,
      role: values.role,
      isActive: values.status === 'active',
      joinedDate: new Date().toISOString(),
      salonName: userSalonName
    };

    try {
      if (editingStaff) {
        await axios.put(`${STAFF_API}/${editingStaff.id}`, payload, axiosConfig);
        message.success('Staff updated successfully');
      } else {
        const staffResponse = await axios.post(STAFF_API, payload, axiosConfig);
        message.success('Staff added successfully');

        try {
          await axios.post(USER_API, { StaffId: staffResponse.data.id }, axiosConfig);
        } catch (userError: any) {
          const msg = userError?.response?.data?.message || '';
          if (
            msg.toLowerCase().includes('exist') ||
            msg.toLowerCase().includes('already') ||
            msg.toLowerCase().includes('duplicate')
          ) {
            setEmailError('Email already exists');
          } else {
            setEmailError(msg || 'Something went wrong');
          }
          await axios.delete(`${STAFF_API}/${staffResponse.data.id}`, axiosConfig);
          return;
        }
      }

      await fetchStaff();
      setModalVisible(false);
      form.resetFields();

    } catch (err: any) {
      const msg = err?.response?.data?.message || '';
      if (
        msg.toLowerCase().includes('exist') ||
        msg.toLowerCase().includes('already') ||
        msg.toLowerCase().includes('duplicate')
      ) {
        setEmailError('Email already exists');
      } else {
        setEmailError('Something went wrong');
      }
    }
  };

  const handleDelete = async (record: any) => {
    if (isCustomer) {
      message.error('You are not authorized to delete staff');
      return;
    }

    if (!record.id) return;
    try {
      await axios.delete(`${STAFF_API}/${record.id}`, axiosConfig);
      message.success('Staff deleted successfully');
      await fetchStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
      message.error('Failed to delete staff');
    }
  };

  const filteredStaff = staff.filter((s) => {
    const matchesSearch = (s.name ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {isCustomer ? "Our Staff" : "Staff Management"}
            </h1>
            <p className="text-gray-600">
              {isCustomer ? "Meet our professional staff" : "Manage salon staff"}
            </p>
          </div>

          {!isCustomer && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setEditingStaff(null); form.resetFields(); setEmailError(''); setModalVisible(true); }}
            >
              Add Staff
            </Button>
          )}
        </div>

        <Card className="mb-6">
          <div className="flex gap-4">
            <Input
              placeholder="Search staff"
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              style={{ width: 120 }}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
            >
              <Option value="all">All Status</Option>
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </div>
        </Card>

        <Card className="mt-4">
          <p className='p-2'>
            {isCustomer ? "Our Staff Data" : "All Staff Data"}
          </p>
          <DataTable
            data={filteredStaff}
            columns={columns}
            loading={loading}
            onEdit={!isCustomer ? (record) => {
              setEditingStaff(record);
              form.setFieldsValue({
                ...record,
                Password: '',
                status: record.status
              });
              setModalVisible(true);
            } : undefined}
            onDelete={!isCustomer ? handleDelete : undefined}
            showActions={!isCustomer}
            rowKey="key"
          />
        </Card>

        {!isCustomer && (
          <ModalForm
            open={modalVisible}
            onClose={() => {
              setModalVisible(false);
              setEditingStaff(null);
              form.resetFields();
              setEmailError('');
            }}
            title={<div className="flex items-center gap-2"><Scissors size={20} />{editingStaff ? 'Edit Staff' : 'Add Staff'}</div>}
            initialValues={editingStaff || {}}
            onSubmit={handleFormSubmit}
            submitText={editingStaff ? 'Update Staff' : 'Add Staff'}
          >
            {emailError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
                {emailError}
              </div>
            )}

            <InputField label="Full Name" name="name" required />
            <InputField
              label="Email"
              name="email"
              type="email"
              prefix={<MailOutlined />}
              required
            />
            <InputField
              label="Password"
              name="Password"
              type="password"
              required={!editingStaff}
            />
            <SelectField
              label="Role"
              name="role"
              required
              options={[{ value: 'Employee', label: 'Employee' }]}
            />
            <SelectField
              label="Status"
              name="status"
              required
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </ModalForm>
        )}
      </div>
    </>
  );
};

export default Staff;