/**
 * Register Page - Uses modern split-screen Auth component
 */
import React from 'react';
import Auth from './Auth';
import './Auth.css';

const Register = () => {
  return <Auth initialMode="register" />;
};

export default Register;

