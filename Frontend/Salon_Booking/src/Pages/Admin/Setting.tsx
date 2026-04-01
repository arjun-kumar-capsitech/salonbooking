import { Form, Input, TimePicker, Button, Tabs, Row, Col, Switch, Card, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import axios from "axios";

const { TabPane } = Tabs;

interface DayTiming {
  opening: string;
  closing: string;
  isOpen: boolean;
}

type TimingRecord = Record<string, DayTiming>;

const USER_API = "http://localhost:5296/api/User";
const TIME_API = "http://localhost:5296/api/Time";

const Settings = () => {
  const [form] = Form.useForm();
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [adminId, setAdminId] = useState<string>("");

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const [timings, setTimings] = useState<TimingRecord>({
    Monday: { opening: "09:00", closing: "18:00", isOpen: true },
    Tuesday: { opening: "09:00", closing: "18:00", isOpen: true },
    Wednesday: { opening: "09:00", closing: "18:00", isOpen: true },
    Thursday: { opening: "09:00", closing: "18:00", isOpen: true },
    Friday: { opening: "09:00", closing: "18:00", isOpen: true },
    Saturday: { opening: "10:00", closing: "17:00", isOpen: true },
    Sunday: { opening: "10:00", closing: "16:00", isOpen: false }
  });

  const loadSalonData = async () => {
    try {
      const res = await axios.get(USER_API);
      const admin = res.data.find((u: any) => u.role === 2);
      if (admin) {
        setAdminId(admin.id);
        form.setFieldsValue({
          name: admin.salonName,
          email: admin.email,
          phone: admin.phoneNumber,
          address: admin.salonAddress
        });

        if (admin.timings) setTimings(admin.timings);
      }
    } catch (err) {
      message.error("Failed to load salon data");
    }
  };

  useEffect(() => {
    loadSalonData();
  }, []);

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

      const res = await axios.get(`${USER_API}/${adminId}`);
      const userData = res.data;

      await axios.put(`${USER_API}/${adminId}`, {
        ...userData,
        salonName: values.name,
        email: values.email,
        phoneNumber: values.phone,
        salonAddress: values.address
      });


      const timePromises = Object.entries(timings).map(async ([day, timing]) => {
        const payload = {
          day,
          opening: timing.opening,
          closing: timing.closing,
          isOpen: timing.isOpen,
          createdAt: new Date().toISOString()
        };
        await axios.post(TIME_API, payload);
      });

      await Promise.all(timePromises);

      message.success("Salon settings and timings updated successfully");
    } catch (error) {
      console.error(error);
      message.error("Failed to save settings");
    }
  };

  return (
    <>
      <div className="p-2">
        <div className="mb-3">
          <h1 className="text-2xl font-semibold">Salon Settings</h1>
          <p>Manage salon booking settings</p>
        </div>

        <Tabs defaultActiveKey="1">
          <TabPane tab="General" key="1">
            <Row gutter={24} className="mb-6">


              <Col span={12}>
                <Card title="Manage your profile" className="border-0 shadow-lg h-full">
                  <Form form={form} layout="vertical">
                    <Form.Item label="Salon Name" name="name" rules={[{ required: true }]}>
                      <Input placeholder="Enter salon name" />
                    </Form.Item>
                    <Form.Item label="Salon Email" name="email" rules={[{ required: true }]}>
                      <Input placeholder="Enter email address" />
                    </Form.Item>
                    <Form.Item label="Salon Phone" name="phone" rules={[{ required: true }]}>
                      <Input placeholder="Enter phone number" />
                    </Form.Item>
                    <Form.Item label="Salon Address" name="address" rules={[{ required: true }]}>
                      <Input.TextArea placeholder="Enter address" rows={2} />
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
                          checked={timings[selectedDay].isOpen}
                          onChange={checked =>
                            setTimings(prev => ({
                              ...prev,
                              [selectedDay]: { ...prev[selectedDay], isOpen: checked }
                            }))
                          }
                          size="small"
                        />
                        <span className="text-sm">Open</span>
                      </div>
                    </div>

                    {timings[selectedDay].isOpen && (
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <div className="text-sm text-gray-500 mb-1">Opening Time</div>
                          <TimePicker
                            value={getTimeValue(timings[selectedDay].opening)}
                            format="HH:mm"
                            style={{ width: "100%" }}
                            onChange={time => handleTimeChange(time, "opening")}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-500 mb-1">Closing Time</div>
                          <TimePicker
                            value={getTimeValue(timings[selectedDay].closing)}
                            format="HH:mm"
                            style={{ width: "100%" }}
                            onChange={time => handleTimeChange(time, "closing")}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-25 flex gap-2 justify-end">
                    <Button size="large">Cancel</Button>
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
    </>
  );
};

export default Settings;