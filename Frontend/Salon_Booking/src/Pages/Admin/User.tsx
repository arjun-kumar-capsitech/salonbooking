import { Card, Button, Input, Select, Form, message } from 'antd';
import { PlusOutlined, SearchOutlined, MailOutlined } from '@ant-design/icons';
import { UserCog } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, StatusBadge } from '../../Components/Ui/Table';
import { InputField, SelectField } from '../../Components/Ui/Forms';
import ModalForm from '../../Components/Ui/Modals';
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const { Option } = Select;
const { getApiUser, getApiStaff, putApiUserId, postApiUserRegisterEmployee, postApiUserRegisterCustomer, deleteApiUserId } = getSalonBookingAPI();

const User = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');  
  const queryClient = useQueryClient();
  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.Role || user?.role;
  const userSalonName = user?.SalonName || user?.salonName;

  const isAdmin = userRole === "Admin" || userRole === "admin" || userRole === 1 || userRole === 2;
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
    setEditingUser(null);
    form.resetFields();
  };

  const { data: staffApiData = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff'], staleTime: 5000,refetchOnWindowFocus: false,refetchOnMount: false,
    queryFn: async () => {
      const response = await getApiStaff(axiosConfig);
      return extractData(response);
    }
  });

  const { data: usersApiData = [], isLoading: usersLoading, } = useQuery({
    queryKey: ['allUsers'],staleTime: 5000,refetchOnWindowFocus: false,refetchOnMount: false,
    queryFn: async () => {
      const response = await getApiUser(axiosConfig);
      return extractData(response);
    }
  });

  const staffList = useMemo(() => {
    return staffApiData.map((s: any) => ({
      id: s.id || s._id,
      name: s.name || s.Name || s.fullName,
      email: s.email || s.Email,
      salonName: s.salonName || s.SalonName
    }));
  }, [staffApiData]);

  const users = useMemo(() => {
    if (!usersApiData.length) return [];
    let filtered = usersApiData.filter((u: any) => u.role === 3 || u.role === 4);
    if (isCustomer) {
      filtered = [];
    } else if (isAdmin && !isSuperAdmin) {
      if (userSalonName) {
        const employeeEmailsInSalon = staffApiData
          .filter((s: any) => {
            const staffSalon = (s.salonName || s.SalonName || "").toString().trim();
            const adminSalon = userSalonName.toString().trim();
            return staffSalon.toLowerCase() === adminSalon.toLowerCase();
          })
          .map((s: any) => (s.email || s.Email || "").toLowerCase());
        
        filtered = filtered.filter((u: any) => {
          if (u.role === 4) {
            return true;
          } else if (u.role === 3) {
            const userEmail = (u.email || "").toLowerCase();
            return employeeEmailsInSalon.includes(userEmail);
          }
          return false;
        });
      } else {
        filtered = filtered.filter((u: any) => u.role === 4);
      }
    }

    return filtered.map((u: any, index: number) => ({
      key: u.id || u._id || index,
      id: u.id || u._id,
      fullName: u.fullName || u.FullName,
      email: u.email || u.Email,
      role: u.role || u.Role,
      isActive: u.isActive !== undefined ? u.isActive : u.IsActive,
      createdAt: u.createdAt || u.CreatedAt,
      phoneNumber: u.phoneNumber || u.PhoneNumber
    }));
  }, [usersApiData, staffApiData, isCustomer, isAdmin, isSuperAdmin, userSalonName]);

  const createEmployeeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await postApiUserRegisterEmployee(payload, axiosConfig);
      if (response.data?.status !== true) {
        throw new Error(response.data?.message || "Employee registration failed");
      }
      return response;
    },
    onSuccess: () => {
      message.success('Employee registered successfully');
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      resetModal();
    },
    onError: (error: any) => {
      message.error(error?.message || error?.response?.data?.message || 'Failed to register employee');
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await postApiUserRegisterCustomer(payload, axiosConfig);
      if (response.data?.status !== true) {
        throw new Error(response.data?.message || "Customer registration failed");
      }
      return response;
    },
    onSuccess: () => {
      message.success('Customer registered successfully');
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      resetModal();
    },
    onError: (error: any) => {
      message.error(error?.message || error?.response?.data?.message || 'Failed to register customer');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      await putApiUserId(id, payload, axiosConfig);
    },
    onSuccess: () => {
      message.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      resetModal();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to update user');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteApiUserId(id, axiosConfig);
    },
    onSuccess: () => {
      message.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to delete user');
    },
  });

  const handleFormSubmit = async (values: any) => {
    if (editingUser) {
      const payload = {
        fullName: values.fullName,
        email: values.email,
        role: Number(values.role),
        isActive: values.isActive === "true"
      };
      updateUserMutation.mutate({ id: editingUser.id, payload });
    } else {
      if (values.role === 3) {
        createEmployeeMutation.mutate({ staffId: values.staffId });
      } else if (values.role === 4) {
        const payload = {
          fullName: values.fullName,
          email: values.email,
          phoneNumber: values.phoneNumber || "",
          password: values.password || "123456",
          confirmPassword: values.password || "123456"
        };
        createCustomerMutation.mutate(payload);
      } else {
        message.error("Invalid role selected");
      }
    }
  };

  const handleDelete = (record: any) => {
    if (!record.id) return;
    deleteUserMutation.mutate(record.id);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u: any) =>
      (u.fullName ?? '').toLowerCase().includes(searchText.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(searchText.toLowerCase())
    ).filter((u: any) => {
      if (roleFilter === "all") return true;
      if (roleFilter === "Employee") return u.role === 3;
      if (roleFilter === "Customer") return u.role === 4;
      return true;
    }).filter((u: any) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return u.isActive === true;
      if (statusFilter === "inactive") return u.isActive === false;
      return true;
    });
  }, [users, searchText, roleFilter, statusFilter]);

  const columns = [
    {
      title: 'User',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text: string) => (
        <div className="font-semibold">{text || 'N/A'}</div>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => (
        <div className="text-gray-500 text-sm">{email || "-"}</div>
      )
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: number) => (
        <span>{role === 3 ? "Employee" : "Customer"}</span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <StatusBadge type="user" value={isActive ? "active" : "inactive"} />
      )
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date ? dayjs(date).format("DD MMM YYYY hh:mm A") : 'N/A',
      width: 180
    }
  ];
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-600">Manage Employee and Customer users</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingUser(null);
            form.resetFields();
            form.setFieldsValue({ role: 4, isActive: "true" });
            setModalVisible(true);
          }}
        >
          Add User
        </Button>
      </div>

      <Card className="mb-6">
        <div className="flex gap-4">
          <Input
            placeholder="Search users..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            style={{ width: 120 }}
            value={roleFilter}
            onChange={setRoleFilter}
          >
            <Option value="all">All Roles</Option>
            <Option value="Customer">Customer</Option>
            <Option value="Employee">Employee</Option>
          </Select>
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
        <p className="p-2 mb-4">Employee & Customer users</p>
        <DataTable
          data={filteredUsers}
          columns={columns}
          loading={staffLoading || usersLoading ||  createEmployeeMutation.isPending ||  createCustomerMutation.isPending || updateUserMutation.isPending || deleteUserMutation.isPending}
          onEdit={(record: any) => {
            setEditingUser(record);
            form.setFieldsValue({
              fullName: record.fullName,
              email: record.email,
              role: record.role,
              isActive: String(record.isActive)
            });
            setModalVisible(true);
          }}
          onDelete={handleDelete}
          showActions={true}
          rowKey="key"
        />
      </Card>

      <ModalForm
        form={form}
        open={modalVisible}
        onClose={resetModal}
        title={
          <div className="flex items-center gap-2">
            <UserCog size={20} />
            {editingUser ? 'Edit User' : 'Add New User'}
          </div>
        }
        initialValues={
          editingUser
            ? { ...editingUser, isActive: String(editingUser.isActive) }
            : { role: 4, isActive: "true" }
        }
        onSubmit={handleFormSubmit}
        submitText={editingUser ? 'Update User' : 'Add User'}
        loading={updateUserMutation.isPending || createEmployeeMutation.isPending || createCustomerMutation.isPending}
      >
        <InputField
          label="Full Name"
          name="fullName"
          placeholder="Enter user name"
          required={true}
        />
        <InputField
          label="Email"
          name="email"
          placeholder="Enter email address"
          required={true}
          type="email"
          prefix={<MailOutlined />}
        />

        {!editingUser && (
          <>
            <InputField
              label="Password"
              name="password"
              placeholder="Enter password"
              type="password"
              required={true}
            />
            
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) => {
                const role = getFieldValue('role');
                return role === 3 ? (
                  <SelectField
                    label="Select Staff"
                    name="staffId"
                    required={true}
                    options={staffList.map((staff: any) => ({
                      value: staff.id,
                      label: staff.name || staff.email
                    }))}
                    placeholder="Select staff member"
                  />
                ) : null;
              }}
            </Form.Item>
          </>
        )}

        <SelectField
          label="Role"
          name="role"
          placeholder="Select role"
          required={true}
          options={[
            { value: 3, label: 'Employee' },
            { value: 4, label: 'Customer' }
          ]}
        />
        <SelectField
          label="Status"
          name="isActive"
          placeholder="Select status"
          required={true}
          options={[
            { value: "true", label: 'Active' },
            { value: "false", label: 'Inactive' }
          ]}
        />
      </ModalForm>
    </div>
  );
};
export default User;