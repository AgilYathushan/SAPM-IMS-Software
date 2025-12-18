import React, { useState, useEffect } from 'react';
import { Table, Typography, Space, Spin, Card, Tag, Input, Button } from 'antd';
import { HistoryOutlined, SearchOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { workflowService } from '../services/workflowService';
import { handleApiError } from '../utils/errorHandler';
import EmptyState from '../components/EmptyState';
import './AdminWorkflowLogs.css';

const { Title } = Typography;

const AdminWorkflowLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await workflowService.getAllLogs();
      setLogs(response.data);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load workflow logs: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getEntityTypeColor = (entityType) => {
    const colors = {
      'USER': 'blue',
      'PATIENT': 'green',
      'REPORT': 'purple',
      'BILL': 'orange',
      'MEDICAL_TEST': 'cyan',
      'IMAGE': 'magenta',
      'NONE': 'default'
    };
    return colors[entityType] || 'default';
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
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 200,
      ...getColumnSearchProps('action'),
      sorter: (a, b) => (a.action || '').localeCompare(b.action || ''),
    },
    {
      title: 'User ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 120,
      ...getColumnSearchProps('user_id'),
      sorter: (a, b) => (a.user_id || '').localeCompare(b.user_id || ''),
    },
    {
      title: 'Entity Type',
      dataIndex: 'entity_type',
      key: 'entity_type',
      width: 150,
      render: (entityType) => entityType ? (
        <Tag color={getEntityTypeColor(entityType)}>{entityType}</Tag>
      ) : <Tag>NONE</Tag>,
      filters: [
        { text: 'USER', value: 'USER' },
        { text: 'PATIENT', value: 'PATIENT' },
        { text: 'REPORT', value: 'REPORT' },
        { text: 'BILL', value: 'BILL' },
        { text: 'MEDICAL_TEST', value: 'MEDICAL_TEST' },
        { text: 'IMAGE', value: 'IMAGE' },
        { text: 'NONE', value: 'NONE' },
      ],
      onFilter: (value, record) => record.entity_type === value,
    },
    {
      title: 'Relevant ID',
      dataIndex: 'relevant_id',
      key: 'relevant_id',
      width: 120,
      render: (relevantId) => relevantId || 'N/A',
      ...getColumnSearchProps('relevant_id'),
      sorter: (a, b) => ((a.relevant_id || '') || 'N/A').localeCompare((b.relevant_id || '') || 'N/A'),
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 200,
      render: (timestamp) => new Date(timestamp).toLocaleString(),
      sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      defaultSortOrder: 'descend',
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
            <HistoryOutlined /> Workflow Logs
          </Title>
        </Card>

        <Card size="middle">
          <Title level={3}>System Activity Logs</Title>
          {logs.length === 0 ? (
            <EmptyState message="No logs to display" />
          ) : (
            <Table
              columns={columns}
              dataSource={logs}
              rowKey="log_id"
              pagination={{ pageSize: 10 }}
              size="middle"
            />
          )}
        </Card>
      </Space>
    </div>
  );
};

export default AdminWorkflowLogs;
