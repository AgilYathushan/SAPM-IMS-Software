import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Select, DatePicker, Alert, Card, Typography, Space } from 'antd';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { handleApiError } from '../utils/errorHandler';
import './Auth.css';

const { Title, Text } = Typography;

const Auth = ({ initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    role: 'patient',
    // Patient-specific
    date_of_birth: '',
    // Medical staff-specific
    department: '',
    license_no: '',
    specialization: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  // ============================
  // LOGIN
  // ============================
  const handleLogin = async (values) => {
    setError('');
    setLoading(true);

    try {
      const res = await authService.login(
        values.username,
        values.password
      );

      if (!res?.access_token) {
        throw new Error('Authentication failed');
      }

      // Store token ONLY
      localStorage.setItem('token', res.access_token);

      // Store user only if backend provides it
      if (res.user) {
        localStorage.setItem('user', JSON.stringify(res.user));
      } else {
        // If user not in response, fetch it
        const user = await authService.getCurrentUser();
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }
      }

      // Check if user is inactive
      const user = authService.getUser();
      if (user && user.is_active === false) {
        toast.warning('Your account is inactive. You can only access your profile.');
        navigate('/profile');
      } else {
        toast.success('Login successful');
        navigate('/');
      }

    } catch (err) {
      const msg = handleApiError(err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // REGISTER
  // ============================
  const handleRegister = async (values) => {
    setError('');
    setLoading(true);

    try {
      // Prepare registration data
      const registrationData = {
        username: values.username,
        email: values.email,
        password: values.password,
        name: values.name || values.username,
        user_role: values.role
      };

      // Add role-specific data
      if (values.role === 'patient') {
        if (!values.date_of_birth) {
          setError('Date of birth is required for patients');
          setLoading(false);
          return;
        }
        registrationData.date_of_birth = dayjs(values.date_of_birth).format('YYYY-MM-DD');
      } else if (['doctor', 'radiologist', 'cashier'].includes(values.role)) {
        if (values.department) {
          registrationData.department = values.department;
        }
        if (values.license_no) {
          registrationData.license_no = values.license_no;
        }
        if (values.role === 'doctor' && values.specialization) {
          registrationData.specialization = values.specialization;
        }
      }

      // Register via user service
      await userService.create(registrationData);

      toast.success('Registration successful. Your account is pending activation. Please login after activation.');
      setMode('login');
      setFormData({
        username: '',
        email: '',
        password: '',
        name: '',
        role: 'patient',
        date_of_birth: '',
        department: '',
        license_no: '',
        specialization: ''
      });
      navigate('/login');

    } catch (err) {
      const msg = handleApiError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(prev => (prev === 'login' ? 'register' : 'login'));
    setError('');
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
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Title>
              <Text type="secondary">
                {mode === 'login' 
                  ? 'Welcome back to IMS Healthcare' 
                  : 'Join IMS Healthcare System'}
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
              onFinish={mode === 'login' ? handleLogin : handleRegister}
              size="middle"
              initialValues={{ role: 'patient' }}
            >
              {mode === 'register' && (
                <Form.Item
                  label="Full Name"
                  name="name"
                  rules={[{ required: true, message: 'Please enter your name' }]}
                >
                  <Input placeholder="Enter your full name" />
                </Form.Item>
              )}

              <Form.Item
                label="Username"
                name="username"
                rules={[{ required: true, message: 'Please enter your username' }]}
              >
                <Input placeholder="Enter your username" />
              </Form.Item>

              {mode === 'register' && (
                <>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                      { required: true, message: 'Please enter your email' },
                      { type: 'email', message: 'Please enter a valid email' }
                    ]}
                  >
                    <Input type="email" placeholder="Enter your email" />
                  </Form.Item>

                  <Form.Item
                    label="Role"
                    name="role"
                    rules={[{ required: true, message: 'Please select a role' }]}
                  >
                    <Select placeholder="Select Role">
                      <Select.Option value="patient">Patient</Select.Option>
                      <Select.Option value="doctor">Doctor</Select.Option>
                      <Select.Option value="radiologist">Radiologist</Select.Option>
                      <Select.Option value="cashier">Cashier</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role}>
                    {({ getFieldValue }) => {
                      const role = getFieldValue('role');
                      return role === 'patient' ? (
                        <Form.Item
                          label="Date of Birth"
                          name="date_of_birth"
                          rules={[{ required: true, message: 'Please select your date of birth' }]}
                        >
                          <DatePicker
                            style={{ width: '100%' }}
                            format="YYYY-MM-DD"
                          />
                        </Form.Item>
                      ) : null;
                    }}
                  </Form.Item>

                  <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role}>
                    {({ getFieldValue }) => {
                      const role = getFieldValue('role');
                      return ['doctor', 'radiologist', 'cashier'].includes(role) ? (
                        <>
                          <Form.Item
                            label="Department"
                            name="department"
                          >
                            <Select
                              placeholder="Select Department (Optional)"
                              allowClear
                            >
                              <Select.Option value="radiology">Radiology</Select.Option>
                              <Select.Option value="cardiology">Cardiology</Select.Option>
                              <Select.Option value="neurology">Neurology</Select.Option>
                              <Select.Option value="orthopedics">Orthopedics</Select.Option>
                              <Select.Option value="general">General</Select.Option>
                            </Select>
                          </Form.Item>
                          {/* License Number - shown for doctor and radiologist only */}
                          {['doctor', 'radiologist'].includes(role) && (
                            <Form.Item
                              label="License Number"
                              name="license_no"
                            >
                              <Input placeholder="License No (Optional)" />
                            </Form.Item>
                          )}
                          {/* Specialization - shown for doctor only */}
                          {role === 'doctor' && (
                            <Form.Item
                              label="Specialization"
                              name="specialization"
                            >
                              <Input placeholder="Specialization (Optional)" />
                            </Form.Item>
                          )}
                        </>
                      ) : null;
                    }}
                  </Form.Item>
                </>
              )}

              <Form.Item
                label="Password"
                name="password"
                rules={[
                  { required: true, message: 'Please enter your password' },
                  { min: 6, message: 'Password must be at least 6 characters' }
                ]}
              >
                <Input.Password placeholder="Enter your password" />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  style={{ height: '48px', fontSize: '16px' }}
                >
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center' }}>
              {mode === 'login' ? (
                <Space direction="vertical" size="small">
                  <Link to="/forgot-password">
                    <Text type="secondary">Forgot Password?</Text>
                  </Link>
                  <Text type="secondary">
                    No account?{' '}
                    <Button type="link" onClick={toggleMode} style={{ padding: 0 }}>
                      Register
                    </Button>
                  </Text>
                </Space>
              ) : (
                <Text type="secondary">
                  Already have an account?{' '}
                  <Button type="link" onClick={toggleMode} style={{ padding: 0 }}>
                    Sign In
                  </Button>
                </Text>
              )}
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
