import { Card, Button, Input, Select, Form, message } from 'antd';
import { PlusOutlined, SearchOutlined, MailOutlined } from '@ant-design/icons';
import { Scissors } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, StatusBadge } from '../../Components/Ui/Table';
import { InputField, SelectField } from '../../Components/Ui/Forms';
import ModalForm from '../../Components/Ui/Modals';
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const { Option } = Select;
const { getApiStaff, postApiStaff, putApiStaffId, deleteApiStaffId, postApiUserRegisterEmployee } = getSalonBookingAPI();

const Staff = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '' });
  const queryClient = useQueryClient();
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

  const validateField = (name: string, value: string, isEdit: boolean = false) => {
    switch (name) { 
       case "name":
        if (!value.trim()) return "Full name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        if (value.trim().length > 50) return "Name must be less than 50 characters";return "";
      case "email":
        if (!value.trim()) return "Email is required";
        if (!value.includes("@") || !value.includes(".")) return "Email must contain '@' and '.'";
        if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(value)) return "Please enter a valid email address";  return "";
      case "password":
        if (!isEdit && !value) return "Password is required";
        if (value && value.length < 6) return "Password must be at least 6 characters";  return ""; default:return "";
    }
  };

  const resetModal = () => {
    setModalVisible(false);
    setEditingStaff(null);
    form.resetFields();
    setSubmitted(false);
    setFieldErrors({ name: '', email: '', password: '' });
  };

  const { data: staffData = [], isLoading: loading } = useQuery({
    queryKey: ['staff'],  staleTime:5000, refetchOnWindowFocus:false, refetchOnMount: false, 
    queryFn: async () => {
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
      
      return normalized;
    },
  });

  const addStaffMutation = useMutation({
    mutationFn: async (payload: any) => {
      const staffResponse = await postApiStaff(payload);
      const createdStaff = extractData(staffResponse);
      const staffId = createdStaff?.id || createdStaff?._id;
      await postApiUserRegisterEmployee({ staffId });
      return { success: true, staffId };
    },
    onSuccess: () => {
      message.success('Staff added successfully');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      resetModal();
    },
    onError: (error: any) => {
      const backendMessage = error?.response?.data?.message || '';
      if (backendMessage.toLowerCase().includes('exist')) {
        setFieldErrors(prev => ({ ...prev, email: 'Email already exists' }));
      } else {
        message.error(backendMessage || 'Something went wrong');
      }
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      await putApiStaffId(id, payload);
    },
    onSuccess: () => {
      message.success('Staff updated successfully');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      resetModal();
    },
    onError: (error: any) => {
      const backendMessage = error?.response?.data?.message || '';
      if (backendMessage.toLowerCase().includes('exist')) {
        setFieldErrors(prev => ({ ...prev, email: 'Email already exists' }));
      } else {
        message.error(backendMessage || 'Something went wrong');
      }
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteApiStaffId(id);
    },
    onSuccess: () => {
      message.success('Staff deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to delete staff');
    },
  });

  const getFieldError = (field: string) => {
    return submitted ? fieldErrors[field as keyof typeof fieldErrors] : "";
  };

  const handleFormSubmit = (values: any) => {
    setSubmitted(true);
    const nameError = validateField("name", values.name, !!editingStaff);
    const emailError = validateField("email", values.email, !!editingStaff);
    const passwordError = validateField("password", values.Password, !!editingStaff);
    setFieldErrors({ name: nameError, email: emailError, password: passwordError });
    if (nameError || emailError || passwordError) {
      return;
    }
    
    const payload = {
      name: values.name,
      password: values.Password,
      email: values.email,
      role: values.role,
      isActive: values.status === 'active',
      joinedDate: new Date().toISOString(),
      salonName: userSalonName
    };
    
    if (editingStaff) {
      updateStaffMutation.mutate({ id: editingStaff.id, payload });
    } else {
      addStaffMutation.mutate(payload);
    }
  };

  const handleDelete = (record: any) => {
    if (isCustomer || !record.id) return;
    deleteStaffMutation.mutate(record.id);
  };

  const filteredStaff = useMemo(() => {
    return staffData.filter((s: any) =>
      (s.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) &&
      (statusFilter === 'all' || s.status === statusFilter)
    );
  }, [staffData, searchTerm, statusFilter]);

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
    ...(isAdmin || isSuperAdmin ? [{ title: 'Salon Name', dataIndex: 'salonName' }] : []),
    { 
      title: 'Joined Date', 
      dataIndex: 'joined', 
      render: (date: any) => date ? dayjs(date).format("DD MMM YYYY") : 'N/A' 
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      render: (status: string) => <StatusBadge type="user" value={status} /> 
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isCustomer ? "Our Staff" : "Staff Management"}</h1>
          <p className="text-gray-600">{isCustomer ? "Meet our professional staff" : "Manage salon staff"}</p>
        </div>
        {!isCustomer && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => { 
              setEditingStaff(null); 
              form.resetFields(); 
              setSubmitted(false);
              setFieldErrors({ name: '', email: '', password: '' });
              setModalVisible(true); 
            }}
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
        <p className="p-2 mb-4">All Staff Data</p>
        <DataTable 
          data={filteredStaff} 
          columns={columns} 
          loading={loading || addStaffMutation.isPending || updateStaffMutation.isPending || deleteStaffMutation.isPending} 
          onEdit={!isCustomer ? (record) => { 
            setEditingStaff(record); 
            form.setFieldsValue({ 
              name: record.name, 
              email: record.email, 
              role: record.role, 
              status: record.status, 
            }); 
            setSubmitted(false);
            setFieldErrors({ name: '', email: '', password: '' });
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
          title={<div className="flex items-center gap-2"><Scissors size={20} />{editingStaff ? 'Edit Staff' : 'Add Staff'}</div>} 
          initialValues={editingStaff || { status: 'active', role: 'Employee' }} 
          onSubmit={handleFormSubmit} 
          submitText={editingStaff ? 'Update Staff' : 'Add Staff'}
          loading={addStaffMutation.isPending || updateStaffMutation.isPending}
        >
          <div className="mb-4">
            <InputField 
              label="Full Name" 
              name="name" 
              required 
              placeholder="Enter full name" 
            />
            {getFieldError("name") && (
              <p className="text-red-500 text-sm mt-1">{getFieldError("name")}</p>
            )}
          </div>
          
          <div className="mb-4">
            <InputField 
              label="Email" 
              name="email" 
              prefix={<MailOutlined />} 
              required 
              placeholder="Enter email address" 
            />
            {getFieldError("email") && (
              <p className="text-red-500 text-sm mt-1">{getFieldError("email")}</p>
            )}
          </div>
          
          <div className="mb-4">
            <InputField 
              label="Password" 
              name="Password" 
              required={!editingStaff} 
              placeholder={editingStaff ? "Leave blank to keep current password" : "Enter password"} 
            />
            {getFieldError("password") && (
              <p className="text-red-500 text-sm mt-1">{getFieldError("password")}</p>
            )}
          </div>
          
          <div className="mb-4">
            <SelectField 
              label="Role" 
              name="role" 
              required 
              options={[{ value: 'Employee', label: 'Employee' }]} 
            />
          </div>
          
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
export default Staff;