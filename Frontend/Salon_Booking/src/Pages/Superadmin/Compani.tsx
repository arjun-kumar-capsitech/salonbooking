import { Card, Button, Form, message, Spin } from "antd";
import { PlusOutlined, ShopOutlined, UserOutlined, EnvironmentOutlined, LockOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
import { useState, useMemo, useEffect, useRef } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { showSuperAdminCompani } from "../../Redux/Store/Slice/columnsSlice";
import { DataTable } from "../../Components/Ui/Table";
import { InputField, SelectField } from "../../Components/Ui/Forms";
import ModalForm from "../../Components/Ui/Modals";
import SearchInput from "../../Components/Ui/SearchInput";
import FormError, { validateField } from "../../Components/Ui/FormError";
import { getSalonBookingAPI, type User } from "../../api/generated";
import { useSearch } from "../../utils/FilterData";
import type { CompanyFormValues, CompanyListResult, CompanyRow, FieldErrors,  } from "../../Types/Alltypes";

const { getApiUser, putApiUserId, postApiUserRegisterAdmin, deleteApiUserId } = getSalonBookingAPI();

const Compani = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CompanyFormValues>();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<CompanyRow | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({ name: "", email: "", password: "" });
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const axiosConfig = { withCredentials: true };

  useEffect(() => {
    dispatch(showSuperAdminCompani());
  }, [dispatch]);

  const parseResponse = <T,>(data: unknown): T | null => {
    if (!data) return null;
    if (typeof data === "string") {
      try {
        return JSON.parse(data) as T;
      } catch {
        return null;
      }
    }
    return data as T;
  };

  const resetModal = () => {
    setModalVisible(false);
    setSelectedAdmin(null);
    setSubmitted(false);
    setFieldErrors({ name: "", email: "", password: "" });
    form.resetFields();
  };

  const { data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching } =
   useInfiniteQuery<CompanyListResult>({
    queryKey: ["superAdminCompanies"],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      try {
        const response = await getApiUser({ page: Number(pageParam), pageSize: 4 }, axiosConfig);
        const parsedData = parseResponse<{
          status?: boolean;
          result?: {
            data?: User[] | null;
            totalCount?: number;
            hasNextPage?: boolean;
          };
        }>(response.data);

        if (!parsedData?.status || !parsedData.result) {
          return { data: [], totalCount: 0, hasNextPage: false, nextPage: Number(pageParam) + 1 };
        }

        const admins = (parsedData.result.data ?? []).filter((user) => Number(user.role) === 2);

        const companies: CompanyRow[] = admins.map((user, index) => ({
          key: String(user.id ?? `${pageParam}-${index}`),
          id: String(user.id ?? ""),
          salonName: user.salonName ?? "N/A",
          owner: user.fullName ?? user.name ?? "N/A",
          email: user.email ?? "N/A",
          phone: user.phoneNumber ?? "N/A",
          status: user.isActive ? "active" : "inactive",
          salonAddress: user.salonAddress ?? "N/A",
        }));

        return {
          data: companies,
          totalCount: parsedData.result.totalCount ?? companies.length,
          hasNextPage: parsedData.result.hasNextPage ?? false,
          nextPage: Number(pageParam) + 1,
        };
      } catch {
        return { data: [], totalCount: 0, hasNextPage: false, nextPage: Number(pageParam) + 1 };
      }
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

  const allCompanies = useMemo<CompanyRow[]>(() => infiniteData?.pages.flatMap((page) => page.data) ?? [], [infiniteData]);

  const { searchText, setSearchText, filteredData: searchFilteredData } = useSearch<CompanyRow>
  (allCompanies, ["salonName", "owner", "email", "phone"], 500);

  const filteredCompanies = useMemo(() => searchFilteredData ?? [], [searchFilteredData]);
  const totalCount = infiniteData?.pages[0]?.totalCount ?? 0;

  const createCompanyMutation = useMutation({
    mutationFn: async (values: CompanyFormValues) => {
      const response = await postApiUserRegisterAdmin({
        fullName: values.owner.trim(),
        email: values.email.trim(),
        phoneNumber: values.phone.trim(),
        salonName: values.salonName.trim(),
        salonAddress: values.salonAddress.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
      }, axiosConfig);
      return response;
    },
    onSuccess: () => {
      message.success("Company added successfully");
      queryClient.invalidateQueries({ queryKey: ["superAdminCompanies"] });
      resetModal();
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { message?: string } } };
      message.error(axiosError.response?.data?.message ?? "Failed to add company");
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CompanyFormValues }) => {
      return putApiUserId(id, {
        fullName: values.owner.trim(),
        email: values.email.trim(),
        phoneNumber: values.phone.trim(),
        salonName: values.salonName.trim(),
        salonAddress: values.salonAddress.trim(),
        role: 2,
        isActive: values.status === "active",
      }, axiosConfig);
    },
    onSuccess: () => {
      message.success("Company updated successfully");
      queryClient.invalidateQueries({ queryKey: ["superAdminCompanies"] });
      resetModal();
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { message?: string } } };
      message.error(axiosError.response?.data?.message ?? "Failed to update company");
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteApiUserId(id, axiosConfig);
    },
    onSuccess: () => {
      message.success("Company deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["superAdminCompanies"] });
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { message?: string } } };
      message.error(axiosError.response?.data?.message ?? "Failed to delete company");
    },
  });

  const handleFormSubmit = (values: CompanyFormValues) => {
    setSubmitted(true);

    const errors: FieldErrors = {
      name: validateField("name", values.owner),
      email: validateField("email", values.email),
      password: validateField("password", values.password, Boolean(selectedAdmin)),
    };

    setFieldErrors(errors);

    if (Object.values(errors).some(Boolean)) return;

    if (!selectedAdmin && values.confirmPassword !== values.password) {
      message.error("Passwords do not match");
      return;
    }

    if (selectedAdmin?.id) {
      updateCompanyMutation.mutate({ id: selectedAdmin.id, values });
      return;
    }

    createCompanyMutation.mutate(values);
  };

  const handleAdd = () => {
    setSelectedAdmin(null);
    setSubmitted(false);
    setFieldErrors({ name: "", email: "", password: "" });
    form.resetFields();
    form.setFieldsValue({ status: "active" });
    setModalVisible(true);
  };

  const handleEdit = (record: CompanyRow) => {
    setSelectedAdmin(record);
    setSubmitted(false);
    setFieldErrors({ name: "", email: "", password: "" });
    form.resetFields();
    form.setFieldsValue({
      salonName: record.salonName,
      owner: record.owner,
      email: record.email,
      phone: record.phone,
      salonAddress: record.salonAddress,
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleDelete = (record: CompanyRow) => {
    if (!record.id) return;
    deleteCompanyMutation.mutate(record.id);
  };

  const loading = isLoading || createCompanyMutation.isPending || updateCompanyMutation.isPending;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "PT Serif, serif" }}>Companies Management</h1>
          <p className="text-gray-600" style={{ fontFamily: "Public Sans, sans-serif" }}>Manage all salon companies</p>
          {totalCount > 0 && <p className="text-sm text-gray-500 mt-1">Showing {filteredCompanies.length} of {totalCount} companies</p>}
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add Company</Button>
      </div>

      <Card className="mb-6">
        <SearchInput searchText={searchText} onSearchChange={setSearchText} 
        placeholder="Search company, owner, email or phone..." width={400} />
      </Card>

      <Card>
        <div className="mb-4 flex justify-between items-center">
          <div className="p-2 flex items-center gap-2">
            <span>All Companies Data</span>
            {isFetching && !isFetchingNextPage && <Spin size="small" />}
          </div>
        </div>

        <DataTable data={filteredCompanies} tableType="companies" loading={loading} 
        onEdit={handleEdit} onDelete={handleDelete} showActions rowKey="key" />

        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="text-center py-4">
              <Spin size="large" />
              <p className="mt-2 text-gray-500">Loading more companies...</p>
            </div>
          )}

          {!hasNextPage && filteredCompanies.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">No companies found</div>
          )}
        </div>
      </Card>

      <ModalForm
        form={form}
        open={modalVisible}
        onClose={resetModal}
        title={
          <div className="flex items-center gap-2">
            <ShopOutlined />
            {selectedAdmin ? "Edit Company" : "Add Company"}
          </div>
        }
        initialValues={{ status: selectedAdmin?.status ?? "active" }}
        onSubmit={handleFormSubmit}
        submitText={selectedAdmin ? "Update Company" : "Add Company"}
        loading={createCompanyMutation.isPending || updateCompanyMutation.isPending}
        width={500}
      >
        <div className="mb-4">
          <InputField label="Company Name" name="salonName" placeholder="Enter company name" 
          required prefix={<ShopOutlined />} />
        </div>
        <div className="mb-4">
          <InputField label="Owner Name" name="owner" placeholder="Enter owner name" 
          required prefix={<UserOutlined />} />
          {submitted && <FormError message={fieldErrors.name} />}
        </div>
        <div className="mb-4">
          <InputField label="Email" name="email" type="email" placeholder="Enter email" 
          required prefix={<MailOutlined />} />
          {submitted && <FormError message={fieldErrors.email} />}
        </div>
        <div className="mb-4">
          <InputField label="Phone" name="phone" placeholder="Enter phone number" 
          required prefix={<PhoneOutlined />} />
        </div>
        <div className="mb-4">
          <InputField label="Salon Address" name="salonAddress" placeholder="Enter salon address"
           required prefix={<EnvironmentOutlined />} />
        </div>

        {!selectedAdmin && (
          <>
            <div className="mb-4">
              <InputField label="Password" name="password" type="password" placeholder="Enter password"
               required prefix={<LockOutlined />} />
              {submitted && <FormError message={fieldErrors.password} />}
            </div>
            <div className="mb-4">
              <InputField label="Confirm Password" name="confirmPassword" type="password" 
              placeholder="Confirm password" required prefix={<LockOutlined />} />
            </div>
          </>
        )}

        {selectedAdmin && (
          <SelectField label="Status" name="status" required options={[{ value: "active", label: "Active" }, 
            { value: "inactive", label: "Inactive" }]} />
        )}
      </ModalForm>
    </div>
  );
};
export default Compani;