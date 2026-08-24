import { Card, Button, Input, Select, Form, message, Spin } from "antd";
import { PlusOutlined, SearchOutlined, MailOutlined } from "@ant-design/icons";
import { UserCog } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import { InputField, SelectField } from "../../Components/Ui/Forms";
import ModalForm from "../../Components/Ui/Modals";
import dayjs from "dayjs";
import { getSalonBookingAPI, UserRole, type User } from "../../api/generated";
import { useSearch } from "../../utils/FilterData";
import type { UserRow, UserFormValues, UserPage } from "../../Types/Alltypes";

const { getApiUser, putApiUserId, postApiUserRegisterEmployee, postApiUserRegisterCustomer, deleteApiUserId } = getSalonBookingAPI();

const axiosConfig = { withCredentials: true,};


const parseResponse = <T,>(response: unknown): T | null => {
  if (!response || typeof response !== "object") return null;
  const data = (response as { data?: unknown }).data;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  return data as T;
};

const getRoleLabel = (role?: number): string => {
  switch (role) {
    case UserRole.NUMBER_1:
      return "SuperAdmin";
    case UserRole.NUMBER_2:
      return "Admin";
    case UserRole.NUMBER_3:
      return "Employee";
    case UserRole.NUMBER_4:
      return "Customer";
    default:
      return "Unknown";
  }
};

