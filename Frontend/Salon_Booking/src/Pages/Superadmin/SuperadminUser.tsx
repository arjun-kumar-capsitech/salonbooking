import { useEffect, useState } from "react";
import { Card, Input, Select, message } from "antd";
import { SearchOutlined, MailOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useDispatch } from "react-redux";
import { showSuperAdminUser } from "../../Redux/Store/Slice/columnsSlice";
import { DataTable, StatusBadge } from "../../Components/Ui/Table";
import { getSalonBookingAPI } from '../../api/generated';

const { getApiUser, deleteApiUserId } = getSalonBookingAPI();
const { Option } = Select;

const User = () => {
  const dispatch = useDispatch();
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const token = localStorage.getItem("authToken");
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
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
      const res = await getApiUser(axiosConfig);
      const data = extractData(res);
      const formatted = data.map((u: any, index: number) => ({
        key: u.id || index,
        id: u.id,
        fullName: u.fullName || u.FullName,
        email: u.email || u.Email,
        role: getRoleName(u.role),
        status: u.isActive ? "active" : "inactive",
        createdAt: u.createdAt || u.CreatedAt,
      }));
      setUsers(formatted);
      setFilteredUsers(formatted);
    } catch {
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatch(showSuperAdminUser());
  }, [dispatch]);

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
      data = data.filter((u) => u.role === roleFilter);
    }

    if (statusFilter !== "all") {
      data = data.filter((u) => u.status === statusFilter);
    }

    setFilteredUsers(data);
  };

  useEffect(() => {
    applyFilters();
  }, [searchText, roleFilter, statusFilter, users]);

  const handleDelete = async (record: any) => {
    try {
      await deleteApiUserId(record.id, axiosConfig);
      message.success("User deleted successfully");
      fetchUsers();
    } catch {
      message.error("Failed to delete user");
    }
  };

  const columns = [
    {
      title: "User",
      dataIndex: "fullName",
      render: (text: string, record: any) => (
        <>
          <div className="font-medium">{text}</div>
          <div className="text-gray-500 text-sm">
            <MailOutlined className="mr-1" />
            {record.email}
          </div>
        </>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (role: string) => <StatusBadge type="user" value={role} />,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => <StatusBadge type="salon" value={status} />,
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      render: (date: string) =>
        date ? dayjs(date).format("DD MMM YYYY hh:mm A") : "-",
    },
  ];

  return (
    <div>
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
            style={{ width: 140 }}
            value={roleFilter}
            onChange={(val) => setRoleFilter(val)}
          >
            <Option value="all">All Roles</Option>
            <Option value="Admin">Admin</Option>
            <Option value="Employee">Employee</Option>
            <Option value="Customer">Customer</Option>
          </Select>

          <Select
            style={{ width: 140 }}
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
        <p className="p-2">All Users Data</p>
        <DataTable
          data={filteredUsers}
          columns={columns}
          loading={loading}
          onDelete={handleDelete}
          showActions={true}
          rowKey="key"
        />
      </Card>
    </div>
  );
};

export default User;