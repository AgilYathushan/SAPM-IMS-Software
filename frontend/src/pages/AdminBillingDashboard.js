import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Spin, Button, Table, Tag } from 'antd';
import { DollarOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, TableOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { billingService } from '../services/billingService';
import { handleApiError } from '../utils/errorHandler';
import './AdminBillingDashboard.css';

const { Title } = Typography;

const AdminBillingDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const dashboardResponse = await billingService.getDashboard();
      setDashboard(dashboardResponse.data);
      
      // Load all bills for table view
      const billsResponse = await billingService.getBills();
      setBills(billsResponse.data || []);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load dashboard: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Bill ID',
      dataIndex: 'bill_id',
      key: 'bill_id',
    },
    {
      title: 'Patient ID',
      dataIndex: 'patient_id',
      key: 'patient_id',
    },
    {
      title: 'Total Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `$${parseFloat(amount || 0).toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap = {
          paid: 'green',
          pending: 'orange',
          overdue: 'red',
        };
        return <Tag color={colorMap[status] || 'default'}>{status?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A',
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
        <Spin size="middle" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div style={{ padding: '24px' }}>
        <Card size="middle">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            Dashboard data not available.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card size="middle">
          <Space align="center" justify="space-between" style={{ width: '100%' }}>
            <Title level={2} style={{ margin: 0 }}>
              <DollarOutlined /> Billing Dashboard
            </Title>
            <Button
              type="primary"
              icon={<TableOutlined />}
              onClick={() => setShowTable(!showTable)}
            >
              {showTable ? 'Hide Table' : 'View All Bills'}
            </Button>
          </Space>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card size="middle">
              <Statistic
                title="Total Bills"
                value={dashboard.total_bills}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="middle">
              <Statistic
                title="Paid Bills"
                value={dashboard.paid_bills}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="middle">
              <Statistic
                title="Pending Bills"
                value={dashboard.pending_bills}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="middle">
              <Statistic
                title="Total Amount"
                value={dashboard.total_amount}
                prefix={<DollarOutlined />}
                precision={2}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="middle">
              <Statistic
                title="Paid Amount"
                value={dashboard.paid_amount}
                prefix={<DollarOutlined />}
                precision={2}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="middle">
              <Statistic
                title="Payable Amount"
                value={dashboard.payable_amount}
                prefix={<DollarOutlined />}
                precision={2}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Summary">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Statistic
                title="Payment Rate"
                value={dashboard.total_amount > 0 ? ((dashboard.paid_amount / dashboard.total_amount) * 100) : 0}
                suffix="%"
                precision={2}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Statistic
                title="Outstanding"
                value={dashboard.payable_amount}
                prefix={<DollarOutlined />}
                precision={2}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
          </Row>
        </Card>

        {showTable && (
          <Card>
            <Title level={4}>All Bills</Title>
            <Table
              columns={columns}
              dataSource={bills}
              rowKey={(record) => record.bill_id || record.id}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        )}
      </Space>
    </div>
  );
};

export default AdminBillingDashboard;
