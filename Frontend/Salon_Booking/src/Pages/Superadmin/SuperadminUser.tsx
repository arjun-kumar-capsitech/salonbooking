import { Card, Button, Input, Select, Form, message, Spin } from 'antd';
import { PlusOutlined, SearchOutlined, MailOutlined } from '@ant-design/icons';
import { UserCog } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable, StatusBadge } from '../../Components/Ui/Table';
import { InputField, SelectField } from '../../Components/Ui/Forms';
import ModalForm from '../../Components/Ui/Modals';
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const { getAllUsers: getApiUser, getAllStaff: getApiStaff, updateUser: putApiUserId, registerEmployee: postApiUserRegisterEmployee, registerCustomer: postApiUserRegisterCustomer, deleteUser: deleteApiUserId } = getSalonBookingAPI();
const { Option } = Select;
const SuperAdminUser = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const token = localStorage.getItem("authToken");
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
  const resetModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['staffList'],staleTime: 3000,refetchOnWindowFocus: false,refetchOnMount: false,
    queryFn: async () => {
      const response = await getApiStaff(undefined, axiosConfig);
      const parsedData = ResponseData(response);
      if (parsedData?.status === true && parsedData?.result) {
        const result = parsedData.result;
        if (Array.isArray(result)) {
          return result;
        } else if (result.data && Array.isArray(result.data)) {
          return result.data;
        }
      }
      return [];
    },
  });

  const { data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: usersLoading,} = useInfiniteQuery({
    queryKey: ['allUsers', roleFilter, statusFilter, searchInput], staleTime: 5000, refetchOnMount: false, refetchOnWindowFocus: false, initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const response = await getApiUser({ page: pageParam, pageSize: 4 }, axiosConfig);
        const parsedData = ResponseData(response);
        if (!parsedData?.status || !parsedData?.result) {
          return {
            data: [],
            totalCount: 0,
            hasNextPage: false,
            nextPage: pageParam + 1
          };
        }
        let rawUsers = [];
        let pagination = null;

        const result = parsedData.result;
        if (Array.isArray(result)) {
          rawUsers = result;
          pagination = parsedData.pagination || null;
        } else if (result?.data && Array.isArray(result.data)) {
          rawUsers = result.data;
          pagination = result.pagination || parsedData.pagination || null;
        } else {
          rawUsers = [];
        }

        const transformedUsers = rawUsers.map((u: any, index: number) => ({
          key: u.id || u._id || `${pageParam}-${index}`,
          id: u.id || u._id,
          fullName: u.fullName || u.FullName || u.name || 'Unknown',
          email: u.email || u.Email || 'No Email',
          role: u.role || u.Role || 4,
          isActive: u.isActive !== undefined ? u.isActive : u.IsActive,
          createdAt: u.createdAt || u.CreatedAt || new Date().toISOString(),
          phoneNumber: u.phoneNumber || u.PhoneNumber || '',
          salonName: u.salonName || u.SalonName || ''
        }));

        let finalData = transformedUsers;
        if (roleFilter !== 'all') {
          finalData = finalData.filter((u: any) => {
            if (roleFilter === 'SuperAdmin') return u.role === 1;
            if (roleFilter === 'Admin') return u.role === 2;
            if (roleFilter === 'Employee') return u.role === 3;
            if (roleFilter === 'Customer') return u.role === 4;
            return true;
          });
        }
        if (statusFilter !== 'all') {
          finalData = finalData.filter((u: any) => {
            if (statusFilter === 'active') return u.isActive === true;
            if (statusFilter === 'inactive') return u.isActive === false;
            return true;
          });
        }
        if (searchInput) {
          const searchLower = searchInput.toLowerCase();
          finalData = finalData.filter((u: any) =>
            u.fullName?.toLowerCase().includes(searchLower) ||
            u.email?.toLowerCase().includes(searchLower)
          );
        }
        const totalCount = pagination?.totalCount || finalData.length;
        const hasNext = pagination?.hasNextPage || false;
        return {
          data: finalData,
          totalCount: totalCount,
          hasNextPage: hasNext,
          nextPage: pageParam + 1,
        };
      } catch (error) {
        console.error('Error fetching users:', error);
        return {
          data: [],
          totalCount: 0,
          hasNextPage: false,
          nextPage: pageParam + 1,
        };
      }
    },
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextPage : undefined,
    enabled: staffData !== undefined,
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

  const allUsers = useMemo(() => {
    return infiniteData?.pages?.flatMap(page => page.data) || [];
  }, [infiniteData]);

  const staffList = useMemo(() => {
    return (staffData || []).map((s: any) => ({
      id: s.id || s._id,
      name: s.name || s.Name || s.fullName || s.FullName || 'Unknown',
      email: s.email || s.Email,
      salonName: s.salonName || s.SalonName
    }));
  }, [staffData]);

  const createEmployeeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await postApiUserRegisterEmployee(payload, axiosConfig);
      if (!response.data?.status) {
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
      if (!response.data?.status) {
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
      const response = await putApiUserId(id, payload, axiosConfig);
      if (!response.data?.status) {
        throw new Error(response.data?.message || "Update failed");
      }
      return response;
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
      const response = await deleteApiUserId(id, axiosConfig);
      if (!response.data?.status) {
        throw new Error(response.data?.message || "Delete failed");
      }
      return response;
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
        phoneNumber: values.phoneNumber || '',
        salonName: values.salonName || '',
        salonAddress: values.salonAddress || '',
        role: Number(values.role),
        isActive: values.isActive === "true"
      };
      await updateUserMutation.mutateAsync({ id: editingUser.id, payload });
    } else {
      if (Number(values.role) === 3) {
        await createEmployeeMutation.mutateAsync({ staffId: values.staffId });
      } else if (Number(values.role) === 4) {
        const payload = {
          fullName: values.fullName,
          email: values.email,
          phoneNumber: values.phoneNumber || "",
          password: values.password || "123456",
          confirmPassword: values.password || "123456"
        };
        await createCustomerMutation.mutateAsync(payload);
      } else if (Number(values.role) === 1 || Number(values.role) === 2) {
        const payload = {
          fullName: values.fullName,
          email: values.email,
          phoneNumber: values.phoneNumber || "",
          password: values.password || "123456",
          confirmPassword: values.password || "123456",
          role: Number(values.role),
          isActive: values.isActive === "true"
        };
        await createCustomerMutation.mutateAsync(payload);
      } else {
        message.error("Invalid role selected");
      }
    }
  };

  const handleDelete = (record: any) => {
    if (!record.id) return;
    deleteUserMutation.mutate(record.id);
  };

  const handleSearch = () => {
    setSearchInput(searchTerm);
  };

  const getRoleLabel = (role: number) => {
    if (role === 1) return "SuperAdmin";
    if (role === 2) return "Admin";
    if (role === 3) return "Employee";
    if (role === 4) return "Customer";
    return "Unknown";
  };

  const columns = [
    {
      title: 'User',
      dataIndex: 'fullName',
      render: (text: string, record: any) => (
        <div>
          <div className="font-semibold">{text || 'N/A'}</div>
          <div className="text-gray-500 text-sm">
            <MailOutlined className="mr-1" /> {record.email || '-'}
          </div>
        </div>
      )
    },
    {
      title: 'Role',
      dataIndex: 'role',
      render: (role: number) => (
        <span>{getRoleLabel(role)}</span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      render: (isActive: boolean) => (
        <StatusBadge type="user" value={isActive ? "active" : "inactive"} />
      )
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      render: (date: string) => date ? dayjs(date).format("DD MMM YYYY hh:mm A") : 'N/A',
      width: 180
    }
  ];

  const isLoading = (usersLoading && !infiniteData) || staffLoading;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-600">Manage All users</p>
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
        <div className="flex gap-4 flex-wrap">
          <Input
            placeholder="Search users..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
          />
          <Select
            style={{ width: 140 }}
            value={roleFilter}
            onChange={setRoleFilter}
          >
            <Option value="all">All Roles</Option>
            <Option value="SuperAdmin">SuperAdmin</Option>
            <Option value="Admin">Admin</Option>
            <Option value="Employee">Employee</Option>
            <Option value="Customer">Customer</Option>
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
        <DataTable
          data={allUsers}
          columns={columns}
          loading={isLoading}
          onEdit={(record: any) => {
            setEditingUser(record);
            form.setFieldsValue({
              fullName: record.fullName,
              email: record.email,
              phoneNumber: record.phoneNumber,
              role: record.role,
              isActive: String(record.isActive)
            });
            setModalVisible(true);
          }}
          onDelete={handleDelete}
          showActions={true}
          rowKey="key"
        />
        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="text-center py-4">
              <Spin size="large" />
              <p className="mt-2 text-gray-500">Loading more users...</p>
            </div>
          )}
          {!hasNextPage && allUsers.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              No users found
            </div>
          )}
        </div>
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
                if (Number(role) === 3) {
                  return (
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
                  );
                }
                if (Number(role) === 1 || Number(role) === 2) {
                  return (
                    <InputField
                      label="Salon Name"
                      name="salonName"
                      placeholder="Enter salon name"
                      required={true}
                    />
                  );
                }
                return null;
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
            { value: 1, label: 'SuperAdmin' },
            { value: 2, label: 'Admin' },
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
export default SuperAdminUser;