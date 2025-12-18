import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Tag, Typography, Space, Spin, Descriptions, Form, Input, Select, InputNumber, List } from 'antd';
import { ArrowLeftOutlined, DollarOutlined, EditOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { billingService } from '../services/billingService';
import { workflowService } from '../services/workflowService';
import { handleApiError } from '../utils/errorHandler';
import EmptyState from '../components/EmptyState';
import './CashierBills.css';

const { Title } = Typography;

// Helper function to safely format amount values
const formatAmount = (amount) => {
  const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(numAmount)) {
    return '0.00';
  }
  return numAmount.toFixed(2);
};

const CashierBills = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    procedure_info: [{ procedure: '', base_cost: '' }],
    total_amount: '',
    status: 'pending'
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    transaction_reference: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      setLoading(true);
      const response = await billingService.getBills();
      setBills(response.data);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load bills: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBill = async (billId) => {
    try {
      const response = await billingService.getBillById(billId);
      setSelectedBill(response.data);
      if (response.data.procedure_info) {
        setFormData({
          procedure_info: response.data.procedure_info,
          total_amount: response.data.total_amount,
          status: response.data.status
        });
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load bill details: ${errorMessage}`);
    }
  };

  const handleUpdateBill = async (values) => {
    try {
      const billId = selectedBill.bill_id || selectedBill.id; // Support both for backward compatibility
      
      // Only update total_amount, keep existing procedure_info
      await billingService.updateBill(billId, {
        total_amount: parseFloat(values.total_amount) || 0,
        procedure_info: selectedBill.procedure_info, // Keep existing procedures
        status: formData.status
      });
      toast.success('Bill updated successfully');
      
      // Log action
      try {
        await workflowService.createLog(
          "Update Bill",
          "BILL",
          billId
        );
      } catch (logError) {
        console.error('Failed to log action:', logError);
      }
      
      setEditing(false);
      loadBills();
      handleViewBill(billId);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to update bill: ${errorMessage}`);
    }
  };

  const handleProcessPayment = async (values) => {
    try {
      const billId = selectedBill.bill_id || selectedBill.id; // Support both for backward compatibility
      await billingService.createPayment({
        bill_id: billId,
        amount: parseFloat(values.amount),
        payment_method: values.payment_method,
        transaction_reference: values.transaction_reference || null
      });
      
      // Update bill status
      await billingService.updateBillStatus(billId, 'paid');
      
      toast.success('Payment processed successfully');
      
      // Log action
      try {
        await workflowService.createLog(
          "Process Payment",
          "BILL",
          billId
        );
      } catch (logError) {
        console.error('Failed to log action:', logError);
      }
      
      setPaymentForm({ amount: '', payment_method: 'cash', transaction_reference: '' });
      loadBills();
      handleViewBill(billId);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to process payment: ${errorMessage}`);
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
      title: 'Bill ID',
      dataIndex: 'bill_id',
      key: 'bill_id',
      ...getColumnSearchProps('bill_id'),
      sorter: (a, b) => ((a.bill_id || '') || '').localeCompare((b.bill_id || '') || ''),
    },
    {
      title: 'Patient ID',
      dataIndex: 'patient_id',
      key: 'patient_id',
      ...getColumnSearchProps('patient_id'),
      sorter: (a, b) => ((a.patient_id || '') || '').localeCompare((b.patient_id || '') || ''),
    },
    {
      title: 'Total Amount',
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
        return <Tag color={colorMap[status] || 'default'}>{status?.toUpperCase()}</Tag>;
      },
      filters: [
        { text: 'Paid', value: 'paid' },
        { text: 'Pending', value: 'pending' },
        { text: 'Overdue', value: 'overdue' },
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
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleViewBill(record.bill_id)}
          size="middle"
        >
          View
        </Button>
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
            <DollarOutlined /> Billing Management
          </Title>
        </Card>

        {selectedBill ? (
          <Card size="middle">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => {
                  setSelectedBill(null);
                  setEditing(false);
                }}
                size="middle"
              >
                Back to List
              </Button>

              <Title level={3}>Bill #{selectedBill.bill_id}</Title>

              {!editing ? (
                <>
                  <Descriptions bordered column={1}>
                    <Descriptions.Item label="Patient ID">
                      {selectedBill.patient_id}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag color={selectedBill.status === 'paid' ? 'green' : 'orange'}>
                        {selectedBill.status?.toUpperCase()}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Total Amount">
                      ${formatAmount(selectedBill.total_amount)}
                    </Descriptions.Item>
                  </Descriptions>

                  {selectedBill.procedure_info && selectedBill.procedure_info.length > 0 && (
                    <Card type="inner" title="Procedures" size="middle">
                      <List
                        dataSource={selectedBill.procedure_info}
                        renderItem={(proc, index) => (
                          <List.Item>
                            {proc.procedure}: ${formatAmount(proc.base_cost)}
                          </List.Item>
                        )}
                      />
                    </Card>
                  )}

                  <Space>
                    {selectedBill.status !== 'paid' && (
                      <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => setEditing(true)}
                        size="middle"
                      >
                        Edit Bill
                      </Button>
                    )}
                    {selectedBill.status !== 'paid' && (
                      <Button
                        type="primary"
                        onClick={() => setPaymentForm({...paymentForm, amount: selectedBill.total_amount})}
                        size="middle"
                      >
                        Process Payment
                      </Button>
                    )}
                  </Space>
                </>
              ) : (
                <Form
                  layout="vertical"
                  onFinish={handleUpdateBill}
                  initialValues={{
                    total_amount: selectedBill.total_amount,
                  }}
                  size="middle"
                >
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
                      parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                      formatter={(value) => {
                        if (!value) return '';
                        // Only allow numbers and decimal point
                        const numericValue = value.toString().replace(/[^\d.]/g, '');
                        // Ensure only one decimal point
                        const parts = numericValue.split('.');
                        if (parts.length > 2) {
                          return parts[0] + '.' + parts.slice(1).join('');
                        }
                        return numericValue;
                      }}
                    />
                  </Form.Item>
                  
                  {selectedBill.procedure_info && selectedBill.procedure_info.length > 0 && (
                    <Card type="inner" title="Procedures (Read-only)" size="middle">
                      <List
                        dataSource={selectedBill.procedure_info}
                        renderItem={(proc, index) => (
                          <List.Item>
                            {proc.procedure}: ${formatAmount(proc.base_cost)}
                          </List.Item>
                        )}
                      />
                    </Card>
                  )}
                  
                  <Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit" size="middle">
                        Save
                      </Button>
                      <Button onClick={() => setEditing(false)} size="middle">Cancel</Button>
                    </Space>
                  </Form.Item>
                </Form>
              )}

              {selectedBill.status !== 'paid' && paymentForm.amount && (
                <Card type="inner" title="Process Payment" size="middle">
                  <Form
                    layout="vertical"
                    onFinish={handleProcessPayment}
                    initialValues={{
                      amount: paymentForm.amount,
                      payment_method: paymentForm.payment_method,
                      transaction_reference: paymentForm.transaction_reference,
                    }}
                    size="middle"
                  >
                    <Form.Item
                      label="Amount"
                      name="amount"
                      rules={[{ required: true, message: 'Please enter amount' }]}
                    >
                      <InputNumber
                        prefix="$"
                        style={{ width: '100%' }}
                        min={0}
                        size="middle"
                        onChange={(value) => setPaymentForm({...paymentForm, amount: value})}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Payment Method"
                      name="payment_method"
                      rules={[{ required: true, message: 'Please select payment method' }]}
                    >
                      <Select onChange={(value) => setPaymentForm({...paymentForm, payment_method: value})} size="middle">
                        <Select.Option value="cash">Cash</Select.Option>
                        <Select.Option value="card">Card</Select.Option>
                        <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
                        <Select.Option value="insurance">Insurance</Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      label="Transaction Reference (optional)"
                      name="transaction_reference"
                    >
                      <Input
                        size="middle"
                        onChange={(e) => setPaymentForm({...paymentForm, transaction_reference: e.target.value})}
                      />
                    </Form.Item>
                    <Form.Item>
                      <Space>
                        <Button type="primary" htmlType="submit" size="middle">
                          Process Payment
                        </Button>
                        <Button onClick={() => setPaymentForm({amount: '', payment_method: 'cash', transaction_reference: ''})} size="middle">
                          Cancel
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </Card>
              )}
            </Space>
          </Card>
        ) : (
          <Card size="middle">
            <Title level={3}>All Bills</Title>
            {bills.length === 0 ? (
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
        )}
      </Space>
    </div>
  );
};

export default CashierBills;
