import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Tag, Typography, Space, Spin, Descriptions, Modal, Input } from 'antd';
import { ExperimentOutlined, EditOutlined, EyeOutlined, ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { medicalTestService } from '../services/medicalTestService';
import { handleApiError } from '../utils/errorHandler';
import EmptyState from '../components/EmptyState';
import './DoctorTests.css';

const { Title } = Typography;

const DoctorTests = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const [loadingTest, setLoadingTest] = useState(false);

  const handleViewTest = async (testId) => {
    try {
      setLoadingTest(true);
      const response = await medicalTestService.getById(testId);
      const test = response.data;
      setSelectedTest(test);
      
      // Update URL to include testId
      setSearchParams({ testId });
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load medical test: ${errorMessage}`);
    } finally {
      setLoadingTest(false);
    }
  };

  useEffect(() => {
    loadTests();
    
    // Check if testId is in query params and load that test
    const testId = searchParams.get('testId');
    if (testId) {
      handleViewTest(testId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const response = await medicalTestService.getAll();
      setTests(response.data || []);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load medical tests: ${errorMessage}`);
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = (testId) => {
    navigate(`/create-report?testId=${testId}`);
  };

  const handleCloseTestView = () => {
    setSelectedTest(null);
    setSearchParams({});
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
      title: 'Test ID',
      dataIndex: 'medical_test_id',
      key: 'medical_test_id',
      ...getColumnSearchProps('medical_test_id'),
      sorter: (a, b) => ((a.medical_test_id || '') || '').localeCompare((b.medical_test_id || '') || ''),
    },
    {
      title: 'Patient ID',
      dataIndex: 'patient_id',
      key: 'patient_id',
      ...getColumnSearchProps('patient_id'),
      sorter: (a, b) => ((a.patient_id || '') || '').localeCompare((b.patient_id || '') || ''),
    },
    {
      title: 'Test Type',
      dataIndex: 'test_type',
      key: 'test_type',
      ...getColumnSearchProps('test_type'),
      sorter: (a, b) => (a.test_type || '').localeCompare(b.test_type || ''),
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
      filters: [
        { text: 'Requested', value: 'requested' },
        { text: 'Completed', value: 'completed' },
        { text: 'Reporting', value: 'reporting' },
        { text: 'Cancelled', value: 'cancelled' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Requested Date',
      dataIndex: 'requested_at',
      key: 'requested_at',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A',
      sorter: (a, b) => {
        if (!a.requested_at && !b.requested_at) return 0;
        if (!a.requested_at) return 1;
        if (!b.requested_at) return -1;
        return new Date(a.requested_at) - new Date(b.requested_at);
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const testId = record.medical_test_id || record.id;
        return (
          <Space>
            <Button
              type="default"
              icon={<EyeOutlined />}
              onClick={() => handleViewTest(testId)}
              size="middle"
            >
              View
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => handleCreateReport(testId)}
              disabled={record.status !== 'completed'}
              size="middle"
            >
              Generate Report
            </Button>
          </Space>
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

  if (selectedTest) {
    return (
      <div style={{ padding: '24px' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Card size="middle">
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleCloseTestView}
                size="middle"
              >
                Back to List
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                Medical Test Details
              </Title>
            </Space>
          </Card>

          {loadingTest ? (
            <Card size="middle">
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin size="middle" />
              </div>
            </Card>
          ) : (
            <Card size="middle">
              <Descriptions bordered column={1}>
                <Descriptions.Item label="Test ID">
                  {selectedTest.medical_test_id || selectedTest.id}
                </Descriptions.Item>
                <Descriptions.Item label="Patient ID">
                  {selectedTest.patient_id}
                </Descriptions.Item>
                <Descriptions.Item label="Doctor ID">
                  {selectedTest.doctor_id}
                </Descriptions.Item>
                <Descriptions.Item label="Radiologist ID">
                  {selectedTest.radiologist_id || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Test Type">
                  {selectedTest.test_type}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={
                    selectedTest.status === 'completed' ? 'green' :
                    selectedTest.status === 'requested' ? 'orange' :
                    selectedTest.status === 'reporting' ? 'blue' :
                    selectedTest.status === 'cancelled' ? 'red' : 'default'
                  }>
                    {selectedTest.status?.toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Requested At">
                  {selectedTest.requested_at ? new Date(selectedTest.requested_at).toLocaleString() : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Completed At">
                  {selectedTest.completed_at ? new Date(selectedTest.completed_at).toLocaleString() : 'N/A'}
                </Descriptions.Item>
                {selectedTest.notes && (
                  <Descriptions.Item label="Notes">
                    {selectedTest.notes}
                  </Descriptions.Item>
                )}
              </Descriptions>

              <Space style={{ marginTop: '24px' }}>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => handleCreateReport(selectedTest.medical_test_id || selectedTest.id)}
                  disabled={selectedTest.status !== 'completed'}
                >
                  Generate Report
                </Button>
              </Space>
            </Card>
          )}
        </Space>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card>
          <Title level={2} style={{ margin: 0 }}>
            <ExperimentOutlined /> All Medical Tests
          </Title>
        </Card>

        <Card>
          {tests.length === 0 ? (
            <EmptyState message="No medical tests to display" />
          ) : (
            <Table
              columns={columns}
              dataSource={tests}
              rowKey={(record) => record.medical_test_id || record.id}
              pagination={{ pageSize: 10 }}
            />
          )}
        </Card>
      </Space>
    </div>
  );
};

export default DoctorTests;

