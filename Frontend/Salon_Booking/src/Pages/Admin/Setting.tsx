import { Form, Input, TimePicker, Button, Row, Col, Switch, Card, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSalonBookingAPI } from '../../api/generated';

const { getApiUserId, putApiUserId, getApiTime, postApiTime,  } = getSalonBookingAPI();

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
  const [selectedDay, setSelectedDay] = useState<string>("Monday");
  const [adminId, setAdminId] = useState<string>("");
  const queryClient = useQueryClient();
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  const [timings, setTimings] = useState<TimingRecord>({});
  
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
    if (response.data?.status === true && response.data?.result) return response.data.result;
    if (response.data?.result) return response.data.result;
    return response.data;
  };
  
  const { data: userData, isLoading: userLoading, refetch: refetchUser } = useQuery({
    queryKey: ['user', loginUser?.id],
    enabled: !!loginUser?.id && !!token,
    queryFn: async () => {
      const response = await getApiUserId(loginUser.id, axiosConfig);
      return extractData(response);
    },
  });
  
  const { 
    data: timingsData, 
    isLoading: timingsLoading, 
    refetch: refetchTimings 
  } = useQuery({
    queryKey: ['timings', loginUser?.id],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: !!loginUser?.id && !!token,
    queryFn: async () => {
      try {
        const response = await getApiTime({ userId: loginUser.id }, axiosConfig);
        let allTimings = extractData(response);
        if (!Array.isArray(allTimings)) allTimings = [];
        const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        return allTimings.filter((t: any) => {
          const day = t.day || t.Day;
          return validDays.includes(day);
        });
      } catch (error) {
        console.error("Error fetching timings:", error);
        return [];
      }
    },
  });
  
  useEffect(() => {
    if (timingsData && timingsData.length > 0) {
      const apiTimings: TimingRecord = {};
      timingsData.forEach((t: any) => {
        const dayKey = t.day || t.Day;
        if (days.includes(dayKey)) {
          apiTimings[dayKey] = {
            id: t.id || t._id,
            day: dayKey,
            opening: t.opening || t.Opening || "",
            closing: t.closing || t.Closing || "",
            isOpen: t.isOpen !== undefined ? t.isOpen : (t.IsOpen !== undefined ? t.IsOpen : false)
          };
        }
      });
      setTimings(apiTimings);
    } else {
      setTimings({});
    }
  }, [timingsData]);
  
  useEffect(() => {
    if (userData) {
      setAdminId(loginUser.id);
      form.setFieldsValue({
        name: userData?.salonName || userData?.SalonName || "",
        email: userData?.email || userData?.Email || "",
        phone: userData?.phoneNumber || userData?.PhoneNumber || "",
        address: userData?.salonAddress || userData?.SalonAddress || ""
      });
    }
  }, [userData, form, loginUser.id]);
  
  const updateProfileMutation = useMutation({
    mutationFn: async (values: any) => {
      await putApiUserId(adminId, {
        fullName: userData?.fullName || userData?.FullName || "",
        email: values.email,
        phoneNumber: values.phone,
        salonName: values.name,
        salonAddress: values.address,
        role: userData?.role || userData?.Role || 2,
        isActive: userData?.isActive !== undefined ? userData.isActive : (userData?.IsActive !== undefined ? userData.IsActive : true)
      }, axiosConfig);
    },
    onSuccess: () => {
      message.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ['user', loginUser?.id] });
      refetchUser();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to update profile");
    },
  });
  
  const saveTimingsMutation = useMutation({
    mutationFn: async () => {
      const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      
      const timePromises = Object.entries(timings)
        .filter(([day]) => validDays.includes(day))
        .map(async ([day, timing]) => {
          const payload = {
            day: day,
            opening: timing.opening || "09:00",
            closing: timing.closing || "18:00",
            isOpen: timing.isOpen !== undefined ? timing.isOpen : true,
            userId: adminId
          };

          await postApiTime(payload, axiosConfig);
        });
      
      await Promise.all(timePromises);
    },
    onSuccess: () => {
      message.success("Working hours updated successfully");
      queryClient.invalidateQueries({ queryKey: ['timings', loginUser?.id] });
      setTimeout(() => {
        refetchTimings();
      }, 200);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to update working hours");
    },
  });
  
  const handleTimeChange = (time: dayjs.Dayjs | null, type: "opening" | "closing") => {
    if (time) {
      setTimings(prev => ({
        ...prev,
        [selectedDay]: { 
          ...prev[selectedDay], 
          day: selectedDay,
          [type]: time.format("HH:mm"),
          isOpen: prev[selectedDay]?.isOpen ?? true
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
      await updateProfileMutation.mutateAsync(values);
      await saveTimingsMutation.mutateAsync();
      message.success("Salon settings updated successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };
  
  const isLoading = userLoading || timingsLoading || 
                    updateProfileMutation.isPending || 
                    saveTimingsMutation.isPending;
  
  return (
    <div className="p-6" style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'PT Serif, serif' }}>
          Salon Settings
        </h1>
        <p className="text-gray-600" style={{ fontFamily: 'Public Sans, sans-serif' }}>
          Manage salon booking settings
        </p>
      </div>
      
      <Row gutter={24} className="mb-6">
        <Col xs={24} lg={12}>
          <Card 
            title="Manage your profile" 
            className="border-0 shadow-lg h-full"
            style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }}
          >
            <Form form={form} layout="vertical">
              <Form.Item 
                label="Salon Name" 
                name="name" 
                rules={[{ required: true, message: "Salon name is required" }]}
              >
                <Input 
                  placeholder="Enter salon name" 
                  style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }} 
                />
              </Form.Item>
              
              <Form.Item 
                label="Salon Email" 
                name="email" 
                rules={[
                  { required: true, message: "Email is required" }, 
                  { type: 'email', message: 'Enter valid email' }
                ]}
              >
                <Input 
                  placeholder="Enter email" 
                  style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }} 
                />
              </Form.Item>
              
              <Form.Item 
                label="Salon Phone" 
                name="phone" 
                rules={[{ required: true, message: "Phone number is required" }]}
              >
                <Input 
                  placeholder="Enter phone number" 
                  style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }} 
                />
              </Form.Item>
              
              <Form.Item 
                label="Salon Address" 
                name="address" 
                rules={[{ required: true, message: "Address is required" }]}
              >
                <Input.TextArea 
                  rows={2} 
                  placeholder="Enter address" 
                  style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }} 
                />
              </Form.Item>
            </Form>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card 
            title="Working Hours" 
            className="border-0 shadow-lg h-full"
            style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }}
          >
            <div className="mb-4">
              <div className="text-sm mb-2" style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }}>
                Select Day
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {days.map(day => (
                  <Button
                    key={day}
                    type={selectedDay === day ? "primary" : "default"}
                    size="small"
                    onClick={() => setSelectedDay(day)}
                    disabled={isLoading}
                    style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }}
                  >
                    {day}
                  </Button>
                ))}
              </div>
              
              {timings[selectedDay] ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm" style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }}>
                      Timings for {selectedDay}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }}>
                        Closed
                      </span>
                      <Switch
                        checked={timings[selectedDay]?.isOpen || false}
                        onChange={checked => 
                          setTimings(prev => ({ 
                            ...prev, 
                            [selectedDay]: { 
                              ...prev[selectedDay], 
                              day: selectedDay,
                              isOpen: checked 
                            } 
                          }))
                        }
                        size="small"
                        disabled={isLoading}
                      />
                      <span className="text-sm" style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }}>
                        Open
                      </span>
                    </div>
                  </div>
                  
                  {timings[selectedDay]?.isOpen && (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="text-sm text-gray-500 mb-1" 
                             style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }}>
                          Opening Time
                        </div>
                        <TimePicker
                          value={getTimeValue(timings[selectedDay]?.opening)}
                          format="h:mm A"
                          style={{ width: "100%", fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }}
                          onChange={time => handleTimeChange(time, "opening")}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-500 mb-1" 
                             style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }}>
                          Closing Time
                        </div>
                        <TimePicker
                          value={getTimeValue(timings[selectedDay]?.closing)}
                          format="h:mm A"
                          style={{ width: "100%", fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }}
                          onChange={time => handleTimeChange(time, "closing")}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-gray-400 py-4" style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }}>
                  No working hours configured for {selectedDay}. Set time and save.
                </div>
              )}
            </div>
            
            <div className="mt-6 flex gap-2 justify-end">
              <Button 
                size="large" 
                onClick={() => {
                  refetchTimings();
                  refetchUser();
                  queryClient.invalidateQueries({ queryKey: ['user', loginUser?.id] });
                  queryClient.invalidateQueries({ queryKey: ['timings', loginUser?.id] });
                }} 
                disabled={isLoading} 
                style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }}
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                size="large" 
                icon={<SaveOutlined />} 
                onClick={handleSave} 
                loading={isLoading} 
                style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 'normal' }}
              >
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