const SuperAdminUser = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form] = Form.useForm<UserFormValues>();
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const resetModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const { data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: usersLoading, isFetching } = useInfiniteQuery<UserPage>({
    queryKey: ["allUsers", roleFilter, statusFilter],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await getApiUser({ page: Number(pageParam), pageSize: 4 }, axiosConfig);
      const parsedData = parseResponse<{
        status?: boolean;
        result?: {
          data?: User[] | null;
          totalCount?: number;
          hasNextPage?: boolean;
        };
      }>(response);
      if (!parsedData?.status || !parsedData.result) {
        return {
          data: [],
          totalCount: 0,
          hasNextPage: false,
          nextPage: Number(pageParam) + 1,
        };
      }

      const rawUsers = parsedData.result.data ?? [];

      const users: UserRow[] = rawUsers.map((user, index) => ({
        ...user,
        key: String(user.id ?? `${pageParam}-${index}`),
        id: user.id,
        fullName: user.fullName ?? user.name ?? "Unknown",
        email: user.email ?? "No Email",
        role: user.role ?? UserRole.NUMBER_4,
        isActive: user.isActive ?? false,
        phoneNumber: user.phoneNumber ?? "",
        salonName: user.salonName ?? "",
      }));

      const filteredUsers = users.filter((user) => {
        const roleMatch = roleFilter === "all" || (roleFilter === "Admin" && user.role === UserRole.NUMBER_2) || (roleFilter === "Employee" && user.role === UserRole.NUMBER_3) || (roleFilter === "Customer" && user.role === UserRole.NUMBER_4);
        const statusMatch = statusFilter === "all" || (statusFilter === "active" && user.isActive === true) || (statusFilter === "inactive" && user.isActive === false);
        return roleMatch && statusMatch;
      });

      return {
        data: filteredUsers,
        totalCount: parsedData.result.totalCount ?? filteredUsers.length,
        hasNextPage: parsedData.result.hasNextPage ?? false,
        nextPage: Number(pageParam) + 1,
      };
    },
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextPage : undefined,
  });

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, { threshold: 0.1 });

    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allUsers = useMemo<UserRow[]>(() => infiniteData?.pages.flatMap((page) => page.data) ?? [], [infiniteData]);
  const { searchText, setSearchText, filteredData: searchFilteredData } = useSearch(allUsers, ["fullName", "email"], 500);
  const filteredUsers = useMemo(() => searchFilteredData ?? [], [searchFilteredData]);
  const totalCount = infiniteData?.pages[0]?.totalCount ?? 0;

  const createEmployeeMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const response = await postApiUserRegisterEmployee({ staffId }, axiosConfig);
      const data = parseResponse<{ status?: boolean; message?: string }>(response);
      if (!data?.status) throw new Error(data?.message ?? "Employee registration failed");
      return response;
    },
    onSuccess: () => {
      message.success("Employee registered successfully");
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      resetModal();
    },
    onError: (error: Error) => message.error(error.message || "Failed to register employee"),
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (payload: { fullName: string; email: string; phoneNumber: string; password: string; confirmPassword: string }) => {
      const response = await postApiUserRegisterCustomer(payload, axiosConfig);
      const data = parseResponse<{ status?: boolean; message?: string }>(response);
      if (!data?.status) throw new Error(data?.message ?? "Customer registration failed");
      return response;
    },
    onSuccess: () => {
      message.success("Customer registered successfully");
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      resetModal();
    },
    onError: (error: Error) => message.error(error.message || "Failed to register customer"),
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { fullName: string; email: string; phoneNumber: string; salonName: string; salonAddress: string; role: number; isActive: boolean } }) => {
      const response = await putApiUserId(id, payload, axiosConfig);
      const data = parseResponse<{ status?: boolean; message?: string }>(response);
      if (!data?.status) throw new Error(data?.message ?? "Update failed");
      return response;
    },
    onSuccess: () => {
      message.success("User updated successfully");
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      resetModal();
    },
    onError: (error: Error) => message.error(error.message || "Failed to update user"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteApiUserId(id, axiosConfig);
      const data = parseResponse<{ status?: boolean; message?: string }>(response);
      if (!data?.status) throw new Error(data?.message ?? "Delete failed");
      return response;
    },
    onSuccess: () => {
      message.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
    },
    onError: (error: Error) => message.error(error.message || "Failed to delete user"),
  });

  const handleFormSubmit = async (values: UserFormValues) => {
    const role = Number(values.role);

    if (editingUser?.id) {
      await updateUserMutation.mutateAsync({
        id: String(editingUser.id),
        payload: {
          fullName: values.fullName,
          email: values.email,
          phoneNumber: values.phoneNumber ?? "",
          salonName: values.salonName ?? "",
          salonAddress: values.salonAddress ?? "",
          role,
          isActive: values.isActive === "true",
        },
      });
      return;
    }

    if (role === UserRole.NUMBER_3) {
      if (!values.staffId) {
        message.error("Please enter staff ID");
        return;
      }
      await createEmployeeMutation.mutateAsync(values.staffId);
      return;
    }

    if (role === UserRole.NUMBER_4) {
      const password = values.password ?? "123456";

      await createCustomerMutation.mutateAsync({
        fullName: values.fullName,
        email: values.email,
        phoneNumber: values.phoneNumber ?? "",
        password,
        confirmPassword: password,
      });
      return;
    }

    message.error("Only Employee and Customer can be added here");
  };

  const handleDelete = (record: UserRow) => {
    if (record.id) deleteUserMutation.mutate(String(record.id));
  };

  const columns = [
    {
      title: "User",
      dataIndex: "fullName",
      render: (text: string, record: UserRow) => (
        <div>
          <div className="font-semibold">{text || "N/A"}</div>
          <div className="text-gray-500 text-sm">
            <MailOutlined className="mr-1" /> {record.email || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (role: number) => <span>{getRoleLabel(role)}</span>,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      render: (isActive: boolean) => <StatusBadge type="user" value={isActive ? "active" : "inactive"} />,
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      width: 180,
      render: (date?: string) => date ? dayjs(date).format("DD MMM YYYY hh:mm A") : "N/A",
    },
  ];

  const isLoading = usersLoading;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "PT Serif, serif" }}>User Management</h1>
          <p className="text-gray-600" style={{ fontFamily: "Public Sans, sans-serif" }}>Manage All users</p>
          {totalCount > 0 && <p className="text-sm text-gray-500 mt-1">Showing {filteredUsers.length} of {totalCount} users</p>}
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditingUser(null);
          form.resetFields();
          form.setFieldsValue({ role: UserRole.NUMBER_4, isActive: "true" });
          setModalVisible(true);
        }}>
          Add User
        </Button>
      </div>

      <Card className="mb-6">
        <div className="flex gap-4 flex-wrap">
          <Input placeholder="Search users..." prefix={<SearchOutlined />} style={{ width: 300 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} allowClear />
          <Select style={{ width: 140 }} value={roleFilter} onChange={setRoleFilter}>
            <Select.Option value="all">All Roles</Select.Option>
            <Select.Option value="Admin">Admin</Select.Option>
            <Select.Option value="Employee">Employee</Select.Option>
            <Select.Option value="Customer">Customer</Select.Option>
          </Select>
          <Select style={{ width: 120 }} value={statusFilter} onChange={setStatusFilter}>
            <Select.Option value="all">All Status</Select.Option>
            <Select.Option value="active">Active</Select.Option>
            <Select.Option value="inactive">Inactive</Select.Option>
          </Select>
        </div>
      </Card>
      <Card>
        <div className="mb-4 flex justify-between items-center">
          <div className="p-2">
            All Users Data
            {isFetching && !isFetchingNextPage && <Spin size="small" className="ml-2" />}
          </div>
        </div>
        <DataTable data={filteredUsers} columns={columns} loading={isLoading} onEdit={(record: UserRow) => {
          setEditingUser(record);
          form.setFieldsValue({
            fullName: record.fullName ?? "",
            email: record.email ?? "",
            phoneNumber: record.phoneNumber ?? "",
            role: Number(record.role),
            isActive: String(record.isActive),
            salonName: record.salonName ?? "",
          });
          setModalVisible(true);
        }} onDelete={handleDelete} showActions rowKey="key" />

        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="text-center py-4">
              <Spin size="large" />
              <p className="mt-2 text-gray-500">Loading more users...</p>
            </div>
          )}
          {!hasNextPage && filteredUsers.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">No users found</div>
          )}
        </div>
      </Card>

      <ModalForm form={form} open={modalVisible} onClose={resetModal} title={
        <div className="flex items-center gap-2">
          <UserCog size={20} />
          {editingUser ? "Edit User" : "Add New User"}
        </div>
      } initialValues={editingUser ? { ...editingUser, isActive: String(editingUser.isActive) } : { role: UserRole.NUMBER_4, isActive: "true" }} onSubmit={handleFormSubmit} submitText={editingUser ? "Update User" : "Add User"} loading={updateUserMutation.isPending || createEmployeeMutation.isPending || createCustomerMutation.isPending}>
        <InputField label="Full Name" name="fullName" placeholder="Enter user name" required />
        <InputField label="Email" name="email" placeholder="Enter email address" required type="email" prefix={<MailOutlined />} />
        {!editingUser && <InputField label="Password" name="password" placeholder="Enter password" type="password" required />}

        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) => {
            const role = Number(getFieldValue("role"));
            if (role === UserRole.NUMBER_3 && !editingUser) {
              return <InputField label="Staff ID" name="staffId" placeholder="Enter staff ID" required />;
            }
            if ((role === UserRole.NUMBER_1 || role === UserRole.NUMBER_2) && !editingUser) {
              return <InputField label="Salon Name" name="salonName" placeholder="Enter salon name" required />;
            }
            return null;
          }}
        </Form.Item>

        <SelectField label="Role" name="role" placeholder="Select role" required options={[
          { value: 1, label: "SuperAdmin" },
          { value: 2, label: "Admin" },
          { value: 3, label: "Employee" },
          { value: 4, label: "Customer" },
        ]} />
        <SelectField label="Status" name="isActive" placeholder="Select status" required options={[
          { value: "true", label: "Active" },
          { value: "false", label: "Inactive" },
        ]} />
      </ModalForm>
    </div>
  );
};
export default SuperAdminUser;