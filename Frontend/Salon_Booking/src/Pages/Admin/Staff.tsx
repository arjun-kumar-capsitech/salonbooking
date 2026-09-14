import { Card, Button, Form, message, Spin } from "antd";
import { PlusOutlined, MailOutlined } from "@ant-design/icons";
import { Scissors } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "../../Components/Ui/Table";
import { InputField, SelectField } from "../../Components/Ui/Forms";
import ModalForm from "../../Components/Ui/Modals";
import SearchInput from "../../Components/Ui/SearchInput";
import { getSalonBookingAPI, type Staff, type StaffDto, type StaffApiResponse, type StaffPaginationDtoApiResponse } from "../../api/generated";
import { useSearch } from "../../utils/FilterData";
import FormError, { validateField } from "../../Components/Ui/FormError";
import type { StaffFormValues, FieldErrors, StaffRow, StaffListResult } from "../../Types/Alltypes";
const { getApiStaff, postApiStaff, putApiStaffId, deleteApiStaffId, postApiUserRegisterEmployee } = getSalonBookingAPI();

const StaffManagement = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);
  const [form] = Form.useForm<StaffFormValues>();
  const [statusFilter, setStatusFilter] = useState("all");
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({ name: "", email: "", password: "" });
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.Role ?? user?.role;
  const userSalonName = user?.SalonName ?? user?.salonName;
  const isSuperAdmin = userRole === "SuperAdmin" || userRole === 1;
  const isAdmin = userRole === "Admin" || userRole === 2;
  const isCustomer = userRole === "Customer" || userRole === 4;
  const axiosConfig = { withCredentials: true };

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
    setEditingStaff(null);
    setSubmitted(false);
    setFieldErrors({ name: "", email: "", password: "" });
    form.resetFields();
  };

  const { data: infiniteData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching, }
    = useInfiniteQuery<StaffListResult>({
      queryKey: ["staff"],
      initialPageParam: 1,
      queryFn: async ({ pageParam }) => {
        try {
          const response = await getApiStaff({ page: pageParam as number, pageSize: 4 }, axiosConfig);
          const parsedData = parseResponse<StaffPaginationDtoApiResponse>(response.data);
          if (!parsedData?.status || !parsedData.result) {
            return {
              data: [],
              totalCount: 0,
              hasNextPage: false,
              nextPage: (pageParam as number) + 1,
            };
          }

          const result = parsedData.result;
          const rawStaff: Staff[] = result.data ?? [];
          const totalCount = result.totalCount ?? 0;
          const backendHasNextPage = result.hasNextPage ?? false;

          let filteredRawStaff = rawStaff;
          if (isCustomer) {
            filteredRawStaff = [];
          }
          if (isAdmin && !isSuperAdmin && userSalonName) {
            filteredRawStaff = filteredRawStaff.filter((staff: Staff) => {
              return staff.salonName === userSalonName;
            });
          }
          const transformedStaff: StaffRow[] = filteredRawStaff.map((staff: Staff, index: number) => ({
            key: String(staff.id ?? `${pageParam}-${index}`),
            id: staff.id ?? undefined,
            name: staff.name ?? "Unknown",
            email: staff.email ?? "No Email",
            role: staff.role ?? "Employee",
            status: staff.isActive ? "active" : "inactive",
            joined: staff.joinedDate ?? new Date().toISOString(),
            salonName: staff.salonName ?? "Unknown",
          }));
          return {
            data: transformedStaff,
            totalCount,
            hasNextPage: backendHasNextPage,
            nextPage: (pageParam as number) + 1,
          };
        } catch {
          return {
            data: [],
            totalCount: 0,
            hasNextPage: false,
            nextPage: (pageParam as number) + 1,
          };
        }
      },
      getNextPageParam: (lastPage) => {
        return lastPage.hasNextPage ? lastPage.nextPage : undefined;
      },
    });

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allStaff = useMemo<StaffRow[]>(() => {
    return infiniteData?.pages.flatMap((page) => page.data) ?? [];
  }, [infiniteData]);
  const { searchText, setSearchText, filteredData: searchFilteredData }
   = useSearch<StaffRow>(allStaff, ["name", "email"], 500);
  const filteredStaff = useMemo(() => {
    const result = searchFilteredData ?? [];
    if (statusFilter === "all") {
      return result;
    }
    return result.filter((staff) => staff.status === statusFilter);
  }, [searchFilteredData, statusFilter]);

  const addStaffMutation = useMutation({
    mutationFn: async (payload: StaffDto) => {
      const staffResponse = await postApiStaff(payload, axiosConfig);
      const parsedData = parseResponse<StaffApiResponse>(staffResponse.data);
      const result = parsedData?.result;
      const staffId = result?.id ?? undefined;
      if (staffId) {
        await postApiUserRegisterEmployee({ staffId }, axiosConfig);
      }
      return { success: true, staffId };
    },
    onSuccess: () => {
      message.success("Staff added successfully");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      resetModal();
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      };

      const backendMessage = axiosError.response?.data?.message ?? "";
      const normalizedMessage = backendMessage.toLowerCase();

      if (normalizedMessage.includes("exist") || normalizedMessage.includes("already")) {
        setFieldErrors((prev) => ({
          ...prev,
          email: "Email already exists",
        }));
        setSubmitted(true);
        message.error("Email already exists! Please use a different email.");
        return;
      }
      message.error(backendMessage || "Something went wrong");
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: StaffDto }) => {
      await putApiStaffId(id, payload, axiosConfig);
    },
    onSuccess: () => {
      message.success("Staff updated successfully");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      resetModal();
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      };

      const backendMessage = axiosError.response?.data?.message ?? "";
      const normalizedMessage = backendMessage.toLowerCase();
      if (normalizedMessage.includes("exist") || normalizedMessage.includes("already")) {
        setFieldErrors((prev) => ({
          ...prev,
          email: "Email already exists",
        }));
        setSubmitted(true);
        message.error("Email already exists! Please use a different email.");
        return;
      }
      message.error(backendMessage || "Failed to update staff");
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteApiStaffId(id, axiosConfig);
    },
    onSuccess: () => {
      message.success("Staff deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      };
      message.error(axiosError.response?.data?.message || "Failed to delete staff");
    },
  });

  const handleFormSubmit = (values: StaffFormValues) => {
    setSubmitted(true);
    const isEdit = Boolean(editingStaff);
    const errors: FieldErrors = {
      name: validateField("name", values.name),
      email: validateField("email", values.email),
      password: validateField("password", values.Password, isEdit),
    };
    setFieldErrors(errors);

    if (Object.values(errors).some(Boolean)) {
      return;
    }

    const payload: StaffDto = {
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.Password || undefined,
      role: values.role || "Employee",
      isActive: values.status === "active",
      salonName: userSalonName,
    };

    if (editingStaff?.id) {
      updateStaffMutation.mutate({
        id: editingStaff.id,
        payload,
      });
      return;
    }
    addStaffMutation.mutate(payload);
  };

  const handleAdd = () => {
    setEditingStaff(null);
    setSubmitted(false);
    setFieldErrors({ name: "", email: "", password: "" });
    form.resetFields();
    form.setFieldsValue({
      role: "Employee",
      status: "active",
    });

    setModalVisible(true);
  };

  const handleEdit = (record: StaffRow) => {
    setEditingStaff(record);
    setSubmitted(false);
    setFieldErrors({ name: "", email: "", password: "" });
    form.resetFields();
    form.setFieldsValue({
      name: record.name,
      email: record.email,
      role: record.role,
      status: record.status,
      Password: undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = (record: StaffRow) => {
    if (isCustomer || !record.id) return;
    deleteStaffMutation.mutate(record.id);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "PT Serif, serif" }}>
            {isCustomer ? "Our Staff" : "Staff Management"}
          </h1>
          <p className="text-gray-600" style={{ fontFamily: "Public Sans, sans-serif" }}>
            {isCustomer ? "Meet our professional staff" : "Manage salon staff"}
          </p>
        </div>
        {!isCustomer && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Staff
          </Button>
        )}
      </div>
      <Card className="mb-6">
        <SearchInput searchText={searchText} onSearchChange={setSearchText} status={statusFilter}
         onStatusChange={setStatusFilter} placeholder="Search staff..." width={300} />
      </Card>
      <Card>
        <div className="mb-4 flex justify-between items-center">
          <div className="p-2 flex items-center gap-2">
            <span>All Staff Data</span>
            {isFetching && !isFetchingNextPage && <Spin size="small" />}
          </div>
        </div>
        <DataTable data={filteredStaff} tableType="staff" loading={isLoading} onEdit={!isCustomer ? 
        handleEdit : undefined} onDelete={!isCustomer ?  handleDelete : undefined} showActions={!isCustomer} rowKey="key" />
        
        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="text-center py-4">
              <Spin size="large" />
              <div className="mt-2 text-gray-500">
                Loading more staff...
              </div>
            </div>
          )}
          {!hasNextPage && filteredStaff.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              No staff members found
            </div>
          )}
        </div>
      </Card>
      {!isCustomer && (
        <ModalForm
          form={form}
          open={modalVisible}
          onClose={resetModal}
          title={
            <div className="flex items-center gap-2">
              <Scissors size={20} />
              {editingStaff ? "Edit Staff" : "Add Staff"}
            </div>
          }
          initialValues={{
            role: editingStaff?.role ?? "Employee",
            status: editingStaff?.status ?? "active",
          }}
          onSubmit={handleFormSubmit}
          submitText={editingStaff ? "Update Staff" : "Add Staff"}
          loading={addStaffMutation.isPending || updateStaffMutation.isPending}
        >
          <div className="mb-4">
            <InputField label="Full Name" name="name" required placeholder="Enter full name" />
            {submitted && <FormError message={fieldErrors.name} />}
          </div>
          <div className="mb-4">
            <InputField label="Email" name="email" type="email" prefix={<MailOutlined />}
             required placeholder="Enter email address" /> {submitted && <FormError message={fieldErrors.email} />}
          </div>
          <div className="mb-4">
            <InputField label="Password" name="Password" type="password" required={!editingStaff}
             placeholder={editingStaff ? "Leave blank to keep current password" : "Enter password"} /> {submitted && <FormError message={fieldErrors.password} />}
          </div>
          <div className="mb-4">
            <SelectField label="Role" name="role" required options={[{ value: "Employee", label: "Employee" }]} />
          </div>
          <div className="mb-2">
            <SelectField
              label="Status"
              name="status"
              required
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </div>
        </ModalForm>
      )}
    </div>
  );
};
export default StaffManagement;