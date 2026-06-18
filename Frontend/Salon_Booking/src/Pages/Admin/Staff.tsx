import { Card, Button, Input, Select, Form, message, Spin } from 'antd';
import { PlusOutlined, SearchOutlined, MailOutlined } from '@ant-design/icons';
import { Scissors } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, StatusBadge } from '../../Components/Ui/Table';
import { InputField, SelectField } from '../../Components/Ui/Forms';
import ModalForm from '../../Components/Ui/Modals';
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const { getAllStaff: getApiStaff, createStaff: postApiStaff, updateStaff: putApiStaffId, deleteStaff: deleteApiStaffId, registerEmployee: postApiUserRegisterEmployee } = getSalonBookingAPI();
const { Option } = Select;

const Staff = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '' });
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
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

  const validateField = (name: string, value: string, isEdit: boolean = false) => {
    switch (name) {
      case "name":
        if (!value.trim()) return "Full name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        if (value.trim().length > 50) return "Name must be less than 50 characters";
        return "";
      case "email":
        if (!value.trim()) return "Email is required";
        if (!value.includes("@") || !value.includes(".")) return "Email must contain '@' and '.'";
        if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(value)) return "Please enter a valid email address";
        return "";
      case "password":
        if (!isEdit && !value) return "Password is required";
        if (value && value.length < 6) return "Password must be at least 6 characters";
        return "";
      default:
        return "";
    }
  };

  const resetModal = () => {
    setModalVisible(false);
    setEditingStaff(null);
    form.resetFields();
    setSubmitted(false);
    setFieldErrors({ name: '', email: '', password: '' });
  };

  const { data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: loading, isFetching } = useInfiniteQuery({
    queryKey: ['staff', statusFilter, searchInput],
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getApiStaff({ page: pageParam, pageSize: 4 }, axiosConfig);
      const parsedData = ResponseData(response);

      if (!parsedData?.status === true || !parsedData?.result?.data) {
        return {
          data: [],
          totalCount: 0,
          hasNextPage: false,
          nextPage: pageParam + 1
        };
      }

      let rawStaff = parsedData.result.data;
      const pagination = parsedData.result.pagination;

      if (isCustomer) {
        rawStaff = [];
      } else if (isAdmin && !isSuperAdmin && userSalonName) {
        rawStaff = rawStaff.filter((s: any) =>
          (s.salonName || s.SalonName) === userSalonName
        );
      }

      const transformedStaff = rawStaff.map((s: any, index: number) => ({
        key: s.id || s._id || `${pageParam}-${index}`,
        id: s.id || s._id,
        name: s.name || s.Name || s.fullName || s.FullName || 'Unknown',
        email: s.email || s.Email || 'No Email',
        role: s.role || s.Role || 'Employee',
        status: (s.isActive !== undefined ? s.isActive : s.IsActive) ? 'active' : 'inactive',
        joined: s.joinedDate || s.JoinedDate || s.createdAt || s.CreatedAt || new Date().toISOString(),
        salonName: s.salonName || s.SalonName || 'Unknown'
      }));

      let filteredData = transformedStaff;
      if (statusFilter !== 'all') {
        filteredData = filteredData.filter((s: any) => s.status === statusFilter);
      }
      if (searchInput) {
        filteredData = filteredData.filter((s: any) =>
          s.name?.toLowerCase().includes(searchInput.toLowerCase())
        );
      }

      return {
        data: filteredData,
        totalCount: pagination?.totalCount || 0,
        hasNextPage: pagination?.hasNextPage || false,
        nextPage: pageParam + 1,
      };
    },
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextPage : undefined,
  });

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

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
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allStaff = useMemo(() => {
    return infiniteData?.pages?.flatMap(page => page.data) || [];
  }, [infiniteData]);

  const totalCount = infiniteData?.pages?.[0]?.totalCount || 0;

  const addStaffMutation = useMutation({
    mutationFn: async (payload: any) => {
      const staffResponse = await postApiStaff(payload, axiosConfig);
      const parsedData = ResponseData(staffResponse);
      const createdStaff = parsedData?.result || parsedData;
      const staffId = createdStaff?.id || createdStaff?._id;
      if (staffId) {
        await postApiUserRegisterEmployee({ staffId });
      }
      return { success: true, staffId };
    },
    onSuccess: () => {
      message.success('Staff added successfully');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      resetModal();
    },
    onError: (error: any) => {
      const backendMessage = error?.response?.data?.message || '';
      if (backendMessage.toLowerCase().includes('exist') || backendMessage.toLowerCase().includes('already')) {
        setFieldErrors(prev => ({ ...prev, email: 'Email already exists' }));
        message.error('Email already exists! Please use a different email.');
      } else {
        message.error(backendMessage || 'Something went wrong');
      }
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      await putApiStaffId(id, payload, axiosConfig);
    },
    onSuccess: () => {
      message.success('Staff updated successfully');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      resetModal();
    },
    onError: (error: any) => {
      const backendMessage = error?.response?.data?.message || '';
      if (backendMessage.toLowerCase().includes('exist') || backendMessage.toLowerCase().includes('already')) {
        setFieldErrors(prev => ({ ...prev, email: 'Email already exists' }));
        message.error('Email already exists! Please use a different email.');
      } else {
        message.error(backendMessage || 'Failed to update staff');
      }
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteApiStaffId(id, axiosConfig);
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

    const isEdit = !!editingStaff;

    const nameError = validateField("name", values.name, isEdit);
    const emailError = validateField("email", values.email, isEdit);
    const passwordError = validateField("password", values.Password, isEdit);

    setFieldErrors({ name: nameError, email: emailError, password: passwordError });

    if (nameError || emailError || passwordError) {
      return;
    }

    const payload = {
      name: values.name,
      password: values.Password,
      email: values.email,
      role: values.role || 'Employee',
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

  const handleSearch = () => {
    setSearchInput(searchTerm);
  };

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
            placeholder="Search staff..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
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

      <Card>
        <div className="mb-4 flex justify-between items-center">
          <p className="p-2">
            All Staff Data
            {isFetching && !isFetchingNextPage && <Spin size="small" className="ml-2" />}
          </p>
        </div>

        <DataTable
          data={allStaff}
          columns={columns}
          loading={loading && !infiniteData}
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

        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="text-center py-4">
              <Spin size="large" />
              <p className="mt-2 text-gray-500">Loading more staff...</p>
            </div>
          )}

          {!hasNextPage && allStaff.length > 0 && allStaff.length === totalCount && (
            <div className="text-center py-4 text-green-600">
              All {totalCount} staff members loaded successfully!
            </div>
          )}

          {!hasNextPage && allStaff.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No staff members found
            </div>
          )}
        </div>
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