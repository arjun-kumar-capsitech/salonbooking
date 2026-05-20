import { useEffect, useState } from 'react';
import { Card, Button, Input, Select, Form, message } from 'antd';
import { PlusOutlined, SearchOutlined, MailOutlined } from '@ant-design/icons';
import { UserCog } from 'lucide-react';
import axios from 'axios';
import { DataTable, StatusBadge } from '../../Components/Ui/Table';
import { InputField, SelectField } from '../../Components/Ui/Forms';
import ModalForm from '../../Components/Ui/Modals';
import dayjs from "dayjs";

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

  const API_URL = "http://localhost:5296/api/User";
  const STAFF_API = "http://localhost:5296/api/Staff";

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
    },
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [staffRes, usersRes] = await Promise.all([
        axios.get(STAFF_API, axiosConfig),
        axios.get(API_URL, axiosConfig)
      ]);
      
      const staffList = staffRes.data || [];
      const allUsers = usersRes.data || [];
      
      let filtered = allUsers.filter((u: any) => u.role === 3 || u.role === 4);
      
      if (isCustomer) {
        filtered = [];
      } else if (isAdmin && !isSuperAdmin) {
        if (userSalonName) {
          const employeeEmailsInSalon = staffList
            .filter((s: any) => {
              const staffSalon = (s.SalonName || s.salonName || "").toString().trim();
              const adminSalon = userSalonName.toString().trim();
              return staffSalon.toLowerCase() === adminSalon.toLowerCase();
            })
            .map((s: any) => (s.Email || s.email || "").toLowerCase());
          
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
      
      setUsers(filtered);
      setFilteredUsers(filtered);
    } catch (error) {
      console.error(error);
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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
        await axios.put(`${API_URL}/${editingUser.id}`, payload, axiosConfig);
        message.success("User updated successfully");
      } else {
        const newPayload = {
          fullName: values.fullName,
          email: values.email,
          phoneNumber: values.phoneNumber || "",
          password: values.password || "123456",
          role: Number(values.role),
          isActive: true
        };
        await axios.post(`${API_URL}/register`, newPayload, axiosConfig);
        message.success("User registered successfully");
      }

      setModalVisible(false);
      setEditingUser(null);
      form.resetFields();
      fetchUsers();
    } catch (err) {
      console.error(err);
      message.error("Failed to save user");
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await axios.delete(`${API_URL}/${record.id}`, axiosConfig);
      message.success("User deleted successfully");
      fetchUsers();
    } catch {
      message.error("Failed to delete user");
    }
  };

  const columns = [
    {
      title: 'User',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text: string) => (
        <div className="font-semibold">{text}</div>
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
      render: (date: string) => dayjs(date).format("DD MMM YYYY hh:mm A"),
      width: 180
    }
  ];

  return (
    <>
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
        <p className='p-2'>Employee & Customer users</p>
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
        />
      </Card>

      <ModalForm
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
        loading={false}
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
          <InputField
            label="Password"
            name="password"
            placeholder="Enter password"
            type="password"
            required={true}
          />
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
    </>
  );
};

export default User;