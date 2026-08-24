import { Card, Button, Form, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Scissors } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSalonBookingAPI, type AdminServiceDto, type AdminServices } from "../../api/generated";
import { DataTable } from "../../Components/Ui/Table";
import { InputField, SelectField } from "../../Components/Ui/Forms";
import ModalForm from "../../Components/Ui/Modals";
import SearchInput from "../../Components/Ui/SearchInput";
import FormError, { validateField } from "../../Components/Ui/FormError";
import { useSearch } from "../../utils/FilterData";
import type { ServiceRow, ServiceFormValues} from "../../Types/Alltypes";
const { getApiAdminServices, postApiAdminServices, putApiAdminServicesId, deleteApiAdminServicesId } = getSalonBookingAPI();

const Service = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRow | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ serviceName: "", price: "", duration: "" });
  const [form] = Form.useForm<ServiceFormValues>();
  const queryClient = useQueryClient();
  const userStr = localStorage.getItem("user");
  const user: AdminServices & {role?: string | number; salonName?: string | null } = userStr ? JSON.parse(userStr) : {};
  const userRole = user.role;
  const userSalonName = user.salonName;
  const isAdmin = userRole === "Admin" || userRole === 2;
  const isSuperAdmin = userRole === "SuperAdmin" || userRole === 1;
  const isCustomer = userRole === "Customer" || userRole === 4;

  const resetModal = () => {
    setModalVisible(false);
    setEditingService(null);
    setSubmitted(false);
    setFieldErrors({ serviceName: "", price: "", duration: "" });
    form.resetFields();
  };

  const { data: services = [], isLoading } = useQuery<ServiceRow[]>({
    queryKey: ["service"],
    queryFn: async () => {
      const response = await getApiAdminServices();
      const responseData = response.data as {
        status?: boolean;
        result?: AdminServices[] | AdminServices;
      };
      if (!responseData?.status || !responseData.result) return [];
      let data = Array.isArray(responseData.result) ? responseData.result : [responseData.result];
      if (isCustomer) {
        data = data.filter((service) => service.isActive === true);
      }
      if (isAdmin && !isSuperAdmin && userSalonName) {
        data = data.filter((service) => service.salonName === userSalonName);
      }
      return data.map((service, index): ServiceRow => ({
        key: service.id ?? index.toString(),
        id: service.id,
        serviceName: service.serviceName ?? "",
        duration: service.duration ?? 0,
        price: service.price ?? 0,
        status: service.isActive ? "active" : "inactive",
        salonName: service.salonName ?? "All",
      }));
    },
  });

  const { searchText, setSearchText, filteredData } = useSearch<ServiceRow>(services, ["serviceName"], 500);
  const filteredServices = (filteredData ?? []).filter((service) => statusFilter === "all" || service.status === statusFilter);

  const addServiceMutation = useMutation({
    mutationFn: (payload: AdminServiceDto) => postApiAdminServices(payload),
    onSuccess: () => {
      message.success("Service added successfully");
      queryClient.invalidateQueries({ queryKey: ["service"] });
      resetModal();
    },
    onError: (error: unknown) => {
      const backendMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "";
      if (backendMessage.toLowerCase().includes("exist")) {
        setFieldErrors((prev) => ({ ...prev, serviceName: "Service name already exists" }));
      } else {
        message.error(backendMessage || "Something went wrong");
      }
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminServiceDto }) => putApiAdminServicesId(id, payload),
    onSuccess: () => {
      message.success("Service updated successfully");
      queryClient.invalidateQueries({ queryKey: ["service"] });
      resetModal();
    },
    onError: (error: unknown) => {
      const backendMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "";
      if (backendMessage.toLowerCase().includes("exist")) {
        setFieldErrors((prev) => ({ ...prev, serviceName: "Service name already exists" }));
      } else {
        message.error(backendMessage || "Something went wrong");
      }
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => deleteApiAdminServicesId(id),
    onSuccess: () => {
      message.success("Service deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["service"] });
    },
    onError: (error: unknown) => {
      const backendMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "";
      message.error(backendMessage || "Failed to delete service");
    },
  });

  const handleSubmit = (values: ServiceFormValues) => {
    setSubmitted(true);
    const errors = {
      serviceName: validateField("serviceName", values.serviceName),
      price: validateField("price", values.price),
      duration: validateField("duration", values.duration),
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    const payload: AdminServiceDto = {
      serviceName: values.serviceName.trim(),
      duration: Number(values.duration),
      price: Number(values.price),
      isActive: values.status === "active",
      salonName: isSuperAdmin ? values.salonName : userSalonName,
    };

    if (editingService?.id) {
      updateServiceMutation.mutate({ id: editingService.id, payload });
    } else {
      addServiceMutation.mutate(payload);
    }
  };

  const handleAdd = () => {
    setEditingService(null);
    setSubmitted(false);
    setFieldErrors({ serviceName: "", price: "", duration: "" });
    form.resetFields();
    form.setFieldsValue({ status: "active" });
    setModalVisible(true);
  };

  const handleEdit = (record: ServiceRow) => {
    setEditingService(record);
    setSubmitted(false);
    setFieldErrors({ serviceName: "", price: "", duration: "" });
    form.setFieldsValue({
      serviceName: record.serviceName,
      duration: record.duration,
      price: record.price,
      status: record.status,
      ...(isSuperAdmin && { salonName: record.salonName }),
    });

    setModalVisible(true);
  };

  const handleDelete = (record: ServiceRow) => {
    if (!record.id) return;
    deleteServiceMutation.mutate(record.id);
  };
  const loading = isLoading || addServiceMutation.isPending || updateServiceMutation.isPending || deleteServiceMutation.isPending;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "PT Serif, serif" }}>
            {isCustomer ? "Available Services" : "Service Management"}
          </h1>
          <p className="text-gray-600" style={{ fontFamily: "Public Sans, sans-serif" }}>
            {isCustomer ? "Browse our services" : "Manage salon services"}
          </p>
        </div>

        {!isCustomer && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Service
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <SearchInput searchText={searchText} onSearchChange={setSearchText} status={statusFilter}
          onStatusChange={setStatusFilter} placeholder="Search service..." width={300} />
      </Card>

      <Card>
        <p className="p-2 mb-4">
          {isCustomer ? "Available Services Data" : "All Services Data"}
        </p>

        <DataTable data={filteredServices} loading={loading} onEdit={!isCustomer
          ? handleEdit : undefined} onDelete={!isCustomer ? handleDelete : undefined}
          showActions={!isCustomer} rowKey="key" tableType="services" />
      </Card>

      {!isCustomer && (
        <ModalForm
          form={form}
          open={modalVisible}
          onClose={resetModal}
          title={
            <div className="flex items-center gap-2">
              <Scissors size={20} />
              {editingService ? "Edit Service" : "Add Service"}
            </div>
          }
          initialValues={editingService ?? { status: "active" }}
          onSubmit={handleSubmit}
          submitText={editingService ? "Update Service" : "Add Service"}
          loading={addServiceMutation.isPending || updateServiceMutation.isPending}
        >
          <InputField label="Service Name" name="serviceName" required placeholder="Enter service name" />
          {submitted && <FormError message={fieldErrors.serviceName} />}

          <InputField label="Duration (minutes)" name="duration " type="number"
            required placeholder="Enter duration in minutes" />
          {submitted && <FormError message={fieldErrors.duration} />}

          <InputField label="Price" name="price" type="number" required placeholder="Enter price" />
          {submitted && <FormError message={fieldErrors.price} />}

          {isSuperAdmin && (
            <InputField label="Salon Name" name="salonName" required placeholder="Enter salon name" />
          )}

          <SelectField
            label="Status"
            name="status"
            required
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </ModalForm>
      )}
    </div>
  );
};
export default Service;