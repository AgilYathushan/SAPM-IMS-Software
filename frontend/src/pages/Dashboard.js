/**
 * Dashboard Component
 * Main landing page after user login
 * Shows role-based statistics based on user permissions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, Space, Avatar, Statistic, Spin } from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  HeartOutlined,
  ExperimentOutlined,
  EditOutlined,
  UploadOutlined,
  TeamOutlined,
  DashboardOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PictureOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { authService } from '../services/authService';
import { medicalTestService } from '../services/medicalTestService';
import { reportService } from '../services/reportService';
import { billingService } from '../services/billingService';
import { toast } from 'react-toastify';
import { handleApiError } from '../utils/errorHandler';
import './Dashboard.css';

const { Title, Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const user = authService.getUser();
  const [loading, setLoading] = useState(true);
  
  // Statistics state
  const [testStats, setTestStats] = useState(null);
  const [reportStats, setReportStats] = useState(null);
  const [billingStats, setBillingStats] = useState(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      
      if (user?.role === 'radiologist') {
        await loadTestStatistics();
      } else if (user?.role === 'doctor') {
        await loadReportStatistics();
      } else if (user?.role === 'cashier') {
        await loadCashierStatistics();
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTestStatistics = async () => {
    try {
      const response = await medicalTestService.getAll();
      const tests = response.data || [];
      
      const stats = {
        total: tests.length,
        requested: tests.filter(t => t.status === 'requested').length,
        completed: tests.filter(t => t.status === 'completed').length,
        reporting: tests.filter(t => t.status === 'reporting').length,
        cancelled: tests.filter(t => t.status === 'cancelled').length,
      };
      
      setTestStats(stats);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load test statistics: ${errorMessage}`);
    }
  };

  const loadReportStatistics = async () => {
    try {
      const response = await reportService.getAll();
      const reports = response.data || [];
      
      // Get all tests to find which ones need reports
      const testsResponse = await medicalTestService.getAll();
      const tests = testsResponse.data || [];
      
      // Tests that are completed but don't have reports yet
      const completedTests = tests.filter(t => t.status === 'completed');
      const testsWithReports = new Set(reports.map(r => r.medical_test_id));
      const testsNeedingReports = completedTests.filter(t => !testsWithReports.has(t.medical_test_id));
      
      const stats = {
        total: reports.length,
        draft: reports.filter(r => r.status === 'draft').length,
        preliminary: reports.filter(r => r.status === 'preliminary').length,
        confirmed: reports.filter(r => r.status === 'confirmed').length,
        billed: reports.filter(r => r.status === 'billed').length,
        paid: reports.filter(r => r.status === 'paid').length,
        toCreate: testsNeedingReports.length,
      };
      
      setReportStats(stats);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load report statistics: ${errorMessage}`);
    }
  };

  const loadCashierStatistics = async () => {
    try {
      const reportsResponse = await reportService.getAll();
      const reports = reportsResponse.data || [];
      
      const billsResponse = await billingService.getBills();
      const bills = billsResponse.data || [];
      
      const stats = {
        reportsToBill: reports.filter(r => r.status === 'confirmed').length,
        totalBills: bills.length,
        paidBills: bills.filter(b => b.status === 'paid').length,
        pendingBills: bills.filter(b => b.status === 'pending').length,
        totalAmount: bills.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0),
        paidAmount: bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0),
        pendingAmount: bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0),
      };
      
      setBillingStats(stats);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load billing statistics: ${errorMessage}`);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      admin: 'Administrator',
      patient: 'Patient',
      radiologist: 'Radiologist',
      doctor: 'Doctor',
      cashier: 'Cashier'
    };
    return roleMap[role] || role;
  };

  const getMenuItems = () => {
    switch (user?.role) {
      case 'patient':
        return [
          { 
            title: 'Billing Summary', 
            description: 'View billing details summary',
            icon: <DollarOutlined style={{ fontSize: '32px' }} />,
            path: '/patient/billing'
          },
          { 
            title: 'Diagnostic Reports', 
            description: 'View all diagnostic reports',
            icon: <FileTextOutlined style={{ fontSize: '32px' }} />,
            path: '/patient/reports'
          }
        ];
      case 'admin':
        return [
          { 
            title: 'User Statistics', 
            description: 'View user statistics and manage users',
            icon: <UserOutlined style={{ fontSize: '32px' }} />,
            path: '/admin/user-statistics'
          },
          { 
            title: 'Image Statistics', 
            description: 'View image statistics and manage images',
            icon: <PictureOutlined style={{ fontSize: '32px' }} />,
            path: '/admin/image-statistics'
          },
          { 
            title: 'Test Statistics', 
            description: 'View test statistics and manage tests',
            icon: <ExperimentOutlined style={{ fontSize: '32px' }} />,
            path: '/admin/test-statistics'
          },
          { 
            title: 'Report Statistics', 
            description: 'View report statistics and manage reports',
            icon: <FileTextOutlined style={{ fontSize: '32px' }} />,
            path: '/admin/report-statistics'
          },
          { 
            title: 'Billing Dashboard', 
            description: 'View billing dashboard with paid and payable amounts',
            icon: <DashboardOutlined style={{ fontSize: '32px' }} />,
            path: '/admin/billing-dashboard'
          },
          { 
            title: 'Workflow Logs', 
            description: 'View system workflow logs',
            icon: <HistoryOutlined style={{ fontSize: '32px' }} />,
            path: '/admin/workflow-logs'
          }
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  const renderRadiologistDashboard = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      );
    }

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Tests"
              value={testStats?.total || 0}
              prefix={<ExperimentOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Requested"
              value={testStats?.requested || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Completed"
              value={testStats?.completed || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="In Reporting"
              value={testStats?.reporting || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        {testStats?.cancelled > 0 && (
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Cancelled"
                value={testStats?.cancelled || 0}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        )}
      </Row>
    );
  };

  const renderDoctorDashboard = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      );
    }

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Title level={4}>Reports to Create</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Statistic
                title="Tests Needing Reports"
                value={reportStats?.toCreate || 0}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#faad14', fontSize: '32px' }}
              />
            </Col>
          </Row>
        </Card>

        <Card>
          <Title level={4}>Report Summary</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Total Reports"
                value={reportStats?.total || 0}
                prefix={<FileTextOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Preliminary"
                value={reportStats?.preliminary || 0}
                prefix={<EditOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Confirmed"
                value={reportStats?.confirmed || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Billed"
                value={reportStats?.billed || 0}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
          </Row>
        </Card>
      </Space>
    );
  };

  const renderCashierDashboard = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      );
    }

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Title level={4}>Reports to Bill</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Statistic
                title="Confirmed Reports Awaiting Billing"
                value={billingStats?.reportsToBill || 0}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#faad14', fontSize: '32px' }}
              />
            </Col>
          </Row>
        </Card>

        <Card>
          <Title level={4}>Billing Summary</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Total Bills"
                value={billingStats?.totalBills || 0}
                prefix={<FileTextOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Paid Bills"
                value={billingStats?.paidBills || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Pending Bills"
                value={billingStats?.pendingBills || 0}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Total Amount"
                value={billingStats?.totalAmount || 0}
                prefix={<DollarOutlined />}
                precision={2}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Paid Amount"
                value={billingStats?.paidAmount || 0}
                prefix={<DollarOutlined />}
                precision={2}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Pending Amount"
                value={billingStats?.pendingAmount || 0}
                prefix={<DollarOutlined />}
                precision={2}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
          </Row>
        </Card>
      </Space>
    );
  };

  const renderAdminDashboard = () => {
    return (
      <Row gutter={[24, 24]}>
        {menuItems.map((item, index) => (
          <Col xs={24} sm={12} lg={8} key={index}>
            <Card size="middle"
              hoverable
              onClick={() => navigate(item.path)}
              style={{
                height: '100%',
                cursor: 'pointer',
                borderRadius: '12px',
                transition: 'all 0.3s',
              }}
              bodyStyle={{
                padding: '24px',
                textAlign: 'center'
              }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  {item.icon}
                </div>
                <Title level={4} style={{ margin: 0 }}>
                  {item.title}
                </Title>
                <Text type="secondary">
                  {item.description}
                </Text>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  const renderPatientDashboard = () => {
    return (
      <Row gutter={[24, 24]}>
        {menuItems.map((item, index) => (
          <Col xs={24} sm={12} lg={8} key={index}>
            <Card size="middle"
              hoverable
              onClick={() => navigate(item.path)}
              style={{
                height: '100%',
                cursor: 'pointer',
                borderRadius: '12px',
                transition: 'all 0.3s',
              }}
              bodyStyle={{
                padding: '24px',
                textAlign: 'center'
              }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  {item.icon}
                </div>
                <Title level={4} style={{ margin: 0 }}>
                  {item.title}
                </Title>
                <Text type="secondary">
                  {item.description}
                </Text>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card size="middle">
          <Space align="center" size="middle">
            <Avatar 
              size={64} 
              style={{ 
                fontSize: '24px',
                fontWeight: 'bold'
              }}
            >
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            <div>
              <Title level={2} style={{ margin: 0 }}>
                Welcome, {user?.username}!
              </Title>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                {getRoleDisplayName(user?.role)}
              </Text>
            </div>
          </Space>
        </Card>

        {user?.role === 'radiologist' && renderRadiologistDashboard()}
        {user?.role === 'doctor' && renderDoctorDashboard()}
        {user?.role === 'cashier' && renderCashierDashboard()}
        {user?.role === 'admin' && (
          <>
            <Title level={3}>Quick Actions</Title>
            {renderAdminDashboard()}
          </>
        )}
        {user?.role === 'patient' && (
          <>
            <Title level={3}>Quick Actions</Title>
            {renderPatientDashboard()}
          </>
        )}
      </Space>
    </div>
  );
};

export default Dashboard;

