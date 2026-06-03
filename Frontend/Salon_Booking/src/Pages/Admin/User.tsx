import { useEffect, useState } from 'react';
import { Card, Button, Input, Select, Form, message } from 'antd';
import { PlusOutlined, SearchOutlined, MailOutlined } from '@ant-design/icons';
import { UserCog } from 'lucide-react';
import { DataTable, StatusBadge } from '../../Components/Ui/Table';
import { InputField, SelectField } from '../../Components/Ui/Forms';
import ModalForm from '../../Components/Ui/Modals';
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const {getApiUser,getApiStaff,putApiUserId,postApiUserRegisterEmployee,postApiUserRegisterCustomer,deleteApiUserId} = getSalonBookingAPI();

const { Option } = Select;

const User = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form] = Form.useForm();
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [staffList, setStaffList] = useState<any[]>([]);

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
    if (!response || !response.data) return [];
    if (response.data?.status === true && response.data?.result) {
      return response.data.result;
    }
    if (response.data?.result) {
      return response.data.result;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    return [];
  };

  const fetchStaff = async () => {
    try {
      const response = await getApiStaff(axiosConfig);
      const staffData = extractData(response);
      const mapped = staffData.map((s: any) => ({
        id: s.id || s._id,
        name: s.name || s.Name || s.fullName,
        email: s.email || s.Email,
        salonName: s.salonName || s.SalonName
      }));
      setStaffList(mapped);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [staffRes, usersRes] = await Promise.all([
        getApiStaff(axiosConfig),
        getApiUser(axiosConfig)
      ]);
      const staffList = extractData(staffRes);
      const allUsers = extractData(usersRes);
      let filtered = allUsers.filter((u: any) => u.role === 3 || u.role === 4);
      
      if (isCustomer) {
        filtered = [];
      } else if (isAdmin && !isSuperAdmin) {
        if (userSalonName) {
          const employeeEmailsInSalon = staffList
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
  
      const normalized = filtered.map((u: any) => ({
        id: u.id || u._id,
        fullName: u.fullName || u.FullName,
        email: u.email || u.Email,
        role: u.role || u.Role,
        isActive: u.isActive !== undefined ? u.isActive : u.IsActive,
        createdAt: u.createdAt || u.CreatedAt,
        phoneNumber: u.phoneNumber || u.PhoneNumber
      }));
      
      setUsers(normalized);
      setFilteredUsers(normalized);
    } catch (error: any) {
      console.error(error);
      message.error(error.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStaff();
  }, []);

  const applyFilters = () => {
    let data = [...users];

    if (searchText) {
      data = data.filter(
        (u) =>
          u.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (roleFilter !== "all") {
      data = data.filter((u) =>
        roleFilter === "Employee" ? u.role === 3 : u.role === 4
      );
    }

    if (statusFilter !== "all") {
      data = data.filter((u) =>
        statusFilter === "active" ? u.isActive === true : u.isActive === false
      );
    }

    setFilteredUsers(data);
  };

  useEffect(() => {
    applyFilters();
  }, [searchText, roleFilter, statusFilter, users]);

  const handleFormSubmit = async (values: any) => {
    try {
      if (editingUser) {
        const payload = {
          fullName: values.fullName,
          email: values.email,
          role: Number(values.role),
          isActive: values.isActive === "true"
        };
        await putApiUserId(editingUser.id, payload, axiosConfig);
        message.success("User updated successfully");
      } else {
        if (values.role === 3) {
          const payload = {
            staffId: values.staffId
          };
          const response = await postApiUserRegisterEmployee(payload, axiosConfig);
          
          if (response.data?.status === true) {
            message.success("Employee registered successfully");
          } else {
            message.error(response.data?.message || "Employee registration failed");
            return;
          }
        } else if (values.role === 4) {
          const payload = {
            fullName: values.fullName,
            email: values.email,
            phoneNumber: values.phoneNumber || "",
            password: values.password || "123456",
            confirmPassword: values.password || "123456"
          };
          const response = await postApiUserRegisterCustomer(payload, axiosConfig);
          
          if (response.data?.status === true) {
            message.success("Customer registered successfully");
          } else {
            message.error(response.data?.message || "Customer registration failed");
            return;
          }
        } else {
          message.error("Invalid role selected");
          return;
        }
      }

      setModalVisible(false);
      setEditingUser(null);
      form.resetFields();
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.response?.data?.message || err?.response?.data?.Message || "Failed to save user";
      message.error(errorMsg);
    }
  };

  const handleDelete = async (record: any) => {
    try {
      const response = await deleteApiUserId(record.id, axiosConfig);
      if (response.data?.status === true) {
        message.success("User deleted successfully");
        fetchUsers();
      } else {
        message.error(response.data?.message || "Failed to delete user");
      }
    } catch (err: any) {
      console.error(err);
      message.error(err?.response?.data?.message || "Failed to delete user");
    }
  };

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
        <div className="flex gap-5">
          <Input
            placeholder="Search users"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />

          <Select
            style={{ width: 120 }}
            value={roleFilter}
            onChange={(val) => setRoleFilter(val)}
          >
            <Option value="all">All Roles</Option>
            <Option value="Customer">Customer</Option>
            <Option value="Employee">Employee</Option>
          </Select>

          <Select
            style={{ width: 120 }}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
          >
            <Option value="all">All Status</Option>
            <Option value="active">Active</Option>
            <Option value="inactive">Inactive</Option>
          </Select>
        </div>
      </Card>

      <Card>
        <p className='p-2 mb-4'>Employee & Customer users</p>
        <DataTable
          data={filteredUsers}
          columns={columns}
          loading={loading}
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
          rowKey="id"
        />
      </Card>

      <ModalForm
        form={form}
        open={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingUser(null);
          form.resetFields();
        }}
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
            
            {/* Show staff selection only for Employee role */}
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