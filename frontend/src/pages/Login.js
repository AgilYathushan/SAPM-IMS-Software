/**
 * Login Page - Uses modern split-screen Auth component
 */
import React from 'react';
import Auth from './Auth';
import './Auth.css';

const Login = () => {
  return <Auth initialMode="login" />;
};

export default Login;

