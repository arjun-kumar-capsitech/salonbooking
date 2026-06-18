import React, { useState, useMemo } from "react";
import { Card, Button, Row, Col, Modal, Steps, DatePicker, TimePicker, Divider, message, Spin, Rate, Tag,Empty } from "antd";
import { ShopOutlined, CheckCircleOutlined, ClockCircleOutlined, UserOutlined, EnvironmentOutlined, CalendarOutlined, DollarOutlined, StarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSalonBookingAPI } from '../../api/generated';

const { Step } = Steps;
const stepsData = ["Services", "Date & Time", "Staff", "Confirm"];
const { getAllServices: getApiAdminServices, getAllStaff: getApiStaff, getAll: getApiTime, create: postApiBooking } = getSalonBookingAPI();

const CustomerAppointment: React.FC = () => {
  const [selectedSalon, setSelectedSalon] = useState<string | null>(null);
  const [selectedSalonName, setSelectedSalonName] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<any>(null);
  const [selectedTime, setSelectedTime] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const queryClient = useQueryClient();
  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const loggedInUserId = user?.id || user?._id;

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

  const getRandomRating = () => (3 + Math.random() * 2).toFixed(1);
  const getRandomReviews = () => Math.floor(Math.random() * 500) + 10;

  const { data: servicesApiData = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['customerServices'],
    enabled: !!token,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await getApiAdminServices(axiosConfig);
      const services = extractData(res);
      return services.filter((s: any) => s.isActive === true);
    }
  });

  const { data: staffApiData = [], isLoading: staffLoading } = useQuery({
    queryKey: ['customerStaff'],
    enabled: !!token,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await getApiStaff({ page: 1, pageSize: 1000 }, axiosConfig);
      const staff = extractData(res);
      return staff.filter((s: any) => s.isActive === true);
    }
  });

  const { data: timeSlots = [], isLoading: timeLoading } = useQuery({
    queryKey: ['customerTimeSlots'],
    enabled: !!token,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await getApiTime(axiosConfig);
      return extractData(res);
    }
  });

  const salonsData = useMemo(() => {
    const salonMap = new Map();
    
    if (servicesApiData && servicesApiData.length > 0) {
      servicesApiData.forEach((s: any) => {
        const salonName = s.salonName || s.SalonName;
        const salonId = s.salonId || s._id;
        if (salonName && salonName.trim() !== '') {
          if (!salonMap.has(salonName)) {
            salonMap.set(salonName, {
              id: salonId || salonName,
              name: salonName,
              rating: getRandomRating(),
              reviews: getRandomReviews(),
              address: s.salonAddress || "Premium Salon & Spa",
              isOpen: true,
            });
          }
        }
      });
    }

    if (staffApiData && staffApiData.length > 0) {
      staffApiData.forEach((s: any) => {
        const salonName = s.salonName || s.SalonName;
        const salonId = s.salonId || s._id;
        if (salonName && salonName.trim() !== '') {
          if (!salonMap.has(salonName)) {
            salonMap.set(salonName, {
              id: salonId || salonName,
              name: salonName,
              rating: getRandomRating(),
              reviews: getRandomReviews(),
              address: s.salonAddress || "Premium Salon & Spa",
              isOpen: true,
            });
          }
        }
      });
    }
    
    return Array.from(salonMap.values());
  }, [servicesApiData, staffApiData]);

  const totalSalons = salonsData.length;

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
        setSelectedService(null);
        setSelectedDate(null);
        setSelectedTime(null);
        setSelectedStaff(null);
        queryClient.invalidateQueries({ queryKey: ['customerBookings'] });
      }, 4000);
      message.success("Booking Created Successfully");
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Booking failed");
    }
  });

  const getFilteredServices = () => {
    if (!selectedSalonName) return servicesApiData;
    return servicesApiData.filter((service: any) => 
      (service.salonName || service.SalonName) === selectedSalonName && 
      service.isActive === true
    );
  };

  const getFilteredStaff = () => {
    if (!selectedSalonName) return staffApiData;
    return staffApiData.filter((staff: any) => 
      (staff.salonName || staff.SalonName) === selectedSalonName && 
      staff.isActive === true
    );
  };

  const disabledDate = (current: any) => {
    if (!current) return true;
    const dayName = current.format("dddd");
    const dayInfo = timeSlots.find((t: any) => t.day === dayName);
    if (!dayInfo || !dayInfo.isOpen) return true;
    return current < dayjs().startOf("day");
  };

  const disabledTime = () => {
    if (!selectedDate) return {};

    const dayName = selectedDate.format("dddd");
    const dayInfo = timeSlots.find((t: any) => t.day === dayName && t.isOpen);

    if (!dayInfo) return { disabledHours: () => Array.from({ length: 24 }, (_, i) => i) };

    const [openHour, openMin] = dayInfo.opening.split(":").map(Number);
    const [closeHour, closeMin] = dayInfo.closing.split(":").map(Number);

    return {
      disabledHours: () => {
        const hours = [];
        for (let h = 0; h < 24; h++) {
          if (h < openHour || h > closeHour) hours.push(h);
        }
        return hours;
      },
      disabledMinutes: (hour: number) => {
        const minutes = [];
        if (hour === openHour) {
          for (let m = 0; m < openMin; m++) minutes.push(m);
        }
        if (hour === closeHour) {
          for (let m = closeMin + 1; m < 60; m++) minutes.push(m);
        }
        return minutes;
      },
    };
  };

  const getAvailableTimeSlots = () => {
    if (!selectedDate) return [];
    const dayName = selectedDate.format("dddd");
    const dayInfo = timeSlots.find((t: any) => t.day === dayName && t.isOpen);
    if (!dayInfo) return [];
    
    const [openHour, openMin] = dayInfo.opening.split(":").map(Number);
    const [closeHour, closeMin] = dayInfo.closing.split(":").map(Number);
    
    const slots = [];
    const start = new Date();
    start.setHours(openHour, openMin, 0);
    const end = new Date();
    end.setHours(closeHour, closeMin, 0);
    
    while (start < end) {
      const timeStr = start.toTimeString().slice(0, 5);
      slots.push(timeStr);
      start.setMinutes(start.getMinutes() + 30);
    }
    
    return slots;
  };

  const totalPrice = selectedService?.price || 0;
  const isLoading = servicesLoading || staffLoading || timeLoading;

  const confirmBooking = async () => {
    if (!selectedService || !selectedStaff || !selectedDate || !selectedTime || !selectedSalon) {
      message.error("Please complete all steps");
      return;
    }

    if (!selectedService.isActive) {
      message.error("This service is no longer available");
      return;
    }
    if (!selectedStaff.isActive) {
      message.error("This staff member is no longer available");
      return;
    }

    const date = selectedDate.format("YYYY-MM-DD");
    const time = selectedTime.format("HH:mm");
    const appointmentDateTime = new Date(`${date} ${time}`).toISOString();

    const payload = {
      customerId: loggedInUserId,
      serviceId: selectedService.id || selectedService._id,
      staffId: selectedStaff.id || selectedStaff._id,
      appointmentDate: appointmentDateTime,
      salonName: selectedSalonName,
      amount: selectedService.price,
      status: "pending",
    };
    createBookingMutation.mutate(payload);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="text-center p-8">
          <h2 className="text-xl font-bold mb-2">Please Login</h2>
          <p className="text-gray-500">You need to be logged in to book an appointment</p>
        </Card>
      </div>
    );
  }

  if (isLoading) return <Spin fullscreen />;

  if (step === -1) {
    return (
      <div className="min-h-screen from-blue-50 to-indigo-100 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-800 mb-3">Select Your Salon</h1>
            <p className="text-gray-600 text-lg">Choose from our premium salon partners</p>
            {totalSalons > 0 && (
              <p className="text-sm text-gray-400 mt-1">
                Showing {salonsData.length} of {totalSalons} salons
              </p>
            )}
          </div>
          <Row gutter={[24, 24]}>
            {salonsData.length === 0 ? (
              <Col span={24}>
                <Empty 
                  description="No salons available" 
                  className="py-10"
                />
              </Col>
            ) : (
              salonsData.map((salon: any) => (
                <Col xs={24} sm={12} lg={8} key={salon.id}>
                  <Card
                    hoverable
                    className="text-center rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 overflow-hidden"
                    onClick={() => {
                      setSelectedSalon(salon.id);
                      setSelectedSalonName(salon.name);
                      setStep(0);
                    }}
                  >
                    <div className="mb-4">
                      <div className="w-20 h-20 bg-[#183A37] rounded-full flex items-center justify-center mx-auto shadow-md">
                        <ShopOutlined style={{ fontSize: '2rem', color: 'white' }} />
                      </div>
                    </div>
                    <div className="font-bold text-xl mb-2">{salon.name}</div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Rate disabled defaultValue={parseFloat(salon.rating)} allowHalf className="text-yellow-400 text-sm" />
                      <span className="font-semibold text-gray-700">{salon.rating}</span>
                    </div>
                    <div className="text-gray-500 text-sm mb-3">({salon.reviews} reviews)</div>
                    <div className="text-gray-400 text-xs mb-3 flex items-center justify-center gap-1">
                      <EnvironmentOutlined /> {salon.address}
                    </div>
                    <Tag color="green" className="rounded-full px-3 py-1">Open Now</Tag>
                  </Card>
                </Col>
              ))
            )}
          </Row>
        </div>
      </div>
    );
  }

  const filteredServices = getFilteredServices();
  const filteredStaff = getFilteredStaff();
  const availableTimeSlots = getAvailableTimeSlots();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="rounded-2xl shadow-xl border-0 overflow-hidden">
          {selectedSalonName && (
            <div className="mb-6 p-4 bg-[#183a37] rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShopOutlined className="text-2xl" />
                  <div>
                    <div className="font-bold text-lg">{selectedSalonName}</div>
                    <div className="text-blue-100 text-sm">Selected Salon</div>
                  </div>
                </div>
                {salonsData.find((s: any) => s.name === selectedSalonName) && (
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                    <Rate disabled defaultValue={parseFloat(salonsData.find((s: any) => s.name === selectedSalonName)?.rating)} allowHalf className="text-yellow-400 text-xs" />
                    <span className="text-sm font-semibold">{salonsData.find((s: any) => s.name === selectedSalonName)?.rating}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Steps current={step} className="mb-8 px-4">
            {stepsData.map((title, i) => (
              <Step key={i} title={title} />
            ))}
          </Steps>

          <div className="min-h-[300px] px-4">
            {step === 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                  <StarOutlined className="text-yellow-500" />
                  Choose a Service
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {filteredServices.length === 0 ? (
                    <Empty 
                      description="No active services available for this salon" 
                      className="py-10"
                    />
                  ) : (
                    filteredServices.map((service: any) => {
                      const isSelected = selectedService?.id === service.id || selectedService?._id === service._id;
                      return (
                        <div
                          key={service.id || service._id}
                          onClick={() => setSelectedService(service)}
                          className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                            isSelected
                              ? "border-[#183A37] bg-[#183A37]/5"
                              : "border-transparent hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="font-semibold text-lg flex items-center gap-2">
                                {service.serviceName || service.ServiceName}
                                {isSelected && (
                                  <CheckCircleOutlined className="text-[#183A37] text-sm" />
                                )}
                              </div>
                              <div className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                                <ClockCircleOutlined /> 
                                {service.duration || service.Duration} minutes
                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                <UserOutlined /> 
                                {service.category || 'General'}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="font-bold text-2xl text-[#183A37]">
                                ${service.price || service.Price}
                              </div>
                              <div className="text-xs text-gray-400">inclusive tax</div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                  <CalendarOutlined className="text-[#183A37]" />
                  Select Date & Time
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-2 block">Select Date</label>
                    <div className={`rounded-xl border-2 transition-all duration-200 ${
                      selectedDate ? "border-[#183A37] bg-[#183A37]/5" : "border-transparent hover:border-gray-300"
                    }`}>
                      <DatePicker
                        className="w-full border-0 p-3"
                        onChange={(date) => {
                          setSelectedDate(date);
                          setSelectedTime(null);
                        }}
                        disabledDate={disabledDate}
                        placeholder="Choose a date"
                        size="large"
                        format="DD MMM YYYY"
                        suffixIcon={<CalendarOutlined />}
                      />
                    </div>
                    {selectedDate && (
                      <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                        <CheckCircleOutlined className="text-[#183A37]" />
                        <span>{selectedDate.format("dddd, DD MMMM YYYY")} is available</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-2 block">Select Time</label>
                    <div className={`rounded-xl border-2 transition-all duration-200 ${
                      selectedTime ? "border-[#183A37] bg-[#183A37]/5" : "border-transparent hover:border-gray-300"
                    }`}>
                      <TimePicker
                        className="w-full border-0 p-3"
                        format="HH:mm"
                        minuteStep={30}
                        onChange={setSelectedTime}
                        disabledTime={disabledTime}
                        placeholder="Choose a time"
                        size="large"
                        value={selectedTime}
                        suffixIcon={<ClockCircleOutlined />}
                      />
                    </div>
                    {selectedTime && (
                      <div className="mt-2 text-sm text-blue-600 flex items-center gap-1">
                        <ClockCircleOutlined className="text-[#183A37]" />
                        <span>Selected time: {selectedTime.format("HH:mm")}</span>
                      </div>
                    )}
                  </div>

                  {selectedDate && availableTimeSlots.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-2 block">Available Time Slots</label>
                      <div className="flex flex-wrap gap-2">
                        {availableTimeSlots.slice(0, 8).map((slot, index) => {
                          const isSelected = selectedTime && selectedTime.format("HH:mm") === slot;
                          return (
                            <div
                              key={index}
                              onClick={() => {
                                const time = dayjs(`2000-01-01 ${slot}`);
                                setSelectedTime(time);
                              }}
                              className={`px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                                isSelected
                                  ? "border-[#183A37] bg-[#183A37]/5 text-[#183A37] font-medium"
                                  : "border-transparent hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {slot}
                            </div>
                          );
                        })}
                        {availableTimeSlots.length > 8 && (
                          <div className="px-4 py-2 rounded-lg border-2 border-transparent bg-gray-100 text-gray-600">
                            +{availableTimeSlots.length - 8} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                  <UserOutlined className="text-[#183A37]" />
                  Choose a Stylist
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {filteredStaff.length === 0 ? (
                    <Empty 
                      description="No active staff available for this salon" 
                      className="py-10"
                    />
                  ) : (
                    filteredStaff.map((staff: any) => {
                      const isSelected = selectedStaff?.id === staff.id || selectedStaff?._id === staff._id;
                      return (
                        <div
                          key={staff.id || staff._id}
                          onClick={() => setSelectedStaff(staff)}
                          className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                            isSelected
                              ? "border-[#183A37] bg-[#183A37]/5"
                              : "border-transparent hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md ${
                              isSelected ? "bg-[#183A37]" : "bg-gradient-to-br from-gray-400 to-gray-600"
                            }`}>
                              <span className="text-2xl font-bold text-white">
                                {(staff.fullName || staff.FullName || staff.name || "S").charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-lg flex items-center gap-2">
                                {staff.fullName || staff.FullName || staff.name}
                                {isSelected && (
                                  <CheckCircleOutlined className="text-[#183A37] text-sm" />
                                )}
                              </div>
                              <div className="text-gray-500 text-sm flex items-center gap-2">
                                <UserOutlined /> 
                                {staff.role || staff.Role || "Stylist"}
                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                <StarOutlined className="text-yellow-500" />
                                {getRandomRating()} rating
                              </div>
                            </div>
                            <Tag color={isSelected ? "green" : "blue"} className="rounded-full">
                              {isSelected ? "Selected" : "Available"}
                            </Tag>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                  <CheckCircleOutlined className="text-green-500" />
                  Review Your Booking
                </h3>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-gray-600 flex items-center gap-2">
                        <StarOutlined className="text-yellow-500" />
                        Service
                      </span>
                      <span className="font-semibold">{selectedService?.serviceName || selectedService?.ServiceName}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-gray-600 flex items-center gap-2">
                        <UserOutlined />
                        Stylist
                      </span>
                      <span className="font-semibold">{selectedStaff?.fullName || selectedStaff?.FullName || selectedStaff?.name}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-gray-600 flex items-center gap-2">
                        <ShopOutlined />
                        Salon
                      </span>
                      <span className="font-semibold">{selectedSalonName}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-gray-600 flex items-center gap-2">
                        <CalendarOutlined />
                        Date & Time
                      </span>
                      <span className="font-semibold">{selectedDate?.format("DD MMM YYYY")} at {selectedTime?.format("HH:mm")}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-gray-600 flex items-center gap-2">
                        <ClockCircleOutlined />
                        Duration
                      </span>
                      <span className="font-semibold">{selectedService?.duration || selectedService?.Duration} minutes</span>
                    </div>
                    <div className="flex justify-between items-center pt-3">
                      <span className="text-lg font-semibold flex items-center gap-2">
                        <DollarOutlined className="text-[#183A37]" />
                        Total Amount
                      </span>
                      <span className="text-2xl font-bold text-[#183A37]">${totalPrice}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Divider className="my-6" />
          <div className="flex justify-between px-4">
            <Button 
              size="large" 
              onClick={() => setStep(step - 1)} 
              disabled={step === 0}
              className="hover:border-[#183A37] hover:text-[#183A37]"
            >
              Back
            </Button>
            {step === 3 ? (
              <Button 
                type="primary" 
                size="large" 
                onClick={confirmBooking} 
                loading={createBookingMutation.isPending} 
                className="bg-[#183A37] hover:bg-[#0f2825] border-none"
              >
                Confirm Booking
              </Button>
            ) : (
              <Button
                type="primary"
                size="large"
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 0 && !selectedService) ||
                  (step === 1 && (!selectedDate || !selectedTime)) ||
                  (step === 2 && !selectedStaff)
                }
                className="bg-[#183A37] hover:bg-[#0f2825] border-none"
              >
                Next
              </Button>
            )}
          </div>
        </Card>
      </div>

      <Modal open={showConfirmation} footer={null} closable={false} centered width={450}>
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleOutlined className="text-4xl text-green-500" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Booking Confirmed!</h3>
          <p className="text-gray-600 mb-4">Your appointment has been booked successfully.</p>
          {createdBooking && (
            <div className="bg-gray-50 p-4 rounded-xl text-left">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Status:</span>
                <Tag color="orange">Pending</Tag>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Salon:</span>
                <span className="font-medium">{createdBooking.salonName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total:</span>
                <span className="font-bold text-[#183A37] text-lg">${createdBooking.amount}</span>
              </div>
            </div>
          )}
          <div className="mt-6 flex justify-center">
            <div className="animate-pulse">
              <span className="text-sm text-gray-400">Redirecting to salon selection...</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default CustomerAppointment;