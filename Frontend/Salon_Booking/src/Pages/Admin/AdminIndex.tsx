import { TeamOutlined, ScissorOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { DataTable, StatusBadge } from '../../Components/Ui/Table';
import { StatCard } from '../../Components/Ui/Cards';
import { useQuery } from '@tanstack/react-query';
import { Card, Button, Row, Col } from 'antd';
import { getSalonBookingAPI } from '../../api/generated';

const { getApiStaff, getApiAdminServices, getApiBooking } = getSalonBookingAPI();
const AdminIndex = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = user?.Role || user?.role;
  const userSalonName = user?.SalonName || user?.salonName;
  const isAdmin = userRole === "Admin" || userRole === 1 || userRole === 2;
  const isSuperAdmin = userRole === "SuperAdmin";

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const extractData = (response: any) => {
    if (!response) return [];
    const data = response.data;
    if (data?.status === true && data?.result) return data.result;
    if (Array.isArray(data)) return data;
    if (data?.result) return data.result;
    return [];
  };

  const { data: staffApiData = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff'],
    enabled: !!token, staleTime: 5000, refetchOnMount: false, refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await getApiStaff(axiosConfig);
      let staffData = extractData(res);
      let filteredStaff = Array.isArray(staffData) ? staffData : [];
      if (isAdmin && !isSuperAdmin && userSalonName) {
        filteredStaff = filteredStaff.filter((s: any) =>
          (s.salonName || s.SalonName) === userSalonName
        );
      }
      return filteredStaff.map((s: any, index: any) => ({
        key: s.id || s._id || index,
        id: s.id || s._id,
        name: s.name || s.Name || s.fullName || s.FullName || "N/A",
        role: s.role || s.Role || "Employee",
        status: (s.isActive !== undefined ? s.isActive : s.IsActive) ? 'active' : 'inactive'
      }));
    }
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    enabled: !!token, staleTime: 5000, refetchOnMount: false, refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await getApiAdminServices(axiosConfig);
      let servicesData = extractData(res);
      let filteredServices = Array.isArray(servicesData) ? servicesData : [];
      if (isAdmin && !isSuperAdmin && userSalonName) {
        filteredServices = filteredServices.filter((s: any) =>
          (s.salonName || s.SalonName) === userSalonName
        );
      }
      return filteredServices.map((s: any, index: number) => ({
        key: s.id || s._id || index,
        id: s.id || s._id,
        name: s.serviceName || s.ServiceName || s.name || "N/A",
        duration: s.duration || s.Duration || 0,
        price: s.price || s.Price || 0,
        status: (s.isActive !== undefined ? s.isActive : s.IsActive) ? 'active' : 'inactive'
      }));
    }
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['Bookings'],
    enabled: !!token, staleTime: 5000, refetchOnMount: false, refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await getApiBooking(axiosConfig);
      let bookingsData = extractData(res);
      let filteredBookings = Array.isArray(bookingsData) ? bookingsData : [];
      if (isAdmin && !isSuperAdmin && userSalonName) {
        filteredBookings = filteredBookings.filter((b: any) =>
          (b.salonName || b.SalonName) === userSalonName
        );
      }
      const mapped = filteredBookings.map((b: any, index: number) => {
        let amount = 0;
        const status = (b.status || b.Status || "").toLowerCase();
        if (status !== 'cancelled') {
          if (b.amount) amount = parseFloat(b.amount);
          else if (b.Amount) amount = parseFloat(b.Amount);
        }
        return {
          id: b.id || b._id || index,
          amount: isNaN(amount) ? 0 : amount,
          date: b.appointmentDate || b.AppointmentDate || b.createdAt || b.CreatedAt || new Date(),
          status: status
        };
      });
      return mapped;
    }
  });

  const revenue = bookings.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
  const monthlyData = (() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonth = new Array(12).fill(0);
    bookings.forEach((booking: any) => {
      const month = new Date(booking.date).getMonth();
      revenueByMonth[month] += booking.amount;
    });
    return months.map((month, index) => ({
      month,
      revenue: revenueByMonth[index],
      isActive: revenueByMonth[index] > 0
    }));
  })();

  const maxYValue = Math.max(...monthlyData.map(d => d.revenue), 30000);
  const yAxisLabels = [maxYValue, maxYValue * 0.75, maxYValue * 0.5, maxYValue * 0.25, 0];
  const serviceColumns = [
    { title: 'Service Name', dataIndex: 'name' },
    { title: 'Duration (min)', dataIndex: 'duration' },
    {
      title: 'Price',
      dataIndex: 'price',
      render: (price: number) => `$${price?.toFixed(2) || '0.00'}`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status: string) => <StatusBadge type="user" value={status} />
    }
  ];
  
  const staffColumns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Role', dataIndex: 'role' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status: string) => <StatusBadge type="user" value={status} />
    }
  ];
  
  if (!token) {
    return (
      <div className="p-6 text-center">
        <Card>
          <p>Please login to view dashboard</p>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Admin Dashboard Overview</h1>
        <p className="text-gray-600 mb-6">
          Hello again! Here's what's happening in your salon.
        </p>
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={8} md={8}>
            <StatCard
              title="Active Services"
              value={services.filter(s => s.status === 'active').length.toString()}
              icon={<ScissorOutlined />}
              color="#000000"
            />
          </Col>

          <Col xs={24} sm={8} md={8}>
            <StatCard
              title="Active Staff"
              value={`${staffApiData.filter((s: any) => s.status === 'active').length}/${staffApiData.length}`}
              icon={<TeamOutlined />}
              color="#0400f7"
            />
          </Col>

          <Col xs={24} sm={8} md={8}>
            <StatCard
              title="Total Revenue"
              value={`$${revenue.toLocaleString()}`}
              icon={<DollarOutlined />}
              color="#ff7b00"
            />
          </Col>
        </Row>

        <Card className="mb-6" title="Revenue Trend (Monthly)">
          <div className="flex h-80">
            <div className="flex flex-col justify-between pr-4 text-right text-sm text-gray-500 w-24">
              {yAxisLabels.map((label, idx) => (
                <div key={idx}>${Math.round(label).toLocaleString()}</div>
              ))}
            </div>

            <div className="flex-1 flex flex-col">
              <div className="relative flex-1">
                <div className="absolute inset-0 flex flex-col justify-between">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <div key={idx} className="border-t border-gray-300 w-full"></div>
                  ))}
                </div>
                <div className="relative h-full flex items-end gap-2">
                  {monthlyData.map((data, idx) => {
                    const barHeight = maxYValue > 0 ? (data.revenue / maxYValue) * 100 : 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
                        <div
                          className="w-full bg-gradient-to-t from-[#023e7d] to-[#0466c8] rounded-lg transition-all duration-500 hover:from-[#0466c8] hover:to-[#035c9e] cursor-pointer relative group"
                          style={{
                            height: `${barHeight}%`,
                            minHeight: data.revenue > 0 ? '4px' : '0px'
                          }}
                        >
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                            ${data.revenue.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-center mt-2">
                          <div className="text-xs font-medium text-gray-700">{data.month}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 text-center text-gray-500 text-sm">
            <span>Monthly revenue performance (Target: ${maxYValue.toLocaleString()})</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
          <Card
            title="Services"
            extra={
              <Button type="primary" size="small" onClick={() => navigate('/admin/services')}>
                View All
              </Button>
            }
          >
            <DataTable
              data={services}
              columns={serviceColumns}
              showActions={false}
              rowKey="key"
              loading={servicesLoading}
            />
          </Card>

          <Card
            title="Staff Availability"
            extra={
              <Button type="primary" size="small" onClick={() => navigate('/admin/staff')}>
                View All
              </Button>
            }
          >
            <DataTable
              data={staffApiData}
              columns={staffColumns}
              loading={staffLoading}
              showActions={false}
              rowKey="key"
            />
          </Card>
        </div>
      </div>
    </div>
  );
};
export default AdminIndex;