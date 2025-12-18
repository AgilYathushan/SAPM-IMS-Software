import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Tag, Typography, Space, Spin, Descriptions, Form, Input, Upload, Select, Row, Col, Image, Alert, Popconfirm } from 'antd';
import { ArrowLeftOutlined, ExperimentOutlined, EyeOutlined, UploadOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { medicalTestService } from '../services/medicalTestService';
import { imageService } from '../services/imageService';
import { handleApiError } from '../utils/errorHandler';
import { convertMinioUrlForFrontend } from '../utils/minioUrl';
import EmptyState from '../components/EmptyState';
import './TestRequests.css';

const { Title } = Typography;
const { TextArea } = Input;

const MedicalTests = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    file: null,
    description: ''
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const response = await medicalTestService.getAll();
      setTests(response.data || []);
    } catch (error) {
      // Handle 401/404 errors gracefully - just show empty state
      const status = error.response?.status;
      if (status === 401 || status === 404) {
        setTests([]);
      } else {
        const errorMessage = handleApiError(error);
        toast.error(`Failed to load medical tests: ${errorMessage}`);
        setTests([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewTest = async (testId) => {
    try {
      const response = await medicalTestService.getById(testId);
      const test = response.data;
      setSelectedTest(test);
      
      // Load images for this test
      if (test.patient_id) {
        const testId = test.medical_test_id || test.id; // Support both for backward compatibility
        loadTestImages(test.patient_id, testId);
      }
    } catch (error) {
      // Handle 401/404 errors gracefully
      const status = error.response?.status;
      if (status !== 401 && status !== 404) {
        const errorMessage = handleApiError(error);
        toast.error(`Failed to load medical test: ${errorMessage}`);
      }
    }
  };

  const loadTestImages = async (patientId, medicalTestId) => {
    try {
      setLoadingImages(true);
      const response = await imageService.getByPatient(patientId);
      
      let allImages = [];
      if (Array.isArray(response)) {
        allImages = response;
      } else if (response && response.data) {
        allImages = Array.isArray(response.data) ? response.data : [];
      } else if (response && Array.isArray(response)) {
        allImages = response;
      }

      // Filter images by medical_test_id (using string comparison for business identifiers)
      if (medicalTestId) {
        const filteredImages = allImages.filter(img => {
          const imgTestId = img.medical_test_id;
          if (imgTestId === null || imgTestId === undefined) {
            return false;
          }
          return imgTestId === medicalTestId; // Compare as strings
        });
        setImages(filteredImages);
      } else {
        setImages([]);
      }
    } catch (error) {
      console.error('Error loading images:', error);
      setImages([]);
    } finally {
      setLoadingImages(false);
    }
  };


  const handleFileChange = (info) => {
    if (info.file) {
      const file = info.file.originFileObj || info.file;
      setUploadForm({...uploadForm, file: file});
      
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

  const handleUpload = async (values) => {
    if (!uploadForm.file) {
      toast.error('Please select a file');
      return;
    }

    try {
      setUploading(true);
      const testId = selectedTest.medical_test_id || selectedTest.id; // Support both for backward compatibility
      await imageService.upload(
        selectedTest.patient_id,
        selectedTest.test_type.toLowerCase().replace(' ', '_'),
        uploadForm.file,
        values.description,
        testId
      );
      
      // Only update status to completed if test is in requested state
      // If already completed, don't change status (radiologist can add more images)
      if (selectedTest.status === 'requested') {
        await medicalTestService.update(testId, { status: 'completed' });
      }
      
      toast.success('Image uploaded successfully');
      setUploadForm({ file: null, description: '' });
      setImagePreview(null);
      loadTests();
      handleViewTest(testId);
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to upload image: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (image) => {
    try {
      const imageIdToDelete = image.image_id || image.id || image; // Support both for backward compatibility
      await imageService.delete(imageIdToDelete);
      
      toast.success('Image deleted successfully');
      
      // Reload images for this test
      if (selectedTest && selectedTest.patient_id) {
        const testId = selectedTest.medical_test_id || selectedTest.id;
        await loadTestImages(selectedTest.patient_id, testId);
      }
      
      // Check if there are any remaining images for this test
      const testId = selectedTest.medical_test_id || selectedTest.id;
      const testResponse = await medicalTestService.getById(testId);
      const updatedTest = testResponse.data;
      
      // Reload all images for the patient to check if any remain for this test
      const allImagesResponse = await imageService.getByPatient(selectedTest.patient_id);
      let allImages = [];
      if (Array.isArray(allImagesResponse)) {
        allImages = allImagesResponse;
      } else if (allImagesResponse && allImagesResponse.data) {
        allImages = Array.isArray(allImagesResponse.data) ? allImagesResponse.data : [];
      }
      
      // Filter images by medical_test_id
      const remainingImages = allImages.filter(img => {
        const imgTestId = img.medical_test_id;
        if (imgTestId === null || imgTestId === undefined) {
          return false;
        }
        return imgTestId === testId;
      });
      
      // If no images remain, change status back to requested
      if (remainingImages.length === 0 && updatedTest.status === 'completed') {
        await medicalTestService.update(testId, { status: 'requested' });
        toast.info('Test status changed to requested (no images remaining)');
        loadTests();
        handleViewTest(testId);
      } else {
        // Reload the test to get updated status
        loadTests();
        handleViewTest(testId);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to delete image: ${errorMessage}`);
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
      title: 'Doctor ID',
      dataIndex: 'doctor_id',
      key: 'doctor_id',
      ...getColumnSearchProps('doctor_id'),
      sorter: (a, b) => ((a.doctor_id || '') || '').localeCompare((b.doctor_id || '') || ''),
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
        const testId = record.medical_test_id || record.id; // Support both for backward compatibility
        return (
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => handleViewTest(testId)}
            size="middle"
          >
            View
          </Button>
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
            <ExperimentOutlined /> Medical Tests
          </Title>
        </Card>

        {selectedTest ? (
          <Card size="middle">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => setSelectedTest(null)}
                size="middle"
              >
                Back to List
              </Button>

              <Title level={3}>Medical Test #{selectedTest.medical_test_id}</Title>

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
                  <Tag color={
                    selectedTest.status === 'completed' ? 'green' : 
                    selectedTest.status === 'reporting' ? 'blue' :
                    selectedTest.status === 'cancelled' ? 'red' : 'orange'
                  }>
                    {selectedTest.status?.toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Notes">
                  {selectedTest.notes || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Requested">
                  {new Date(selectedTest.requested_at).toLocaleDateString()}
                </Descriptions.Item>
              </Descriptions>

              {images.length > 0 && (
                <Card type="inner" title="Uploaded Images">
                  {loadingImages ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Spin size="middle" tip="Loading images..." />
                    </div>
                  ) : (
                    <Row gutter={[16, 16]}>
                      {images.map((image) => {
                        const imageUrl = convertMinioUrlForFrontend(image.image_url);
                        const imageType = typeof image.image_type === 'string'
                          ? image.image_type
                          : image.image_type?.value || image.image_type || 'Unknown';
                        const imageId = image.id;
                        const imageDisplayId = image.image_id || imageId;

                        return (
                          <Col xs={24} sm={12} md={8} key={`img-${imageId}`}>
                            <Card
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
                                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jODVboQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYbMPA2ODBQoFiUUKcA4fzJwYGEsS2qoPgf3gzsbC1MN2BQLW8QwM9OwMDPwsQoxXEAEFuQWJQIdwDjN5biNGMjCJt7OwMD67T//z+HMzCwazIw/L3+///v7f///10GNP8VA8OBvwEA/GBJbLx1ZgAAAFZlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA5KGAAcAAAASAAAARKACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAABBU0NJSQAAAFNjcmVlbnNob3Rz5Y8EAAAB1mlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgoZXuEHAABAAElEQVR4Ae1dB3wUxRp/SS"
                                  />
                                </div>
                              }
                              actions={[
                                <Popconfirm
                                  key="delete"
                                  title="Delete Image"
                                  description="Are you sure you want to delete this image?"
                                  onConfirm={() => handleDeleteImage(image)}
                                  okText="Yes"
                                  cancelText="No"
                                  okButtonProps={{ danger: true }}
                                >
                                  <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    size="small"
                                  >
                                    Delete
                                  </Button>
                                </Popconfirm>
                              ]}
                            >
                              <Card.Meta
                                title={imageType.toUpperCase()}
                                description={
                                  <div>
                                    <div>Image ID: {imageDisplayId}</div>
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
                  )}
                </Card>
              )}

              {(selectedTest.status === 'requested' || selectedTest.status === 'completed') && (
                <Card type="inner" title="Upload Test Images">
                  <Form
                    layout="vertical"
                    onFinish={handleUpload}
                  >
                    <Form.Item
                      label="Select Image File"
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
                      {uploadForm.file && (
                        <div style={{ marginTop: '8px' }}>
                          Selected: {uploadForm.file.name}
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
                    <Form.Item
                      label="Description"
                      name="description"
                    >
                      <TextArea
                        rows={3}
                        placeholder="Image description..."
                      />
                    </Form.Item>
                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={uploading}
                        disabled={!uploadForm.file}
                        icon={<UploadOutlined />}
                        block
                      >
                        Upload Image
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              )}
            </Space>
          </Card>
        ) : (
          <Card size="middle">
            <Title level={3}>All Medical Tests</Title>
            {tests.length === 0 ? (
              <EmptyState message="No medical tests to display" />
            ) : (
              <Table
                columns={columns}
                dataSource={tests}
                rowKey={(record) => record.medical_test_id || record.id}
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

export default MedicalTests;
