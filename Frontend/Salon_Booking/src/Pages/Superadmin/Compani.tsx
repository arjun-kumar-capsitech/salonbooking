import { useState, useMemo } from "react";
import { Button, Input, message, Modal, Card, Form } from "antd";
import { SearchOutlined, PlusOutlined, ShopOutlined, UserOutlined, EnvironmentOutlined, LockOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { showSuperAdminCompani } from "../../Redux/Store/Slice/columnsSlice";
import Modals from "../../Components/Ui/Modals";
import { InputField, SelectField } from "../../Components/Ui/Forms";
import { DataTable } from "../../Components/Ui/Table";
import { getSalonBookingAPI } from '../../api/generated';

const { getApiUser, putApiUserId, postApiUserRegisterAdmin, deleteApiUserId } = getSalonBookingAPI();
const { confirm } = Modal;

const Compani = () => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [searchText, setSearchText] = useState("");
  const queryClient = useQueryClient();
  const token = localStorage.getItem("authToken");
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const extractData = (response: any) => {
    if (!response || !response.data) return [];
    if (response.data?.status === true && response.data?.result) return response.data.result;
    if (response.data?.result) return response.data.result;
    if (Array.isArray(response.data)) return response.data;
    return [];
  };

  dispatch(showSuperAdminCompani());

  const { data: admins = [], isLoading: loading,} = useQuery({
    queryKey: ['superAdminCompanies'],
    enabled: !!token,staleTime: 5000,refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await getApiUser(axiosConfig);
      const usersData = extractData(response);
      return usersData.filter((u: any) => u.role === 2).map((u: any, index: number) => ({
        key: u.id || u._id || index,
        id: u.id || u._id,
        companyName: u.salonName || u.SalonName,
        owner: u.fullName || u.FullName,
        email: u.email || u.Email,
        phone: u.phoneNumber || u.PhoneNumber,
        status: u.isActive ? "active" : "inactive",
        salonAddress: u.salonAddress || u.SalonAddress,
      }));
    }
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (values: any) => {
      return await postApiUserRegisterAdmin({
        fullName: values.owner,
        email: values.email,
        phoneNumber: values.phone,
        salonName: values.companyName,
        salonAddress: values.salonAddress,
        password: values.password,
        confirmPassword: values.confirmPassword,
      }, axiosConfig);
    },
    onSuccess: () => {
      message.success("Company added successfully");
      queryClient.invalidateQueries({ queryKey: ['superAdminCompanies'] });
      setModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || "Operation failed");
    }
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: any }) => {
      return await putApiUserId(id, {
        fullName: values.owner,
        email: values.email,
        phoneNumber: values.phone,
        salonName: values.companyName,
        salonAddress: values.salonAddress,
        role: 2,
        isActive: values.status === "active",
      }, axiosConfig);
    },
    onSuccess: () => {
      message.success("Company updated successfully");
      queryClient.invalidateQueries({ queryKey: ['superAdminCompanies'] });
      setModalVisible(false);
      setSelectedAdmin(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || "Operation failed");
    }
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteApiUserId(id, axiosConfig);
    },
    onSuccess: () => {
      message.success("Company deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['superAdminCompanies'] });
    },
    onError: () => {
      message.error("Failed to delete company");
    }
  });

  const handleFormSubmit = (values: any) => {
    if (selectedAdmin) {
      updateCompanyMutation.mutate({ id: selectedAdmin.id, values });
    } else {
      createCompanyMutation.mutate(values);
    }
  };

  const handleDelete = (record: any) => {
    confirm({
      title: "Delete Company",
      content: `Are you sure you want to delete ${record.owner}?`,
      onOk() {
        deleteCompanyMutation.mutate(record.id);
      },
    });
  };

  const filteredAdmins = useMemo(() => {
    return admins.filter((admin: any) =>
      admin.companyName?.toLowerCase().includes(searchText.toLowerCase()) ||
      admin.owner?.toLowerCase().includes(searchText.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchText.toLowerCase()) ||
      admin.phone?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [admins, searchText]);

  const getStatusStyle = (status: string) => ({
    color: status === "active" ? "#52c41a" : "#ff4d4f",
    fontWeight: 500,
  });

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
    { title: "Email", dataIndex: "email" },
    { title: "Phone", dataIndex: "phone" },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => <span style={getStatusStyle(status)}>{status === "active" ? "Active" : "Inactive"}</span>,
    },
  ];

  const isLoading = loading || createCompanyMutation.isPending || updateCompanyMutation.isPending;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Companies Management</h1>
          <p className="text-gray-600">Manage all salon companies</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setSelectedAdmin(null); form.resetFields(); setModalVisible(true); }}>
          Add Company
        </Button>
      </div>

      <Card className="mb-6">
        <Input placeholder="Search company" prefix={<SearchOutlined />} style={{ width: 300 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
      </Card>

      <Card>
        <p className="p-2">All Companies Data</p>
        <DataTable data={filteredAdmins} columns={columns} loading={isLoading} onEdit={(record: any) => {
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
        }} onDelete={handleDelete} showActions={true} rowKey="key" />
      </Card>

      <Modals form={form} open={modalVisible} onClose={() => { setModalVisible(false); setSelectedAdmin(null); form.resetFields(); }}
        title={<div className="flex items-center gap-2"><ShopOutlined />{selectedAdmin ? "Edit Company" : "Add Company"}</div>}
        onSubmit={handleFormSubmit} submitText={selectedAdmin ? "Update Company" : "Add Company"}
        loading={createCompanyMutation.isPending || updateCompanyMutation.isPending} width={500}>
        <InputField label="Company Name" name="companyName" placeholder="Enter company name" required={true} prefix={<ShopOutlined />} />
        <InputField label="Owner Name" name="owner" placeholder="Enter owner name" required={true} prefix={<UserOutlined />} />
        <InputField label="Email" name="email" type="email" placeholder="Enter email" required={true} prefix={<MailOutlined />} />
        <InputField label="Phone" name="phone" placeholder="Enter phone number" required={true} prefix={<PhoneOutlined />} />
        <InputField label="Salon Address" name="salonAddress" placeholder="Enter salon address" required={true} prefix={<EnvironmentOutlined />} />
        {selectedAdmin && <SelectField label="Status" name="status" required={true} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />}
        {!selectedAdmin && (<><InputField label="Password" name="password" type="password" placeholder="Enter password" required={true} prefix={<LockOutlined />} />
        <InputField label="Confirm Password" name="confirmPassword" type="password" placeholder="Confirm password" required={true} prefix={<LockOutlined />} /></>)}
      </Modals>
    </div>
  );
};
export default Compani;