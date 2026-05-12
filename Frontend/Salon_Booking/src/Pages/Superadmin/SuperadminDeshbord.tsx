import { useState, useEffect } from 'react'
import { Typography, Card, Button, Row, Col } from 'antd'
import { ShopOutlined, TeamOutlined, DollarOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { DataTable } from '../../Components/Ui/Table'
import { StatCard } from '../../Components/Ui/Cards'

const { Title, Text } = Typography
const API_URL = "http://localhost:5296/api/User"
const BOOKING_API = "http://localhost:5296/api/Booking"

const SuperAdminDeshbord = () => {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [monthlyData, setMonthlyData] = useState<any[]>([])

  const token = localStorage.getItem("authToken")
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await axios.get(API_URL, axiosConfig)
      const allUsers = res.data
      setUsers(allUsers)
      
      const admins = allUsers.filter((u: any) => u.role === 2)
      const companyData = admins.map((u: any, index: number) => ({
        id: u.id || index,
        salonName: u.salonName,
        owner: u.fullName,
        email: u.email,
        phone: u.phoneNumber,
        adminId: u.id
      }))
      setCompanies(companyData)

      const bookingsRes = await axios.get(BOOKING_API, axiosConfig)
      const allBookings = bookingsRes.data
      
      let revenue = 0
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const revenueByMonth = new Array(12).fill(0)
      
      allBookings.forEach((booking: any) => {
        let amount = 0
        if (booking.amount) amount = parseFloat(booking.amount)
        else if (booking.totalAmount) amount = parseFloat(booking.totalAmount)
        else if (booking.price) amount = parseFloat(booking.price)
        else if (booking.Amount) amount = parseFloat(booking.Amount)
        
        if (booking.status === 'completed' || booking.status === 'confirmed' || booking.status === 'pending') {
          revenue += isNaN(amount) ? 0 : amount
        }
        
        const bookingDate = booking.appointmentDate || booking.createdAt || new Date()
        const month = new Date(bookingDate).getMonth()
        revenueByMonth[month] += isNaN(amount) ? 0 : amount
      })
      
      setTotalRevenue(revenue)
      
      const chartData = months.map((month, index) => ({
        month,
        revenue: revenueByMonth[index]
      }))
      
      setMonthlyData(chartData)
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadData()
  }, [])

  const maxYValue = 100000
  const yAxisLabels = [100000, 75000, 50000, 25000, 0]

  const stats = [
    {
      title: 'Companies',
      value: companies.length,
      icon: <ShopOutlined />,
      color: '#000000'
    },
    {
      title: 'Total Users',
      value: users.length,
      icon: <TeamOutlined />,
      color: '#0400f7'
    },
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      icon: <DollarOutlined />,
      color: '#ff7b00'
    }
  ]

  const companyColumns = [
    {
      title: 'Salon Name',
      dataIndex: 'salonName',
      key: 'salonName',
      render: (text: string, record: any) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <ShopOutlined className="text-blue-600" />
          </div>
          <div>
            <div className="font-medium">{text}</div>
            <div className="text-sm text-gray-500">{record.owner}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone'
    }
  ]

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <Title level={3}>Super Admin Dashboard</Title>
          <Text type="secondary">System overview</Text>
        </div>
        
        <Row gutter={[24, 24]} className="mb-8">
          {stats.map((stat, index) => (
            <Col xs={24} sm={8} md={8} key={index}>
              <StatCard
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
              />
            </Col>
          ))}
        </Row>

       
        <Card className="mb-8 shadow-sm" title="Revenue Trend (Monthly)">
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
                    <div key={idx} className="border-t border-gray-200 w-full"></div>
                  ))}
                </div>
                
              
                <div className="relative h-full flex items-end gap-2">
                  {monthlyData.map((data, idx) => {
                    const barHeight = Math.min((data.revenue / maxYValue) * 100, 100)
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
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t text-center text-gray-500 text-sm">
            <span>Yearly revenue performance</span>
          </div>
        </Card>

        <div className="mt-8">
          <Card
            title={
              <div className="flex items-center">
                <ShopOutlined className="mr-2 text-blue-500" />
                Companies Registered
              </div>
            }
            extra={
              <Button
                type="primary"
                size="small"
                onClick={() => navigate('/Super-admin/compani')}
              >
                View Companies
              </Button>
            }
            className="shadow-sm"
          >
            <DataTable
              data={companies}
              columns={companyColumns}
              loading={loading}
              rowKey="id"
              showActions={false}
            />
          </Card>
        </div>
      </div>
    </>
  )
}
export default SuperAdminDeshbord