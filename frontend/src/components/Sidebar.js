/**
 * Sidebar Component
 * Navigation sidebar for authenticated users
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Typography, Button, Space, Alert } from 'antd';
import {
  HomeOutlined,
  DollarOutlined,
  FileTextOutlined,
  HeartOutlined,
  ExperimentOutlined,
  EditOutlined,
  UploadOutlined,
  UserOutlined,
  TeamOutlined,
  DashboardOutlined,
  HistoryOutlined,
  LogoutOutlined,
  InfoCircleOutlined,
  PictureOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { authService } from '../services/authService';
import './Sidebar.css';

const { Sider } = Layout;
const { Text } = Typography;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getUser();
  const isInactive = user && user.is_active === false;

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
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

  // Patient menu items
  const patientMenuItems = [
    { key: '/patient/billing', label: 'Billing Summary', icon: <DollarOutlined /> },
    { key: '/patient/reports', label: 'Diagnostic Reports', icon: <FileTextOutlined /> },
    { key: '/profile', label: 'Profile', icon: <UserOutlined /> }
  ];

  // Doctor menu items
  const doctorMenuItems = [
    { key: '/doctor/reports', label: 'Diagnostic Reports', icon: <FileTextOutlined /> },
    { key: '/doctor/tests', label: 'View Medical Tests', icon: <ExperimentOutlined /> },
    { key: '/doctor/medical-test', label: 'Add Medical Test', icon: <ExperimentOutlined /> },
    { key: '/profile', label: 'Profile', icon: <UserOutlined /> }
  ];

  // Radiologist menu items
  const radiologistMenuItems = [
    { key: '/radiologist/test-requests', label: 'Test Requests', icon: <FileTextOutlined /> },
    { key: '/profile', label: 'Profile', icon: <UserOutlined /> }
  ];

  // Cashier menu items
  const cashierMenuItems = [
    { key: '/cashier/reports', label: 'Diagnostic Reports', icon: <FileTextOutlined /> },
    { key: '/cashier/bills', label: 'Billing Management', icon: <DollarOutlined /> },
    { key: '/profile', label: 'Profile', icon: <UserOutlined /> }
  ];

  // Admin menu items
  const adminMenuItems = [
    { key: '/admin/user-statistics', label: 'User Statistics', icon: <UserOutlined /> },
    { key: '/admin/image-statistics', label: 'Image Statistics', icon: <PictureOutlined /> },
    { key: '/admin/test-statistics', label: 'Test Statistics', icon: <ExperimentOutlined /> },
    { key: '/admin/report-statistics', label: 'Report Statistics', icon: <FileTextOutlined /> },
    { key: '/admin/billing-dashboard', label: 'Billing Dashboard', icon: <DollarOutlined /> },
    { key: '/admin/users', label: 'User Management', icon: <TeamOutlined /> },
    { key: '/admin/workflow-logs', label: 'Workflow Logs', icon: <HistoryOutlined /> }
  ];

  const getMenuItems = () => {
    const baseItems = [
      { key: '/', label: 'Dashboard', icon: <HomeOutlined /> },
    ];
    
    let roleItems = [];
    switch (user?.role) {
      case 'patient':
        roleItems = patientMenuItems;
        break;
      case 'doctor':
        roleItems = doctorMenuItems;
        break;
      case 'radiologist':
        roleItems = radiologistMenuItems;
        break;
      case 'cashier':
        roleItems = cashierMenuItems;
        break;
      case 'admin':
        roleItems = adminMenuItems;
        break;
      default:
        roleItems = [];
    }
    
    return [
      ...baseItems,
      ...roleItems
    ];
  };

  const menuItems = getMenuItems();

  const handleMenuClick = ({ key }) => {
    // If user is inactive, only allow navigation to profile
    if (isInactive && key !== '/profile') {
      return; // Disable navigation for inactive users
    }
    navigate(key);
  };

  // Disable menu items for inactive users (except profile)
  const disabledMenuItems = menuItems.map(item => ({
    ...item,
    disabled: isInactive && item.key !== '/profile' && item.key !== '/'
  }));

  return (
    <Sider
      width={260}
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
      theme="dark"
    >
      <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#fff',
          marginBottom: '8px'
        }}>
          IMS
        </div>
        <Text style={{ color: 'rgba(255,255,255,0.85)' }}>Healthcare System</Text>
      </div>

      <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <Space direction="vertical" align="center" style={{ width: '100%' }}>
          <Avatar 
            size={64} 
            style={{ 
              fontSize: '24px',
              fontWeight: 'bold'
            }}
          >
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <div style={{ textAlign: 'center', width: '100%' }}>
            <Text strong style={{ color: '#fff', display: 'block' }}>
              {user?.username || 'User'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px' }}>
              {getRoleDisplayName(user?.role)}
            </Text>
          </div>
        </Space>
      </div>

      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: 0
      }}>
        {isInactive && (
          <div style={{ padding: '12px' }}>
            <Alert
              message="Account Inactive"
              description="Your account is inactive. You can only access your profile."
              type="info"
              icon={<InfoCircleOutlined />}
              showIcon
              style={{ fontSize: '12px' }}
            />
          </div>
        )}

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={disabledMenuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </div>

      <div style={{ 
        width: '100%', 
        padding: '16px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        background: '#001529',
        flexShrink: 0
      }}>
        <Button
          type="text"
          danger
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          block
          style={{ 
            color: 'rgba(255,255,255,0.85)',
            height: '48px',
            textAlign: 'left'
          }}
        >
          Logout
        </Button>
      </div>
    </Sider>
  );
};

export default Sidebar;
