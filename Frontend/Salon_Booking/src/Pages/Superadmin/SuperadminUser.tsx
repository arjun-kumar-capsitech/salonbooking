import { useEffect, useState } from 'react';
import { Card, Input, Select, message } from 'antd';
import { SearchOutlined, MailOutlined } from '@ant-design/icons';
import { DataTable, StatusBadge } from '../../Components/Ui/Table';
import dayjs from 'dayjs';

const { Option } = Select;

const User = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const API_URL = "http://localhost:5296/api/User";

  const getRoleName = (role: any) => {
    if (!role) return "";
    if (role === "SuperAdmin" || role === 1 || role === "1") return "SuperAdmin";
    if (role === "Admin" || role === 2 || role === "2") return "Admin";
    if (role === "Employee" || role === 3 || role === "3") return "Employee";
    if (role === "Customer" || role === 4 || role === "4") return "Customer";
    return String(role);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setUsers(data);
      setFilteredUsers(data);
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
      data = data.filter((u) => getRoleName(u.role) === roleFilter);
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

  const handleDelete = async (record: any) => {
    try {
      await fetch(`${API_URL}/${record.id || record._id}`, {
        method: "DELETE",
      });
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
      render: (text: string, record: any) => (
        <>
          <div className="font-medium">{text}</div>
          <div className="text-gray-500 text-sm">
            <MailOutlined className="mr-1" /> {record.email}
          </div>
        </>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      render: (role: any) => <StatusBadge type="user" value={getRoleName(role)} />,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      render: (isActive: boolean) => (
        <StatusBadge type="salon" value={isActive ? "active" : "inactive"} />
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      render: (date: string) => dayjs(date).format("DD MMM YYYY hh:mm A"),
      width: 180,
    },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-600">Manage Admin, Employee & Customer users</p>
        </div>
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
            placeholder="Role"
            style={{ width: 120 }}
            value={roleFilter}
            onChange={(val) => setRoleFilter(val)}
          >
            <Option value="all">All Roles</Option>
            <Option value="Admin">Admin</Option>
            <Option value="Employee">Employee</Option>
            <Option value="Customer">Customer</Option>
          </Select>
          <Select
            placeholder="Status"
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
        <DataTable
          data={filteredUsers}
          columns={columns}
          loading={loading}
          onDelete={handleDelete}
        />
      </Card>
    </>
  );
};

export default User;