import { useMemo } from 'react'
import { Typography, Card, Button, Row, Col } from 'antd'
import { ShopOutlined, TeamOutlined, DollarOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../Components/Ui/Table'
import { StatCard } from '../../Components/Ui/Cards'
import { getSalonBookingAPI } from '../../api/generated'

const { Title, Text } = Typography
const { getAllUsers: getApiUser, getAllBooking: getApiBooking } = getSalonBookingAPI()
const SuperAdminDashboard = () => {
  const navigate = useNavigate()
  const token = localStorage.getItem("authToken")
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  }
  const ResponseData = (response: any) => {
    if (!response) return null
    if (typeof response.data === 'string') {
      try {
        return JSON.parse(response.data)
      } catch {
        return null
      }
    }
    return response.data
  }

  const { data: usersData = [], isLoading: usersLoading } = useQuery({
    queryKey: ['superAdminUsers'],enabled: !!token,staleTime: 5000,refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await getApiUser({ page: 1, pageSize: 100 }, axiosConfig)
      const parsedData = ResponseData(res)
      if (!parsedData?.status || !parsedData?.result) {
        return []
      }
      let rawUsers = []
      const result = parsedData.result
      
      if (Array.isArray(result)) {
        rawUsers = result
      } else if (result?.data && Array.isArray(result.data)) {
        rawUsers = result.data
      } else {
        rawUsers = []
      }

      return rawUsers
    }
  })

  const { data: bookingsData = [] } = useQuery({
    queryKey: ['superAdminBookings'],
    enabled: !!token,
    staleTime: 5000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await getApiBooking(undefined, axiosConfig)
      const parsedData = ResponseData(res)
      
      if (!parsedData?.status || !parsedData?.result) {
        return []
      }
      let rawBookings = []
      const result = parsedData.result
      
      if (Array.isArray(result)) {
        rawBookings = result
      } else if (result?.data && Array.isArray(result.data)) {
        rawBookings = result.data
      } else {
        rawBookings = []
      }

      return rawBookings
    }
  })

  const companies = useMemo(() => {
    const admins = usersData.filter((u: any) => {
      const role = u.role || u.Role
      return role === 2
    })
    return admins.map((u: any, index: number) => ({
      id: u.id || u._id || index,
      salonName: u.salonName || u.SalonName || "N/A",
      owner: u.fullName || u.FullName || "N/A",
      email: u.email || u.Email || "N/A",
      phone: u.phoneNumber || u.PhoneNumber || "N/A",
      status: u.isActive ? 'active' : 'inactive'
    }))
  }, [usersData])

  const customers = useMemo(() => {
    return usersData.filter((u: any) => {
      const role = u.role || u.Role
      return role === 4
    })
  }, [usersData])

  const employees = useMemo(() => {
    return usersData.filter((u: any) => {
      const role = u.role || u.Role
      return role === 3
    })
  }, [usersData])

  const totalRevenue = useMemo(() => {
    let total = 0
    bookingsData.forEach((booking: any) => {
      const status = (booking.status || booking.Status || "").toLowerCase()
      if (status === 'completed' || status === 'confirmed') {
        const amount = parseFloat(booking.amount || booking.Amount || booking.totalAmount || booking.TotalAmount || 0)
        total += isNaN(amount) ? 0 : amount
      }
    })
    return total
  }, [bookingsData])

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const revenueByMonth = new Array(12).fill(0)
    
    bookingsData.forEach((booking: any) => {
      const status = (booking.status || booking.Status || "").toLowerCase()
      if (status === 'completed' || status === 'confirmed') {
        const amount = parseFloat(booking.amount || booking.Amount || booking.totalAmount || booking.TotalAmount || 0)
        if (!isNaN(amount)) {
          const bookingDate = booking.appointmentDate || booking.AppointmentDate || booking.createdAt || booking.CreatedAt || booking.date || booking.Date
          if (bookingDate) {
            const month = new Date(bookingDate).getMonth()
            if (!isNaN(month)) {
              revenueByMonth[month] += amount
            }
          }
        }
      }
    })
    
    return months.map((month, index) => ({
      month,
      revenue: revenueByMonth[index],
      isActive: revenueByMonth[index] > 0
    }))
  }, [bookingsData])

  const maxYValue = Math.max(...monthlyData.map(d => d.revenue), 1000)
  const yAxisLabels = [maxYValue, maxYValue * 0.75, maxYValue * 0.5, maxYValue * 0.25, 0]

  const stats = [
    { title: 'Total Companies', value: companies.length, icon: <ShopOutlined />, color: '#000000' },
    { title: 'Total Employees', value: employees.length, icon: <TeamOutlined />, color: '#0400f7' },
    { title: 'Total Customers', value: customers.length, icon: <TeamOutlined />, color: '#ff7b00' },
    { title: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: <DollarOutlined />, color: '#52c41a' }
  ]

  const companyColumns = [
    {
      title: 'Salon Name',
      dataIndex: 'salonName',
      render: (text: string, record: any) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <ShopOutlined className="text-blue-600" />
          </div>
          <div>
            <div className="font-medium">{text}</div>
            <div className="text-sm text-gray-500">Owner: {record.owner}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      render: (text: string) => (
        <div className="flex items-center gap-2">
          <MailOutlined className="text-gray-400" />
          <span>{text}</span>
        </div>
      )
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      render: (text: string) => (
        <div className="flex items-center gap-2">
          <PhoneOutlined className="text-gray-400" />
          <span>{text || "N/A"}</span>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status: string) => (
        <span style={{ 
          color: status === 'active' ? '#52c41a' : '#ff4d4f',
          fontWeight: 500
        }}>
          {status === 'active' ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ]

  if (!token) {
    return (
      <div className="p-6 text-center">
        <Card><p>Please login to view dashboard</p></Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3} className="!mb-2">Super Admin Dashboard</Title>
        <Text type="secondary">System overview and analytics</Text>
      </div>

      <Row gutter={[24, 24]} className="mb-8">
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <StatCard title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
          </Col>
        ))}
      </Row>

      <Card className="mb-8 shadow-sm border border-gray-100" title="Revenue Trend (Monthly)">
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
                  <div key={idx} className="border-t border-gray-200 w-full"></div>
                ))}
              </div>
              <div className="relative h-full flex items-end gap-2">
                {monthlyData.map((data, idx) => {
                  const barHeight = Math.min((data.revenue / maxYValue) * 100, 100)
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div
                        className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-300 group-hover:from-blue-700 group-hover:to-blue-500 cursor-pointer"
                        style={{ height: `${barHeight}%`, minHeight: data.revenue > 0 ? '4px' : '0px' }}
                      >
                        <div className="text-center -mt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-gray-800 text-white text-xs rounded px-2 py-1">
                            ${data.revenue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-center mt-2">
                        <div className="text-xs font-medium text-gray-700">{data.month}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t text-center text-gray-500 text-sm">
          <span>Monthly revenue performance (Completed & Confirmed bookings only)</span>
        </div>
      </Card>

      <div className="mt-8">
        <Card
          title={<div className="flex items-center"><ShopOutlined className="mr-2 text-blue-500" /><span>Registered Companies</span></div>}
          extra={<Button type="primary" size="small" onClick={() => navigate('/Super-admin/compani')}>View All</Button>}
          className="shadow-sm border border-gray-100"
        >
          <DataTable data={companies.slice(0, 5)} columns={companyColumns} loading={usersLoading} rowKey="id" showActions={false} />
          {companies.length > 5 && (
            <div className="text-center mt-4">
              <Button type="link" onClick={() => navigate('/Super-admin/compani')}>+ {companies.length - 5} more companies</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
export default SuperAdminDashboard