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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(API_URL);
      const filtered = data.filter((u: any) => u.role === 3 || u.role === 4);
      setUsers(filtered);
      setFilteredUsers(filtered);
    } catch {
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
      const payload = {
        fullName: values.fullName,
        email: values.email,
        role: Number(values.role),
        isActive: values.isActive === "true"
      };

      if (editingUser) {
        await axios.put(`${API_URL}/${editingUser.id}`, payload);
        message.success("User updated successfully");
      } else {
        const newPayload = {
          fullName: values.fullName,
          email: values.email,
          phoneNumber: values.phoneNumber || "",
          password: ""
        };
        await axios.post(`${API_URL}/register/customer`, newPayload);
        message.success("Customer registered successfully");
      }

      setModalVisible(false);
      setEditingUser(null);
      form.resetFields();
      fetchUsers();
    } catch {
      message.error("Failed to save user");
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await axios.delete(`${API_URL}/${record.id}`);
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
            : {}
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