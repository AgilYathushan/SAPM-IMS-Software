import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Spin, Button, Table, Tag } from 'antd';
import { ExperimentOutlined, TableOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { medicalTestService } from '../services/medicalTestService';
import { handleApiError } from '../utils/errorHandler';
import './AdminTestStatistics.css';

const { Title } = Typography;

const AdminTestStatistics = () => {
  const [statistics, setStatistics] = useState(null);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await medicalTestService.getAll();
      const allTests = response.data || [];
      
      const stats = {
        total: allTests.length,
        requested: allTests.filter(t => t.status === 'requested').length,
        completed: allTests.filter(t => t.status === 'completed').length,
        reporting: allTests.filter(t => t.status === 'reporting').length,
        cancelled: allTests.filter(t => t.status === 'cancelled').length,
      };
      
      setStatistics(stats);
      setTests(allTests);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load test statistics: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Test ID',
      dataIndex: 'medical_test_id',
      key: 'medical_test_id',
    },
    {
      title: 'Patient ID',
      dataIndex: 'patient_id',
      key: 'patient_id',
    },
    {
      title: 'Doctor ID',
      dataIndex: 'doctor_id',
      key: 'doctor_id',
    },
    {
      title: 'Test Type',
      dataIndex: 'test_type',
      key: 'test_type',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap = {
          requested: 'orange',
          completed: 'green',
          reporting: 'blue',
          cancelled: 'red',
        };
        return <Tag color={colorMap[status] || 'default'}>{status?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Requested At',
      dataIndex: 'requested_at',
      key: 'requested_at',
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
              <ExperimentOutlined /> Test Statistics
            </Title>
            <Button
              type="primary"
              icon={<TableOutlined />}
              onClick={() => setShowTable(!showTable)}
            >
              {showTable ? 'Hide Table' : 'View All Tests'}
            </Button>
          </Space>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Tests"
                value={statistics?.total || 0}
                prefix={<ExperimentOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Requested"
                value={statistics?.requested || 0}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Completed"
                value={statistics?.completed || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="In Reporting"
                value={statistics?.reporting || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          {statistics?.cancelled > 0 && (
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Cancelled"
                  value={statistics?.cancelled || 0}
                  prefix={<CloseCircleOutlined />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
          )}
        </Row>

        {showTable && (
          <Card>
            <Title level={4}>All Tests</Title>
            <Table
              columns={columns}
              dataSource={tests}
              rowKey={(record) => record.medical_test_id || record.id}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        )}
      </Space>
    </div>
  );
};

export default AdminTestStatistics;

