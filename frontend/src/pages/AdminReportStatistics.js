import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Spin, Button, Table, Tag } from 'antd';
import { FileTextOutlined, TableOutlined, CheckCircleOutlined, EditOutlined, DollarOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { reportService } from '../services/reportService';
import { handleApiError } from '../utils/errorHandler';
import './AdminReportStatistics.css';

const { Title } = Typography;

const AdminReportStatistics = () => {
  const [statistics, setStatistics] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await reportService.getAll();
      const allReports = response.data || [];
      
      const stats = {
        total: allReports.length,
        preliminary: allReports.filter(r => r.status === 'preliminary').length,
        confirmed: allReports.filter(r => r.status === 'confirmed').length,
        billed: allReports.filter(r => r.status === 'billed').length,
        paid: allReports.filter(r => r.status === 'paid').length,
        cancelled: allReports.filter(r => r.status === 'cancelled').length,
      };
      
      setStatistics(stats);
      setReports(allReports);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load report statistics: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Report ID',
      dataIndex: 'report_id',
      key: 'report_id',
    },
    {
      title: 'Patient ID',
      dataIndex: 'patient_id',
      key: 'patient_id',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap = {
          draft: 'default',
          preliminary: 'orange',
          confirmed: 'green',
          billed: 'blue',
          paid: 'green',
          cancelled: 'red',
        };
        return <Tag color={colorMap[status] || 'default'}>{status?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A',
    },
    {
      title: 'Finalized At',
      dataIndex: 'finalized_at',
      key: 'finalized_at',
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
              <FileTextOutlined /> Report Statistics
            </Title>
            <Button
              type="primary"
              icon={<TableOutlined />}
              onClick={() => setShowTable(!showTable)}
            >
              {showTable ? 'Hide Table' : 'View All Reports'}
            </Button>
          </Space>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Reports"
                value={statistics?.total || 0}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Preliminary"
                value={statistics?.preliminary || 0}
                prefix={<EditOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Confirmed"
                value={statistics?.confirmed || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Billed"
                value={statistics?.billed || 0}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Paid"
                value={statistics?.paid || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          {statistics?.cancelled > 0 && (
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Cancelled"
                  value={statistics?.cancelled || 0}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
          )}
        </Row>

        {showTable && (
          <Card>
            <Title level={4}>All Reports</Title>
            <Table
              columns={columns}
              dataSource={reports}
              rowKey={(record) => record.report_id || record.id}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        )}
      </Space>
    </div>
  );
};

export default AdminReportStatistics;

