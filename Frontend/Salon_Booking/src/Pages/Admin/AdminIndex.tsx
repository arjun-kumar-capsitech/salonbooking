import { TeamOutlined, ScissorOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { DataTable, StatusBadge } from '../../Components/Ui/Table';
import { StatCard } from '../../Components/Ui/Cards';
import { useEffect, useState } from 'react';
import { Card, Button, Row, Col,} from 'antd';
import axios from 'axios';


const AdminIndex = () => {
  const navigate = useNavigate();

  const [staffList, setStaffList] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  const BOOKING_API = "http://localhost:5296/api/Booking";
  const STAFF_API = "http://localhost:5296/api/Staff";
  const SERVICE_API = "http://localhost:5296/api/AdminServices";

  const token = localStorage.getItem("authToken");
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await axios.get(STAFF_API, axiosConfig);
      const normalized = res.data.map((s: any, index: any) => ({
        key: s.id || s._id || index,
        id: s.id || s._id,
        name: s.name,
        role: s.role === 3 ? "Employee" : "Staff",
        status: s.isActive ? 'active' : 'inactive'
      }));
      setStaffList(normalized);
    } catch (err) {
      console.error("Staff error", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await axios.get(SERVICE_API, axiosConfig);
      const normalized = res.data.map((s: any, index: number) => ({
        key: s.id || s._id || index,
        id: s.id || s._id,
        name: s.serviceName || s.name || "N/A",
        duration: s.duration,
        price: s.price,
        status: s.isActive ? 'active' : 'inactive'
      }));
      setServices(normalized);
    } catch (err) {
      console.error("Service error", err);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get(BOOKING_API, axiosConfig);
      const mapped = res.data.map((b: any, index: number) => {
        let amount = 0;
        if (b.amount) amount = parseFloat(b.amount);
        else if (b.totalAmount) amount = parseFloat(b.totalAmount);
        else if (b.price) amount = parseFloat(b.price);
        else if (b.Amount) amount = parseFloat(b.Amount);
        
        return {
          id: b.id || b._id || index,
          amount: isNaN(amount) ? 0 : amount,
          date: b.appointmentDate || b.createdAt || new Date()
        };
      });
      setBookings(mapped);
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const revenueByMonth = new Array(12).fill(0);
      
      mapped.forEach((booking: any) => {
        const month = new Date(booking.date).getMonth();
        revenueByMonth[month] += booking.amount;
      });
      
      const chartData = months.map((month, index) => ({
        month,
        revenue: revenueByMonth[index],
        isActive: revenueByMonth[index] > 0
      }));
      
      setMonthlyData(chartData);
    } catch (err) {
      console.error("Booking error", err);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchServices();
    fetchBookings();
  }, []);

  const revenue = bookings.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
  const maxYValue = 30000;
  const yAxisLabels = [30000, 22500, 15000, 7500, 0];

  const serviceColumns = [
    { title: 'Service Name', dataIndex: 'name' },
    { title: 'Duration (min)', dataIndex: 'duration' },
    {
      title: 'Price',
      dataIndex: 'price',
      render: (price: number) => `$${price}`
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

  return (
    <>
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
              value={`${staffList.filter(s => s.status === 'active').length}/${staffList.length}`}
              icon={<TeamOutlined />}
              color="#0400f7"
            />
          </Col>

          <Col xs={24} sm={8} md={8}>
            <StatCard
              title=" Total Revenue"
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
                <div key={idx}>${label.toLocaleString()}</div>
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
                    const barHeight = Math.min((data.revenue / maxYValue) * 100, 100);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
                        <div 
                          className="w-full bg-gradient-to-t from-[#023e7d] to-[#023e7d]  rounded-lg transition-all duration-500 hover:from-[#0466c8] hover:to-[#0466c8] cursor-pointer"
                          style={{ 
                            height: `${barHeight}%`,
                            minHeight: data.revenue > 0 ? '4px' : '0px'
                          }}
                        >
                          <div className="text-center -mt-6 opacity-0 hover:opacity-100 transition-opacity">
                            <span className="bg-gray-800 text-white text-xs rounded px-2 py-1">
                              ${data.revenue.toLocaleString()}
                            </span>
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
          
          <div className="mt-4 pt-3  text-center text-gray-500 text-sm">
            <span> Monthly revenue performance (Target: $30,000)</span>
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
              rowKey="id"
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
              data={staffList}
              columns={staffColumns}
              loading={loading}
              showActions={false}
              rowKey="id"
            />
          </Card>
        </div>
      </div>
    </>
  );
};

export default AdminIndex;