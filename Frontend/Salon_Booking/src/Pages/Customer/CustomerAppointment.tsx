  import React, { useState, useEffect } from "react";
  import { Card, Button, Row, Col, Modal, Steps, DatePicker, TimePicker, Divider, message, Spin,} from "antd";
  import { ShopOutlined, CheckCircleOutlined } from "@ant-design/icons";
  import dayjs from "dayjs";

  const { Step } = Steps;
  const stepsData = ["Services", "Date & Time", "Staff", "Confirm"];

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

    useEffect(() => {
      const fetchData = async () => {
        try {
          setLoading(true);
          const [servicesRes, staffRes, usersRes, timeRes] = await Promise.all([
            fetch("http://localhost:5296/api/AdminServices"),
            fetch("http://localhost:5296/api/Staff"),
            fetch("http://localhost:5296/api/User"),
            fetch("http://localhost:5296/api/Time"),
          ]);

          const services = await servicesRes.json();
          const staff = await staffRes.json();
          const users = await usersRes.json();
          const times = await timeRes.json();

          setServicesData(services);
          setStaffData(staff);
          setTimeSlots(times);

          const salons = users
            .filter((u: any) => u.role === 2)
            .map((admin: any) => ({
              id: admin.id,
              name: admin.salonName || admin.fullName,
            }));

          setSalonsData(salons);
        } catch {
          message.error("Failed to load data");
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }, []);

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
        const token = localStorage.getItem("authToken");
        const user = JSON.parse(localStorage.getItem("user") || "{}");

        if (!selectedService || !selectedStaff || !selectedDate || !selectedTime || !selectedSalon) {
          message.error("Please complete all steps");
          return;
        }

        const date = selectedDate.format("YYYY-MM-DD");
        const time = selectedTime.format("HH:mm");
        const appointmentDateTime = new Date(`${date} ${time}`).toISOString();

        const payload = {
          customerId: user.id,
          serviceId: selectedService.id,
          staffId: selectedStaff.id,
          appointmentDate: appointmentDateTime,
          salonName: selectedSalonName,
          amount: selectedService.price,
          status: "pending",
        };

        const res = await fetch("http://localhost:5296/api/Booking", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error();

        const data = await res.json();
        setCreatedBooking(data);
        setShowConfirmation(true);

        setTimeout(() => {
          setShowConfirmation(false);
          window.location.reload();
        }, 4000);

        message.success("Booking Created");
      } catch {
        message.error("Booking failed");
      }
    };

    if (loading) return <Spin fullscreen />;

    if (step === -1) {
      return (
        <div className="h-full bg-gray-50 py-10 px-4">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-center">
              Select Salon
            </h1>
            <Row gutter={[24, 24]}>
              {salonsData.map((salon) => (
                <Col xs={24} sm={12} lg={8} key={salon.id}>
                  <Card
                    hoverable
                    className="text-center rounded-xl shadow-md"
                    onClick={() => {
                      setSelectedSalon(salon.id);
                      setSelectedSalonName(salon.name);
                      setStep(0);
                    }}
                  >
                    <ShopOutlined className="text-3xl text-blue-500 mb-3" />
                    <div className="font-medium text-lg">{salon.name}</div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      );
    }

    return (
      <div className=" bg-gray-50 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-lg rounded-xl">
            {selectedSalonName && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ShopOutlined className="text-blue-500" />
                  <span className="font-medium">{selectedSalonName}</span>
                </div>
              </div>
            )}

            <Steps current={step} className="mb-10">
              {stepsData.map((title, i) => (
                <Step key={i} title={title} />
              ))}
            </Steps>

            <div className="min-h-[250px] mt-10">
              {step === 0 &&
                servicesData.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className={`p-4 rounded-xl cursor-pointer mb-4 ${
                      selectedService?.id === service.id
                        ? "border-2 border-blue-500 bg-blue-50"
                        : "border border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between text-lg">
                      <span>{service.serviceName}</span>
                      <span className="font-semibold">${service.price}</span>
                    </div>
                  </div>
                ))}

              {step === 1 && (
                <>
                  <DatePicker
                    className="w-full"
                    onChange={setSelectedDate}
                    disabledDate={disabledDate}
                  />
                  <div className="mt-5">
                    <TimePicker
                      className="w-full"
                      format="HH:mm"
                      minuteStep={5}
                      onChange={setSelectedTime}
                      disabledTime={disabledTime}
                    />
                  </div>
                </>
              )}

              {step === 2 &&
                staffData.map((staff) => (
                  <div
                    key={staff.id}
                    onClick={() => setSelectedStaff(staff)}
                    className={`p-4 rounded-xl cursor-pointer mb-4 ${
                      selectedStaff?.id === staff.id
                        ? "border-2 border-blue-500 bg-blue-50"
                        : "border border-gray-200"
                    }`}
                  >
                    <div className="font-medium text-lg">{staff.name}</div>
                  </div>
                ))}

              {step === 3 && (
                <div className="space-y-3 text-lg">
                  <p>
                    <strong>Service:</strong> {selectedService?.serviceName}
                  </p>
                  <p>
                    <strong>Staff:</strong> {selectedStaff?.name}
                  </p>
                  <p>
                    <strong>Salon:</strong> {selectedSalonName}
                  </p>
                  <p className="text-blue-600 font-semibold">Total: ${totalPrice}</p>
                </div>
              )}
            </div>

            <Divider />

            <div className="flex justify-between mt-6">
              <Button onClick={() => setStep(step - 1)} disabled={step === 0}>
                Back
              </Button>

              {step === 3 ? (
                <Button type="primary" onClick={confirmBooking}>
                  Confirm Booking
                </Button>
              ) : (
                <Button
                  type="primary"
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

        <Modal open={showConfirmation} footer={null}>
          <div className="text-center py-6">
            <CheckCircleOutlined className="text-5xl text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Booking Confirmed</h3>

            {createdBooking && (
              <>
                <p>Status: pending</p>
                <p className="text-gray-600">Salon: {createdBooking.salonName}</p>
                <p className="font-semibold text-blue-600 mb-4">Total: ${createdBooking.amount}</p>
              </>
            )}
          </div>
        </Modal>
      </div>
    );
  };

  export default CustomerAppointment;