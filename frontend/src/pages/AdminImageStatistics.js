import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Spin, Button, Table, Tag } from 'antd';
import { PictureOutlined, TableOutlined, DatabaseOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { imageService } from '../services/imageService';
import { handleApiError } from '../utils/errorHandler';
import './AdminImageStatistics.css';

const { Title } = Typography;

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const AdminImageStatistics = () => {
  const [statistics, setStatistics] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await imageService.getAll();
      const allImages = response.data || [];
      
      // Group images by type
      const imageTypeCounts = {
        mri: 0,
        ct: 0,
        xray: 0,
      };
      
      // Calculate total file size
      let totalSize = 0;
      
      allImages.forEach(img => {
        // Get image type (handle both string and enum object)
        const imageType = typeof img.image_type === 'string' 
          ? img.image_type.toLowerCase() 
          : img.image_type?.value?.toLowerCase() || img.image_type?.toLowerCase() || '';
        
        if (imageType === 'mri') {
          imageTypeCounts.mri++;
        } else if (imageType === 'ct') {
          imageTypeCounts.ct++;
        } else if (imageType === 'xray') {
          imageTypeCounts.xray++;
        }
        
        // Sum file sizes (file_size is in bytes)
        if (img.file_size) {
          totalSize += parseInt(img.file_size) || 0;
        }
      });
      
      const stats = {
        total: allImages.length,
        mri: imageTypeCounts.mri,
        ct: imageTypeCounts.ct,
        xray: imageTypeCounts.xray,
        totalSize: totalSize,
      };
      
      setStatistics(stats);
      setImages(allImages);
    } catch (error) {
      // Handle 401 errors gracefully - might be authentication issue
      const status = error.response?.status;
      if (status === 401) {
        toast.error('Authentication failed. Please log in again.');
        setStatistics({
          total: 0,
          mri: 0,
          ct: 0,
          xray: 0,
          totalSize: 0,
        });
        setImages([]);
      } else {
        const errorMessage = handleApiError(error);
        toast.error(`Failed to load image statistics: ${errorMessage}`);
        setStatistics({
          total: 0,
          mri: 0,
          ct: 0,
          xray: 0,
          totalSize: 0,
        });
        setImages([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Image ID',
      dataIndex: 'image_id',
      key: 'image_id',
    },
    {
      title: 'Patient ID',
      dataIndex: 'patient_id',
      key: 'patient_id',
    },
    {
      title: 'Image Type',
      dataIndex: 'image_type',
      key: 'image_type',
      render: (type) => {
        const imageType = typeof type === 'string' ? type : type?.value || type || 'Unknown';
        return <Tag>{imageType.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap = {
          processed: 'green',
          pending: 'orange',
          archived: 'default',
        };
        return <Tag color={colorMap[status] || 'default'}>{status?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Uploaded At',
      dataIndex: 'uploaded_at',
      key: 'uploaded_at',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A',
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space align="center" justify="space-between" style={{ width: '100%' }}>
            <Title level={2} style={{ margin: 0 }}>
              <PictureOutlined /> Image Statistics
            </Title>
            <Button
              type="primary"
              icon={<TableOutlined />}
              onClick={() => setShowTable(!showTable)}
            >
              {showTable ? 'Hide Table' : 'View All Images'}
            </Button>
          </Space>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Images"
                value={statistics?.total || 0}
                prefix={<PictureOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="MRI Images"
                value={statistics?.mri || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="CT Scan Images"
                value={statistics?.ct || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="X-Ray Images"
                value={statistics?.xray || 0}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Image Size"
                value={formatFileSize(statistics?.totalSize || 0)}
                prefix={<DatabaseOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {showTable && (
          <Card>
            <Title level={4}>All Images</Title>
            <Table
              columns={columns}
              dataSource={images}
              rowKey={(record) => record.image_id || record.id}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        )}
      </Space>
    </div>
  );
};

export default AdminImageStatistics;

