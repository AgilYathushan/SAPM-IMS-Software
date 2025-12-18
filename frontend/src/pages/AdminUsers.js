import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Typography, Space, Spin, Card, Switch, Input } from 'antd';
import { TeamOutlined, CheckOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { userService } from '../services/userService';
import { workflowService } from '../services/workflowService';
import { handleApiError } from '../utils/errorHandler';
import EmptyState from '../components/EmptyState';
import './AdminUsers.css';

const { Title } = Typography;

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAll();
      setUsers(response.data);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load users: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await userService.update(userId, { is_active: !currentStatus });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      
      // Log action
      try {
        await workflowService.createLog(
          !currentStatus ? "Activate User" : "Deactivate User",
          "USER",
          userId
        );
      } catch (logError) {
        console.error('Failed to log action:', logError);
      }
      
      loadUsers();
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to update user: ${errorMessage}`);
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

  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
          size="middle"
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => clearFilters && clearFilters()}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
    onFilter: (value, record) =>
      record[dataIndex]
        ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase())
        : '',
  });

  const columns = [
    {
      title: 'User ID',
      dataIndex: 'user_id',
      key: 'user_id',
      ...getColumnSearchProps('user_id'),
      sorter: (a, b) => ((a.user_id || '') || '').localeCompare((b.user_id || '') || ''),
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      ...getColumnSearchProps('username'),
      sorter: (a, b) => (a.username || '').localeCompare(b.username || ''),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      ...getColumnSearchProps('name'),
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ...getColumnSearchProps('email'),
      sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
    },
    {
      title: 'Role',
      dataIndex: 'user_role',
      key: 'user_role',
      render: (role) => {
        // Handle both 'role' and 'user_role' for backward compatibility
        const roleValue = role || '';
        return getRoleDisplayName(roleValue);
      },
      filters: [
        { text: 'Administrator', value: 'admin' },
        { text: 'Patient', value: 'patient' },
        { text: 'Radiologist', value: 'radiologist' },
        { text: 'Doctor', value: 'doctor' },
        { text: 'Cashier', value: 'cashier' },
      ],
      onFilter: (value, record) => {
        // Check both 'user_role' and 'role' for backward compatibility
        const roleValue = record.user_role || record.role || '';
        return roleValue === value;
      },
      sorter: (a, b) => {
        const roleA = a.user_role || a.role || '';
        const roleB = b.user_role || b.role || '';
        return roleA.localeCompare(roleB);
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
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const userId = record.user_id || record.id; // Support both for backward compatibility
        return (
          <Switch
            checked={record.is_active}
            onChange={() => handleToggleActive(userId, record.is_active)}
            checkedChildren={<CheckOutlined />}
            unCheckedChildren={<CloseOutlined />}
            size="default"
          />
        );
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="middle" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card size="middle">
          <Title level={2} style={{ margin: 0 }}>
            <TeamOutlined /> User Management
          </Title>
        </Card>

        <Card size="middle">
          <Title level={3}>All Users (Patients and Staff)</Title>
          {users.length === 0 ? (
            <EmptyState message="No users to display" />
          ) : (
            <Table
              columns={columns}
              dataSource={users}
              rowKey={(record) => record.user_id || record.id}
              pagination={{ pageSize: 10 }}
              rowClassName={(record) => (!record.is_active ? 'inactive-row' : '')}
              size="middle"
            />
          )}
        </Card>
      </Space>
    </div>
  );
};

export default AdminUsers;
