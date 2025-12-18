import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Form, Input, Select, Button, Card, Typography, Space, Alert, Row, Col, Image, Spin } from 'antd';
import { toast } from 'react-toastify';
import { reportService } from '../services/reportService';
import { imageService } from '../services/imageService';
import { medicalTestService } from '../services/medicalTestService';
import { medicalStaffService } from '../services/medicalStaffService';
import { authService } from '../services/authService';
import { handleApiError } from '../utils/errorHandler';
import { convertMinioUrlForFrontend } from '../utils/minioUrl';
import './CreateReport.css';

const { Title } = Typography;
const { TextArea } = Input;

const CreateReport = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const testId = searchParams.get('testId');
  
  const [formData, setFormData] = useState({
    patientId: '',
    imageId: '',
    medicalTestId: '',
    findings: '',
    diagnosis: '',
    recommendations: '',
    status: 'preliminary'
  });
  const [medicalTest, setMedicalTest] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    if (testId) {
      loadMedicalTest(testId);
    } else {
      toast.error('No test selected. Please select a test from the tests page.');
      navigate('/doctor/tests');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  useEffect(() => {
    if (medicalTest && medicalTest.patient_id) {
      const testId = medicalTest.medical_test_id || medicalTest.id; // Support both for backward compatibility
      loadPatientImages(medicalTest.patient_id, testId);
    }
  }, [medicalTest]);


  const loadMedicalTest = async (id) => {
    try {
      setLoadingTest(true);
      const response = await medicalTestService.getById(id);
      const test = response.data;
      setMedicalTest(test);
      setFormData(prev => ({
        ...prev,
        patientId: test.patient_id,
        medicalTestId: test.medical_test_id
      }));
    } catch (err) {
      const errorMessage = handleApiError(err);
      toast.error(`Failed to load medical test: ${errorMessage}`);
      navigate('/doctor/tests');
    } finally {
      setLoadingTest(false);
    }
  };

  const loadPatientImages = async (patientId, medicalTestId) => {
    try {
      setLoadingImages(true);
      const response = await imageService.getByPatient(patientId);
      
      // Handle different response structures
      let allImages = [];
      if (Array.isArray(response)) {
        allImages = response;
      } else if (response && response.data) {
        allImages = Array.isArray(response.data) ? response.data : [];
      } else if (response && Array.isArray(response)) {
        allImages = response;
      }
      
      if (allImages.length === 0) {
        setImages([]);
        setSelectedImageId(null);
        toast.warning('No images found for this patient. Please ensure images have been uploaded.');
        return;
      }
      
      // Filter images by medical_test_id if available (using business identifiers)
      let filteredImages = [];
      if (medicalTestId) {
        filteredImages = allImages.filter(img => {
          const imgTestId = img.medical_test_id;
          if (imgTestId === null || imgTestId === undefined) {
            return false; // Exclude images without medical_test_id
          }
          return imgTestId === medicalTestId; // Compare business identifiers directly
        });
      }
      
      // If no images match the test ID, show all patient images as fallback
      const imagesToShow = filteredImages.length > 0 ? filteredImages : allImages;
      setImages(imagesToShow);
      
      // Automatically select the first image if available
      if (imagesToShow.length > 0 && !selectedImageId) {
        const firstImage = imagesToShow[0];
        const firstImageId = firstImage.image_id || firstImage.id;
        setSelectedImageId(firstImageId);
        setFormData(prev => ({ ...prev, imageId: firstImageId }));
      }
      
      if (filteredImages.length === 0 && allImages.length > 0 && medicalTestId) {
        toast.info(`No images specifically linked to this test. Showing all images for this patient (${allImages.length} total).`);
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      toast.error(`Failed to load images: ${errorMessage}`);
      setImages([]);
      setSelectedImageId(null);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleImageSelect = (imageId) => {
    setSelectedImageId(imageId);
    setFormData(prev => ({ ...prev, imageId }));
  };

  const handleSubmit = async (values) => {
    if (!selectedImageId) {
      toast.error('Please select an image for this report');
      return;
    }

    setLoading(true);

    try {
      // Get current user's medical staff ID
      const user = authService.getUser();
      if (!user) {
        toast.error('User not found. Please login again.');
        navigate('/login');
        return;
      }

      const userId = user.user_id || user.id; // Support both for backward compatibility
      if (!userId) {
        toast.error('User ID not found. Please login again.');
        navigate('/login');
        return;
      }

      // Fetch medical staff record to get staff_id (business identifier)
      let radiologistId = null;
      try {
        const staffResponse = await medicalStaffService.getByUserId(userId);
        if (staffResponse && staffResponse.data) {
          radiologistId = staffResponse.data.staff_id || staffResponse.data.id; // Support both for backward compatibility
        }
      } catch (staffError) {
        console.error('Error fetching medical staff:', staffError);
        toast.error('Failed to fetch medical staff record. Please ensure your profile is set up correctly.');
        setLoading(false);
        return;
      }

      if (!radiologistId) {
        toast.error('Medical staff record not found. Please contact administrator.');
        setLoading(false);
        return;
      }

      // Ensure medical_test_id is a string (business identifier)
      const medicalTestId = medicalTest.medical_test_id || medicalTest.id; // Support both for backward compatibility

      await reportService.create({
        patient_id: medicalTest.patient_id,
        image_id: selectedImageId,
        radiologist_id: radiologistId, // Now using string business identifier
        medical_test_id: medicalTestId,
        findings: values.findings,
        diagnosis: values.diagnosis,
        recommendations: values.recommendations,
        status: values.status
      });
      toast.success('Report created successfully!');
      navigate('/doctor/reports');
    } catch (err) {
      const errorMessage = handleApiError(err);
      toast.error(`Failed to create report: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (loadingTest) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Card size="middle">
          <Title level={2}>Loading test information...</Title>
        </Card>
      </div>
    );
  }

  if (!medicalTest) {
    return (
      <div style={{ padding: '24px' }}>
        <Card size="middle">
          <Alert
            message="No Test Selected"
            description="Please select a test from the tests page to create a report."
            type="warning"
            showIcon
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card size="middle">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Title level={2} style={{ margin: 0 }}>
            Create Diagnostic Report
          </Title>

          <Form
            layout="vertical"
            onFinish={handleSubmit}
            size="middle"
            initialValues={{ 
              status: 'preliminary',
              patientId: medicalTest.patient_id,
              testId: medicalTest.medical_test_id || medicalTest.id
            }}
          >
            <Form.Item
              label="Patient ID"
              name="patientId"
            >
              <Input disabled value={medicalTest.patient_id} />
            </Form.Item>

            <Form.Item
              label="Test ID"
              name="testId"
            >
              <Input disabled value={medicalTest.medical_test_id || medicalTest.id} />
            </Form.Item>

            <Form.Item
              label="Test Images"
              required
            >
              {loadingImages ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Spin size="middle" />
                  <div style={{ marginTop: '10px' }}>Loading images...</div>
                </div>
              ) : images.length === 0 ? (
                <Alert
                  message="No images available"
                  description="No images have been uploaded for this test yet. Please upload images first."
                  type="warning"
                  showIcon
                />
              ) : (
                <div>
                  <Row gutter={[16, 16]}>
                    {images.map((image) => {
                      const imageUrl = convertMinioUrlForFrontend(image.image_url);
                      const imageType = typeof image.image_type === 'string' 
                        ? image.image_type 
                        : image.image_type?.value || image.image_type || 'Unknown';
                      const imageBusinessId = image.image_id || image.id;
                      const isSelected = selectedImageId === imageBusinessId;
                      
                      return (
                        <Col xs={24} sm={12} md={8} key={imageBusinessId}>
                          <Card
                            hoverable
                            onClick={() => handleImageSelect(imageBusinessId)}
                            style={{
                              cursor: 'pointer',
                              border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
                              boxShadow: isSelected ? '0 2px 8px rgba(24, 144, 255, 0.2)' : 'none',
                              transition: 'all 0.3s'
                            }}
                            cover={
                              <div style={{ 
                                height: '200px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                backgroundColor: '#f5f5f5',
                                overflow: 'hidden'
                              }}>
                                <Image
                                  src={imageUrl}
                                  alt={image.description || 'Medical Image'}
                                  style={{ 
                                    maxHeight: '200px', 
                                    maxWidth: '100%',
                                    objectFit: 'contain'
                                  }}
                                  preview={{
                                    mask: 'Preview'
                                  }}
                                  fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYbMPA2ODBQoFiUUKcA4fzJwYGEsS2qoPgf3gzsbC1MN2BQLW8QwM9OwMDPwsQoxXEAEFuQWJQIdwDjN5biNGMjCJt7OwMD67T//z+HMzCwazIw/L3+///v7f///10GNP8VA8OBvwEA/GBJbLx1ZgAAAFZlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA5KGAAcAAAASAAAARKACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAABBU0NJSQAAAFNjcmVlbnNob3Rz5Y8EAAAB1mlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgoZXuEHAABAAElEQVR4Ae1dB3wUxRd/SS"
                                />
                              </div>
                            }
                          >
                            <Card.Meta
                              title={
                                <div>
                                  <span style={{ fontWeight: 'bold' }}>{imageType.toUpperCase()}</span>
                                  {isSelected && (
                                    <span style={{ 
                                      marginLeft: '8px', 
                                      color: '#1890ff',
                                      fontSize: '12px'
                                    }}>
                                      ✓ Selected
                                    </span>
                                  )}
                                </div>
                              }
                              description={
                                <div>
                                  <div>Image ID: {image.image_id || image.id}</div>
                                  {image.description && (
                                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                                      {image.description}
                                    </div>
                                  )}
                                </div>
                              }
                            />
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                  {!selectedImageId && (
                    <Alert
                      message="No image selected"
                      description="Please click on an image above to select it for the report."
                      type="warning"
                      showIcon
                      style={{ marginTop: '16px' }}
                    />
                  )}
                </div>
              )}
            </Form.Item>

            <Form.Item
              label="Findings"
              name="findings"
              rules={[{ required: true, message: 'Please enter findings' }]}
            >
              <TextArea
                rows={5}
                placeholder="Enter findings..."
              />
            </Form.Item>

            <Form.Item
              label="Diagnosis"
              name="diagnosis"
              rules={[{ required: true, message: 'Please enter diagnosis' }]}
            >
              <TextArea
                rows={5}
                placeholder="Enter diagnosis..."
              />
            </Form.Item>

            <Form.Item
              label="Recommendations"
              name="recommendations"
            >
              <TextArea
                rows={5}
                placeholder="Enter recommendations..."
              />
            </Form.Item>

            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: 'Please select a status' }]}
            >
              <Select>
                <Select.Option value="preliminary">Preliminary</Select.Option>
                <Select.Option value="confirmed">Confirmed</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="middle"
              >
                Create Report
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default CreateReport;

