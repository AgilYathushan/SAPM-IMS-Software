import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Table, Select, Statistic, Row, Col, Typography, Tag, Space, Spin, Input, Button } from 'antd';
import { DollarOutlined, SearchOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { billingService } from '../services/billingService';
import { patientService } from '../services/patientService';
import { authService } from '../services/authService';
import { handleApiError } from '../utils/errorHandler';
import EmptyState from '../components/EmptyState';
import './Billing.css';

const { Title } = Typography;

// Helper function to safely format amount values
const formatAmount = (amount) => {
  const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(numAmount)) {
    return '0.00';
  }
  return numAmount.toFixed(2);
};

const Billing = () => {
  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const user = authService.getUser();
  const hasLoadedRef = useRef(false);
  const loadingRef = useRef(false);
  const errorShownRef = useRef(false); // Use ref instead of state to prevent re-renders

  const getCurrentPatientId = useCallback(async () => {
    try {
      const userId = user?.user_id || user?.id; // Support both for backward compatibility
      if (user?.role === 'patient' && userId) {
        const response = await patientService.getByUserId(userId);
        return response.data.patient_id;
      }
    } catch (error) {
      // Handle errors silently
    }
    return null;
  }, [user?.user_id, user?.id, user?.role]);

  const loadPatients = useCallback(async () => {
    if (user?.role === 'patient') {
      return;
    }
    try {
      const response = await patientService.getAll();
      setPatients(response.data || []);
    } catch (err) {
      if (err.response?.status !== 404 && err.response?.status !== 403 && !errorShownRef.current) {
        const errorMessage = handleApiError(err);
        toast.error(`Failed to load patients: ${errorMessage}`);
        errorShownRef.current = true;
      }
    }
  }, [user?.role]);

  const loadPatientBills = useCallback(async (patientId = null) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const pid = patientId || (user?.role === 'patient' ? await getCurrentPatientId() : null);
      if (pid) {
        const response = await billingService.getBillsByPatient(pid);
        setBills(response.data || []);
      } else {
        const response = await billingService.getBills();
        setBills(response.data || []);
      }
    } catch (err) {
      const isNotFoundError = err.response?.status === 404 || 
                             err.response?.status === 403 ||
                             err.response?.data?.detail?.toLowerCase().includes('not found') ||
                             err.response?.data?.detail?.toLowerCase().includes('does not exist');
      
      if (isNotFoundError) {
        setBills([]);
        setError('');
      } else if (!errorShownRef.current) {
        const errorMessage = handleApiError(err);
        setError(errorMessage);
        toast.error(`Failed to load bills: ${errorMessage}`);
        errorShownRef.current = true;
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user?.role, getCurrentPatientId]);

  const loadFinancialSummary = useCallback(async (patientId = null) => {
    try {
      const pid = patientId || (user?.role === 'patient' ? await getCurrentPatientId() : null);
      if (pid) {
        const response = await billingService.getFinancialSummary(pid);
        setSummary(response.data);
      }
    } catch (err) {
      const isNotFoundError = err.response?.status === 404 || 
                             err.response?.status === 403 ||
                             err.response?.data?.detail?.toLowerCase().includes('not found') ||
                             err.response?.data?.detail?.toLowerCase().includes('does not exist');
      
      if (isNotFoundError) {
        setSummary(null);
      } else if (!errorShownRef.current) {
        const errorMessage = handleApiError(err);
        toast.error(`Failed to load financial summary: ${errorMessage}`);
        errorShownRef.current = true;
        setSummary(null);
      } else {
        setSummary(null);
      }
    }
  }, [user?.role, getCurrentPatientId]);

  useEffect(() => {
    if (loadingRef.current || hasLoadedRef.current) {
      return;
    }
    
    let isMounted = true;
    hasLoadedRef.current = true;
    
    const initializeData = async () => {
      if (!isMounted) return;
      
      errorShownRef.current = false;
      setError('');
      
      if (user?.role !== 'patient') {
        await loadPatients();
      }
      
      if (user?.role === 'patient') {
        const patientId = await getCurrentPatientId();
        if (!isMounted) return;
        
        if (patientId) {
          await Promise.allSettled([
            loadPatientBills(patientId),
            loadFinancialSummary(patientId)
          ]);
        } else {
          if (isMounted) {
            setBills([]);
            setSummary(null);
          }
        }
      }
    };
    
    initializeData();
    
    return () => {
      isMounted = false;
      hasLoadedRef.current = false;
    };
  }, [user?.user_id, user?.id, user?.role]); // Only depend on user ID and role to prevent infinite loops


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
      title: 'Bill ID',
      dataIndex: 'bill_id',
      key: 'bill_id',
      ...getColumnSearchProps('bill_id'),
      sorter: (a, b) => ((a.bill_id || '') || '').localeCompare((b.bill_id || '') || ''),
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `$${formatAmount(amount)}`,
      sorter: (a, b) => parseFloat(a.total_amount || 0) - parseFloat(b.total_amount || 0),
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
        return (
          <Tag color={colorMap[status] || 'default'}>
            {status?.toUpperCase()}
          </Tag>
        );
      },
      filters: [
        { text: 'Paid', value: 'paid' },
        { text: 'Pending', value: 'pending' },
        { text: 'Overdue', value: 'overdue' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A',
      sorter: (a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card size="middle">
          <Title level={2} style={{ margin: 0 }}>
            Billing & Payments
          </Title>
        </Card>

        {user?.role !== 'patient' && (
          <Card size="middle">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={4}>Select Patient</Title>
              <Select
                style={{ width: '100%' }}
                placeholder="Select Patient"
                value={selectedPatient || undefined}
                onChange={(value) => {
                  setSelectedPatient(value);
                  errorShownRef.current = false;
                  loadingRef.current = false;
                  hasLoadedRef.current = false;
                  if (value) {
                    loadPatientBills(value);
                    loadFinancialSummary(value);
                  } else {
                    setBills([]);
                    setSummary(null);
                  }
                }}
                allowClear
                size="middle"
              >
                <Select.Option value="">All Patients</Select.Option>
                {patients.map((patient) => (
                  <Select.Option key={patient.patient_id || patient.id} value={patient.patient_id || patient.id}>
                    {patient.patient_id} - {patient.first_name} {patient.last_name}
                  </Select.Option>
                ))}
              </Select>
            </Space>
          </Card>
        )}

        {summary && (
          <Card size="middle">
            <Title level={4}>Financial Summary</Title>
            <Row gutter={16} style={{ marginTop: '16px' }}>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Total Billed"
                  value={summary.total_billed || 0}
                  prefix={<DollarOutlined />}
                  precision={2}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Total Paid"
                  value={summary.total_paid || 0}
                  prefix={<DollarOutlined />}
                  precision={2}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="Pending"
                  value={summary.pending || 0}
                  prefix={<DollarOutlined />}
                  precision={2}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
            </Row>
          </Card>
        )}

        <Card size="middle">
          <Title level={4}>Bills</Title>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="middle" />
            </div>
          ) : bills.length === 0 ? (
            <EmptyState message="No bills to display" />
          ) : (
            <Table
              columns={columns}
              dataSource={bills}
              rowKey={(record) => record.bill_id || record.id}
              pagination={{ pageSize: 10 }}
              size="middle"
            />
          )}
        </Card>
      </Space>
    </div>
  );
};

export default Billing;
