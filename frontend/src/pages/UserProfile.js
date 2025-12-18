// User Profile Page
// Allows users to edit their profile based on role

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Select, Button, Card, Typography, Space, DatePicker, Descriptions, Tag, Spin } from 'antd';
import { UserOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { patientService } from '../services/patientService';
import { medicalStaffService } from '../services/medicalStaffService';
import { handleApiError } from '../utils/errorHandler';
import './UserProfile.css';

const { Title } = Typography;
const { TextArea } = Input;

const UserProfile = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    // User fields
    phone: '',
    address: '',
    // Patient fields
    date_of_birth: '',
    // Medical staff fields
    department: '',
    specialization: '',
  });
  const [userData, setUserData] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [medicalStaffData, setMedicalStaffData] = useState(null);

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      setLoading(true);
      // First try to get user from localStorage
      let user = authService.getUser();
      
      // Check if admin user (admin doesn't have user_id)
      if (user && (user.is_admin || user.role === 'admin' || user.user_role === 'admin')) {
        toast.info('Admin users cannot update their profile through this page.');
        setLoading(false);
        navigate('/dashboard');
        return;
      }

      // If user doesn't exist or doesn't have a user_id, try to fetch from API
      if (!user || (!user.user_id && !user.id)) {
        const apiUser = await authService.getCurrentUser();
        if (apiUser) {
          // Check if admin
          if (apiUser.is_admin || apiUser.role === 'admin' || apiUser.user_role === 'admin') {
            toast.info('Admin users cannot update their profile through this page.');
            setLoading(false);
            navigate('/dashboard');
            return;
          }
          if (apiUser.user_id || apiUser.id) {
            // Update localStorage with the fetched user
            localStorage.setItem('user', JSON.stringify(apiUser));
            user = apiUser;
          }
        }
      }

      const userId = user?.user_id || user?.id;
      if (user && userId) {
        setCurrentUser(user);
        await loadProfile(user);
      } else {
        toast.error('User not found. Please login again.');
        setLoading(false);
        navigate('/login');
      }
    } catch (err) {
      console.error('Error initializing user:', err);
      toast.error('Failed to load user data. Please login again.');
      setLoading(false);
      navigate('/login');
    }
  };

  const loadProfile = async (user) => {
    const userId = user?.user_id || user?.id; // Support both for backward compatibility
    if (!user || !userId) {
      toast.error('User not found. Please login again.');
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      
      // Load user data
      const userResponse = await userService.getById(userId);
      if (userResponse && userResponse.data) {
        setUserData(userResponse.data);
        setProfileData(prev => ({
          ...prev,
          phone: userResponse.data.phone || '',
          address: userResponse.data.address || '',
        }));
      } else {
        throw new Error('Invalid response from server');
      }

      // Load role-specific data
      const userRole = user.role || user.user_role;
      if (userRole === 'patient') {
        try {
          const patientResponse = await patientService.getByUserId(userId);
          if (patientResponse && patientResponse.data) {
            setPatientData(patientResponse.data);
            setProfileData(prev => ({
              ...prev,
              date_of_birth: patientResponse.data.date_of_birth || '',
            }));
          }
        } catch (err) {
          console.log('Patient data not found:', err);
        }
      } else if (['doctor', 'radiologist', 'cashier'].includes(userRole)) {
        try {
          const staffResponse = await medicalStaffService.getByUserId(userId);
          if (staffResponse && staffResponse.data) {
            setMedicalStaffData(staffResponse.data);
            setProfileData(prev => ({
              ...prev,
              department: staffResponse.data.department || '',
              specialization: staffResponse.data.specialization || '',
            }));
          }
        } catch (err) {
          console.log('Medical staff data not found:', err);
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      toast.error(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    setSaving(true);

    try {
      const userId = currentUser?.user_id || currentUser?.id; // Support both for backward compatibility
      if (!currentUser || !userId) {
        toast.error('User not found. Please login again.');
        return;
      }

      // Update user data (phone, address)
      await userService.update(userId, {
        phone: values.phone,
        address: values.address,
      });

      // Update role-specific data
      const userRole = currentUser.role || currentUser.user_role;
      if (userRole === 'patient' && patientData) {
        const patientId = patientData.patient_id || patientData.id; // Support both
        await patientService.update(patientId, {
          date_of_birth: values.date_of_birth ? dayjs(values.date_of_birth).format('YYYY-MM-DD') : profileData.date_of_birth,
        });
      } else if (['doctor', 'radiologist', 'cashier'].includes(userRole) && medicalStaffData) {
        const updateData = {
          department: values.department,
        };
        
        // Only doctors can update specialization
        if (userRole === 'doctor') {
          updateData.specialization = values.specialization;
        }
        
        const staffId = medicalStaffData.staff_id || medicalStaffData.id; // Support both
        await medicalStaffService.update(staffId, updateData);
      }

      toast.success('Profile updated successfully');
      // Reload profile data
      await loadProfile(currentUser);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

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
            <UserOutlined /> User Profile
          </Title>
        </Card>

        <Card title="Basic Information" size="middle">
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Username">{userData?.username}</Descriptions.Item>
            <Descriptions.Item label="Email">{userData?.email}</Descriptions.Item>
            <Descriptions.Item label="Name">{userData?.name}</Descriptions.Item>
            <Descriptions.Item label="Role">{userData?.user_role || currentUser?.role || currentUser?.user_role}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={userData?.is_active ? 'green' : 'red'}>
                {userData?.is_active ? 'Active' : 'Inactive'}
              </Tag>
            </Descriptions.Item>
            {(currentUser?.role === 'doctor' || currentUser?.user_role === 'doctor') && medicalStaffData && (
              <Descriptions.Item label="License No">
                {medicalStaffData.license_no || 'Not set'}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card title="Editable Information" size="middle">
          <Form
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              phone: profileData.phone,
              address: profileData.address,
              date_of_birth: profileData.date_of_birth ? dayjs(profileData.date_of_birth) : null,
              department: profileData.department,
              specialization: profileData.specialization,
            }}
            size="middle"
          >
            <Form.Item
              label="Phone"
              name="phone"
            >
              <Input placeholder="Phone number" />
            </Form.Item>

            <Form.Item
              label="Address"
              name="address"
            >
              <TextArea rows={3} placeholder="Address" />
            </Form.Item>

            {(currentUser?.role === 'patient' || currentUser?.user_role === 'patient') && (
              <Form.Item
                label="Date of Birth"
                name="date_of_birth"
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            )}

            {currentUser && ['doctor', 'radiologist', 'cashier'].includes(currentUser.role || currentUser.user_role) && (
              <Form.Item
                label="Department"
                name="department"
              >
                <Select placeholder="Select Department">
                  <Select.Option value="radiology">Radiology</Select.Option>
                  <Select.Option value="cardiology">Cardiology</Select.Option>
                  <Select.Option value="neurology">Neurology</Select.Option>
                  <Select.Option value="orthopedics">Orthopedics</Select.Option>
                  <Select.Option value="general">General</Select.Option>
                </Select>
              </Form.Item>
            )}

            {(currentUser?.role === 'doctor' || currentUser?.user_role === 'doctor') && (
              <Form.Item
                label="Specialization"
                name="specialization"
              >
                <Input placeholder="Specialization" />
              </Form.Item>
            )}

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<SaveOutlined />}
                size="middle"
                block
              >
                Save Changes
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </div>
  );
};

export default UserProfile;
