import { Card, Button, Input, Select, Form, message } from 'antd';
import { PlusOutlined, SearchOutlined, MailOutlined } from '@ant-design/icons';
import { Scissors } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DataTable, StatusBadge } from '../../Components/Ui/Table';
import { InputField, SelectField } from '../../Components/Ui/Forms';
import ModalForm from '../../Components/Ui/Modals';
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const { getApiStaff, postApiStaff, putApiStaffId, deleteApiStaffId, postApiUserRegisterEmployee} = getSalonBookingAPI();
const { Option } = Select;
const Staff = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [form] = Form.useForm();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [emailError, setEmailError] = useState('');

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.Role || user?.role;
  const userSalonName = user?.SalonName || user?.salonName;

  const isAdmin = userRole === "Admin" || userRole === 1 || userRole === 2;
  const isSuperAdmin = userRole === "SuperAdmin";
  const isCustomer = userRole === "Customer" || userRole === 4;

  const extractData = (response: any) => {
    if (!response) return [];
    const data = response.data;
    if (data?.status === true && data?.result) return data.result;
    if (data?.result) return data.result;
    if (Array.isArray(data)) return data;
    return [];
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await getApiStaff();
      let staffData = extractData(response);
      let filteredStaff = Array.isArray(staffData) ? staffData : [];

      if (isCustomer) {
        filteredStaff = [];
      } else if (isAdmin && !isSuperAdmin && userSalonName) {
        filteredStaff = filteredStaff.filter((s: any) =>
          (s.SalonName || s.salonName) === userSalonName
        );
      }

      const normalized = filteredStaff.map((s: any, index: number) => ({
        key: s.id || s._id || index,
        id: s.id || s._id,
        name: s.FullName || s.fullName || s.name,
        email: s.Email || s.email,
        role: s.Role || s.role,
        status: (s.isActive !== undefined ? s.isActive : s.IsActive) ? 'active' : 'inactive',
        joined: s.CreatedAt || s.createdAt || s.JoinedDate || s.joinedDate || new Date().toISOString(),
        salonName: s.SalonName || s.salonName || 'Unknown'
      }));

      setStaff(normalized);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const columns = [
    { title: 'Staff Member', dataIndex: 'name', render: (text: string, record: any) => (
      <div><div className="font-medium">{text}</div><div className="text-gray-500 text-sm"><MailOutlined className="mr-1" /> {record.email}</div></div>
    )},
    { title: 'Role', dataIndex: 'role' },
    ...(isAdmin || isSuperAdmin ? [{ title: 'Salon Name', dataIndex: 'salonName' }] : []),
    { title: 'Joined Date', dataIndex: 'joined', render: (date: any) => date ? dayjs(date).format("DD MMM YYYY") : 'N/A' },
    { title: 'Status', dataIndex: 'status', render: (status: string) => <StatusBadge type="user" value={status} /> }
  ];

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
        await putApiStaffId(editingStaff.id, payload);
        message.success('Staff updated successfully');
        await fetchStaff();
        setModalVisible(false);
        form.resetFields();
      } else {
        const staffResponse = await postApiStaff(payload);
        const createdStaff = extractData(staffResponse);
        const staffId = createdStaff?.id || createdStaff?._id;
        message.success('Staff added successfully');

        try {
          await postApiUserRegisterEmployee({ staffId });
          await fetchStaff();
          setModalVisible(false);
          form.resetFields();
        } catch (userError: any) {
          const backendMessage = userError?.response?.data?.message || '';
          if (backendMessage.toLowerCase().includes('exist')) {
            setEmailError('Email already exists');
          } else {
            setEmailError(backendMessage || 'Something went wrong');
          }
          await deleteApiStaffId(staffId);
        }
      }
    } catch (err: any) {
      const backendMessage = err?.response?.data?.message || '';
      if (backendMessage.toLowerCase().includes('exist')) {
        setEmailError('Email already exists');
      } else {
        setEmailError(backendMessage || 'Something went wrong');
      }
    }
  };

  const handleDelete = async (record: any) => {
    if (isCustomer || !record.id) return;
    try {
      await deleteApiStaffId(record.id);
      message.success('Staff deleted successfully');
      await fetchStaff();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Failed to delete staff');
    }
  };

  const filteredStaff = staff.filter((s) =>
    (s.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) &&
    (statusFilter === 'all' || s.status === statusFilter)
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isCustomer ? "Our Staff" : "Staff Management"}</h1>
          <p className="text-gray-600">{isCustomer ? "Meet our professional staff" : "Manage salon staff"}</p>
        </div>
        {!isCustomer && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingStaff(null); form.resetFields(); setEmailError(''); setModalVisible(true); }}>
            Add Staff
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <div className="flex gap-4">
          <Input placeholder="Search staff" prefix={<SearchOutlined />} style={{ width: 300 }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} allowClear />
          <Select style={{ width: 120 }} value={statusFilter} onChange={setStatusFilter}>
            <Option value="all">All Status</Option>
            <Option value="active">Active</Option>
            <Option value="inactive">Inactive</Option>
          </Select>
        </div>
      </Card>

      <Card>
        <p className="p-2 mb-4">All Staff Data</p>
        <DataTable data={filteredStaff} columns={columns} loading={loading} onEdit={!isCustomer ? (record) => { setEditingStaff(record); form.setFieldsValue({ name: record.name, email: record.email, role: record.role, status: record.status, Password: '' }); setEmailError(''); setModalVisible(true); } : undefined} onDelete={!isCustomer ? handleDelete : undefined} showActions={!isCustomer} rowKey="key" />
      </Card>

      {!isCustomer && (
        <ModalForm form={form} open={modalVisible} onClose={() => { setModalVisible(false); setEditingStaff(null); form.resetFields(); setEmailError(''); }} title={<div className="flex items-center gap-2"><Scissors size={20} />{editingStaff ? 'Edit Staff' : 'Add Staff'}</div>} initialValues={editingStaff || { status: 'active', role: 'Employee' }} onSubmit={handleFormSubmit} submitText={editingStaff ? 'Update Staff' : 'Add Staff'}>
          {emailError && <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 rounded text-sm">{emailError}</div>}
          <InputField label="Full Name" name="name" required placeholder="Enter full name" />
          <InputField label="Email" name="email" type="email" prefix={<MailOutlined />} required placeholder="Enter email address" />
          <InputField label="Password" name="Password" type="password" required={!editingStaff} placeholder={editingStaff ? "Leave blank to keep current password" : "Enter password"} />
          <SelectField label="Role" name="role" required options={[{ value: 'Employee', label: 'Employee' }]} />
          <SelectField label="Status" name="status" required options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </ModalForm>
      )}
    </div>
  );
};
export default Staff;