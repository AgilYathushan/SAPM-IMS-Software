import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Tag, Typography, Space, Spin, Row, Col, Image, Descriptions, Alert, Input } from 'antd';
import { ArrowLeftOutlined, FileTextOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { reportService } from '../services/reportService';
import { imageService } from '../services/imageService';
import { authService } from '../services/authService';
import { patientService } from '../services/patientService';
import { handleApiError } from '../utils/errorHandler';
import { convertMinioUrlForFrontend } from '../utils/minioUrl';
import EmptyState from '../components/EmptyState';
import './PatientReports.css';

const { Title } = Typography;

const PatientReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = authService.getUser();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      // Get patient record by user_id
      try {
        const userId = user?.user_id || user?.id; // Support both for backward compatibility
        const patientResponse = await patientService.getByUserId(userId);
        const patient = patientResponse.data;
        const patientId = patient.patient_id || patient.id; // Support both for backward compatibility
        
        const response = await reportService.getByPatient(patientId);
        setReports(response.data || []);
      } catch (patientError) {
        // Handle different error cases gracefully
        const status = patientError.response?.status;
        if (status === 404) {
          // Patient record doesn't exist
          toast.warn('Patient record not found. Please contact administrator.');
          setReports([]);
        } else if (status === 401) {
          // Authentication error - handle silently to prevent logout loop
          setReports([]);
        } else {
          // Other errors
          const errorMessage = handleApiError(patientError);
          toast.error(`Failed to load patient data: ${errorMessage}`);
          setReports([]);
        }
      }
    } catch (error) {
      // Catch any remaining errors
      const status = error.response?.status;
      if (status !== 401) {
        // Only show error if it's not a 401 (which will be handled by interceptor)
        const errorMessage = handleApiError(error);
        toast.error(`Failed to load reports: ${errorMessage}`);
      }
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async (reportId) => {
    try {
      const reportResponse = await reportService.getById(reportId);
      const report = reportResponse.data;
      setSelectedReport(report);
      
      // Load images for this report
      try {
        const imagesResponse = await imageService.getByPatient(report.patient_id);
        let allImages = [];
        
        // Handle different response structures
        if (Array.isArray(imagesResponse)) {
          allImages = imagesResponse;
        } else if (imagesResponse && imagesResponse.data) {
          allImages = Array.isArray(imagesResponse.data) ? imagesResponse.data : [];
        } else if (imagesResponse && Array.isArray(imagesResponse)) {
          allImages = imagesResponse;
        }
        
        // Filter to get the specific image for this report
        if (report.image_id) {
          const reportImage = allImages.filter(img => {
            return img.id === report.image_id || img.image_id === report.image_id;
          });
          setImages(reportImage);
          
          // If no exact match, try to get image by ID directly
          if (reportImage.length === 0 && report.image_id) {
            try {
              const singleImageResponse = await imageService.getById(report.image_id);
              if (singleImageResponse && singleImageResponse.data) {
                setImages([singleImageResponse.data]);
              } else {
                setImages([]);
              }
            } catch (imgError) {
              console.warn('Could not load image by ID:', imgError);
              setImages([]);
            }
          }
        } else {
          setImages([]);
        }
      } catch (imgError) {
        console.error('Error loading images:', imgError);
        setImages([]);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      toast.error(`Failed to load report details: ${errorMessage}`);
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap = {
          draft: 'default',
          preliminary: 'orange',
          final: 'green',
        };
        return <Tag color={colorMap[status] || 'default'}>{status?.toUpperCase()}</Tag>;
      },
      filters: [
        { text: 'Draft', value: 'draft' },
        { text: 'Preliminary', value: 'preliminary' },
        { text: 'Final', value: 'final' },
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
      render: (_, record) => {
        const reportId = record.report_id || record.id; // Support both for backward compatibility
        return (
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => handleViewReport(reportId)}
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
            <FileTextOutlined /> My Diagnostic Reports
          </Title>
        </Card>

        {selectedReport ? (
          <Card size="middle">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => setSelectedReport(null)}
                size="middle"
              >
                Back to List
              </Button>

              <Title level={3}>Report #{selectedReport.report_id}</Title>

              <Descriptions bordered column={1}>
                <Descriptions.Item label="Status">
                  <Tag color={selectedReport.status === 'final' ? 'green' : 'orange'}>
                    {selectedReport.status?.toUpperCase()}
                  </Tag>
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
              </Descriptions>

              {images.length > 0 ? (
                <div>
                  <Title level={4}>Associated Images</Title>
                  <Row gutter={[16, 16]}>
                    {images.map((image) => {
                      const imageUrl = convertMinioUrlForFrontend(image.image_url);
                      const imageType = typeof image.image_type === 'string' 
                        ? image.image_type 
                        : image.image_type?.value || image.image_type || 'Unknown';
                      
                      return (
                        <Col xs={24} sm={12} md={8} key={image.id || image.image_id}>
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
                                  fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYbMPA2ODBQoFiUUKcA4fzJwYGEsS2qoPgf3gzsbC1MN2BQLW8QwM9OwMDPwsQoxXEAEFuQWJQIdwDjN5biNGMjCJt7OwMD67T//z+HMzCwazIw/L3+///v7f///10GNP8VA8OBvwEA/GBJbLx1ZgAAAFZlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA5KGAAcAAAASAAAARKACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAABBU0NJSQAAAFNjcmVlbnNob3Rz5Y8EAAAB1mlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgoZXuEHAABAAElEQVR4Ae1dB3wUxRd/SS"
                                />
                              </div>
                            }
                          >
                            <Card.Meta
                              title={imageType.toUpperCase()}
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
                </div>
              ) : (
                <Alert
                  message="No images available"
                  description="No images are associated with this report."
                  type="info"
                  showIcon
                />
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
    </div>
  );
};

export default PatientReports;
