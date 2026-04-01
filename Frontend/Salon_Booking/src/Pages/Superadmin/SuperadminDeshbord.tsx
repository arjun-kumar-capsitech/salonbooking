import { useState, useEffect } from 'react'
import { Typography, Card, Button, Row, Col } from 'antd'
import { ShopOutlined, TeamOutlined, DollarOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { DataTable } from '../../Components/Ui/Table'
import { StatCard } from '../../Components/Ui/Cards'

const { Title, Text } = Typography
const API_URL = "http://localhost:5296/api/User"
const SuperAdminDeshbord = () => {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const loadData = async () => {
    setLoading(true)
    try {
      const res = await axios.get(API_URL)
      const allUsers = res.data
      setUsers(allUsers)
      const admins = allUsers.filter((u: any) => u.role === 2)
      const companyData = admins.map((u: any, index: number) => ({
        id: u.id || index,
        salonName: u.salonName,
        owner: u.fullName,
        email: u.email,
        phone: u.phoneNumber
      }))
      setCompanies(companyData)
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    loadData()
  }, [])
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
      title: 'Revenue',
      value: '$0',
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
        <Row gutter={[16, 16]} className="mb-6">
          {stats.map((stat, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <StatCard
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
              />
            </Col>
          ))}
        </Row>
        <Card
          title={
            <div className="flex items-center">
              <ShopOutlined className="mr-2 text-blue-500" />
              Companies Registered
            </div>
          }
          extra={
            <Button
              type="link"
              onClick={() => navigate('/Super-admin/compani')}
            >
              View Companies
            </Button>
          }
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
    </>
  )
}
export default SuperAdminDeshbord;