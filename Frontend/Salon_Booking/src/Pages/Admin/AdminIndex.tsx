import { TeamOutlined, ScissorOutlined, DollarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { DataTable, StatusBadge } from '../../Components/Ui/Table';
import { StatCard } from '../../Components/Ui/Cards';
import { useEffect, useState } from 'react';
import { Card, Button, Row, Col } from 'antd';
import axios from 'axios';

const AdminIndex = () => {
  const navigate = useNavigate();

  const [staffList, setStaffList] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const BOOKING_API = "http://localhost:5296/api/Booking";
  const STAFF_API = "http://localhost:5296/api/Staff";
  const SERVICE_API = "http://localhost:5296/api/AdminServices";

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await axios.get(STAFF_API);

      const normalized = res.data.map((s: any, index: number) => ({
        key: s.id || s._id || index,
        id: s.id || s._id,
        name: s.name,
        role: s.role,
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
      const res = await axios.get(SERVICE_API);

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
      const res = await axios.get(BOOKING_API);

      console.log("Bookings Raw:", res.data); // debug

      const mapped = res.data.map((b: any, index: number) => {
        const amt =
          b.amount ??
          b.Amount ??
          b.price ??
          b.totalAmount ??
          0;

        return {
          id: b.id || b._id || index,
          amount: parseFloat(amt) || 0
        };
      });

      setBookings(mapped);
    } catch (err) {
      console.error("Booking error", err);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchServices();
    fetchBookings();
  }, []);

  const revenue = bookings.reduce(
    (sum: number, b: any) => sum + (b.amount || 0),
    0
  );

  const serviceColumns = [
    { title: 'Service Name', dataIndex: 'name' },
    { title: 'Duration (min)', dataIndex: 'duration' },
    {
      title: 'Price',
      dataIndex: 'price',
      render: (price: number) => `₹${price}`
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
          <Col xs={12} md={6}>
            <StatCard
              title="Active Services"
              value={services.filter(s => s.status === 'active').length.toString()}
              icon={<ScissorOutlined />}
              color="#000000"
            />
          </Col>

          <Col xs={12} md={6}>
            <StatCard
              title="Active Staff"
              value={`${staffList.filter(s => s.status === 'active').length}/${staffList.length}`}
              icon={<TeamOutlined />}
              color="#0400f7"
            />
          </Col>

          <Col xs={12} md={6}>
            <StatCard
              title="Revenue"
              value={`$${revenue.toLocaleString()}`}
              icon={<DollarOutlined />}
              color="#ff7b00"
            />
          </Col>
        </Row>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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