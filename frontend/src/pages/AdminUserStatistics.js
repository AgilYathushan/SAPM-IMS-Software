import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Typography, Space, Spin, Button, Table, Tag } from 'antd';
import { UserOutlined, TeamOutlined, CheckCircleOutlined, CloseCircleOutlined, TableOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { userService } from '../services/userService';
import { handleApiError } from '../utils/errorHandler';
import './AdminUserStatistics.css';

const { Title } = Typography;

const AdminUserStatistics = () => {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await userService.getAll();
      const allUsers = response.data || [];
      
      const stats = {
        total: allUsers.length,
        active: allUsers.filter(u => u.is_active === true).length,
        inactive: allUsers.filter(u => u.is_active === false).length,
        admin: allUsers.filter(u => u.user_role === 'admin').length,
        patient: allUsers.filter(u => u.user_role === 'patient').length,
        doctor: allUsers.filter(u => u.user_role === 'doctor').length,
        radiologist: allUsers.filter(u => u.user_role === 'radiologist').length,
        cashier: allUsers.filter(u => u.user_role === 'cashier').length,
      };
      
      setStatistics(stats);
      setUsers(allUsers);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load user statistics: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'User ID',
      dataIndex: 'user_id',
      key: 'user_id',
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'user_role',
      key: 'user_role',
      render: (role) => {
        const colorMap = {
          admin: 'red',
          patient: 'blue',
          doctor: 'green',
          radiologist: 'orange',
          cashier: 'purple',
        };
        return <Tag color={colorMap[role] || 'default'}>{role?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A',
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space align="center" justify="space-between" style={{ width: '100%' }}>
            <Title level={2} style={{ margin: 0 }}>
              <UserOutlined /> User Statistics
            </Title>
            <Button
              type="primary"
              icon={<TableOutlined />}
              onClick={() => setShowTable(!showTable)}
            >
              {showTable ? 'Hide Table' : 'View All Users'}
            </Button>
          </Space>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Users"
                value={statistics?.total || 0}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Users"
                value={statistics?.active || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Inactive Users"
                value={statistics?.inactive || 0}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <Title level={4}>Users by Role</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Admins"
                value={statistics?.admin || 0}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Patients"
                value={statistics?.patient || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Doctors"
                value={statistics?.doctor || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Radiologists"
                value={statistics?.radiologist || 0}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Cashiers"
                value={statistics?.cashier || 0}
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
          </Row>
        </Card>

        {showTable && (
          <Card>
            <Title level={4}>All Users</Title>
            <Table
              columns={columns}
              dataSource={users}
              rowKey="user_id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        )}
      </Space>
    </div>
  );
};

export default AdminUserStatistics;

