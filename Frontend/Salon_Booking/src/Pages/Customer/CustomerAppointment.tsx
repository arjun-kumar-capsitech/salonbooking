import React, { useState, useMemo } from "react";
import { Card, Button, Row, Col, Modal, Steps, DatePicker, Divider, message, Spin, Tag, Empty, Checkbox } from "antd";
import { ShopOutlined, CheckCircleOutlined, ClockCircleOutlined, UserOutlined, EnvironmentOutlined, CalendarOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSalonBookingAPI } from '../../api/generated';
import axios from 'axios';

const { Step } = Steps;
const stepsData = ["Services", "Staff", "Date & Time", "Confirm"];

const {
  getApiAdminServices,
  getApiStaff,
  getApiTime,
  getApiUser,
  postApiBooking
} = getSalonBookingAPI();

const BASE_URL = 'http://localhost:5296';

interface SlotDto {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

const CustomerAppointment: React.FC = () => {
  const [, setSelectedSalon] = useState<string | null>(null);
  const [selectedSalonName, setSelectedSalonName] = useState<string | null>(null);
  const [selectedSalonAdminId, setSelectedSalonAdminId] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotDto | null>(null);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const queryClient = useQueryClient();
  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInUserId = user?.id || user?._id;
  const customerName = user?.fullName || user?.FullName || user?.name || "Customer";

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
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

  const extractData = (response: any) => {
    if (!response) return [];
    const parsedData = ResponseData(response);
    if (parsedData?.status === true && parsedData?.result) {
      if (parsedData.result?.data && Array.isArray(parsedData.result.data)) {
        return parsedData.result.data;
      }
      if (Array.isArray(parsedData.result)) {
        return parsedData.result;
      }
    }
    if (Array.isArray(parsedData)) {
      return parsedData;
    }
    if (parsedData?.data && Array.isArray(parsedData.data)) {
      return parsedData.data;
    }
    return [];
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return dayjs(time, 'HH:mm').format('h:mm A');
  };

  const { data: salonsData = [], isLoading: salonsLoading } = useQuery({
    queryKey: ['customerSalons'],
    enabled: !!token,
    queryFn: async () => {
      try {
        const response = await getApiUser({ page: 1, pageSize: 1000 }, axiosConfig);
        const users = extractData(response);
        const adminUsers = users.filter((u: any) => {
          const role = u.role || u.Role;
          return role === 2 || role === 3 || role === 4;
        });
        const salonMap = new Map();
        adminUsers.forEach((u: any) => {
          const salonName = u.salonName || u.SalonName;
          if (salonName && salonName.trim() !== '') {
            if (!salonMap.has(salonName)) {
              salonMap.set(salonName, {
                id: u.id || u._id,
                name: salonName,
                adminId: u.id || u._id,
                address: u.salonAddress || u.SalonAddress || 'Salon Address',
                phone: u.phoneNumber || u.PhoneNumber || '',
                email: u.email || u.Email,
                rating: (3 + Math.random() * 2).toFixed(1),
                reviews: Math.floor(Math.random() * 500) + 10,
                isActive: u.isActive !== undefined ? u.isActive : true,
                openingTime: '09:00',
                closingTime: '18:00',
              });
            }
          }
        });
        return Array.from(salonMap.values());
      } catch (error) {
        console.error("Error fetching salons:", error);
        return [];
      }
    }
  });

  const { data: servicesApiData = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['customerServices', selectedSalonName],
    enabled: !!token && !!selectedSalonName,
    queryFn: async () => {
      try {
        const response = await getApiAdminServices(axiosConfig);
        const services = extractData(response);
        return services
          .filter((s: any) => {
            const isActive = s.isActive !== false;
            const serviceSalon = s.salonName || s.SalonName;
            return isActive && serviceSalon === selectedSalonName;
          })
          .map((s: any) => ({
            id: s.id || s._id,
            serviceName: s.serviceName || s.ServiceName || s.name || 'Service',
            price: s.price || s.Price || 0,
            duration: s.duration || s.Duration || 30,
            description: s.description || s.Description || '',
            isActive: s.isActive !== undefined ? s.isActive : true,
            salonName: s.salonName || s.SalonName || selectedSalonName,
          }));
      } catch (error) {
        console.error("Error fetching services:", error);
        return [];
      }
    }
  });

