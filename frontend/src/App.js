/**
 * Main React Application Component
 * Sets up routing and navigation for the Image Management System
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import UploadImage from './pages/UploadImage';
import CreateReport from './pages/CreateReport';
import Billing from './pages/Billing';

// Patient Pages
import PatientReports from './pages/PatientReports';

// Doctor Pages
import DoctorReports from './pages/DoctorReports';
import DoctorTests from './pages/DoctorTests';
import MedicalTest from './pages/MedicalTest';

// Radiologist Pages
import MedicalTests from './pages/TestRequests';

// Cashier Pages
import CashierBills from './pages/CashierBills';
import CashierReports from './pages/CashierReports';

// Admin Pages
import AdminUsers from './pages/AdminUsers';
import AdminBillingDashboard from './pages/AdminBillingDashboard';
import AdminWorkflowLogs from './pages/AdminWorkflowLogs';
import AdminUserStatistics from './pages/AdminUserStatistics';
import AdminImageStatistics from './pages/AdminImageStatistics';
import AdminTestStatistics from './pages/AdminTestStatistics';
import AdminReportStatistics from './pages/AdminReportStatistics';

// User Profile
import UserProfile from './pages/UserProfile';

import { authService } from './services/authService';
import './App.css';

function App() {
  return (
    <ConfigProvider>
      <Router>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      <Routes>
        {/* ====================================================================
            Public Routes (No Authentication Required)
            ==================================================================== */}
        
        {/* Login page - user authentication */}
        <Route path="/login" element={<Login />} />
        
        {/* Registration page - new user signup */}
        <Route path="/register" element={<Register />} />
        
        {/* Forgot Password page - password reset */}
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ====================================================================
            Protected Routes (Authentication Required)
            ==================================================================== */}
        
        {/* Dashboard - main landing page after login */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          }
        />
        
        {/* Image upload - restricted to radiologists only */}
        <Route
          path="/upload"
          element={
            <PrivateRoute allowedRoles={['radiologist']}>
              <Layout>
                <UploadImage />
              </Layout>
            </PrivateRoute>
          }
        />
        
        {/* Create diagnostic report - restricted to doctors only */}
        <Route
          path="/create-report"
          element={
            <PrivateRoute allowedRoles={['doctor']}>
              <Layout>
                <CreateReport />
              </Layout>
            </PrivateRoute>
          }
        />
        
        {/* Billing page - accessible to all authenticated users */}
        <Route
          path="/billing"
          element={
            <PrivateRoute>
              <Layout>
                <Billing />
              </Layout>
            </PrivateRoute>
          }
        />
        
        {/* Patient Routes */}
        <Route
          path="/patient/billing"
          element={
            <PrivateRoute allowedRoles={['patient']}>
              <Layout>
                <Billing />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/patient/reports"
          element={
            <PrivateRoute allowedRoles={['patient']}>
              <Layout>
                <PatientReports />
              </Layout>
            </PrivateRoute>
          }
        />
        
        {/* Doctor Routes */}
        <Route
          path="/doctor/reports"
          element={
            <PrivateRoute allowedRoles={['doctor']}>
              <Layout>
                <DoctorReports />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/doctor/tests"
          element={
            <PrivateRoute allowedRoles={['doctor']}>
              <Layout>
                <DoctorTests />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/doctor/medical-test"
          element={
            <PrivateRoute allowedRoles={['doctor']}>
              <Layout>
                <MedicalTest />
              </Layout>
            </PrivateRoute>
          }
        />
        
        {/* Radiologist Routes */}
        <Route
          path="/radiologist/test-requests"
          element={
            <PrivateRoute allowedRoles={['radiologist']}>
              <Layout>
                <MedicalTests />
              </Layout>
            </PrivateRoute>
          }
        />
        
        {/* Cashier Routes */}
        <Route
          path="/cashier/reports"
          element={
            <PrivateRoute allowedRoles={['cashier']}>
              <Layout>
                <CashierReports />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/cashier/bills"
          element={
            <PrivateRoute allowedRoles={['cashier']}>
              <Layout>
                <CashierBills />
              </Layout>
            </PrivateRoute>
          }
        />
        
        {/* User Profile - accessible to all authenticated users (including inactive) */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Layout>
                <UserProfile />
              </Layout>
            </PrivateRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/users"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <Layout>
                <AdminUsers />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/user-statistics"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <Layout>
                <AdminUserStatistics />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/image-statistics"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <Layout>
                <AdminImageStatistics />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/test-statistics"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <Layout>
                <AdminTestStatistics />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/report-statistics"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <Layout>
                <AdminReportStatistics />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/billing-dashboard"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <Layout>
                <AdminBillingDashboard />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/workflow-logs"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <Layout>
                <AdminWorkflowLogs />
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
