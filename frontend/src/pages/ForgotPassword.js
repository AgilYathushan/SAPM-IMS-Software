/**
 * Forgot Password Component
 * Allows users to reset their password by providing username and email
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Space, Alert } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { userService } from '../services/userService';
import { handleApiError } from '../utils/errorHandler';
import './ForgotPassword.css';

const { Title, Text } = Typography;

const ForgotPassword = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setError('');
    setLoading(true);

    try {
      await userService.resetPassword({
        username: values.username,
        email: values.email,
        new_password: values.newPassword
      });
      toast.success('Password reset successfully! Please login with your new password.');
      navigate('/login');
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-right-panel">
        <Card size="middle" 
          style={{ 
            maxWidth: 500, 
            margin: '0 auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderRadius: '12px'
          }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <Title level={2} style={{ marginBottom: '8px' }}>
                Reset Password
              </Title>
              <Text type="secondary">
                Enter your username and email to reset your password
              </Text>
            </div>

            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                closable
                onClose={() => setError('')}
              />
            )}

            <Form
              layout="vertical"
              onFinish={handleSubmit}
            size="middle"
            >
              <Form.Item
                label="Username"
                name="username"
                rules={[{ required: true, message: 'Please enter your username' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Enter your username"
                />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  type="email"
                  placeholder="Enter your email"
                />
              </Form.Item>

              <Form.Item
                label="New Password"
                name="newPassword"
                rules={[
                  { required: true, message: 'Please enter your new password' },
                  { min: 6, message: 'Password must be at least 6 characters' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Enter new password"
                />
              </Form.Item>

              <Form.Item
                label="Confirm Password"
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Please confirm your password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match!'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Confirm new password"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                size="middle"
                >
                  Reset Password
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center' }}>
              <Space direction="vertical" size="small">
                <Link to="/login">
                  <Button type="link" icon={<ArrowLeftOutlined />}>
                    Back to Login
                  </Button>
                </Link>
                <Text type="secondary">
                  Remember your password?{' '}
                  <Link to="/login">Sign In</Link>
                </Text>
              </Space>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