  const { data: staffApiData = [], isLoading: staffLoading } = useQuery({
    queryKey: ['customerStaff', selectedSalonName],
    enabled: !!token && !!selectedSalonName,
    queryFn: async () => {
      try {
        const response = await getApiStaff({ page: 1, pageSize: 1000 }, axiosConfig);
        const staff = extractData(response);
        return staff
          .filter((s: any) => {
            const isActive = s.isActive !== false;
            const staffSalon = s.salonName || s.SalonName;
            return isActive && staffSalon === selectedSalonName;
          })
          .map((s: any) => ({
            id: s.id || s._id,
            fullName: s.fullName || s.FullName || s.name || 'Staff',
            email: s.email || s.Email || '',
            phone: s.phone || s.Phone || s.phoneNumber || '',
            role: s.role || s.Role || 'Employee',
            isActive: s.isActive !== undefined ? s.isActive : true,
            salonName: s.salonName || s.SalonName || selectedSalonName,
          }));
      } catch (error) {
        console.error("Error fetching staff:", error);
        return [];
      }
    }
  });

  const { data: allTimeSlots = [], isLoading: timeLoading } = useQuery({
    queryKey: ['allTimeSlots'],
    enabled: !!token,
    queryFn: async () => {
      try {
        const response = await getApiTime({}, axiosConfig);
        const slots = extractData(response);
        if (Array.isArray(slots) && slots.length > 0) {
          return slots.map((slot: any) => ({
            id: slot.id || slot._id,
            day: slot.day || slot.Day,
            opening: slot.opening || slot.Opening || '09:00',
            closing: slot.closing || slot.Closing || '18:00',
            isOpen: slot.isOpen !== undefined ? slot.isOpen : (slot.IsOpen !== undefined ? slot.IsOpen : true),
            userId: slot.userId || slot.UserId,
          }));
        }
        return [];
      } catch (error) {
        console.error("Error fetching all time slots:", error);
        return [];
      }
    }
  });

  const getSalonTimings = (adminId: string) => {
    return allTimeSlots.filter((slot: any) => slot.userId === adminId);
  };

  const getDayStatusForSalon = (adminId: string, dayName: string) => {
    const salonSlots = getSalonTimings(adminId);
    return salonSlots.find((t: any) => t.day === dayName) || null;
  };

  const getDayStatus = (dayName: string) => {
    if (!selectedSalonAdminId) return null;
    return getDayStatusForSalon(selectedSalonAdminId, dayName);
  };

