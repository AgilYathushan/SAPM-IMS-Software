import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, Typography, Space, Upload, Descriptions, Tag, Spin, Image } from 'antd';
import { UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { imageService } from '../services/imageService';
import { medicalTestService } from '../services/medicalTestService';
import { handleApiError } from '../utils/errorHandler';
import './UploadImage.css';

const { Title } = Typography;
const { TextArea } = Input;

const UploadImage = () => {
  const [formData, setFormData] = useState({
    medicalTestId: '',
    description: '',
    file: null
  });
  const [medicalTests, setMedicalTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    loadMedicalTests();
  }, []);

  const loadMedicalTests = async () => {
    try {
      setLoadingRequests(true);
      const response = await medicalTestService.getAll();
      // Filter to show only requested or completed tests (radiologist can upload images for these)
      const allowedTests = (response.data || []).filter(
        test => test.status === 'requested' || test.status === 'completed'
      );
      setMedicalTests(allowedTests);
    } catch (err) {
      const errorMessage = handleApiError(err);
      toast.error(`Failed to load medical tests: ${errorMessage}`);
      setMedicalTests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleMedicalTestChange = (value) => {
    setFormData({ ...formData, medicalTestId: value });
    const test = medicalTests.find(t => {
      const testId = t.medical_test_id || t.id; // Support both for backward compatibility
      return testId.toString() === value.toString();
    });
    if (test) {
      setSelectedTest(test);
    } else {
      setSelectedTest(null);
    }
  };

  const handleFileChange = (info) => {
    if (info.file) {
      const file = info.file.originFileObj || info.file;
      setFormData({ ...formData, file: file });
      
      // Create preview URL for image
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
      }
    }
  };

  const handleSubmit = async (values) => {
    if (!formData.file) {
      toast.error('Please select an image file to upload');
      return;
    }
    
    if (!selectedTest) {
      toast.error('Please select a valid medical test');
      return;
    }
    
    setLoading(true);

    try {
      // Map test_type to image_type enum values
      const testTypeMap = {
        'CT Scan': 'ct',
        'CT': 'ct',
        'XRAY': 'xray',
        'X-Ray': 'xray',
        'X-Ray Scan': 'xray',
        'MRI': 'mri',
        'MRI Scan': 'mri'
      };
      
      const imageType = testTypeMap[selectedTest.test_type] || 
                       selectedTest.test_type.toLowerCase()
                         .replace(/\s+/g, '')
                         .replace('scan', '')
                         .replace('-', '');
      
      // Upload image with medical test ID
      const testId = selectedTest.medical_test_id || selectedTest.id; // Support both for backward compatibility
      await imageService.upload(
        selectedTest.patient_id,
        imageType,
        formData.file,
        values.description,
        testId
      );
      
      // Only update status to completed if test is in requested state
      // If already completed, don't change status (radiologist can add more images)
      if (selectedTest.status === 'requested') {
        await medicalTestService.update(testId, { status: 'completed' });
      }
      
      toast.success('Image uploaded successfully!');
      setFormData({
        medicalTestId: '',
        description: '',
        file: null
      });
      setSelectedTest(null);
      setImagePreview(null);
      
      // Reload medical tests
      loadMedicalTests();
    } catch (err) {
      const errorMessage = handleApiError(err);
      toast.error(`Failed to upload image: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (loadingRequests) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="middle" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card size="middle">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Title level={2} style={{ margin: 0 }}>
            <UploadOutlined /> Upload Medical Image
          </Title>

          <Form
            layout="vertical"
            onFinish={handleSubmit}
            size="middle"
          >
            <Form.Item
              label="Medical Test"
              name="medicalTestId"
              rules={[{ required: true, message: 'Please select a medical test' }]}
            >
              <Select
                placeholder="Select Medical Test"
                onChange={handleMedicalTestChange}
                value={formData.medicalTestId || undefined}
              >
                {medicalTests.map((test) => {
                  const testId = test.medical_test_id || test.id; // Support both for backward compatibility
                  return (
                    <Select.Option key={testId} value={testId}>
                      Test #{test.medical_test_id || test.id} - {test.test_type} (Patient: {test.patient_id}, Doctor: {test.doctor_id})
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>

            {selectedTest && (
              <Card type="inner" title="Medical Test Details">
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Test ID">
                    {selectedTest.medical_test_id}
                  </Descriptions.Item>
                  <Descriptions.Item label="Patient ID">
                    {selectedTest.patient_id}
                  </Descriptions.Item>
                  <Descriptions.Item label="Doctor ID">
                    {selectedTest.doctor_id}
                  </Descriptions.Item>
                  <Descriptions.Item label="Test Type">
                    {selectedTest.test_type}
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={selectedTest.status === 'completed' ? 'green' : 'orange'}>
                      {selectedTest.status?.toUpperCase()}
                    </Tag>
                  </Descriptions.Item>
                  {selectedTest.notes && (
                    <Descriptions.Item label="Notes">
                      {selectedTest.notes}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}

            <Form.Item
              label="Description"
              name="description"
            >
              <TextArea
                rows={3}
                placeholder="Enter image description..."
              />
            </Form.Item>

            <Form.Item
              label="Image File"
              name="file"
              rules={[{ required: true, message: 'Please select an image file' }]}
            >
              <Upload
                beforeUpload={() => false}
                onChange={handleFileChange}
                accept="image/*"
                maxCount={1}
              >
                <Button icon={<UploadOutlined />}>Select Image</Button>
              </Upload>
              {formData.file && (
                <div style={{ marginTop: '8px' }}>
                  Selected: {formData.file.name}
                </div>
              )}
              {imagePreview && (
                <div style={{ marginTop: '16px' }}>
                  <Card type="inner" title="Image Preview" style={{ maxWidth: '500px' }}>
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                      preview={{
                        mask: 'Preview'
                      }}
                    />
                  </Card>
                </div>
              )}
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={!formData.medicalTestId || !formData.file}
                block
                size="middle"
                icon={<UploadOutlined />}
              >
                Upload Image
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default UploadImage;

