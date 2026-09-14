import { Alert, Button, Card, Col, DatePicker, Form, Input, message, Row, Select, Spin, Tag } from "antd";
import { CalendarOutlined, ClockCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Scissors } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { getSalonBookingAPI, type AdminServices, type Booking, type BookingDto, type SlotRequestDto, type Staff, type User, type TimeDto } from "../../api/generated";
import { DataTable } from "../../Components/Ui/Table";
import { InputField, SelectField } from "../../Components/Ui/Forms";
import ModalForm from "../../Components/Ui/Modals";
import SearchInput from "../../Components/Ui/SearchInput";
import { useSearch } from "../../utils/FilterData";
import { connection, startSignalR } from "../../Services/signalR";
import { validateField } from "../../Components/Ui/FormError";
import type { Slot } from "../../Types/Alltypes";
const apiOptions = { withCredentials: true };

const parseResponse = <T,>(data: unknown): T | null => {
  if (typeof data !== "string") return data as T;
  try { return JSON.parse(data) as T; } catch { return null; }
};

const Bookings = () => {
  const api = getSalonBookingAPI();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [createForm] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>();
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [customerName, setCustomerName] = useState("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const user = useMemo<User | null>(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null") as User | null; }
    catch { return null; }
  }, []);
  const userId = user?.id;
  const userRole = user?.role;
  const salonName = user?.salonName;
  const isSuperAdmin = userRole === 1;
  const isAdmin = userRole === 2;
  const isCustomer = userRole === 4;

  useEffect(() => {
    void startSignalR();
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["availableSlots"] });
      void queryClient.invalidateQueries({ queryKey: ["staffBookings"] });
    };
    connection.on("SlotBooked", refresh);

    return () => connection.off("SlotBooked", refresh);
  }, [queryClient]);

  const { data: refs, isLoading: refsLoading } = useQuery({
    queryKey: ["referenceData"],
    queryFn: async () => {
      const [usersRes, staffRes, servicesRes, timeRes] = await Promise.all([
        api.getApiUser({ page: 1, pageSize: 1000 }, apiOptions),
        api.getApiStaff({ page: 1, pageSize: 1000 }, apiOptions),
        api.getApiAdminServices(apiOptions),
        api.getApiTime({}, apiOptions),
      ]);
      const users = parseResponse<{ result?: { data?: User[] } }>(usersRes.data)?.result?.data ?? [];
      const staff = parseResponse<{ result?: { data?: Staff[] } }>(staffRes.data)?.result?.data ?? [];
      const services = parseResponse<{ result?: AdminServices[] }>(servicesRes.data)?.result ?? [];
      const timeData = parseResponse<{ result?: TimeDto[] }>(timeRes.data)?.result ?? [];
      const customerMap: Record<string, User> = {};
      const staffMap: Record<string, Staff> = {};
      const serviceMap: Record<string, AdminServices> = {};
      const adminMap: Record<string, string> = {};
      const timeMap: Record<string, TimeDto> = {};

      users.forEach((item) => {
        const id = String(item.id ?? "");
        if ((item.role === 1 || item.role === 2) && item.salonName && id) {
          adminMap[item.salonName] = id;
        }
        if (item.role === 4 && id) {
          customerMap[id] = item;
        }
        if (item.role === 3 && item.employeeProfileId) {
          staffMap[String(item.employeeProfileId)] = {
            id: item.employeeProfileId,
            fullName: item.fullName ?? item.name ?? "",
            name: item.fullName ?? item.name ?? "",
            email: item.email,
            salonName: item.salonName,
            role: "Employee",
            isActive: item.isActive,
          };
        }
      });

      staff.forEach((item) => {
        if (item.id) {
          staffMap[String(item.id)] = item;
        }
      });
      services.forEach((item) => {
        if (item.id && item.isActive !== false) {
          serviceMap[String(item.id)] = item;
        }
      });
      timeData.forEach((item) => {
        if (item.userId && item.day) {
          timeMap[`${String(item.userId)}-${item.day}`] = item;
        }
      });
      return { customerMap, staffMap, serviceMap, adminMap, timeMap };
    },
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching } = useInfiniteQuery({
    queryKey: ["bookings", salonName, userRole],
    initialPageParam: 1,
    enabled: !!refs,
    queryFn: async ({ pageParam }) => {
      const response = await api.getApiBooking({ page: pageParam, pageSize: 10 }, apiOptions);
      const result = parseResponse<{ result?: { data?: Booking[]; totalCount?: number; hasNextPage?: boolean } }>(response.data)?.result;
      let bookings = result?.data ?? [];
      if (isAdmin && salonName) {
        bookings = bookings.filter(item => String(item.salonName ?? "").toLowerCase() === salonName.toLowerCase());
      }
      if (isCustomer) {
        bookings = bookings.filter(item => String(item.customerId ?? "") === String(userId ?? ""));
      }
      return {
        data: bookings.map((booking, index) => {
          const customer = refs?.customerMap[String(booking.customerId ?? "")];
          const staff = refs?.staffMap[String(booking.staffId ?? "")];
          const ids = booking.serviceIds?.length ? booking.serviceIds : booking.serviceId ? [booking.serviceId] : [];
          const serviceName = ids.map(id => refs?.serviceMap[String(id)]?.serviceName).filter(Boolean).join(", ");
          const date = booking.appointmentDate ? dayjs(booking.appointmentDate).format("DD MMM YYYY") : "Invalid Date";
          return {
            ...booking,
            key: String(booking.id ?? `${pageParam}-${index}`),
            customerName: booking.customerName ?? customer?.fullName ?? "Unknown Customer",
            serviceName: serviceName || "Unknown Service",
            staffName: staff?.name ?? "Unknown Staff",
            appointmentDate: booking.startTime && booking.endTime ? `${date} - ${booking.startTime} to ${booking.endTime}` : date,
            status: booking.status?.toLowerCase() === "complete" ? "completed" : booking.status?.toLowerCase() ?? "pending",
          } as Booking;
        }),
        totalCount: result?.totalCount ?? 0,
        hasNextPage: result?.hasNextPage ?? false,
        nextPage: pageParam + 1,
      };
    },
    getNextPageParam: page => page.hasNextPage ? page.nextPage : undefined,
  });

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || !loadMoreRef.current) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void fetchNextPage();
    });
    observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const bookings = useMemo(() => data?.pages.flatMap(page => page.data) ?? [], [data]);
  const { searchText, setSearchText, filteredData } = useSearch(bookings, ["customerName"], 500);
  const getSalonTiming = (date: Dayjs | null) => {
    if (!date || !refs || !selectedStaffId) return null;
    const staff = refs.staffMap[String(selectedStaffId)];
    if (!staff?.salonName) return null;
    const adminId = refs.adminMap[String(staff.salonName)];
    if (!adminId) return null;
    return refs.timeMap[`${String(adminId)}-${date.format("dddd")}`] ?? null;
  };

  const { data: existingBookings = [], isLoading: staffBookingsLoading } = useQuery({
    queryKey: ["staffBookings", selectedStaffId, selectedDate?.format("YYYY-MM-DD")],
    enabled: !!selectedStaffId && !!selectedDate,
    queryFn: async () => {
      const response = await api.getApiBooking({ page: 1, pageSize: 1000 }, apiOptions);
      const bookings = parseResponse<{ result?: { data?: Booking[] } }>(response.data)?.result?.data ?? [];
      return bookings.filter(booking => {
        const status = booking.status?.toLowerCase() ?? "";
        return booking.staffId &&
          String(booking.staffId) === String(selectedStaffId) &&
          booking.appointmentDate &&
          selectedDate &&
          dayjs(booking.appointmentDate).isSame(selectedDate, "day") &&
          ["pending", "confirmed", "inprogress"].includes(status);
      });
    },
    staleTime: 0,
  });

  const { data: slots = [], isLoading: slotsLoading, isError: slotsError } = useQuery({
    queryKey: ["availableSlots", selectedStaffId, selectedDate?.format("YYYY-MM-DD"), selectedServices],
    enabled: !!selectedStaffId && !!selectedDate && selectedServices.length > 0 && !!refs,
    queryFn: async () => {
      if (!refs || !selectedStaffId || !selectedDate) return [];
      const staff = refs.staffMap[String(selectedStaffId)];
      if (!staff) {
        throw new Error("Selected staff not found");
      }
      const adminId = refs.adminMap[String(staff.salonName ?? "")];
      if (!adminId) {
        throw new Error("Admin not found for selected salon");
      }
      const payload: SlotRequestDto = {
        userId: adminId,
        staffId: selectedStaffId,
        date: `${selectedDate.format("YYYY-MM-DD")}T12:00:00`,
        serviceIds: selectedServices,
      };

      const response = await api.postApiSlotAvailableSlots(payload, apiOptions);
      const parsed = parseResponse<{
        status?: boolean;
        message?: string;
        slots?: Slot[];
        result?: {
          slots?: Slot[];
        };
      }>(response.data);
      if (!parsed?.status) {
        return [];
      }

      const apiSlots = Array.isArray(parsed.slots)
        ? parsed.slots
        : Array.isArray(parsed.result?.slots)
          ? parsed.result.slots
          : [];
      return apiSlots.filter(slot => slot.isAvailable === true);
    },
    staleTime: 0,
  });

  const availableSlots = useMemo(() => {
    const now = dayjs();
    return slots.filter(slot => {
      if (!slot.isAvailable) return false;
      if (selectedDate?.isSame(now, "day")) {
        const start = dayjs(`${selectedDate.format("YYYY-MM-DD")}T${slot.startTime}`);
        if (start.isBefore(now)) {
          return false;
        }
      }

      return !existingBookings.some(booking => {
        if (!booking.startTime || !booking.endTime || !selectedDate) return false;
        const start = dayjs(`${selectedDate.format("YYYY-MM-DD")}T${slot.startTime}`);
        const end = dayjs(`${selectedDate.format("YYYY-MM-DD")}T${slot.endTime}`);
        const bookingStart = dayjs(`${selectedDate.format("YYYY-MM-DD")}T${booking.startTime}`);
        const bookingEnd = dayjs(`${selectedDate.format("YYYY-MM-DD")}T${booking.endTime}`).add(15, "minute");
        return start.isBefore(bookingEnd) && end.isAfter(bookingStart);
      });
    });
  }, [slots, existingBookings, selectedDate]);

  const totalDuration = useMemo(
    () => selectedServices.reduce((total, id) => total + Number(refs?.serviceMap[String(id)]?.duration ?? 0), 0),
    [selectedServices, refs]
  );
  const totalPrice = useMemo(
    () => selectedServices.reduce((total, id) => total + Number(refs?.serviceMap[String(id)]?.price ?? 0), 0),
    [selectedServices, refs]
  );

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.putApiBookingId(id, { status }, apiOptions),
    onSuccess: () => {
      message.success("Booking status updated successfully");
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      resetModal();
    },
    onError: () => message.error("Failed to update status"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: BookingDto) => api.postApiBooking(payload, apiOptions),
    onSuccess: () => {
      message.success("Booking created successfully");
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["availableSlots"] });
      void queryClient.invalidateQueries({ queryKey: ["staffBookings"] });
      resetCreateModal();
    },
    onError: () => message.error("Failed to create booking"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteApiBookingId(id, apiOptions),
    onSuccess: () => {
      message.success("Booking deleted successfully");
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: () => message.error("Failed to delete booking"),
  });

  const resetModal = () => {
    setModalVisible(false);
    setEditingBooking(null);
    form.resetFields();
  };

  const resetCreateModal = () => {
    setCreateModalVisible(false);
    createForm.resetFields();
    setSelectedServices([]);
    setSelectedStaffId(undefined);
    setSelectedDate(null);
    setSelectedSlot(null);
    setCustomerName("");
  };

  const handleCreate = (values: { salonName?: string }) => {
    const customerError = validateField("customerName", customerName);
    if (customerError) return void message.warning(customerError);
    const servicesError = validateField("services", selectedServices);
    if (servicesError) return void message.warning(servicesError);
    const staffError = validateField("staff", selectedStaffId);
    if (staffError) return void message.warning(staffError);
    const dateError = validateField("date", selectedDate);
    if (dateError) return void message.warning(dateError);
    const timeSlotError = validateField("timeSlot", selectedSlot);
    if (timeSlotError) return void message.warning(timeSlotError);
    const staff = refs?.staffMap[selectedStaffId!];
    if (isAdmin && salonName && staff?.salonName !== salonName) {
      return void message.error("Selected staff does not belong to your salon");
    }
    const bookingSalon = isSuperAdmin ? values.salonName?.trim() : salonName;
    const salonError = validateField("salonName", bookingSalon);
    if (salonError) return void message.warning(salonError);
    createMutation.mutate({
      customerName: customerName.trim(),
      staffId: selectedStaffId!,
      serviceIds: selectedServices,
      appointmentDate: `${selectedDate!.format("YYYY-MM-DD")}T12:00:00`,
      startTime: selectedSlot!.startTime,
      endTime: selectedSlot!.endTime,
      amount: totalPrice,
      salonName: bookingSalon!,
    });
  };

  const staffOptions = useMemo(
    () => Object.values(refs?.staffMap ?? {})
      .filter(item => item.id && (!isAdmin || !salonName || item.salonName === salonName))
      .map(item => ({ value: String(item.id), label: item.name ?? "Unknown Staff" })),
    [refs, isAdmin, salonName]
  );

  const serviceOptions = useMemo(
    () => Object.values(refs?.serviceMap ?? {})
      .filter(item => item.id && (!isAdmin || !salonName || item.salonName === salonName || item.salonName === "All"))
      .map(item => ({
        value: String(item.id),
        label: `${item.serviceName ?? "Unknown"} (${item.duration ?? 0}min - $${item.price ?? 0})`,
      })),
    [refs, isAdmin, salonName]
  );

  const disabledDate = (date: Dayjs) => {
    if (!date) return false;
    if (date.isBefore(dayjs().startOf("day"))) {
      return true;
    }
    if (!selectedStaffId || !refs) {
      return false;
    }
    const staff = refs.staffMap[String(selectedStaffId)];
    if (!staff?.salonName) {
      return false;
    }
    const adminId = refs.adminMap[String(staff.salonName)];
    if (!adminId) {
      return true;
    }
    const dayInfo = refs.timeMap[`${String(adminId)}-${date.format("dddd")}`];
    return !dayInfo || dayInfo.isOpen !== true;
  };

  const pageLoading = (isLoading && !data) || refsLoading || staffBookingsLoading;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Booking Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage All Bookings</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate("/live-booking")}>Live Booking</Button>
          {!isCustomer && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
              Create Booking
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <SearchInput searchText={searchText} onSearchChange={setSearchText} placeholder="Search customer..." />
      </Card>
      <Card>
        <div className="mb-4">
          All Bookings Data
          {isFetching && !isFetchingNextPage && <Spin size="small" className="ml-2" />}
        </div>
        <DataTable
          data={filteredData}
          loading={pageLoading}
          onEdit={(record: Booking) => {
            if (["completed", "cancelled"].includes(String(record.status))) {
              return void message.warning(`Cannot edit a ${record.status} booking`);
            }
            setEditingBooking(record);
            form.setFieldsValue({ status: record.status });
            setModalVisible(true);
          }}
          onDelete={!isCustomer ? (record: Booking) => {
            if (record.id) deleteMutation.mutate(String(record.id));
          } : undefined}
          showActions={!isCustomer}
          rowKey="key"
        />

        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="text-center py-4">
              <Spin size="large" />
              <div className="mt-2 text-gray-500">Loading more bookings...</div>
            </div>
          )}
          {!hasNextPage && filteredData.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">No bookings found</div>
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
              Update Booking Status
            </div>
          }
          initialValues={{ status: "confirmed" }}
          onSubmit={values => {
            if (editingBooking?.id) {
              updateMutation.mutate({
                id: String(editingBooking.id),
                status: values.status,
              });
            }
          }}
          submitText="Update Booking"
          loading={updateMutation.isPending}
        >
          <div className="mb-4">
            <label>Customer Name</label>
            <div className="p-2 bg-gray-50 rounded border">{editingBooking?.customerName}</div>
          </div>
          <SelectField
            label="Status"
            name="status"
            required
            options={[
              { value: "confirmed", label: "Confirmed" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </ModalForm>
      )}

      {!isCustomer && (
        <ModalForm
          form={createForm}
          open={createModalVisible}
          onClose={resetCreateModal}
          title={
            <div className="flex items-center gap-2">
              <CalendarOutlined className="text-blue-600" />
              Create New Booking
            </div>
          }
          onSubmit={handleCreate}
          submitText="Create Booking"
          loading={createMutation.isPending}
          width={700}
        >
          <div className="mb-4">
            <label>Customer Name <span className="text-red-500">*</span></label>
            <Input
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
            />
          </div>
          <div className="mb-4">
            <label>Services <span className="text-red-500">*</span></label>
            <Select
              mode="multiple"
              value={selectedServices}
              onChange={(values: string[]) => {
                setSelectedServices(values);
                setSelectedSlot(null);
              }}
              className="w-full"
              placeholder="Select services"
              options={serviceOptions}
            />
            {totalDuration > 0 && (
              <div className="mt-1 text-sm text-gray-600">
                Total duration: <strong>{totalDuration} min</strong>
              </div>
            )}
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <div className="mb-4">
                <label>Staff <span className="text-red-500">*</span></label>
                <Select
                  value={selectedStaffId}
                  onChange={(value: string) => {
                    setSelectedStaffId(value);
                    setSelectedDate(null);
                    setSelectedSlot(null);
                  }}
                  className="w-full"
                  placeholder="Select staff"
                  options={staffOptions}
                />
              </div>
            </Col>
            <Col span={12}>
              <div className="mb-4">
                <label>Date <span className="text-red-500">*</span></label>
                <DatePicker
                  className="w-full"
                  format="YYYY-MM-DD"
                  value={selectedDate}
                  onChange={date => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  disabledDate={disabledDate}
                />
              </div>
            </Col>
          </Row>
          {selectedServices.length > 0 && selectedStaffId && selectedDate && (
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Available Time Slots</span>
                {slotsLoading && <Spin size="small" />}
              </div>
              {slotsError ? (
                <Alert message="Failed to load slots" type="error" showIcon />
              ) : slotsLoading ? (
                <div className="text-center py-4">Loading slots...</div>
              ) : !availableSlots.length ? (
                <Alert message="No available slots for the selected criteria" type="info" showIcon />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map(slot => {
                    const selected = selectedSlot?.startTime === slot.startTime && selectedSlot?.endTime === slot.endTime;
                    return (
                      <Card
                        key={`${slot.startTime}-${slot.endTime}`}
                        size="small"
                        className={`cursor-pointer ${selected ? "border-blue-500 bg-blue-50" : ""}`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <div className="text-center">
                          <ClockCircleOutlined className="text-blue-500 mr-1" />
                          {slot.startTime} - {slot.endTime}
                          {selected && (
                            <Tag color="blue" className="mt-1 block">Selected</Tag>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {selectedDate && selectedStaffId && refs && (() => {
            const dayInfo = getSalonTiming(selectedDate);
            if (!dayInfo) {
              return (
                <Alert
                  className="mb-4"
                  message="Salon timing not found for selected day"
                  type="warning"
                  showIcon
                />
              );
            }
            return (
              <div className="mb-4 text-sm text-gray-500">
                Salon Timing: {dayInfo.opening} - {dayInfo.closing}
              </div>
            );
          })()}

          {isSuperAdmin && (
            <InputField
              label="Salon Name"
              name="salonName"
              required
              placeholder="Enter salon name"
            />
          )}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-4">
            <p className="text-sm text-blue-700">
              <CalendarOutlined className="mr-1" />
              {isAdmin
                ? `Booking will be created for ${salonName ?? "your salon"} salon with "Pending" status.`
                : 'Booking will be created with "Pending" status.'}
            </p>
          </div>
        </ModalForm>
      )}
    </div>
  );
};
export default Bookings;