  const totalDuration = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + (s.duration || 0), 0);
  }, [selectedServices]);

  const totalPrice = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + (s.price || 0), 0);
  }, [selectedServices]);

  const {
    data: slotsResponse,
    isLoading: slotsLoading,
    isError: slotsError,
  } = useQuery({
    queryKey: ['availableSlots', selectedSalonAdminId, selectedStaff?.id, selectedDate, selectedServices.map(s => s.id)],
    queryFn: async () => {
      if (!selectedSalonAdminId || !selectedStaff?.id || !selectedDate || selectedServices.length === 0) {
        return null;
      }
      const payload = {
        userId: selectedSalonAdminId,
        staffId: selectedStaff.id,
        date: selectedDate.toISOString(),
        serviceIds: selectedServices.map(s => s.id),
      };
      const response = await axios.post(`${BASE_URL}/api/Slot/available-slots`, payload, axiosConfig);
      return response.data;
    },
    enabled: !!selectedSalonAdminId && !!selectedStaff?.id && !!selectedDate && selectedServices.length > 0,
    staleTime: 0,
  });

  const { data: existingBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['staffBookings', selectedStaff?.id, selectedDate],
    enabled: !!selectedStaff?.id && !!selectedDate && !!token,
    queryFn: async () => {
      if (!selectedStaff?.id || !selectedDate || !token) {
        return [];
      }
      const response = await axios.get(`${BASE_URL}/api/Booking/staff/${selectedStaff.id}/date/${selectedDate.format('YYYY-MM-DD')}`, axiosConfig);
      const data = extractData(response);
      return data.filter((b: any) =>
        b.status && ['pending', 'confirmed', 'inprogress'].includes(b.status.toLowerCase())
      );
    },
    staleTime: 0,
  });

  const availableSlots: SlotDto[] = useMemo(() => {
    if (!slotsResponse || !slotsResponse.status || !selectedDate) return [];
    const now = dayjs();
    const isToday = selectedDate.isSame(now, 'day');
    const slots = slotsResponse.slots || [];

    const isOverlapping = (slot: SlotDto, booking: any) => {
      const slotStart = dayjs(selectedDate.format('YYYY-MM-DD') + 'T' + slot.startTime);
      const slotEnd = dayjs(selectedDate.format('YYYY-MM-DD') + 'T' + slot.endTime);
      const bookStart = dayjs(booking.startTime);
      const bookEnd = dayjs(booking.endTime);
      const bufferEnd = bookEnd.add(15, 'minute');
      return slotStart.isBefore(bufferEnd) && slotEnd.isAfter(bookStart);
    };

    return slots.filter((slot: SlotDto) => {
      if (!slot.isAvailable) return false;
      if (isToday) {
        const slotStart = dayjs(selectedDate.format('YYYY-MM-DD') + 'T' + slot.startTime);
        if (slotStart.isBefore(now)) return false;
      }
      const conflict = existingBookings.some((b: any) => isOverlapping(slot, b));
      if (conflict) return false;
      return true;
    });
  }, [slotsResponse, selectedDate, existingBookings]);

  const handleSalonSelect = (salon: any) => {
    setSelectedSalon(salon.id);
    setSelectedSalonName(salon.name);
    setSelectedSalonAdminId(salon.adminId);
    setStep(0);
  };

  const createBookingMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await postApiBooking(payload, axiosConfig);
      return extractData(response);
    },
    onSuccess: (data) => {
      setCreatedBooking(data);
      setShowConfirmation(true);
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
        queryClient.invalidateQueries({ queryKey: ['customerBookings'] });
        queryClient.invalidateQueries({ queryKey: ['staffBookings'] });
      }, 4000);
      message.success("Booking Created Successfully");
    },
    onError: (error: any) => {
      console.error("Booking error:", error);
      message.error(error?.response?.data?.message || error?.message || "Booking failed");
    }
  });

  const disabledDate = (current: any) => {
    if (!current) return false;
    if (current < dayjs().startOf("day")) return true;
    const dayName = current.format("dddd");
    const dayInfo = getDayStatus(dayName);
    if (!dayInfo || !dayInfo.isOpen) return true;
    return false;
  };

  const confirmBooking = async () => {
    if (!selectedSlot || !selectedStaff || !selectedDate || selectedServices.length === 0) {
      message.error("Please complete all steps");
      return;
    }
    try {
      const payload = {
        customerId: loggedInUserId,
        customerName: customerName,
        staffId: selectedStaff.id,
        serviceIds: selectedServices.map(s => s.id),
        appointmentDate: selectedDate.toISOString(),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        amount: totalPrice,
        status: "pending",
        salonName: selectedSalonName,
      };
      await createBookingMutation.mutateAsync(payload);
    } catch (error) {
      console.error("Booking confirmation error:", error);
    }
  };

  const isLoading = salonsLoading || servicesLoading || staffLoading || timeLoading || bookingsLoading;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Card className="text-center p-8">
          <h2 className="text-xl font-bold mb-2">Please Login</h2>
          <p className="text-gray-500">You need to be logged in to book an appointment</p>
        </Card>
      </div>
    );
  }

  if (isLoading && step === -1) return <Spin fullscreen />;

  if (step === -1) {
    return (
      <div className="min-h-screen py-10 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-800 mb-3">Select Your Salon</h1>
            <p className="text-gray-600 text-lg">Choose from our premium salon partners</p>
            {salonsLoading ? (
              <div className="flex justify-center py-10"><Spin size="large" /></div>
            ) : (
              <Row gutter={[24, 24]}>
                {salonsData.length === 0 ? (
                  <Col span={24}>
                    <Card><Empty description="No salons available" /></Card>
                  </Col>
                ) : (
                  salonsData.map((salon: any) => {
                    const dayName = dayjs().format("dddd");
                    const dayInfo = getDayStatusForSalon(salon.adminId, dayName);
                    const isOpen = dayInfo ? dayInfo.isOpen : false;
                    const opening = dayInfo ? dayInfo.opening : "N/A";
                    const closing = dayInfo ? dayInfo.closing : "N/A";
                    return (
                      <Col xs={24} sm={12} lg={8} key={salon.id}>
                        <Card
                          hoverable
                          className="text-center rounded-xl shadow hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                          onClick={() => handleSalonSelect(salon)}
                        >
                          <div className="py-4">
                            <div className="w-16 h-16 bg-[#197278] rounded-full flex items-center justify-center mx-auto mb-3">
                              <ShopOutlined style={{ fontSize: '1.5rem', color: 'white' }} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-1">{salon.name}</h3>
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <span className="text-gray-700">{salon.rating}</span>
                              <span className="text-gray-400 text-sm">({salon.reviews})</span>
                            </div>
                            <div className="text-gray-500 text-sm mb-3">
                              <EnvironmentOutlined /> {salon.address}
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              {dayInfo ? (
                                <>
                                  <Tag color={isOpen ? 'green' : 'red'}>{isOpen ? 'Open Now' : 'Closed'}</Tag>
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
                  const dayName = dayjs().format("dddd");
                  const dayInfo = getDayStatus(dayName);
                  return dayInfo ? (
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                      <span className={`text-xs font-semibold ${dayInfo.isOpen ? 'text-green-400' : 'text-red-400'}`}>
                        {dayInfo.isOpen ? "Open" : "Closed"}
                      </span>
                      <span className="text-xs text-white/80">{dayInfo.opening} - {dayInfo.closing}</span>
                    </div>
                  ) : (
                    <div className="bg-white/20 px-3 py-1 rounded-full text-xs text-white/80">
                      Timings not set
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          <Steps current={step} className="mb-6">
            {stepsData.map((title) => (
              <Step key={title} title={title} />
            ))}
          </Steps>

          <div className="min-h-[250px]">
            {step === 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                  Choose Services (Multiple)
                </h3>
                {servicesLoading ? (
                  <div className="flex justify-center py-8"><Spin /></div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto">
                    {servicesApiData.length === 0 ? (
                      <Empty description="No services available" />
                    ) : (
                      servicesApiData.map((service: any) => {
                        const isChecked = selectedServices.some(s => s.id === service.id);
                        return (
                          <div
                            key={service.id}
                            onClick={() => {
                              if (isChecked) {
                                setSelectedServices(selectedServices.filter(s => s.id !== service.id));
                              } else {
                                setSelectedServices([...selectedServices, service]);
                              }
                            }}
                            className={`p-4 rounded-lg cursor-pointer transition-all border ${isChecked ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-semibold text-gray-800">{service.serviceName}</div>
                                <div className="text-gray-500 text-sm">{service.duration} min</div>
                                {service.description && (
                                  <div className="text-gray-400 text-xs">{service.description}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className={`font-bold ${isChecked ? 'text-blue-600' : 'text-gray-800'}`}>
                                  ${service.price}
                                </div>
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
                      <span className="font-bold">Total: ${totalPrice}</span>
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
                  <div className="flex justify-center py-8"><Spin /></div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto">
                    {staffApiData.length === 0 ? (
                      <Empty description="No staff available" />
                    ) : (
                      staffApiData.map((staff: any) => {
                        const isSelected = selectedStaff?.id === staff.id;
                        return (
                          <div
                            key={staff.id}
                            onClick={() => setSelectedStaff(staff)}
                            className={`p-4 rounded-lg cursor-pointer transition-all border ${isSelected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isSelected ? 'bg-[#197278]' : 'bg-gray-400'}`}>
                                <span className="text-white font-bold text-xl">{staff.fullName.charAt(0).toUpperCase()}</span>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-800 text-lg">{staff.fullName}</div>
                                <div className="text-gray-500 text-sm">{staff.role}</div>
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
                      onChange={(date) => {
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
                      <div className="mt-1 text-sm text-blue-600">
                        {selectedDate.format("dddd, DD MMM YYYY")}
                      </div>
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
                          {availableSlots.map((slot) => (
                            <Card
                              key={`${slot.startTime}-${slot.endTime}`}
                              className={`cursor-pointer transition-all hover:shadow-md ${
                                selectedSlot && selectedSlot.startTime === slot.startTime && selectedSlot.endTime === slot.endTime
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200'
                              }`}
                              onClick={() => setSelectedSlot(slot)}
                              size="small"
                            >
                              <div className="text-center">
                                <ClockCircleOutlined className="text-blue-500 mr-1" />
                                <span className="font-medium">{formatTime(slot.startTime)}</span>
                                <span className="mx-1">-</span>
                                <span className="font-medium">{formatTime(slot.endTime)}</span>
                                {selectedSlot && selectedSlot.startTime === slot.startTime && selectedSlot.endTime === slot.endTime && (
                                  <Tag color="blue" className="mt-1 block">Selected</Tag>
                                )}
                              </div>
                            </Card>
                          ))}
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
                      <span className="font-medium text-gray-800">{selectedServices.map(s => s.serviceName).join(', ')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue-200">
                      <span className="text-gray-600">Stylist</span>
                      <span className="font-medium text-gray-800">{selectedStaff?.fullName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue-200">
                      <span className="text-gray-600">Date</span>
                      <span className="font-medium text-gray-800">{selectedDate?.format("DD MMM YYYY")}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue-200">
                      <span className="text-gray-600">Time Slot</span>
                      <span className="font-medium text-gray-800">
                        {selectedSlot ? `${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}` : 'Not selected'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-blue-200">
                      <span className="text-gray-600">Duration</span>
                      <span className="font-medium text-gray-800">{totalDuration} min</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="font-semibold text-gray-700">Total</span>
                      <span className="font-bold text-blue-600 text-lg">${totalPrice}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Divider className="my-4" />
          <div className="flex justify-between">
            <Button onClick={() => setStep(step - 1)} disabled={step === 0}>
              Back
            </Button>
            {step === 3 ? (
              <Button
                type="primary"
                onClick={confirmBooking}
                loading={createBookingMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600 border-none"
                disabled={!selectedSlot || !selectedStaff || !selectedDate || selectedServices.length === 0}
              >
                Confirm Booking
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 0 && selectedServices.length === 0) ||
                  (step === 1 && !selectedStaff) ||
                  (step === 2 && (!selectedDate || !selectedSlot))
                }
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
                <span className="font-medium text-gray-800">{selectedServices.map(s => s.serviceName).join(', ')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Staff</span>
                <span className="font-medium text-gray-800">{createdBooking.staffName || selectedStaff?.fullName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Date & Time</span>
                <span className="font-medium text-gray-800">
                  {selectedDate?.format("DD MMM YYYY")} {selectedSlot ? `${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}` : ''}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-blue-600">${createdBooking.amount || totalPrice}</span>
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