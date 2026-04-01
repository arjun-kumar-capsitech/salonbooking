import { useEffect, useState } from 'react';
import { Button, Input, message, Modal } from 'antd';
import { SearchOutlined, PlusOutlined, ShopOutlined, UserOutlined, MailOutlined, PhoneOutlined, EnvironmentOutlined, LockOutlined } from '@ant-design/icons';
import Modals from '../../Components/Ui/Modals';
import { InputField } from '../../Components/Ui/Forms';
import { DataTable } from '../../Components/Ui/Table';
import axios from 'axios';

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

const API_URL = 'http://localhost:5296/api/User';

const Compani = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [searchText, setSearchText] = useState('');
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL);
      const filtered = response.data.filter((u: any) => u.role === 2);
      setAdmins(filtered);
    } catch (error) {
      message.error('Failed to load admins');
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
          fullName: values.fullName,
          email: values.email,
          phoneNumber: values.phoneNumber,
          salonName: values.salonName,
          salonAddress: values.salonAddress,
          role: 2,
          isActive: true
        });
        message.success('Admin updated successfully');
      } else {
        await axios.post(`${API_URL}/register/admin`, {
          fullName: values.fullName,
          email: values.email,
          phoneNumber: values.phoneNumber,
          salonName: values.salonName,
          salonAddress: values.salonAddress,
          password: values.password,
          confirmPassword: values.confirmPassword
        });
        message.success('Admin registered successfully');
      }
      loadAdmins();
      setModalVisible(false);
      setSelectedAdmin(null);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = (record: Admin) => {
    confirm({
      title: 'Delete Admin',
      content: `Are you sure you want to delete ${record.fullName}?`,
      async onOk() {
        try {
          await axios.delete(`${API_URL}/${record.id}`);
          message.success('Admin deleted successfully');
          loadAdmins();
        } catch (error) {
          message.error('Failed to delete admin');
        }
      }
    });
  };

  const filteredAdmins = admins.filter(admin =>
    admin.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchText.toLowerCase()) ||
    admin.salonName?.toLowerCase().includes(searchText.toLowerCase()) ||
    admin.salonAddress?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Salon Name',
      dataIndex: 'salonName',
      render: (name: string, record: Admin) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <ShopOutlined className="text-blue-600" />
          </div>
          <div>
            <div className="font-medium">{name || '-'}</div>
            {record.salonAddress && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <EnvironmentOutlined className="text-gray-400" />
                {record.salonAddress}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Owner Name',
      dataIndex: 'fullName',
      render: (fullName: string) => (
        <div className="flex items-center">
          <UserOutlined className="text-gray-400 mr-2" />
          <span className="font-medium">{fullName}</span>
        </div>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      render: (email: string) => (
        <div className="flex items-center">
          <MailOutlined className="text-gray-400 mr-2" />
          <span>{email}</span>
        </div>
      )
    },
    {
      title: 'Phone',
      dataIndex: 'phoneNumber',
      render: (phone: string) => (
        <div className="flex items-center">
          <PhoneOutlined className="text-gray-400 mr-2" />
          <span>{phone}</span>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Companis Management</h1>
          <p className="text-gray-600">Manage all salon Companis</p>

          <div className="flex justify-between items-center mb-6 gap-4 mt-10">
            <Input
              placeholder="Search by name, email, salon or address..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-64"
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedAdmin(null);
                setModalVisible(true);
              }}
            >
              Add Companis
            </Button>
          </div>
        </div>

        <DataTable
          data={filteredAdmins}
          columns={columns}
          loading={loading}
          onEdit={(record) => {
            setSelectedAdmin(record);
            setModalVisible(true);
          }}
          onDelete={handleDelete}
          showActions={true}
          rowKey="id"
        />

        <Modals
          open={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedAdmin(null);
          }}
          title={
            <div className="flex items-center gap-2">
              <ShopOutlined />
              {selectedAdmin ? 'Edit Companis' : 'Add New Companis'}
            </div>
          }
          onSubmit={handleFormSubmit}
          submitText={selectedAdmin ? 'Update Companis' : 'Add Companis'}
          width={500}
        >
          <InputField
            label="Owner Name"
            name="fullName"
            placeholder="Enter owner's name"
            required={true}
            prefix={<UserOutlined />}
          />

          <InputField
            label="Email"
            name="email"
            type="email"
            placeholder="owner@salon.com"
            required={true}
            prefix={<MailOutlined />}
          />

          <InputField
            label="Phone Number"
            name="phoneNumber"
            placeholder="+91 9876543210"
            required={true}
            prefix={<PhoneOutlined />}
          />

          <InputField
            label="Salon Name"
            name="salonName"
            placeholder="Enter salon name"
            required={true}
            prefix={<ShopOutlined />}
          />

          <InputField
            label="Salon Address"
            name="salonAddress"
            placeholder="Complete address with city and pincode"
            required={true}
            prefix={<EnvironmentOutlined />}
          />

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
    </>
  );
};

export default Compani;