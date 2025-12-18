/**
 * Error Handler Utility
 * Formats API errors into user-friendly messages
 */

/**
 * Format error messages from API responses
 * @param {Object} errorResponse - The error response from axios
 * @returns {string} - Formatted error message
 */
export const formatError = (errorResponse) => {
  if (!errorResponse) {
    return 'An unexpected error occurred. Please try again.';
  }

  const detail = errorResponse.detail;
  
  // Handle array of validation errors (FastAPI 422 format)
  if (Array.isArray(detail)) {
    const errors = detail.map(err => {
      const field = err.loc && err.loc.length > 0 
        ? err.loc[err.loc.length - 1] // Get the last element (field name)
        : 'field';
      
      // Format field name to be more readable
      const fieldName = formatFieldName(field);
      
      // Get error message
      let message = err.msg || 'Invalid value';
      
      // Make error messages more user-friendly
      message = improveErrorMessage(message, field);
      
      return `${fieldName}: ${message}`;
    });
    
    return errors.length > 1 
      ? `Please fix the following errors:\n${errors.join('\n')}`
      : errors[0];
  }
  
  // Handle string error messages (most common FastAPI format)
  if (typeof detail === 'string') {
    return improveErrorMessage(detail);
  }
  
  // Handle object error messages
  if (detail && typeof detail === 'object') {
    if (detail.message) {
      return improveErrorMessage(detail.message);
    }
    if (detail.error) {
      return improveErrorMessage(detail.error);
    }
    // If it's an object but no standard properties, try to stringify useful info
    const keys = Object.keys(detail);
    if (keys.length > 0) {
      const firstKey = keys[0];
      if (typeof detail[firstKey] === 'string') {
        return improveErrorMessage(detail[firstKey]);
      }
    }
  }
  
  // Handle HTTP status code errors
  if (errorResponse.status) {
    return getHttpErrorMessage(errorResponse.status);
  }
  
  // Fallback - try to extract any useful information
  if (errorResponse.message) {
    return improveErrorMessage(errorResponse.message);
  }
  
  if (errorResponse.error) {
    return improveErrorMessage(typeof errorResponse.error === 'string' 
      ? errorResponse.error 
      : errorResponse.error.message || JSON.stringify(errorResponse.error));
  }
  
  // Last resort fallback
  return 'An error occurred. Please try again.';
};

/**
 * Format field names to be more readable
 * @param {string} field - Field name from API
 * @returns {string} - Formatted field name
 */
const formatFieldName = (field) => {
  const fieldMap = {
    'username': 'Username',
    'email': 'Email',
    'password': 'Password',
    'name': 'Name',
    'role': 'Role',
    'patient_id': 'Patient ID',
    'image_id': 'Image ID',
    'report_id': 'Report ID',
    'bill_id': 'Bill ID',
    'test_type': 'Test Type',
    'medical_test_id': 'Medical Test ID',
    'test_request_id': 'Medical Test ID', // Legacy support
    'procedure_info': 'Procedure Information',
    'total_amount': 'Total Amount',
    'base_cost': 'Base Cost',
    'procedure': 'Procedure',
    'findings': 'Findings',
    'diagnosis': 'Diagnosis',
    'recommendations': 'Recommendations'
  };
  
  return fieldMap[field] || field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
};

/**
 * Improve error messages to be more user-friendly
 * @param {string} message - Original error message
 * @param {string} field - Field name (optional)
 * @returns {string} - Improved error message
 */
const improveErrorMessage = (message, field = '') => {
  if (!message) return 'Invalid value';
  
  const lowerMessage = message.toLowerCase();
  
  // Common FastAPI validation errors
  const errorMap = {
    'value is not a valid email address': 'Please enter a valid email address',
    'value is not a valid email': 'Please enter a valid email address',
    'string does not match expected pattern': 'Invalid format',
    'string too short': field === 'password' 
      ? 'Password must be at least 6 characters long'
      : 'Value is too short',
    'string too long': 'Value is too long',
    'value is not a valid integer': 'Please enter a valid number',
    'value is not a valid float': 'Please enter a valid number',
    'field required': 'This field is required',
    'none is not an allowed value': 'This field is required',
    'username already registered': 'This username is already taken. Please choose another.',
    'email already registered': 'This email is already registered. Please use a different email or login.',
    'could not validate credentials': 'Invalid username or password. Please check your credentials.',
    'user account is inactive': 'Your account has been deactivated. Please contact an administrator.',
    'not enough permissions': 'You do not have permission to perform this action.',
    'user not found': 'User not found.',
    'bill not found': 'Bill not found.',
    'patient not found': 'Patient not found.',
    'report not found': 'Diagnostic report not found.',
    'test request not found': 'Test request not found.',
    'image not found': 'Medical image not found.',
    'payment amount exceeds bill total': 'Payment amount cannot exceed the total bill amount.'
  };
  
  // Check for exact matches first
  for (const [key, value] of Object.entries(errorMap)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Handle common patterns
  if (lowerMessage.includes('required')) {
    return 'This field is required';
  }
  
  if (lowerMessage.includes('invalid')) {
    return `Invalid ${field ? formatFieldName(field).toLowerCase() : 'value'}`;
  }
  
  if (lowerMessage.includes('already exists') || lowerMessage.includes('already registered')) {
    return 'This value already exists. Please use a different value.';
  }
  
  // Return original message if no improvement found
  return message.charAt(0).toUpperCase() + message.slice(1);
};

/**
 * Get user-friendly HTTP error messages
 * @param {number} statusCode - HTTP status code
 * @returns {string} - Error message
 */
const getHttpErrorMessage = (statusCode) => {
  const statusMessages = {
    400: 'Invalid request. Please check your input and try again.',
    401: 'Authentication required. Please login to continue.',
    403: 'Access denied. You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'A conflict occurred. This resource may already exist.',
    422: 'Validation error. Please check your input and try again.',
    500: 'Server error. Please try again later.',
    502: 'Service unavailable. Please try again later.',
    503: 'Service temporarily unavailable. Please try again later.'
  };
  
  return statusMessages[statusCode] || `Error ${statusCode}. Please try again.`;
};

/**
 * Extract error from axios error object
 * @param {Error} error - Axios error object
 * @returns {string} - Formatted error message
 */
export const handleApiError = (error) => {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }
  
  // Network error
  if (error.message === 'Network Error' || !error.response) {
    return 'Network error. Please check your internet connection and try again.';
  }
  
  // API error response - check multiple possible structures
  if (error.response?.data) {
    const data = error.response.data;
    
    // If data is already a string, return it
    if (typeof data === 'string') {
      return improveErrorMessage(data);
    }
    
    // Try formatError first (handles detail property)
    const formatted = formatError(data);
    if (formatted && formatted !== 'An error occurred. Please try again.') {
      return formatted;
    }
    
    // Check for common error message properties
    if (data.message) {
      return improveErrorMessage(data.message);
    }
    
    if (data.error) {
      return improveErrorMessage(typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error));
    }
    
    // Check for error_description (OAuth style)
    if (data.error_description) {
      return improveErrorMessage(data.error_description);
    }
    
    // If data is an object but no standard properties, try to extract useful info
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length > 0) {
        // Try first non-empty string value
        for (const key of keys) {
          if (typeof data[key] === 'string' && data[key].trim()) {
            return improveErrorMessage(data[key]);
          }
        }
      }
    }
  }
  
  // HTTP status error
  if (error.response?.status) {
    return getHttpErrorMessage(error.response.status);
  }
  
  // Generic error
  return error.message || 'An error occurred. Please try again.';
};
