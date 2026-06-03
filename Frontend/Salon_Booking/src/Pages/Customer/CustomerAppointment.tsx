import React, { useState, useEffect } from "react";
import { Card, Button, Row, Col, Modal, Steps, DatePicker, TimePicker, Divider, message, Spin, Rate, Tag } from "antd";
import { ShopOutlined, CheckCircleOutlined, ClockCircleOutlined, UserOutlined, EnvironmentOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';
const { Step } = Steps;
const stepsData = ["Services", "Date & Time", "Staff", "Confirm"];
const {getApiAdminServices,getApiStaff,getApiUser,getApiTime,postApiBooking} = getSalonBookingAPI();
const CustomerAppointment: React.FC = () => {
  const [servicesData, setServicesData] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any[]>([]);
  const [salonsData, setSalonsData] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState<string | null>(null);
  const [selectedSalonName, setSelectedSalonName] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<any>(null);
  const [selectedTime, setSelectedTime] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const extractData = (response: any) => {
    if (!response || !response.data) return [];
    if (response.data?.status === true && response.data?.result) {
      return response.data.result;
    }
    if (response.data?.result) {
      return response.data.result;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  };

  const getRandomRating = () => {
    return (3 + Math.random() * 2).toFixed(1);
  };

  const getRandomReviews = () => {
    return Math.floor(Math.random() * 500) + 10;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [servicesRes, staffRes, usersRes, timeRes] = await Promise.all([
          getApiAdminServices(axiosConfig),
          getApiStaff(axiosConfig),
          getApiUser(axiosConfig),
          getApiTime(axiosConfig),
        ]);

        const services = extractData(servicesRes);
        const staff = extractData(staffRes);
        const users = extractData(usersRes);
        const times = extractData(timeRes);

        const activeServices = services.filter((s: any) => s.isActive === true);
        const activeStaff = staff.filter((s: any) => s.isActive === true);

        setServicesData(activeServices);
        setStaffData(activeStaff);
        setTimeSlots(times);

        const salons = users
          .filter((u: any) => u.role === 2)
          .map((admin: any) => ({
            id: admin.id || admin._id,
            name: admin.salonName || admin.SalonName || admin.fullName,
            rating: getRandomRating(),
            reviews: getRandomReviews(),
            address: admin.salonAddress || admin.SalonAddress || "Address not available",
            isOpen: true,
          }))
          .filter((salon: any) => salon.name);

        setSalonsData(salons);
      } catch (error) {
        console.error("Error fetching data:", error);
        message.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getFilteredServices = () => {
    if (!selectedSalonName) return servicesData;
    return servicesData.filter((service: any) => 
      (service.salonName || service.SalonName) === selectedSalonName && service.isActive === true
    );
  };

  const getFilteredStaff = () => {
    if (!selectedSalonName) return staffData;
    return staffData.filter((staff: any) => 
      (staff.salonName || staff.SalonName) === selectedSalonName && staff.isActive === true
    );
  };

  const disabledDate = (current: any) => {
    if (!current) return true;
    const dayName = current.format("dddd");
    const dayInfo = timeSlots.find((t) => t.day === dayName);
    if (!dayInfo || !dayInfo.isOpen) return true;
    return current < dayjs().startOf("day");
  };

  const disabledTime = () => {
    if (!selectedDate) return {};

    const dayName = selectedDate.format("dddd");
    const dayInfo = timeSlots.find((t) => t.day === dayName && t.isOpen);

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

  const totalPrice = selectedService?.price || 0;

  const confirmBooking = async () => {
    try {
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
        customerId: user?.id || user?._id,
        serviceId: selectedService.id || selectedService._id,
        staffId: selectedStaff.id || selectedStaff._id,
        appointmentDate: appointmentDateTime,
        salonName: selectedSalonName,
        amount: selectedService.price,
        status: "pending",
      };

      const res = await postApiBooking(payload, axiosConfig);
      const data = extractData(res);
      
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
      }, 4000);

      message.success("Booking Created Successfully");
    } catch (error) {
      console.error("Booking error:", error);
      message.error("Booking failed");
    }
  };

  if (loading) return <Spin fullscreen />;

  if (step === -1) {
    return (
      <div className="min-h-screen from-blue-50 to-indigo-100 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-800 mb-3">Select Your Salon</h1>
            <p className="text-gray-600 text-lg">Choose from our premium salon partners</p>
          </div>
          <Row gutter={[24, 24]}>
            {salonsData.map((salon) => (
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
            ))}
          </Row>
        </div>
      </div>
    );
  }

  const filteredServices = getFilteredServices();
  const filteredStaff = getFilteredStaff();

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
                {salonsData.find(s => s.name === selectedSalonName) && (
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                    <Rate disabled defaultValue={parseFloat(salonsData.find(s => s.name === selectedSalonName)?.rating)} allowHalf className="text-yellow-400 text-xs" />
                    <span className="text-sm font-semibold">{salonsData.find(s => s.name === selectedSalonName)?.rating}</span>
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
                <h3 className="text-lg font-semibold mb-4 text-gray-700">Choose a Service</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {filteredServices.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl">
                      No active services available for this salon
                    </div>
                  ) : (
                    filteredServices.map((service) => (
                      <div
                        key={service.id || service._id}
                        onClick={() => setSelectedService(service)}
                        className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                          selectedService?.id === service.id || selectedService?._id === service._id
                            ? "border-2 border-blue-500 bg-blue-50 shadow-md"
                            : "border border-gray-200 hover:border-blue-300 hover:shadow-sm bg-white"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-lg">{service.serviceName || service.ServiceName}</div>
                            <div className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                              <ClockCircleOutlined /> {service.duration || service.Duration} minutes
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-2xl text-blue-600">${service.price || service.Price}</div>
                            <div className="text-xs text-gray-400">inclusive tax</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">Select Date & Time</h3>
                <div className="space-y-5">
                  <DatePicker
                    className="w-full"
                    onChange={setSelectedDate}
                    disabledDate={disabledDate}
                    placeholder="Select Date"
                    size="large"
                    format="DD MMM YYYY"
                  />
                  <TimePicker
                    className="w-full"
                    format="HH:mm"
                    minuteStep={5}
                    onChange={setSelectedTime}
                    disabledTime={disabledTime}
                    placeholder="Select Time"
                    size="large"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">Choose a Stylist</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {filteredStaff.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl">
                      No active staff available for this salon
                    </div>
                  ) : (
                    filteredStaff.map((staff) => (
                      <div
                        key={staff.id || staff._id}
                        onClick={() => setSelectedStaff(staff)}
                        className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                          selectedStaff?.id === staff.id || selectedStaff?._id === staff._id
                            ? "border-2 border-blue-500 bg-blue-50 shadow-md"
                            : "border border-gray-200 hover:border-blue-300 hover:shadow-sm bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-2xl font-bold text-white">
                              {(staff.fullName || staff.FullName || staff.name || "S").charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-lg">
                              {staff.fullName || staff.FullName || staff.name}
                            </div>
                            <div className="text-gray-500 text-sm flex items-center gap-2">
                              <UserOutlined /> {staff.role || staff.Role || "Stylist"}
                            </div>
                          </div>
                          <Tag color="green" className="rounded-full">Available</Tag>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">Review Your Booking</h3>
                <div className="bg-gray-50 p-6 rounded-xl">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-600">Service</span>
                      <span className="font-semibold">{selectedService?.serviceName || selectedService?.ServiceName}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-600">Stylist</span>
                      <span className="font-semibold">{selectedStaff?.fullName || selectedStaff?.FullName || selectedStaff?.name}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-600">Salon</span>
                      <span className="font-semibold">{selectedSalonName}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-600">Date & Time</span>
                      <span className="font-semibold">{selectedDate?.format("DD MMM YYYY")} at {selectedTime?.format("HH:mm")}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3">
                      <span className="text-lg font-semibold">Total Amount</span>
                      <span className="text-2xl font-bold text-blue-600">${totalPrice}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Divider className="my-6" />
          <div className="flex justify-between px-4">
            <Button size="large" onClick={() => setStep(step - 1)} disabled={step === 0}>
              Back
            </Button>
            {step === 3 ? (
              <Button type="primary" size="large" onClick={confirmBooking} className="bg-blue-600 hover:bg-blue-700">
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
                <span className="font-bold text-blue-600 text-lg">${createdBooking.amount}</span>
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