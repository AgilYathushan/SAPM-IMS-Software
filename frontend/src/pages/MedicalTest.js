import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Select, Button, Card, Typography, Space } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { medicalTestService } from '../services/medicalTestService';
import { patientService } from '../services/patientService';
import { medicalStaffService } from '../services/medicalStaffService';
import { workflowService } from '../services/workflowService';
import { handleApiError } from '../utils/errorHandler';
import './MedicalTest.css';

const { Title } = Typography;
const { TextArea } = Input;

const MedicalTest = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [radiologists, setRadiologists] = useState([]);
  const [formData, setFormData] = useState({
    patient_id: '',
    radiologist_id: '',
    test_type: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPatients();
    loadRadiologists();
  }, []);

  const loadPatients = async () => {
    try {
      // Load only active patients
      const response = await patientService.getAll();
      // Filter active patients on frontend
      const activePatients = (response.data || []).filter(p => p.is_active);
      setPatients(activePatients);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load patients: ${errorMessage}`);
    }
  };

  const loadRadiologists = async () => {
    try {
      // Load radiologists using API filter for role and active status
      const response = await medicalStaffService.getAll({
        role: 'radiologist',
        active_only: true
      });
      
      // Also filter on frontend as fallback
      const activeRadiologists = (response.data || []).filter(
        staff => {
          const role = staff.user_role?.value || staff.user_role || '';
          const isRadiologist = role.toLowerCase() === 'radiologist';
          const isActive = staff.is_active === true || staff.is_active === 'true';
          return isRadiologist && isActive;
        }
      );
      
      setRadiologists(activeRadiologists);
      
      if (activeRadiologists.length === 0) {
        console.warn('No active radiologists found');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Error loading radiologists:', error);
      toast.error(`Failed to load radiologists: ${errorMessage}`);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const response = await medicalTestService.create(values);
      const createdTest = response.data;
      const medicalTestId = createdTest?.medical_test_id || createdTest?.id;
      
      toast.success('Medical test created successfully');
      
      // Log the action with the created medical test ID
      try {
        await workflowService.createLog(
          "Create Medical Test",
          "MEDICAL_TEST",
          medicalTestId
        );
      } catch (logError) {
        console.error('Failed to log action:', logError);
      }
      
      // Redirect to view the test
      if (medicalTestId) {
        navigate(`/doctor/tests?testId=${medicalTestId}`);
      } else {
        navigate('/doctor/tests');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to create medical test request: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card size="middle">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Title level={2} style={{ margin: 0 }}>
            <ExperimentOutlined /> Medical Test
          </Title>

          <Form
            layout="vertical"
            onFinish={handleSubmit}
            size="middle"
          >
            <Form.Item
              label="Patient"
              name="patient_id"
              rules={[{ required: true, message: 'Please select a patient' }]}
            >
              <Select placeholder="Select a patient">
                {patients.map((patient) => {
                  const patientId = patient.patient_id || patient.id; // Support both for backward compatibility
                  return (
                    <Select.Option key={patientId} value={patientId}>
                      {patient.name || patient.username} {patient.is_active ? '' : '(Inactive)'}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>

            <Form.Item
              label="Radiologist"
              name="radiologist_id"
              rules={[{ required: true, message: 'Please select a radiologist' }]}
            >
              <Select placeholder="Select a radiologist">
                {radiologists.map((radiologist) => {
                  const staffId = radiologist.staff_id || radiologist.id; // Support both for backward compatibility
                  return (
                    <Select.Option key={staffId} value={staffId}>
                      {radiologist.name || radiologist.username} {radiologist.department ? `- ${radiologist.department}` : ''}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>

            <Form.Item
              label="Test Type"
              name="test_type"
              rules={[{ required: true, message: 'Please select a test type' }]}
            >
              <Select placeholder="Select test type">
                <Select.Option value="CT Scan">CT Scan</Select.Option>
                <Select.Option value="XRAY">XRAY</Select.Option>
                <Select.Option value="MRI">MRI</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Notes"
              name="notes"
            >
              <TextArea
                rows={5}
                placeholder="Additional notes or instructions..."
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="middle"
                >
                  Request Medical Test
                </Button>
                <Button onClick={() => navigate('/')} size="middle">
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default MedicalTest;

