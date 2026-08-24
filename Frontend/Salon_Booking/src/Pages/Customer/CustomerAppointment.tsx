import { Button, Card, Checkbox, Col, DatePicker, Divider, Empty, Modal, Row, Spin, Steps, Tag, message } from "antd";
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, EnvironmentOutlined, ShopOutlined, UserOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSalonBookingAPI } from "../../api/generated";
import type { AdminServices, Booking, BookingDto, SlotRequestDto, Staff, TimeDto, User } from "../../api/generated";
import { UserRole } from "../../api/generated";
import type { Salon, SlotDto } from "../../Types/Alltypes";
const { Step } = Steps;
const stepsData = ["Services", "Staff", "Date & Time", "Confirm"];
const { getApiAdminServices, getApiStaff, getApiTime, getApiUser, postApiBooking, postApiSlotAvailableSlots } = getSalonBookingAPI();

const CustomerAppointment = () => {
  const [, setSelectedSalon] = useState<string | null>(null);
  const [selectedSalonName, setSelectedSalonName] = useState<string | null>(null);
  const [selectedSalonAdminId, setSelectedSalonAdminId] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const [selectedServices, setSelectedServices] = useState<AdminServices[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotDto | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem("user") || "{}") as Partial<User>;
  const customerName = user.fullName || user.name || "Customer";
  const customerId = user.id || user.customerProfileId || undefined;
  const axiosConfig = { withCredentials: true };

  const responseData = (response: unknown): any => {
    if (!response) return null;
    const data = (response as any)?.data ?? response;
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return data;
  };

  const extractData = (response: unknown): any[] => {
    const data = responseData(response);
    if (!data) return [];
    if (data?.status === true && data?.result) {
      if (Array.isArray(data.result)) return data.result;
      if (Array.isArray(data.result?.data)) return data.result.data;
    }
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const formatTime = (time: string | null | undefined) => {
    if (!time) return "";
    const value = time.length > 5 ? time.substring(0, 5) : time;
    return dayjs(`2000-01-01T${value}`).format("h:mm A");
  };

  const { data: salonsData = [], isLoading: salonsLoading } = useQuery<Salon[]>({
    queryKey: ["customerSalons"],
    queryFn: async () => {
      try {
        const response = await getApiUser({ page: 1, pageSize: 1000 }, axiosConfig);
        const users = extractData(response) as User[];
        const salonMap = new Map<string, Salon>();
        users.forEach(userData => {
          const role = userData.role;
          const salonName = userData.salonName?.trim();
          const id = userData.id;
          if (role === UserRole.NUMBER_2 && salonName && id && userData.isActive !== false && !salonMap.has(salonName)) {
            salonMap.set(salonName, { ...userData, id, salonName });
          }
        });
        return Array.from(salonMap.values());
      } catch (error) {
        console.error("Error fetching salons:", error);
        return [];
      }
    }
  });

  const { data: servicesApiData = [], isLoading: servicesLoading } = useQuery<AdminServices[]>({
    queryKey: ["customerServices", selectedSalonName],
    enabled: !!selectedSalonName,
    queryFn: async () => {
      try {
        const response = await getApiAdminServices(axiosConfig);
        return (extractData(response) as AdminServices[]).filter(service => service.isActive !== false && service.salonName === selectedSalonName);
      } catch (error) {
        console.error("Error fetching services:", error);
        return [];
      }
    }
  });

  const { data: staffApiData = [], isLoading: staffLoading } = useQuery<Staff[]>({
    queryKey: ["customerStaff", selectedSalonName],
    enabled: !!selectedSalonName,
    queryFn: async () => {
      try {
        const response = await getApiStaff({ page: 1, pageSize: 1000 }, axiosConfig);
        return (extractData(response) as Staff[]).filter(staff => staff.isActive !== false && staff.salonName === selectedSalonName);
      } catch (error) {
        console.error("Error fetching staff:", error);
        return [];
      }
    }
  });

  const { data: allTimeSlots = [], isLoading: timeLoading } = useQuery<TimeDto[]>({
    queryKey: ["allTimeSlots"],
    queryFn: async () => {
      try {
        const response = await getApiTime({}, axiosConfig);
        return extractData(response) as TimeDto[];
      } catch (error) {
        console.error("Error fetching timings:", error);
        return [];
      }
    }
  });

  const getDayStatus = (dayName: string): TimeDto | null => {
    if (!selectedSalonAdminId) return null;
    return allTimeSlots.find(slot => slot.userId === selectedSalonAdminId && slot.day === dayName) ?? null;
  };
  const getSalonDayStatus = (adminId: string, dayName: string): TimeDto | null => {
    return allTimeSlots.find(slot => slot.userId === adminId && slot.day === dayName) ?? null;
  };
  const totalDuration = useMemo(() => selectedServices.reduce((total, service) => total + Number(service.duration || 0), 0), [selectedServices]);
  const totalPrice = useMemo(() => selectedServices.reduce((total, service) => total + Number(service.price || 0), 0), [selectedServices]);

  const { data: slotsResponse, isLoading: slotsLoading, isError: slotsError } = useQuery({
    queryKey: ["availableSlots", selectedSalonAdminId, selectedStaff?.id, selectedDate?.format("YYYY-MM-DD"), selectedServices.map(service => service.id)],
    enabled: !!selectedSalonAdminId && !!selectedStaff?.id && !!selectedDate && selectedServices.length > 0,
    queryFn: async () => {
      const payload: SlotRequestDto = {
        userId: selectedSalonAdminId,
        staffId: selectedStaff?.id,
        date: selectedDate?.toISOString(),
        serviceIds: selectedServices.map(service => service.id).filter((id): id is string => !!id)
      };
      const response = await postApiSlotAvailableSlots(payload, axiosConfig);
      return responseData(response);
    },
    staleTime: 0
  });

  const availableSlots = useMemo<SlotDto[]>(() => {
    if (!slotsResponse?.status || !selectedDate) return [];
    const slots: SlotDto[] = Array.isArray(slotsResponse.slots)
      ? slotsResponse.slots
      : Array.isArray(slotsResponse.result?.slots)
        ? slotsResponse.result.slots
        : [];
    const now = dayjs();
    const isToday = selectedDate.isSame(now, "day");

    return slots.filter(slot => {
      if (!slot.isAvailable) return false;
      if (isToday) {
        const slotStart = dayjs(`${selectedDate.format("YYYY-MM-DD")}T${slot.startTime}`);
        if (slotStart.isBefore(now)) return false;
      }
      return true;
    });
  }, [slotsResponse, selectedDate]);

  const handleSalonSelect = (salon: Salon) => {
    setSelectedSalon(salon.id);
    setSelectedSalonName(salon.salonName);
    setSelectedSalonAdminId(salon.id);
    setSelectedServices([]);
    setSelectedStaff(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep(0);
  };

  const createBookingMutation = useMutation({
    mutationFn: async (payload: BookingDto) => {
      const response = await postApiBooking(payload, axiosConfig);
      const data = responseData(response);
      return (data?.result ?? data) as Booking;
    },
    onSuccess: data => {
      setCreatedBooking(data);
      setShowConfirmation(true);
      queryClient.invalidateQueries({ queryKey: ["customerBookings"] });
      queryClient.invalidateQueries({ queryKey: ["availableSlots"] });
      message.success("Booking Created Successfully");

      setTimeout(() => {
        setShowConfirmation(false);
        setStep(-1);
        setSelectedSalon(null);
        setSelectedSalonName(null);
        setSelectedSalonAdminId(null);
        setSelectedServices([]);
        setSelectedDate(null);
        setSelectedStaff(null);
        setSelectedSlot(null);
        setCreatedBooking(null);
      }, 4000);
    },
    onError: (error: any) => {
      console.error("Booking error:", error);
      message.error(error?.response?.data?.message || error?.message || "Booking failed");
    }
  });

  const disabledDate = (current: Dayjs) => {
    if (!current) return false;
    if (current.isBefore(dayjs().startOf("day"))) return true;
    const dayInfo = getDayStatus(current.format("dddd"));
    return !dayInfo || dayInfo.isOpen !== true;
  };
  const confirmBooking = async () => {
    if (!selectedSlot || !selectedStaff?.id || !selectedDate || selectedServices.length === 0) {
      message.error("Please complete all steps");
      return;
    }
    const serviceIds = selectedServices.map(service => service.id).filter((id): id is string => !!id);
    const payload: BookingDto = {
      customerId,
      customerName,
      staffId: selectedStaff.id,
      serviceIds,
      appointmentDate: selectedDate.toISOString(),
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      amount: totalPrice,
      salonName: selectedSalonName
    };

    await createBookingMutation.mutateAsync(payload);
  };

  const isInitialLoading = salonsLoading || timeLoading;

  if (isInitialLoading && step === -1) {
    return <Spin fullscreen />;
  }

  if (step === -1) {
    return (
      <div className="min-h-screen py-10 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-800 mb-3">Select Your Salon</h1>
            <p className="text-gray-600 text-lg">Choose from our premium salon partners</p>

            {salonsLoading ? (
              <div className="flex justify-center py-10">
                <Spin size="large" />
              </div>
            ) : (
              <Row gutter={[24, 24]}>
                {salonsData.length === 0 ? (
                  <Col span={24}>
                    <Card>
                      <Empty description="No salons available" />
                    </Card>
                  </Col>
                ) : (
                  salonsData.map(salon => {
                    const dayName = dayjs().format("dddd");
                    const dayInfo = getSalonDayStatus(salon.id, dayName);
                    const isOpen = dayInfo?.isOpen ?? false;
                    const opening = dayInfo?.opening ?? "N/A";
                    const closing = dayInfo?.closing ?? "N/A";

                    return (
                      <Col xs={24} sm={12} lg={8} key={salon.id}>
                        <Card hoverable className="text-center rounded-xl shadow hover:shadow-lg transition-shadow duration-300 cursor-pointer" onClick={() => handleSalonSelect(salon)}>
                          <div className="py-4">
                            <div className="w-16 h-16 bg-[#197278] rounded-full flex items-center justify-center mx-auto mb-3">
                              <ShopOutlined style={{ fontSize: "1.5rem", color: "white" }} />
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 mb-1">{salon.salonName}</h3>

                            <div className="flex items-center justify-center gap-2 mb-2">
                              <span className="text-gray-700">4.5</span>
                              <span className="text-gray-400 text-sm">(0)</span>
                            </div>

                            <div className="text-gray-500 text-sm mb-3">
                              <EnvironmentOutlined /> {salon.salonAddress || "Salon Address"}
                            </div>

                            <div className="flex items-center justify-center gap-2">
                              {dayInfo ? (
                                <>
                                  <Tag color={isOpen ? "green" : "red"}>{isOpen ? "Open Now" : "Closed"}</Tag>
                                  <span className="text-xs text-gray-400">{opening} - {closing}</span>
                                </>
                              ) : (
                                <Tag color="orange">Timings not set</Tag>
                              )}
                            </div>
                          </div>
                        </Card>
                      </Col>
                    );
                  })
                )}
              </Row>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <Card className="rounded-xl shadow-lg">
          {selectedSalonName && (
            <div className="mb-6 p-4 bg-[#197278] rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShopOutlined className="text-xl" />
                  <div>
                    <div className="font-bold">{selectedSalonName}</div>
                    <div className="text-blue-100 text-sm">Selected Salon</div>
                  </div>
                </div>
                {(() => {
                  const dayInfo = getDayStatus(dayjs().format("dddd"));
                  return dayInfo ? (
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                      <span className={`text-xs font-semibold ${dayInfo.isOpen ? "text-green-400" : "text-red-400"}`}>
                        {dayInfo.isOpen ? "Open" : "Closed"}
                      </span>
                      <span className="text-xs text-white/80">{dayInfo.opening} - {dayInfo.closing}</span>
                    </div>
                  ) : (
                    <div className="bg-white/20 px-3 py-1 rounded-full text-xs text-white/80">Timings not set</div>
                  );
                })()}
              </div>
            </div>
          )}
          <Steps current={step} className="mb-6">
            {stepsData.map(title => <Step key={title} title={title} />)}
          </Steps>
          <div className="min-h-[250px]">
            {step === 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">Choose Services (Multiple)</h3>
                {servicesLoading ? (
                  <div className="flex justify-center py-8">
                    <Spin />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto">
                    {servicesApiData.length === 0 ? (
                      <Empty description="No services available" />
                    ) : (
                      servicesApiData.map(service => {
                        const serviceId = service.id;
                        const isChecked = !!serviceId && selectedServices.some(item => item.id === serviceId);
                        return (
                          <div
                            key={serviceId || service.serviceName}
                            onClick={() => {
                              if (!serviceId) return;
                              setSelectedServices(isChecked ? selectedServices.filter(item => item.id !== serviceId) : [...selectedServices, service]);
                            }}
                            className={`p-4 rounded-lg cursor-pointer transition-all border ${isChecked ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-semibold text-gray-800">{service.serviceName || service.name || "Service"}</div>
                                <div className="text-gray-500 text-sm">{service.duration || 0} min</div>
                                {service.description && <div className="text-gray-400 text-xs">{service.description}</div>}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className={`font-bold ${isChecked ? "text-blue-600" : "text-gray-800"}`}>${Number(service.price || 0).toFixed(2)}</div>
                                <Checkbox checked={isChecked} />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
                {selectedServices.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Selected: {selectedServices.length} service(s)</span>
                      <span>Total Duration: {totalDuration} min</span>
                      <span className="font-bold">Total: ${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                  <UserOutlined className="text-blue-500" />
                  Choose a Stylist
                </h3>
                {staffLoading ? (
                  <div className="flex justify-center py-8">
                    <Spin />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto">
                    {staffApiData.length === 0 ? (
                      <Empty description="No staff available" />
                    ) : (
                      staffApiData.map(staff => {
                        const staffId = staff.id;
                        const isSelected = selectedStaff?.id === staffId;
                        return (
                          <div
                            key={staffId || staff.fullName}
                            onClick={() => staffId && setSelectedStaff(staff)}
                            className={`p-4 rounded-lg cursor-pointer transition-all border ${isSelected ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isSelected ? "bg-[#197278]" : "bg-gray-400"}`}>
                                <span className="text-white font-bold text-xl">{(staff.fullName || staff.name || "S").charAt(0).toUpperCase()}</span>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-800 text-lg">{staff.fullName || staff.name || "Staff"}</div>
                                <div className="text-gray-500 text-sm">{staff.role || "Employee"}</div>
                              </div>
                              {isSelected && <CheckCircleOutlined className="text-blue-600 text-lg ml-auto" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                  <CalendarOutlined className="text-blue-500" />
                  Select Date & Time Slot
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">Date</label>
                    <DatePicker
                      className="w-full p-2 border rounded-lg"
                      onChange={date => {
                        setSelectedDate(date);
                        setSelectedSlot(null);
                      }}
                      disabledDate={disabledDate}
                      placeholder="Choose a date"
                      format="DD MMM YYYY"
                      suffixIcon={<CalendarOutlined />}
                      value={selectedDate}
                    />
                    {selectedDate && (
                      <div className="mt-1 text-sm text-blue-600">{selectedDate.format("dddd, DD MMM YYYY")}</div>
                    )}
                  </div>

                  {selectedDate && selectedStaff && selectedServices.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Available Time Slots</span>
                        {slotsLoading && <Spin size="small" />}
                      </div>
                      {slotsLoading ? (
                        <div className="text-center py-4">Loading slots...</div>
                      ) : slotsError ? (
                        <div className="text-red-500">Error loading slots</div>
                      ) : availableSlots.length === 0 ? (
                        <div className="text-center py-4 text-gray-400">No available slots for the selected criteria</div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {availableSlots.map(slot => {
                            const isSelected = selectedSlot?.startTime === slot.startTime && selectedSlot?.endTime === slot.endTime;
                            return (
                              <Card
                                key={`${slot.startTime}-${slot.endTime}`}
                                className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
                                onClick={() => setSelectedSlot(slot)}
                                size="small"
                              >
                                <div className="text-center">
                                  <ClockCircleOutlined className="text-blue-500 mr-1" />
                                  <span className="font-medium">{formatTime(slot.startTime)}</span>
                                  <span className="mx-1">-</span>
                                  <span className="font-medium">{formatTime(slot.endTime)}</span>
                                  {isSelected && <Tag color="blue" className="mt-1 block">Selected</Tag>}
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">Review Your Booking</h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-blue-200">
                      <span className="text-gray-600">Salon</span>
                      <span className="font-medium text-gray-800">{selectedSalonName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue-200">
                      <span className="text-gray-600">Services</span>
                      <span className="font-medium text-gray-800">{selectedServices.map(service => service.serviceName || service.name || "Service").join(", ")}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue-200">
                      <span className="text-gray-600">Stylist</span>
                      <span className="font-medium text-gray-800">{selectedStaff?.fullName || selectedStaff?.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue-200">
                      <span className="text-gray-600">Date</span>
                      <span className="font-medium text-gray-800">{selectedDate?.format("DD MMM YYYY")}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue-200">
                      <span className="text-gray-600">Time Slot</span>
                      <span className="font-medium text-gray-800">{selectedSlot ? `${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}` : "Not selected"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue-200">
                      <span className="text-gray-600">Duration</span>
                      <span className="font-medium text-gray-800">{totalDuration} min</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="font-semibold text-gray-700">Total</span>
                      <span className="font-bold text-blue-600 text-lg">${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Divider className="my-4" />
          <div className="flex justify-between">
            <Button onClick={() => setStep(step - 1)} disabled={step === 0}>Back</Button>
            {step === 3 ? (
              <Button
                type="primary"
                onClick={confirmBooking}
                loading={createBookingMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600 border-none"
                disabled={!selectedSlot || !selectedStaff?.id || !selectedDate || selectedServices.length === 0}
              >
                Confirm Booking
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={() => setStep(step + 1)}
                disabled={(step === 0 && selectedServices.length === 0) || (step === 1 && !selectedStaff?.id) || (step === 2 && (!selectedDate || !selectedSlot))}
                className="bg-blue-500 hover:bg-blue-600 border-none"
              >
                Next
              </Button>
            )}
          </div>
        </Card>
      </div>

      <Modal open={showConfirmation} footer={null} closable={false} centered>
        <div className="text-center py-6">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircleOutlined className="text-2xl text-blue-500" />
          </div>
          <h3 className="text-xl font-bold mb-1 text-gray-800">Booking Confirmed!</h3>
          <p className="text-gray-600 text-sm mb-3">Your appointment has been booked successfully.</p>

          {createdBooking && (
            <div className="bg-blue-50 p-3 rounded text-left text-sm border border-blue-200">
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Salon</span>
                <span className="font-medium text-gray-800">{createdBooking.salonName || selectedSalonName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Services</span>
                <span className="font-medium text-gray-800">{selectedServices.map(service => service.serviceName || service.name || "Service").join(", ")}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Staff</span>
                <span className="font-medium text-gray-800">{createdBooking.fullName || selectedStaff?.fullName || selectedStaff?.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Date & Time</span>
                <span className="font-medium text-gray-800">
                  {selectedDate?.format("DD MMM YYYY")} {selectedSlot ? `${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}` : ""}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-blue-600">${Number(createdBooking.amount ?? totalPrice).toFixed(2)}</span>
              </div>
            </div>
          )}
          <div className="mt-4 text-sm text-blue-400">Redirecting...</div>
        </div>
      </Modal>
    </div>
  );
};
export default CustomerAppointment;