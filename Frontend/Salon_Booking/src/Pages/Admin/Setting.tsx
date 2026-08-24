import { Form, Input, TimePicker, Button, Row, Col, Switch, Card, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSalonBookingAPI, type TimeDto } from "../../api/generated";
import type {ProfileFormValues,TimingRecord} from "../../Types/Alltypes"; 
const { getApiUserId, putApiUserId, getApiTime, postApiTime } = getSalonBookingAPI();

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const axiosConfig = { withCredentials: true };
const Settings = () => {
  const [form] = Form.useForm<ProfileFormValues>();
  const [selectedDay, setSelectedDay] = useState<string>("Monday");
  const [timings, setTimings] = useState<TimingRecord>({});
  const queryClient = useQueryClient();
  const loginUser = JSON.parse(localStorage.getItem("user") || "{}");
  const adminId = loginUser?.id;
  
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["user", adminId],
    enabled: !!adminId,
    queryFn: async () => {
      const response = await getApiUserId(adminId, axiosConfig);
      return response.data?.result ?? null;
    },
  });

  const { data: timingsData = [], isLoading: timingsLoading } = useQuery<TimeDto[]>({
    queryKey: ["timings", "global"],
    enabled: !!adminId,
    queryFn: async () => {
      const response = await getApiTime({ userId: adminId }, axiosConfig);
      const result = (response.data as { result?: TimeDto[] } | undefined)?.result;
      if (!Array.isArray(result)) {
        return [];
      }
      return result.filter((timing: TimeDto) => DAYS.includes(timing.day ?? ""));
    },
  });

  useEffect(() => {
    const apiTimings: TimingRecord = {};
    timingsData.forEach((timing: TimeDto) => {
      const day = timing.day;

      if (!day || !DAYS.includes(day)) {
        return;
      }
      apiTimings[day] = {
        day,
        opening: timing.opening ?? "",
        closing: timing.closing ?? "",
        isOpen: timing.isOpen ?? false,
      };
    });
    setTimings(apiTimings);
  }, [timingsData]);

  useEffect(() => {
    if (!userData) {
      return;
    }
    form.setFieldsValue({
      name: userData.salonName ?? "",
      email: userData.email ?? "",
      phone: userData.phoneNumber ?? "",
      address: userData.salonAddress ?? "",
    });
  }, [userData, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (!adminId) {
        throw new Error("User ID not found");
      }
      await putApiUserId(adminId, {
        fullName: userData?.fullName ?? "",
        email: values.email,
        phoneNumber: values.phone,
        salonName: values.name,
        salonAddress: values.address,
        role: userData?.role ?? 2,
        isActive: userData?.isActive ?? true,
      }, axiosConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", adminId] });
    },
  });

  const saveTimingsMutation = useMutation({
    mutationFn: async () => {
      if (!adminId) {
        throw new Error("User ID not found");
      }
      const salonName = userData?.salonName ?? loginUser?.salonName ?? "";
      const requests = DAYS.map((day) => {
        const timing = timings[day];

        if (!timing) {
          return null;
        }

        return postApiTime({
          day,
          opening: timing.opening || "09:00",
          closing: timing.closing || "18:00",
          isOpen: timing.isOpen,
          userId: adminId,
          salonName,
        }, axiosConfig);
      }).filter(Boolean);

      await Promise.all(requests);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timings", "global"] });
    },
  });

  const handleTimeChange = (time: dayjs.Dayjs | null, type: "opening" | "closing") => {
    if (!time) {
      return;
    }

    setTimings((previous) => ({
      ...previous,
      [selectedDay]: {
        ...previous[selectedDay],
        day: selectedDay,
        opening: type === "opening" ? time.format("HH:mm") : previous[selectedDay]?.opening ?? "",
        closing: type === "closing" ? time.format("HH:mm") : previous[selectedDay]?.closing ?? "",
        isOpen: previous[selectedDay]?.isOpen ?? true,
      },
    }));
  };

  const getTimeValue = (value?: string) => {
    if (!value) {
      return null;
    }
    return dayjs(value, "HH:mm");
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await updateProfileMutation.mutateAsync(values);
      await saveTimingsMutation.mutateAsync();
      message.success("Salon settings updated successfully");
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleCancel = async () => {
    await queryClient.invalidateQueries({ queryKey: ["user", adminId] });
    await queryClient.invalidateQueries({ queryKey: ["timings", "global"] });
  };

  const isLoading = userLoading || timingsLoading || updateProfileMutation.isPending || saveTimingsMutation.isPending;

  return (
    <div className="p-6" style={{ fontFamily: "Public Sans, sans-serif" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "PT Serif, serif" }}>Salon Settings</h1>
        <p className="text-gray-600">Manage salon booking settings</p>
      </div>

      <Row gutter={24} className="mb-6">
        <Col xs={24} lg={12}>
          <Card title="Manage your profile" className="border-0 shadow-lg h-full">
            <Form form={form} layout="vertical">
              <Form.Item label="Salon Name" name="name" rules={[{ required: true, message: "Salon name is required" }]}>
                <Input placeholder="Enter salon name" />
              </Form.Item>

              <Form.Item label="Salon Email" name="email" rules={[{ required: true, message: "Email is required" }, 
                { type: "email", message: "Enter valid email" }]}>
                <Input placeholder="Enter email" />
              </Form.Item>

              <Form.Item label="Salon Phone" name="phone" rules={[{ required: true, message: "Phone number is required" }]}>
                <Input placeholder="Enter phone number" />
              </Form.Item>

              <Form.Item label="Salon Address" name="address" rules={[{ required: true, message: "Address is required" }]}>
                <Input.TextArea rows={2} placeholder="Enter address" />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Working Hours" className="border-0 shadow-lg h-full">
            <div className="mb-4">
              <div className="text-sm mb-2">Select Day</div>

              <div className="flex flex-wrap gap-2 mb-4">
                {DAYS.map((day) => (
                  <Button key={day} type={selectedDay === day ? "primary" : "default"} size="small" onClick={() => setSelectedDay(day)} disabled={isLoading}>
                    {day}
                  </Button>
                ))}
              </div>

              {timings[selectedDay] ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm">Timings for {selectedDay}</div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm">Closed</span>

                      <Switch checked={timings[selectedDay]?.isOpen ?? false} onChange={(checked) => setTimings((previous) => ({
                        ...previous,
                        [selectedDay]: {
                          ...previous[selectedDay],
                          day: selectedDay,
                          isOpen: checked,
                        },
                      }))} size="small" disabled={isLoading} />

                      <span className="text-sm">Open</span>
                    </div>
                  </div>

                  {timings[selectedDay]?.isOpen && (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="text-sm text-gray-500 mb-1">Opening Time</div>

                        <TimePicker value={getTimeValue(timings[selectedDay]?.opening)} format="h:mm A" style={{ width: "100%" }} onChange={(time) => handleTimeChange(time, "opening")} disabled={isLoading} />
                      </div>

                      <div className="flex-1">
                        <div className="text-sm text-gray-500 mb-1">Closing Time</div>

                        <TimePicker value={getTimeValue(timings[selectedDay]?.closing)} format="h:mm A" style={{ width: "100%" }} onChange={(time) => handleTimeChange(time, "closing")} disabled={isLoading} />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-gray-400 py-4">
                  No working hours configured for {selectedDay}. Set time and save.
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <Button size="large" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>

              <Button type="primary" size="large" icon={<SaveOutlined />} onClick={handleSave} loading={isLoading}>
                Save All Settings
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
export default Settings;