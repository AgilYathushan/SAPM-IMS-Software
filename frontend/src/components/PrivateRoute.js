/**
 * PrivateRoute Component
 * Route protection wrapper that enforces authentication and role-based access
 * Redirects to login if user is not authenticated
 * Redirects to dashboard if user doesn't have required role
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

/**
 * PrivateRoute Component
 * @param {ReactNode} children - Component to render if access is granted
 * @param {string[]} allowedRoles - Array of roles allowed to access this route
 * @returns {ReactNode} Protected component or redirect
 */
const PrivateRoute = ({ children, allowedRoles = [] }) => {
  // Check if user is authenticated (has valid token)
  const isAuthenticated = authService.isAuthenticated();
  // Get current user information
  const user = authService.getUser();

  // ========================================================================
  // Authentication Check
  // ========================================================================
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ========================================================================
  // Active Status Check
  // ========================================================================
  // Check if user is inactive
  if (user && user.is_active === false) {
    // Get current pathname
    const currentPath = window.location.pathname;
    
    // Allow inactive users to access profile page
    if (currentPath === '/profile') {
      // User is inactive but accessing profile - allow it
      return children;
    }
    
    // For all other pages, redirect inactive users to profile
    return <Navigate to="/profile" replace />;
  }

  // ========================================================================
  // Role-Based Access Control (RBAC)
  // ========================================================================
  // If route has role restrictions, check if user has required role
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    // User doesn't have required role - redirect to dashboard
    return <Navigate to="/" replace />;
  }

  // User is authenticated, active, and has required role - render protected component
  return children;
};

export default PrivateRoute;

