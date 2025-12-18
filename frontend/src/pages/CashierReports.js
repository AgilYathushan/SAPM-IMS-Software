import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Typography, Space, Spin, Descriptions, Alert, Modal, Form, InputNumber, DatePicker, Input } from 'antd';
import { FileTextOutlined, EyeOutlined, DollarOutlined, CheckCircleOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { reportService } from '../services/reportService';
import { billingService } from '../services/billingService';
import { medicalTestService } from '../services/medicalTestService';
import { handleApiError } from '../utils/errorHandler';
import EmptyState from '../components/EmptyState';
import './CashierReports.css';

const { Title } = Typography;

const CashierReports = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [medicalTest, setMedicalTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingBill, setCreatingBill] = useState(false);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [billForm] = Form.useForm();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await reportService.getAll();
      setReports(response.data || []);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load reports: ${errorMessage}`);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async (reportId) => {
    try {
      const response = await reportService.getById(reportId);
      const report = response.data;
      setSelectedReport(report);
      
      // Load medical test to get test type
      if (report.medical_test_id) {
        try {
          const testResponse = await medicalTestService.getById(report.medical_test_id);
          setMedicalTest(testResponse.data);
        } catch (testError) {
          console.warn('Could not load medical test:', testError);
          setMedicalTest(null);
        }
      } else {
        setMedicalTest(null);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load report details: ${errorMessage}`);
    }
  };

  const handleCreateBill = async () => {
    if (!selectedReport) return;

    // Check if report is already billed
    if (selectedReport.status === 'billed' || selectedReport.status === 'paid') {
      toast.warning('This report has already been billed.');
      return;
    }

    // Check if report is confirmed
    if (selectedReport.status !== 'confirmed') {
      toast.warning('Only confirmed reports can be billed.');
      return;
    }

    setBillModalVisible(true);
  };

  const confirmCreateBill = async (values) => {
    if (!selectedReport) return;

    try {
      setCreatingBill(true);
      
      // Get total amount from form
      const totalAmount = parseFloat(values.total_amount) || 0;
      if (totalAmount <= 0) {
        toast.error('Please enter a valid amount greater than 0');
        return;
      }
      
      // Get test type from medical test, or use default
      const testType = medicalTest?.test_type || 'Diagnostic Test';
      
      // Create bill from report
      const billData = {
        patient_id: selectedReport.patient_id,
        procedure_info: [
          {
            procedure: testType,
            base_cost: totalAmount
          }
        ],
        total_amount: totalAmount,
        due_date: values.due_date ? values.due_date.toISOString() : null
      };

      const billResponse = await billingService.createBill(billData);
      
      // Update report status to "billed"
      await reportService.update(selectedReport.report_id, { status: 'billed' });
      
      toast.success('Bill created successfully from report!');
      setBillModalVisible(false);
      billForm.resetFields();
      loadReports();
      handleViewReport(selectedReport.report_id);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to create bill: ${errorMessage}`);
    } finally {
      setCreatingBill(false);
    }
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
      title: 'Report ID',
      dataIndex: 'report_id',
      key: 'report_id',
      ...getColumnSearchProps('report_id'),
      sorter: (a, b) => ((a.report_id || '') || '').localeCompare((b.report_id || '') || ''),
    },
    {
      title: 'Patient ID',
      dataIndex: 'patient_id',
      key: 'patient_id',
      ...getColumnSearchProps('patient_id'),
      sorter: (a, b) => ((a.patient_id || '') || '').localeCompare((b.patient_id || '') || ''),
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
      filters: [
        { text: 'Draft', value: 'draft' },
        { text: 'Preliminary', value: 'preliminary' },
        { text: 'Confirmed', value: 'confirmed' },
        { text: 'Billed', value: 'billed' },
        { text: 'Paid', value: 'paid' },
        { text: 'Cancelled', value: 'cancelled' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Created Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A',
      sorter: (a, b) => {
        if (!a.created_at && !b.created_at) return 0;
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(a.created_at) - new Date(b.created_at);
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => handleViewReport(record.report_id)}
            size="middle"
          >
            View
          </Button>
          {record.status === 'confirmed' && (
            <Button
              type="default"
              icon={<DollarOutlined />}
              onClick={() => {
                const reportId = record.report_id || record.id; // Support both for backward compatibility
                handleViewReport(reportId);
                setTimeout(() => handleCreateBill(), 100);
              }}
              size="middle"
            >
              Create Bill
            </Button>
          )}
        </Space>
      ),
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
            <FileTextOutlined /> Diagnostic Reports
          </Title>
        </Card>

        {selectedReport ? (
          <Card size="middle">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button
                onClick={() => {
                  setSelectedReport(null);
                  setMedicalTest(null);
                }}
                size="middle"
              >
                Back to List
              </Button>

              <Title level={3}>Report #{selectedReport.report_id}</Title>

              <Descriptions bordered column={1}>
                <Descriptions.Item label="Status">
                  <Tag color={
                    selectedReport.status === 'confirmed' ? 'green' : 
                    selectedReport.status === 'billed' ? 'blue' :
                    selectedReport.status === 'paid' ? 'green' :
                    selectedReport.status === 'preliminary' ? 'orange' :
                    selectedReport.status === 'cancelled' ? 'red' : 'default'
                  }>
                    {selectedReport.status?.toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Patient ID">
                  {selectedReport.patient_id}
                </Descriptions.Item>
                <Descriptions.Item label="Test Type">
                  {medicalTest?.test_type || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Findings">
                  {selectedReport.findings || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Diagnosis">
                  {selectedReport.diagnosis || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Recommendations">
                  {selectedReport.recommendations || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Created">
                  {new Date(selectedReport.created_at).toLocaleDateString()}
                </Descriptions.Item>
                {selectedReport.finalized_at && (
                  <Descriptions.Item label="Confirmed Date">
                    {new Date(selectedReport.finalized_at).toLocaleDateString()}
                  </Descriptions.Item>
                )}
              </Descriptions>

              {selectedReport.status === 'confirmed' && (
                <Space style={{ width: '100%', justifyContent: 'center', marginTop: '20px' }}>
                  <Button
                    type="primary"
                    icon={<DollarOutlined />}
                    onClick={handleCreateBill}
                    size="middle"
                    style={{
                      height: '48px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      padding: '0 32px',
                      borderRadius: '6px'
                    }}
                  >
                    Create Bill from Report
                  </Button>
                </Space>
              )}
            </Space>
          </Card>
        ) : (
          <Card size="middle">
            <Title level={3}>All Diagnostic Reports</Title>
            {reports.length === 0 ? (
              <EmptyState message="No reports to display" />
            ) : (
              <Table
                columns={columns}
                dataSource={reports}
                rowKey={(record) => record.report_id || record.id}
                pagination={{ pageSize: 10 }}
                size="middle"
              />
            )}
          </Card>
        )}
      </Space>

      <Modal
        title="Create Bill from Report"
        open={billModalVisible}
        onCancel={() => {
          setBillModalVisible(false);
          billForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        {selectedReport && (
          <Form
            form={billForm}
            layout="vertical"
            onFinish={confirmCreateBill}
            initialValues={{
              total_amount: undefined
            }}
            size="middle"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Report ID">
                  {selectedReport.report_id}
                </Descriptions.Item>
                <Descriptions.Item label="Patient ID">
                  {selectedReport.patient_id}
                </Descriptions.Item>
                <Descriptions.Item label="Test Type">
                  {medicalTest?.test_type || 'N/A'}
                </Descriptions.Item>
              </Descriptions>
              
              <Form.Item
                label="Total Amount"
                name="total_amount"
                rules={[
                  { required: true, message: 'Please enter the total amount' },
                  { type: 'number', min: 0.01, message: 'Amount must be greater than 0' }
                ]}
              >
                <InputNumber
                  prefix="$"
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder="Enter total amount"
                  size="middle"
                />
              </Form.Item>
              
              <Form.Item
                label="Due Date"
                name="due_date"
                rules={[
                  { required: true, message: 'Please select a due date' }
                ]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  disabledDate={(current) => {
                    // Disable dates before today
                    return current && current < dayjs().startOf('day');
                  }}
                  placeholder="Select due date"
                  size="middle"
                />
              </Form.Item>
              
              <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Button onClick={() => {
                  setBillModalVisible(false);
                  billForm.resetFields();
                }} size="middle">
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={creatingBill} size="middle">
                  Create Bill
                </Button>
              </Space>
            </Space>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default CashierReports;

