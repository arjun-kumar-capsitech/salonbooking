import { Form, Input, TimePicker, Button, Tabs, Row, Col, Switch, Card, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import { getSalonBookingAPI } from '../../api/generated';

const { TabPane } = Tabs;
const { getApiUserId,putApiUserId,getApiTime,postApiTime,putApiTimeDay,} = getSalonBookingAPI();

interface DayTiming {
  id?: string;
  day: string;
  opening: string;
  closing: string;
  isOpen: boolean;
}

type TimingRecord = Record<string, DayTiming>;

const Settings = () => {
  const [form] = Form.useForm();
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [adminId, setAdminId] = useState<string>("");
  
  const days = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  ];
  
  const defaultTimings: TimingRecord = {
    Monday: { day: "Monday", opening: "09:00", closing: "18:00", isOpen: true },
    Tuesday: { day: "Tuesday", opening: "09:00", closing: "18:00", isOpen: true },
    Wednesday: { day: "Wednesday", opening: "09:00", closing: "18:00", isOpen: true },
    Thursday: { day: "Thursday", opening: "09:00", closing: "18:00", isOpen: true },
    Friday: { day: "Friday", opening: "09:00", closing: "18:00", isOpen: true },
    Saturday: { day: "Saturday", opening: "10:00", closing: "17:00", isOpen: true },
    Sunday: { day: "Sunday", opening: "10:00", closing: "16:00", isOpen: false }
  };
  
  const [timings, setTimings] = useState<TimingRecord>(defaultTimings);

  const token = localStorage.getItem("authToken");
  const loginUser = JSON.parse(localStorage.getItem("user") || "{}");

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  const extractData = (response: any) => {
    if (!response || !response.data) return null;
    if (response.data?.status === true && response.data?.result) {
      return response.data.result;
    }
    if (response.data?.result) {
      return response.data.result;
    }
    return response.data;
  };

  const loadSalonData = async () => {
    try {
      if (!loginUser?.id) {
        message.error("User not found");
        return;
      }

      setAdminId(loginUser.id);

      const userRes = await getApiUserId(loginUser.id, axiosConfig);
      const userData = extractData(userRes);
      const admin = userData;

      form.setFieldsValue({
        name: admin?.salonName || admin?.SalonName,
        email: admin?.email || admin?.Email,
        phone: admin?.phoneNumber || admin?.PhoneNumber,
        address: admin?.salonAddress || admin?.SalonAddress
      });

      const timeRes = await getApiTime(axiosConfig);
      let allTimings = extractData(timeRes);
      
      if (!Array.isArray(allTimings)) {
        allTimings = [];
      }
      
      const userTimings = allTimings.filter((t: any) =>
        t.userId === loginUser.id || t.UserId === loginUser.id
      );

      if (userTimings.length > 0) {
        const updatedTimings = { ...defaultTimings };

        userTimings.forEach((t: any) => {
          updatedTimings[t.day || t.Day] = {
            id: t.id || t._id,
            day: t.day || t.Day,
            opening: t.opening || t.Opening,
            closing: t.closing || t.Closing,
            isOpen: t.isOpen !== undefined ? t.isOpen : t.IsOpen
          };
        });

        setTimings(updatedTimings);
      }
    } catch (err) {
      console.log(err);
      message.error("Failed to load salon data");
    }
  };

  useEffect(() => {
    if (token && loginUser?.id) {
      loadSalonData();
    }
  }, [token]);

  const handleTimeChange = (time: Dayjs | null, type: "opening" | "closing") => {
    if (time) {
      setTimings(prev => ({
        ...prev,
        [selectedDay]: {
          ...prev[selectedDay],
          [type]: time.format("HH:mm")
        }
      }));
    }
  };

  const getTimeValue = (timeString: string) => {
    return timeString ? dayjs(timeString, "HH:mm") : null;
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      const userRes = await getApiUserId(adminId, axiosConfig);
      const userData = extractData(userRes);
      
      await putApiUserId(adminId, {
        fullName: userData?.fullName || userData?.FullName,
        email: values.email,
        phoneNumber: values.phone,
        salonName: values.name,
        salonAddress: values.address,
        role: userData?.role || userData?.Role,
        isActive: userData?.isActive !== undefined ? userData.isActive : userData?.IsActive
      }, axiosConfig);

      const existingTimesRes = await getApiTime(axiosConfig);
      let existingTimes = extractData(existingTimesRes);
      
      if (!Array.isArray(existingTimes)) {
        existingTimes = [];
      }
      
      const timePromises = Object.entries(timings).map(async ([day, timing]) => {
        const existing = existingTimes.find(
          (t: any) => (t.day === day || t.Day === day) && (t.userId === adminId || t.UserId === adminId)
        );

        const payload = {
          day: day,
          opening: timing.opening,
          closing: timing.closing,
          isOpen: timing.isOpen
        };

        if (existing) {
          await putApiTimeDay(day, payload, axiosConfig);
        } else {
          await postApiTime(payload, axiosConfig);
        }
      });

      await Promise.all(timePromises);

      message.success("Salon settings updated successfully");
      loadSalonData();

    } catch (error) {
      console.log(error);
      message.error("Failed to save settings");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Salon Settings</h1>
        <p className="text-gray-600">Manage salon booking settings</p>
      </div>
      
      <Tabs defaultActiveKey="1">
        <TabPane tab="General" key="1">
          <Row gutter={24} className="mb-6">
            <Col span={12}>
              <Card title="Manage your profile" className="border-0 shadow-lg h-full">
                <Form form={form} layout="vertical">
                  <Form.Item
                    label="Salon Name"
                    name="name"
                    rules={[{ required: true, message: "Salon name is required" }]}
                  >
                    <Input placeholder="Enter salon name" />
                  </Form.Item>
                  <Form.Item
                    label="Salon Email"
                    name="email"
                    rules={[{ required: true, message: "Email is required" }, { type: 'email', message: 'Enter valid email' }]}
                  >
                    <Input placeholder="Enter email" />
                  </Form.Item>
                  <Form.Item
                    label="Salon Phone"
                    name="phone"
                    rules={[{ required: true, message: "Phone number is required" }]}
                  >
                    <Input placeholder="Enter phone number" />
                  </Form.Item>
                  <Form.Item
                    label="Salon Address"
                    name="address"
                    rules={[{ required: true, message: "Address is required" }]}
                  >
                    <Input.TextArea rows={2} placeholder="Enter address" />
                  </Form.Item>
                </Form>
              </Card>
            </Col>
            
            <Col span={12}>
              <Card title="Working Hours" className="border-0 shadow-lg h-full">
                <div className="mb-4">
                  <div className="text-sm font-semibold mb-2">Select Day</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {days.map(day => (
                      <Button
                        key={day}
                        type={selectedDay === day ? "primary" : "default"}
                        size="small"
                        onClick={() => setSelectedDay(day)}
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium">Timings for {selectedDay}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Closed</span>
                      <Switch
                        checked={timings[selectedDay]?.isOpen}
                        onChange={checked =>
                          setTimings(prev => ({
                            ...prev,
                            [selectedDay]: {
                              ...prev[selectedDay],
                              isOpen: checked
                            }
                          }))
                        }
                        size="small"
                      />
                      <span className="text-sm">Open</span>
                    </div>
                  </div>
                  
                  {timings[selectedDay]?.isOpen && (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="text-sm text-gray-500 mb-1">Opening Time</div>
                        <TimePicker
                          value={getTimeValue(timings[selectedDay]?.opening)}
                          format="HH:mm"
                          style={{ width: "100%" }}
                          onChange={time => handleTimeChange(time, "opening")}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-500 mb-1">Closing Time</div>
                        <TimePicker
                          value={getTimeValue(timings[selectedDay]?.closing)}
                          format="HH:mm"
                          style={{ width: "100%" }}
                          onChange={time => handleTimeChange(time, "closing")}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-2 justify-end">
                  <Button size="large" onClick={() => loadSalonData()}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                  >
                    Save All Settings
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Settings;