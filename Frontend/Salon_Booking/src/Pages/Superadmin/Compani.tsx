import { useEffect, useState } from "react";
import { Button, Input, message, Modal, Card, Form } from "antd";
import { SearchOutlined, PlusOutlined, ShopOutlined, UserOutlined, EnvironmentOutlined, LockOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
import axios from "axios";
import { showSuperAdminCompani } from "../../Redux/Store/Slice/columnsSlice";
import { useDispatch } from "react-redux";
import Modals from "../../Components/Ui/Modals";
import { InputField, SelectField } from "../../Components/Ui/Forms";
import { DataTable } from "../../Components/Ui/Table";

const { confirm } = Modal;

interface Admin {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  salonName: string;
  salonAddress: string;
  isActive: boolean;
  role: number;
}

const API_URL = "http://localhost:5296/api/User";

const Compani = () => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [searchText, setSearchText] = useState("");
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(showSuperAdminCompani());
  }, [dispatch]);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL);
      const filtered = response.data
        .filter((u: any) => u.role === 2)
        .map((u: any, index: number) => ({
          key: u.id || u._id || index,
          id: u.id || u._id,
          companyName: u.SalonName || u.salonName,
          owner: u.FullName || u.fullName,
          email: u.Email || u.email,
          phone: u.PhoneNumber || u.phoneNumber,
          status: u.isActive ? "active" : "inactive",
          salonAddress: u.SalonAddress || u.salonAddress,
        }));
      setAdmins(filtered);
    } catch (error) {
      message.error("Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleFormSubmit = async (values: any) => {
    try {
      if (selectedAdmin) {
        await axios.put(`${API_URL}/${selectedAdmin.id}`, {
          fullName: values.owner,
          email: values.email,
          phoneNumber: values.phone,
          salonName: values.companyName,
          salonAddress: values.salonAddress,
          role: 2,
          isActive: values.status === "active",
        });
        message.success("Company updated successfully");
      } else {
        await axios.post(`${API_URL}/register/admin`, {
          fullName: values.owner,
          email: values.email,
          phoneNumber: values.phone,
          salonName: values.companyName,
          salonAddress: values.salonAddress,
          password: values.password,
          confirmPassword: values.confirmPassword,
        });
        message.success("Company added successfully");
      }
      loadAdmins();
      setModalVisible(false);
      setSelectedAdmin(null);
      form.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = (record: any) => {
    confirm({
      title: "Delete Company",
      content: `Are you sure you want to delete ${record.owner}?`,
      async onOk() {
        try {
          await axios.delete(`${API_URL}/${record.id}`);
          message.success("Company deleted successfully");
          loadAdmins();
        } catch (error) {
          message.error("Failed to delete company");
        }
      },
    });
  };

  const filteredAdmins = admins.filter(
    (admin: any) =>
      admin.companyName?.toLowerCase().includes(searchText.toLowerCase()) ||
      admin.owner?.toLowerCase().includes(searchText.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchText.toLowerCase()) ||
      admin.phone?.toLowerCase().includes(searchText.toLowerCase())
  );
  const getStatusStyle = (status: string) => {
    return {
      color: status === "active" ? "#52c41a" : "#ff4d4f",
      fontWeight: 500,
    };
  };

  const columns = [
    {
      title: "Company Name",
      dataIndex: "companyName",
      render: (text: string, record: any) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-gray-500 text-sm">Owner: {record.owner}</div>
        </div>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Phone",
      dataIndex: "phone",
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => (
        <span style={getStatusStyle(status)}>
          {status === "active" ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Companies Management</h1>
          <p className="text-gray-600">Manage all salon companies</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setSelectedAdmin(null);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          Add Company
        </Button>
      </div>

      <Card className="mb-6">
        <Input
          placeholder="Search company"
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </Card>

      <Card>
        <p className="p-2">All Companies Data</p>
        <DataTable
          data={filteredAdmins}
          columns={columns}
          loading={loading}
          onEdit={(record: any) => {
            setSelectedAdmin(record);
            form.setFieldsValue({
              companyName: record.companyName,
              owner: record.owner,
              email: record.email,
              phone: record.phone,
              salonAddress: record.salonAddress,
              status: record.status,
            });
            setModalVisible(true);
          }}
          onDelete={handleDelete}
          showActions={true}
          rowKey="key"
        />
      </Card>

      <Modals
        form={form}
        open={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedAdmin(null);
          form.resetFields();
        }}
        title={
          <div className="flex items-center gap-2">
            <ShopOutlined />
            {selectedAdmin ? "Edit Company" : "Add Company"}
          </div>
        }
        onSubmit={handleFormSubmit}
        submitText={selectedAdmin ? "Update Company" : "Add Company"}
        width={500}
      >
        <InputField
          label="Company Name"
          name="companyName"
          placeholder="Enter company name"
          required={true}
          prefix={<ShopOutlined />}
        />
        <InputField
          label="Owner Name"
          name="owner"
          placeholder="Enter owner name"
          required={true}
          prefix={<UserOutlined />}
        />
        <InputField
          label="Email"
          name="email"
          type="email"
          placeholder="Enter email"
          required={true}
          prefix={<MailOutlined />}
        />
        <InputField
          label="Phone"
          name="phone"
          placeholder="Enter phone number"
          required={true}
          prefix={<PhoneOutlined />}
        />
        <InputField
          label="Salon Address"
          name="salonAddress"
          placeholder="Enter salon address"
          required={true}
          prefix={<EnvironmentOutlined />}
        />
        
        {selectedAdmin && (
          <SelectField
            label="Status"
            name="status"
            required={true}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        )}

        {!selectedAdmin && (
          <>
            <InputField
              label="Password"
              name="password"
              type="password"
              placeholder="Enter password"
              required={true}
              prefix={<LockOutlined />}
            />
            <InputField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm password"
              required={true}
              prefix={<LockOutlined />}
            />
          </>
        )}
      </Modals>
    </div>
  );
};

export default Compani;