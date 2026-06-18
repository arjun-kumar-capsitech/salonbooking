import { useState, useMemo, useEffect, useRef } from "react";
import { Button, Input, message, Modal, Card, Form, Spin } from "antd";
import { SearchOutlined, PlusOutlined, ShopOutlined, UserOutlined, EnvironmentOutlined, LockOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { showSuperAdminCompani } from "../../Redux/Store/Slice/columnsSlice";
import Modals from "../../Components/Ui/Modals";
import { InputField, SelectField } from "../../Components/Ui/Forms";
import { DataTable } from "../../Components/Ui/Table";
import { getSalonBookingAPI } from '../../api/generated';

const { getAllUsers: getApiUser,  updateUser: putApiUserId,  registerAdmin: postApiUserRegisterAdmin,  deleteUser: deleteApiUserId} = getSalonBookingAPI();
const { confirm } = Modal;
const Compani = () => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [searchText, setSearchText] = useState("");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const token = localStorage.getItem("authToken");
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
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

  dispatch(showSuperAdminCompani());
  const {data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: loading,} = useInfiniteQuery({
    queryKey: ['superAdminCompanies'], staleTime: 5000, refetchOnWindowFocus: false, refetchOnMount: false,
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getApiUser({ page: pageParam, pageSize:4 }, axiosConfig);
      const parsedData = ResponseData(response);
      
      if (!parsedData?.status || !parsedData?.result) {
        return {
          data: [],
          totalCount: 0,
          hasNextPage: false,
          nextPage: pageParam + 1
        };
      }

      let rawUsers = [];
      let pagination = null;
      const result = parsedData.result;
      
      if (Array.isArray(result)) {
        rawUsers = result;
        pagination = parsedData.pagination || null;
      } else if (result?.data && Array.isArray(result.data)) {
        rawUsers = result.data;
        pagination = result.pagination || parsedData.pagination || null;
      } else {
        rawUsers = [];
      }
      const adminUsers = rawUsers.filter((u: any) => {
        const role = u.role || u.Role;
        return role === 2;
      });
      const transformedCompanies = adminUsers.map((u: any, index: number) => ({
        key: u.id || u._id || `${pageParam}-${index}`,
        id: u.id || u._id,
        companyName: u.salonName || u.SalonName || 'N/A',
        owner: u.fullName || u.FullName || 'N/A',
        email: u.email || u.Email || 'N/A',
        phone: u.phoneNumber || u.PhoneNumber || 'N/A',
        status: u.isActive ? "active" : "inactive",
        salonAddress: u.salonAddress || u.SalonAddress || 'N/A',
      }));
      const totalCount = adminUsers.length;     
      const hasNext = pagination?.hasNextPage || false;

      return {
        data: transformedCompanies,
        totalCount: totalCount,
        hasNextPage: hasNext,
        nextPage: pageParam + 1,
      };
    },
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextPage : undefined,
  });

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
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
        observerRef.current = null;
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allCompanies = useMemo(() => {
    return infiniteData?.pages?.flatMap(page => page.data) || [];
  }, [infiniteData]);

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

  const filteredCompanies = useMemo(() => {
    if (!searchText) return allCompanies;
    return allCompanies.filter((admin: any) =>
      admin.companyName?.toLowerCase().includes(searchText.toLowerCase()) ||
      admin.owner?.toLowerCase().includes(searchText.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchText.toLowerCase()) ||
      admin.phone?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [allCompanies, searchText]);

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

  const isLoading = (loading && !infiniteData) || createCompanyMutation.isPending || updateCompanyMutation.isPending;

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
        <div className="flex gap-4">
          <Input 
            placeholder="Search company by name, owner, email or phone" 
            prefix={<SearchOutlined />} 
            style={{ width: 400 }} 
            value={searchText} 
            onChange={(e) => setSearchText(e.target.value)} 
            allowClear
          />
        </div>
      </Card>

      <Card>
        <div className="p-2 font-medium mb-4"> 
          All Companies Data
        </div>
        <DataTable 
          data={filteredCompanies} 
          columns={columns} 
          loading={isLoading} 
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
        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="text-center py-4">
              <Spin size="large" />
              <p className="mt-2 text-gray-500">Loading more companies...</p>
            </div>
          )}
          {!hasNextPage && allCompanies.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              No companies found
            </div>
          )}
        </div>
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
        loading={createCompanyMutation.isPending || updateCompanyMutation.isPending} 
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
              { value: "inactive", label: "Inactive" }
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